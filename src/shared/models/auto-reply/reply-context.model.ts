import { AutoReplyConfig } from "./auto-reply-config.model";
import { ConversationMessage } from "./conversation-message.model";
import { GeneratedReply } from "./generated-reply.model";
import { ReplyRequest } from "./reply-request.model";

/**
 * Passed from step to step through the state machine; each step adds what it found out.
 */
export class ReplyContext {
    request: ReplyRequest;
    config: AutoReplyConfig;
    shouldReply: boolean;
    skipReason?: string;
    postCaption?: string;
    parentCommentText?: string;
    conversation: ConversationMessage[];
    generatedReply?: GeneratedReply;
    sentReplyId?: string;
}
