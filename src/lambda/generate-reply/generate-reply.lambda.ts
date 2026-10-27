import { DependencyContainer } from "./framework/dependency-container.framework";
import { ReplyContext } from "../../shared/models/auto-reply/reply-context.model";
import { StepFunctionsTaskInput } from "../../shared/models/step-functions-task-input.model";
import { LoggerService } from "../../shared/services/logger.service";
import { ReplyGenerationService } from "../../shared/services/reply-generation.service";

export const handler = async (event: StepFunctionsTaskInput<ReplyContext>): Promise<ReplyContext> => {
    const logger: LoggerService = DependencyContainer.resolve("LoggerService");
    const replyGenerationService: ReplyGenerationService = DependencyContainer.resolve("ReplyGenerationService");

    logger.setTaskName("GenerateReply");
    logger.setCorrelationId(event.ExecutionId);

    try {
        return await replyGenerationService.generateReply(event.Input);
    } finally {
        logger.unsetCorrelationId();
    }
};
