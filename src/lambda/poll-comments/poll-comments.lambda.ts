import { ScheduledEvent } from "aws-lambda";

import { DependencyContainer } from "./framework/dependency-container.framework";
import { CommentPollResult } from "../../shared/models/auto-reply/comment-poll-result.model";
import { CommentPollingService } from "../../shared/services/comment-polling.service";
import { LoggerService } from "../../shared/services/logger.service";

/**
 * Runs on a schedule: passes each new comment on the account's latest posts to the state machine.
 */
export const handler = async (event: ScheduledEvent): Promise<CommentPollResult> => {
    const logger: LoggerService = DependencyContainer.resolve("LoggerService");
    const commentPollingService: CommentPollingService = DependencyContainer.resolve("CommentPollingService");

    logger.setTaskName("PollComments");
    logger.setCorrelationId(event.id);

    try {
        return await commentPollingService.pollComments();
    } finally {
        logger.unsetCorrelationId();
    }
};
