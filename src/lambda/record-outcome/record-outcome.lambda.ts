import { DependencyContainer } from "./framework/dependency-container.framework";
import { ReplyContext } from "../../shared/models/auto-reply/reply-context.model";
import { ReplyRecord } from "../../shared/models/auto-reply/reply-record.model";
import { StepFunctionsTaskInput } from "../../shared/models/step-functions-task-input.model";
import { LoggerService } from "../../shared/services/logger.service";
import { ReplyOutcomeService } from "../../shared/services/reply-outcome.service";

export const handler = async (event: StepFunctionsTaskInput<ReplyContext>): Promise<ReplyRecord> => {
    const logger: LoggerService = DependencyContainer.resolve("LoggerService");
    const replyOutcomeService: ReplyOutcomeService = DependencyContainer.resolve("ReplyOutcomeService");

    logger.setTaskName("RecordOutcome");
    logger.setCorrelationId(event.ExecutionId);

    try {
        return await replyOutcomeService.recordOutcome(event.Input, event.ExecutionId);
    } finally {
        logger.unsetCorrelationId();
    }
};
