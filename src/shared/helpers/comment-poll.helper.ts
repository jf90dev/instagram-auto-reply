import { createHash } from "crypto";

import { ReplyRequest } from "../models/auto-reply/reply-request.model";
import { InstagramComment } from "../models/instagram/instagram-comment.model";

export class CommentPollHelper {
    /**
     * The comments on one post, replies included, that someone other than the account wrote with
     * text since `since`. The account's own comments and replies are left out, so it never replies
     * to itself.
     */
    static toReplyRequests(
        mediaId: string,
        comments: InstagramComment[],
        accountUserId: string,
        since: Date
    ): ReplyRequest[] {
        const allComments = comments.flatMap(comment => [comment, ...(comment.replies?.data ?? [])]);

        return allComments
            .filter(comment => CommentPollHelper.isReplyCandidate(comment, accountUserId, since))
            .map(comment => ({
                channel: "comment",
                eventId: `comment:${comment.id}`,
                senderId: comment.from!.id,
                senderUsername: comment.from!.username,
                text: comment.text!,
                receivedAt: new Date(comment.timestamp!).toISOString(),
                commentId: comment.id,
                mediaId: mediaId,
                parentCommentId: comment.parent_id
            }));
    }

    /**
     * A Step Functions execution name (at most 80 characters of [A-Za-z0-9-_]) that is the same
     * every time the same comment is passed on.
     */
    static toExecutionName(request: ReplyRequest): string {
        const eventHash = createHash("sha256").update(request.eventId).digest("hex").slice(0, 40);
        return `${request.channel}-${eventHash}`;
    }

    private static isReplyCandidate(comment: InstagramComment, accountUserId: string, since: Date): boolean {
        const hasAuthor = Boolean(comment.from?.id);
        const isFromAccount = comment.from?.id === accountUserId;
        const hasText = Boolean(comment.text?.trim());
        const isRecent = Boolean(comment.timestamp) && new Date(comment.timestamp!) >= since;

        return hasAuthor && !isFromAccount && hasText && isRecent;
    }
}
