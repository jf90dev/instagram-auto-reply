import { DependencyContainer } from "./framework/dependency-container.framework";
import { ReplyContext } from "../../shared/models/auto-reply/reply-context.model";
import { ReplyRequest } from "../../shared/models/auto-reply/reply-request.model";
import { StepFunctionsTaskInput } from "../../shared/models/step-functions-task-input.model";
import { LoggerService } from "../../shared/services/logger.service";
import { ReplyContextService } from "../../shared/services/reply-context.service";

export const handler = async (event: StepFunctionsTaskInput<ReplyRequest>): Promise<ReplyContext> => {
    const logger: LoggerService = DependencyContainer.resolve("LoggerService");
    const replyContextService: ReplyContextService = DependencyContainer.resolve("ReplyContextService");

    logger.setTaskName("GetContext");
    logger.setCorrelationId(event.ExecutionId);

    try {
        return await replyContextService.buildContext(event.Input);
    } finally {
        logger.unsetCorrelationId();
    }
};
