import { inject, injectable } from "tsyringe";

import { LoggerService } from "./logger.service";
import { ReplyContext } from "../models/auto-reply/reply-context.model";
import { ReplyRecord } from "../models/auto-reply/reply-record.model";
import { ReplyStatus } from "../models/auto-reply/reply-status.model";
import { ReplyRepository } from "../repositories/reply.repository";

@injectable()
export class ReplyOutcomeService {
    constructor(
        @inject("LoggerService") private logger: LoggerService,
        @inject("ReplyRepository") private replyRepository: ReplyRepository
    ) {}

    /**
     * Stores what happened to the comment or message, including drafts waiting for approval.
     */
    async recordOutcome(context: ReplyContext, executionId?: string): Promise<ReplyRecord> {
        const { request, generatedReply } = context;
        const status = this.getStatus(context);

        const record: ReplyRecord = {
            eventId: request.eventId,
            executionId: executionId,
            channel: request.channel,
            status: status,
            senderId: request.senderId,
            senderUsername: request.senderUsername,
            inboundText: request.text,
            commentId: request.commentId,
            mediaId: request.mediaId,
            replyText: generatedReply?.replyText || undefined,
            reason: context.skipReason ?? generatedReply?.reason,
            model: generatedReply?.model,
            sentReplyId: context.sentReplyId,
            receivedAt: new Date(request.receivedAt),
            recordedAt: new Date()
        };

        try {
            await this.replyRepository.saveReply(record);
            this.logger.info(`Recorded ${request.eventId} as ${status}`);
            return record;
        } catch (error) {
            this.logger.errorMessage(`Failed to record the outcome of ${request.eventId}: ${error}`);
            throw error;
        }
    }

    private getStatus(context: ReplyContext): ReplyStatus {
        const decision = context.generatedReply?.decision;

        if (context.sentReplyId) {
            return "sent";
        }
        if (decision === "reply") {
            return "draft";
        }
        if (decision === "escalate") {
            return "escalated";
        }
        return "skipped";
    }
}
