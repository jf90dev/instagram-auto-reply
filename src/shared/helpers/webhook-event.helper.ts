import { createHash } from "crypto";

import { ReplyRequest } from "../models/auto-reply/reply-request.model";
import {
    InstagramChange,
    InstagramMessagingEvent,
    InstagramWebhookEntry,
    InstagramWebhookPayload
} from "../models/instagram/instagram-webhook-payload.model";

export class WebhookEventHelper {
    /**
     * The comments and direct messages in a webhook body that someone else sent the account.
     * The account's own comments and messages (echoes), deletions, reactions, read receipts and
     * messages without text are left out, so the account never replies to itself.
     */
    static toReplyRequests(payload: InstagramWebhookPayload): ReplyRequest[] {
        if (payload.object !== "instagram") {
            return [];
        }

        const replyRequests: ReplyRequest[] = [];

        for (const entry of payload.entry ?? []) {
            for (const change of entry.changes ?? []) {
                const request = WebhookEventHelper.commentToReplyRequest(entry, change);
                if (request) {
                    replyRequests.push(request);
                }
            }
            for (const messagingEvent of entry.messaging ?? []) {
                const request = WebhookEventHelper.messageToReplyRequest(entry, messagingEvent);
                if (request) {
                    replyRequests.push(request);
                }
            }
        }

        return replyRequests;
    }

    /**
     * A Step Functions execution name (at most 80 characters of [A-Za-z0-9-_]) that is the same
     * every time Meta delivers the same event.
     */
    static toExecutionName(request: ReplyRequest): string {
        const eventHash = createHash("sha256").update(request.eventId).digest("hex").slice(0, 40);
        return `${request.channel}-${eventHash}`;
    }

    private static commentToReplyRequest(
        entry: InstagramWebhookEntry,
        change: InstagramChange
    ): ReplyRequest | undefined {
        const comment = change.value;
        const isComment = change.field === "comments";
        const isFromAccount = comment?.from?.id === entry.id;
        const hasText = Boolean(comment?.text?.trim());

        if (!isComment || isFromAccount || !hasText || !comment.from) {
            return undefined;
        }

        return {
            channel: "comment",
            eventId: `comment:${comment.id}`,
            senderId: comment.from.id,
            senderUsername: comment.from.username,
            text: comment.text!,
            receivedAt: new Date(entry.time * 1000).toISOString(),
            commentId: comment.id,
            mediaId: comment.media?.id,
            parentCommentId: comment.parent_id
        };
    }

    private static messageToReplyRequest(
        entry: InstagramWebhookEntry,
        messagingEvent: InstagramMessagingEvent
    ): ReplyRequest | undefined {
        const message = messagingEvent.message;
        const isFromAccount = message?.is_echo === true || messagingEvent.sender.id === entry.id;
        const hasText = Boolean(message?.text?.trim());

        if (!message || isFromAccount || message.is_deleted || !hasText) {
            return undefined;
        }

        return {
            channel: "message",
            eventId: `message:${message.mid}`,
            messageId: message.mid,
            senderId: messagingEvent.sender.id,
            text: message.text!,
            receivedAt: new Date(messagingEvent.timestamp).toISOString()
        };
    }
}
