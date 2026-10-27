import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";
import { injectable } from "tsyringe";

import { ParameterStoreError } from "../models/error-handling/parameter-store-error.model";

/**
 * Reads SSM Parameter Store values (SecureString values decrypted). Values are kept for the
 * lifetime of the Lambda container, so each container reads a parameter once.
 */
@injectable()
export class ParameterStoreClient {
    private client: SSMClient;
    private cachedValues = new Map<string, string>();

    constructor() {
        this.client = new SSMClient({});
    }

    async getParameterValue(parameterName: string): Promise<string> {
        const values = await this.getParameterValues([parameterName]);
        return values[parameterName];
    }

    async getParameterValues(parameterNames: string[]): Promise<{ [parameterName: string]: string }> {
        const namesToFetch = parameterNames.filter(name => !this.cachedValues.has(name));

        if (namesToFetch.length > 0) {
            await this.fetchParameters(namesToFetch);
        }

        return Object.fromEntries(parameterNames.map(name => [name, this.cachedValues.get(name)!]));
    }

    private async fetchParameters(parameterNames: string[]): Promise<void> {
        try {
            const output = await this.client.send(
                new GetParametersCommand({ Names: parameterNames, WithDecryption: true })
            );

            if (output.InvalidParameters && output.InvalidParameters.length > 0) {
                throw new ParameterStoreError({
                    name: "PARAMETER_STORE_ERROR",
                    message: `Parameters not found: ${output.InvalidParameters.join(", ")}`
                });
            }

            for (const parameter of output.Parameters ?? []) {
                this.cachedValues.set(parameter.Name!, parameter.Value!);
            }
        } catch (error) {
            if (error instanceof ParameterStoreError) {
                throw error;
            }
            throw new ParameterStoreError({
                name: "PARAMETER_STORE_ERROR",
                message: `Failed to read parameters ${parameterNames.join(", ")}`,
                cause: error
            });
        }
    }
}
