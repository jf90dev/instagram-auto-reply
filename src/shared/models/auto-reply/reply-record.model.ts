import { ReplyChannel } from "./reply-channel.model";
import { ReplyStatus } from "./reply-status.model";

/**
 * One document per comment or direct message in the replies collection: what came in, what
 * Claude decided and what was sent.
 */
export class ReplyRecord {
    eventId: string;
    executionId?: string;
    channel: ReplyChannel;
    status: ReplyStatus;
    senderId: string;
    senderUsername?: string;
    inboundText: string;
    commentId?: string;
    mediaId?: string;
    replyText?: string;
    reason?: string;
    model?: string;
    sentReplyId?: string;
    receivedAt: Date;
    recordedAt: Date;
}
