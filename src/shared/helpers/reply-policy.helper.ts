import {
    COMMENT_REPLY_MAX_LENGTH,
    DIRECT_MESSAGE_MAX_LENGTH,
    DIRECT_MESSAGE_REPLY_WINDOW_HOURS
} from "../constants/instagram-limits.constant";
import { AutoReplyConfig } from "../models/auto-reply/auto-reply-config.model";
import { ReplyChannel } from "../models/auto-reply/reply-channel.model";
import { ReplyRequest } from "../models/auto-reply/reply-request.model";

export interface SkipCheckInput {
    readonly request: ReplyRequest;
    readonly config: AutoReplyConfig;
    readonly accountUserId: string;
    readonly repliesSentToSenderToday: number;
    readonly now: Date;
}

/**
 * The hard rules that apply whatever Claude decides.
 */
export class ReplyPolicyHelper {
    /**
     * Why this comment or message must not get a reply, or undefined if it may.
     */
    static findSkipReason(input: SkipCheckInput): string | undefined {
        const { request, config } = input;

        if (!config.isEnabled) {
            return "Auto-reply is switched off";
        }
        if (request.channel === "comment" && !config.replyToComments) {
            return "Replies to comments are switched off";
        }
        if (request.channel === "message" && !config.replyToMessages) {
            return "Replies to direct messages are switched off";
        }
        if (request.senderId === input.accountUserId) {
            return "Sent by the account itself";
        }
        if (input.repliesSentToSenderToday >= config.maxRepliesPerUserPerDay) {
            return `Already replied to this person ${input.repliesSentToSenderToday} times in the last 24 hours`;
        }
        if (request.channel === "message" && ReplyPolicyHelper.isOutsideMessagingWindow(request, input.now)) {
            return `Direct message is older than ${DIRECT_MESSAGE_REPLY_WINDOW_HOURS} hours`;
        }

        return undefined;
    }

    /**
     * Why a reply Claude wrote must not be sent automatically, or undefined if it may.
     */
    static findReplyProblem(replyText: string, channel: ReplyChannel, allowedLinks: string[]): string | undefined {
        const maximumLength = channel === "comment" ? COMMENT_REPLY_MAX_LENGTH : DIRECT_MESSAGE_MAX_LENGTH;

        if (!replyText.trim()) {
            return "Reply is empty";
        }
        if (replyText.length > maximumLength) {
            return `Reply is ${replyText.length} characters, more than the ${maximumLength} Instagram allows`;
        }

        const linksInReply = replyText.match(/(https?:\/\/|www\.)\S+/gi) ?? [];
        const unapprovedLinks = linksInReply.filter(
            link => !allowedLinks.some(allowedLink => link.toLowerCase().includes(allowedLink.toLowerCase()))
        );
        if (unapprovedLinks.length > 0) {
            return `Reply contains links that are not in allowedLinks: ${unapprovedLinks.join(", ")}`;
        }

        return undefined;
    }

    private static isOutsideMessagingWindow(request: ReplyRequest, now: Date): boolean {
        const hoursSinceReceived = (now.getTime() - new Date(request.receivedAt).getTime()) / (60 * 60 * 1000);
        return hoursSinceReceived >= DIRECT_MESSAGE_REPLY_WINDOW_HOURS;
    }
}
