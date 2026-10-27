import { DependencyContainer } from "./framework/dependency-container.framework";
import { ReplyContext } from "../../shared/models/auto-reply/reply-context.model";
import { StepFunctionsTaskInput } from "../../shared/models/step-functions-task-input.model";
import { LoggerService } from "../../shared/services/logger.service";
import { ReplySendingService } from "../../shared/services/reply-sending.service";

export const handler = async (event: StepFunctionsTaskInput<ReplyContext>): Promise<ReplyContext> => {
    const logger: LoggerService = DependencyContainer.resolve("LoggerService");
    const replySendingService: ReplySendingService = DependencyContainer.resolve("ReplySendingService");

    logger.setTaskName("SendReply");
    logger.setCorrelationId(event.ExecutionId);

    try {
        return await replySendingService.sendReply(event.Input);
    } finally {
        logger.unsetCorrelationId();
    }
};
