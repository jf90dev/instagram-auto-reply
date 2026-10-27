import { inject, injectable } from "tsyringe";

import { LoggerService } from "./logger.service";
import { ParameterStoreClient } from "../clients/parameter-store.client";
import { StepFunctionsClient } from "../clients/step-functions.client";
import { WebhookEventHelper } from "../helpers/webhook-event.helper";
import { WebhookSignatureHelper } from "../helpers/webhook-signature.helper";
import { WebhookError } from "../models/error-handling/webhook-error.model";
import { InstagramWebhookPayload } from "../models/instagram/instagram-webhook-payload.model";

@injectable()
export class WebhookService {
    private readonly appSecretParameterName = process.env.INSTAGRAM_APP_SECRET_PARAMETER_NAME!;
    private readonly verifyTokenParameterName = process.env.INSTAGRAM_VERIFY_TOKEN_PARAMETER_NAME!;
    private readonly stateMachineArn = process.env.STATE_MACHINE_ARN!;

    constructor(
        @inject("LoggerService") private logger: LoggerService,
        @inject("ParameterStoreClient") private parameterStoreClient: ParameterStoreClient,
        @inject("StepFunctionsClient") private stepFunctionsClient: StepFunctionsClient
    ) {}

    /**
     * Meta's subscription check: returns the challenge to echo back if the verify token matches,
     * otherwise undefined.
     */
    async verifySubscription(mode?: string, verifyToken?: string, challenge?: string): Promise<string | undefined> {
        const expectedVerifyToken = await this.parameterStoreClient.getParameterValue(this.verifyTokenParameterName);
        const isValidSubscription = mode === "subscribe" && verifyToken === expectedVerifyToken && Boolean(challenge);

        return isValidSubscription ? challenge : undefined;
    }

    /**
     * Checks the signature, then starts one state machine execution per comment or direct message.
     * Returns how many executions were started.
     */
    async handleNotification(rawBody: string, signatureHeader?: string): Promise<number> {
        const appSecret = await this.parameterStoreClient.getParameterValue(this.appSecretParameterName);

        if (!WebhookSignatureHelper.isValidSignature(rawBody, signatureHeader, appSecret)) {
            throw new WebhookError({ name: "WEBHOOK_ERROR", message: "Webhook signature is missing or invalid" });
        }

        const payload = this.parseBody(rawBody);
        const replyRequests = WebhookEventHelper.toReplyRequests(payload);
        let startedExecutions = 0;

        for (const replyRequest of replyRequests) {
            const executionName = WebhookEventHelper.toExecutionName(replyRequest);
            const isStarted = await this.stepFunctionsClient.startExecutionOnce(
                this.stateMachineArn,
                executionName,
                replyRequest
            );

            if (isStarted) {
                startedExecutions++;
                this.logger.info(`Started ${executionName} for ${replyRequest.eventId}`);
            } else {
                this.logger.info(`Skipped ${replyRequest.eventId}: already handled by ${executionName}`);
            }
        }

        return startedExecutions;
    }

    private parseBody(rawBody: string): InstagramWebhookPayload {
        try {
            return JSON.parse(rawBody) as InstagramWebhookPayload;
        } catch (error) {
            throw new WebhookError({ name: "WEBHOOK_ERROR", message: "Webhook body is not JSON", cause: error });
        }
    }
}
