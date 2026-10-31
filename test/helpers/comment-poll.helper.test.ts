import { CommentPollHelper } from "../../src/shared/helpers/comment-poll.helper";
import { InstagramComment } from "../../src/shared/models/instagram/instagram-comment.model";

const accountId = "17840000000000000";
const since = new Date("2026-10-30T12:00:00.000Z");

describe("CommentPollHelper", () => {
    test("turns recent comments and replies from other people into reply requests", () => {
        const comments: InstagramComment[] = [
            {
                id: "comment-1",
                text: "This hit hard",
                timestamp: "2026-10-31T09:00:00+0000",
                from: { id: "user-1", username: "reader" },
                replies: {
                    data: [
                        {
                            id: "reply-1",
                            text: "Same here",
                            timestamp: "2026-10-31T09:05:00+0000",
                            from: { id: "user-2", username: "another_reader" },
                            parent_id: "comment-1"
                        }
                    ]
                }
            }
        ];

        expect(CommentPollHelper.toReplyRequests("media-1", comments, accountId, since)).toEqual([
            {
                channel: "comment",
                eventId: "comment:comment-1",
                senderId: "user-1",
                senderUsername: "reader",
                text: "This hit hard",
                receivedAt: "2026-10-31T09:00:00.000Z",
                commentId: "comment-1",
                mediaId: "media-1",
                parentCommentId: undefined
            },
            {
                channel: "comment",
                eventId: "comment:reply-1",
                senderId: "user-2",
                senderUsername: "another_reader",
                text: "Same here",
                receivedAt: "2026-10-31T09:05:00.000Z",
                commentId: "reply-1",
                mediaId: "media-1",
                parentCommentId: "comment-1"
            }
        ]);
    });

    test("leaves out the account's own replies, empty comments and comments older than the lookback", () => {
        const comments: InstagramComment[] = [
            {
                id: "old-comment",
                text: "Posted last week",
                timestamp: "2026-10-24T09:00:00+0000",
                from: { id: "user-1" },
                replies: {
                    data: [
                        {
                            id: "own-reply",
                            text: "Thanks!",
                            timestamp: "2026-10-31T09:00:00+0000",
                            from: { id: accountId },
                            parent_id: "old-comment"
                        }
                    ]
                }
            },
            { id: "empty-comment", text: "   ", timestamp: "2026-10-31T09:00:00+0000", from: { id: "user-2" } },
            { id: "no-author", text: "Hidden author", timestamp: "2026-10-31T09:00:00+0000" }
        ];

        expect(CommentPollHelper.toReplyRequests("media-1", comments, accountId, since)).toEqual([]);
    });

    test("names executions the same way every time, within the Step Functions limits", () => {
        const request = {
            channel: "comment" as const,
            eventId: "comment:17900000000000001",
            senderId: "user-1",
            text: "hi",
            receivedAt: "2026-10-31T09:00:00.000Z"
        };

        const executionName = CommentPollHelper.toExecutionName(request);

        expect(executionName).toBe(CommentPollHelper.toExecutionName({ ...request }));
        expect(executionName).toMatch(/^comment-[0-9a-f]{40}$/);
    });
});
