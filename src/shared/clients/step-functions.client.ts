import {
    ExecutionAlreadyExists,
    ListExecutionsCommand,
    ListExecutionsCommandOutput,
    RedriveExecutionCommand,
    RedriveExecutionCommandOutput,
    SFNClient,
    StartExecutionCommand
} from "@aws-sdk/client-sfn";
import { injectable } from "tsyringe";

import { StepFunctionsError } from "../models/error-handling/step-functions-error.model";

@injectable()
export class StepFunctionsClient {
    private client: SFNClient;

    constructor() {
        this.client = new SFNClient({});
    }

    /**
     * Starts an execution with a name derived from its input, so starting the same work twice
     * (for example when Meta retries a webhook) runs it once. Returns false if an execution with
     * that name already finished (a still-running one is returned by Step Functions as a success).
     */
    async startExecutionOnce(stateMachineArn: string, executionName: string, input: unknown): Promise<boolean> {
        try {
            await this.client.send(
                new StartExecutionCommand({
                    stateMachineArn: stateMachineArn,
                    name: executionName,
                    input: JSON.stringify(input)
                })
            );
            return true;
        } catch (error) {
            if (error instanceof ExecutionAlreadyExists) {
                return false;
            }
            throw new StepFunctionsError({
                name: "STEP_FUNCTIONS_ERROR",
                message: `Failed to start execution ${executionName} of ${stateMachineArn}`,
                cause: error
            });
        }
    }

    async redriveExecution(executionArn: string): Promise<RedriveExecutionCommandOutput> {
        return this.client.send(new RedriveExecutionCommand({ executionArn: executionArn }));
    }

    async getFailedExecutions(stateMachineArn: string): Promise<ListExecutionsCommandOutput> {
        return this.client.send(
            new ListExecutionsCommand({ stateMachineArn: stateMachineArn, statusFilter: "FAILED" })
        );
    }
}
