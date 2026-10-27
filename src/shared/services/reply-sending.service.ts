import { inject, injectable } from "tsyringe";

import { LoggerService } from "./logger.service";
import { InstagramGraphClient } from "../clients/instagram-graph.client";
import { ReplyContext } from "../models/auto-reply/reply-context.model";
import { InstagramSentReply } from "../models/instagram/instagram-sent-reply.model";

@injectable()
export class ReplySendingService {
    constructor(
        @inject("LoggerService") private logger: LoggerService,
        @inject("InstagramGraphClient") private instagramGraphClient: InstagramGraphClient
    ) {}

    /**
     * Posts the generated reply: a public reply to a comment, or a direct message back.
     */
    async sendReply(context: ReplyContext): Promise<ReplyContext> {
        const { request, generatedReply } = context;

        try {
            const sentReply = await this.send(context, generatedReply!.replyText);
            const sentReplyId = sentReply.id ?? sentReply.message_id;

            this.logger.info(`Sent ${request.channel} reply ${sentReplyId} for ${request.eventId}`);

            return { ...context, sentReplyId: sentReplyId };
        } catch (error) {
            this.logger.errorMessage(`Failed to send the reply for ${request.eventId}: ${error}`);
            throw error;
        }
    }

    private async send(context: ReplyContext, replyText: string): Promise<InstagramSentReply> {
        if (context.request.channel === "comment") {
            return this.instagramGraphClient.replyToComment(context.request.commentId!, replyText);
        }
        return this.instagramGraphClient.sendDirectMessage(context.request.senderId, replyText);
    }
}
