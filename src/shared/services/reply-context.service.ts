import { inject, injectable } from "tsyringe";

import { LoggerService } from "./logger.service";
import { InstagramGraphClient } from "../clients/instagram-graph.client";
import { CONVERSATION_MESSAGES_FOR_CONTEXT } from "../constants/instagram-limits.constant";
import { ReplyPolicyHelper } from "../helpers/reply-policy.helper";
import { AutoReplyConfig } from "../models/auto-reply/auto-reply-config.model";
import { ConversationMessage } from "../models/auto-reply/conversation-message.model";
import { ReplyContext } from "../models/auto-reply/reply-context.model";
import { ReplyRequest } from "../models/auto-reply/reply-request.model";
import { AutoReplyConfigRepository } from "../repositories/auto-reply-config.repository";
import { ReplyRepository } from "../repositories/reply.repository";

@injectable()
export class ReplyContextService {
    constructor(
        @inject("LoggerService") private logger: LoggerService,
        @inject("InstagramGraphClient") private instagramGraphClient: InstagramGraphClient,
        @inject("AutoReplyConfigRepository") private autoReplyConfigRepository: AutoReplyConfigRepository,
        @inject("ReplyRepository") private replyRepository: ReplyRepository
    ) {}

    /**
     * Applies the reply rules and, if a reply is allowed, gathers what Claude needs to write one:
     * the post caption and parent comment for a comment, the earlier messages for a direct message.
     */
    async buildContext(request: ReplyRequest): Promise<ReplyContext> {
        try {
            const config = await this.autoReplyConfigRepository.getConfig();
            const skipReason = await this.findSkipReason(request, config);

            if (skipReason) {
                this.logger.info(`Not replying to ${request.eventId}: ${skipReason}`);
                return { request, config, shouldReply: false, skipReason, conversation: [] };
            }

            if (request.channel === "comment") {
                return {
                    request,
                    config,
                    shouldReply: true,
                    conversation: [],
                    ...(await this.getCommentContext(request))
                };
            }

            return { request, config, shouldReply: true, conversation: await this.getConversation(request) };
        } catch (error) {
            this.logger.errorMessage(`Failed to build the reply context for ${request.eventId}: ${error}`);
            throw error;
        }
    }

    private async findSkipReason(request: ReplyRequest, config: AutoReplyConfig): Promise<string | undefined> {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        return ReplyPolicyHelper.findSkipReason({
            request: request,
            config: config,
            accountUserId: await this.instagramGraphClient.getAccountUserId(),
            repliesSentToSenderToday: await this.replyRepository.countRepliesSentToSenderSince(
                request.senderId,
                oneDayAgo
            ),
            now: now
        });
    }

    private async getCommentContext(
        request: ReplyRequest
    ): Promise<{ postCaption?: string; parentCommentText?: string }> {
        const media = request.mediaId ? await this.instagramGraphClient.getMedia(request.mediaId) : undefined;
        const parentComment = request.parentCommentId
            ? await this.instagramGraphClient.getComment(request.parentCommentId)
            : undefined;

        return { postCaption: media?.caption, parentCommentText: parentComment?.text };
    }

    /**
     * The earlier messages of the conversation, oldest first, without the new message itself.
     */
    private async getConversation(request: ReplyRequest): Promise<ConversationMessage[]> {
        const recentMessages = await this.instagramGraphClient.getRecentConversationMessages(
            request.senderId,
            CONVERSATION_MESSAGES_FOR_CONTEXT
        );

        return recentMessages
            .filter(message => message.id !== request.messageId && Boolean(message.message))
            .reverse()
            .map(message => ({
                isFromAccount: message.from.id !== request.senderId,
                text: message.message!,
                sentAt: message.created_time
            }));
    }
}
