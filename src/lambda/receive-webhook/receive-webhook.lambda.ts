import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

import { DependencyContainer } from "./framework/dependency-container.framework";
import { WebhookError } from "../../shared/models/error-handling/webhook-error.model";
import { LoggerService } from "../../shared/services/logger.service";
import { WebhookService } from "../../shared/services/webhook.service";

/**
 * The Instagram webhook, behind a Lambda function URL. GET answers Meta's subscription check;
 * POST receives comment and direct message notifications.
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const logger: LoggerService = DependencyContainer.resolve("LoggerService");
    const webhookService: WebhookService = DependencyContainer.resolve("WebhookService");

    logger.setTaskName("ReceiveWebhook");
    logger.setCorrelationId(event.requestContext.requestId);

    try {
        logger.info(`Received webhook: ${event.requestContext.http.method} ${event.rawPath}`);
        logger.info(`Event: ${JSON.stringify(event)}`);

        return { statusCode: 200, body: "OK" };

        // if (event.requestContext.http.method === "GET") {
        //     const query = event.queryStringParameters ?? {};
        //     const challenge = await webhookService.verifySubscription(
        //         query["hub.mode"],
        //         query["hub.verify_token"],
        //         query["hub.challenge"]
        //     );

        //     return challenge
        //         ? { statusCode: 200, headers: { "Content-Type": "text/plain" }, body: challenge }
        //         : { statusCode: 403, body: "Forbidden" };
        // }

        // if (event.requestContext.http.method === "POST") {
        //     const rawBody = event.isBase64Encoded
        //         ? Buffer.from(event.body ?? "", "base64").toString("utf8")
        //         : (event.body ?? "");
        //     const startedExecutions = await webhookService.handleNotification(
        //         rawBody,
        //         event.headers["x-hub-signature-256"]
        //     );

        //     logger.info(`Webhook handled, ${startedExecutions} replies started`);
        //     return { statusCode: 200, body: "OK" };
        // }

        // return { statusCode: 405, body: "Method Not Allowed" };
    } catch (error) {
        if (error instanceof WebhookError) {
            logger.warn(`Rejected webhook: ${error.message}`);
            return { statusCode: 401, body: "Unauthorized" };
        }

        // Any other failure returns 500 so Meta delivers the notification again.
        logger.errorMessage(`Webhook failed: ${error}`);
        return { statusCode: 500, body: "Internal Server Error" };
    } finally {
        logger.unsetCorrelationId();
    }
};
