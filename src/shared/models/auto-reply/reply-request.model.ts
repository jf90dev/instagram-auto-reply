import { ReplyChannel } from "./reply-channel.model";

/**
 * One comment or direct message someone sent the account.
 * It is the input of a state machine execution.
 */
export class ReplyRequest {
    channel: ReplyChannel;
    eventId: string;
    senderId: string;
    senderUsername?: string;
    text: string;
    receivedAt: string;
    messageId?: string;
    commentId?: string;
    mediaId?: string;
    parentCommentId?: string;
}
