import { WebhookEventHelper } from "../../src/shared/helpers/webhook-event.helper";
import { InstagramWebhookPayload } from "../../src/shared/models/instagram/instagram-webhook-payload.model";

const accountId = "17840000000000000";

describe("WebhookEventHelper", () => {
    test("turns a comment from someone else into a reply request", () => {
        const payload: InstagramWebhookPayload = {
            object: "instagram",
            entry: [
                {
                    id: accountId,
                    time: 1761559200,
                    changes: [
                        {
                            field: "comments",
                            value: {
                                id: "comment-1",
                                text: "This hit hard",
                                from: { id: "user-1", username: "reader" },
                                media: { id: "media-1" }
                            }
                        }
                    ]
                }
            ]
        };

        expect(WebhookEventHelper.toReplyRequests(payload)).toEqual([
            {
                channel: "comment",
                eventId: "comment:comment-1",
                senderId: "user-1",
                senderUsername: "reader",
                text: "This hit hard",
                receivedAt: "2025-10-27T10:00:00.000Z",
                commentId: "comment-1",
                mediaId: "media-1",
                parentCommentId: undefined
            }
        ]);
    });

    test("turns a direct message into a reply request", () => {
        const payload: InstagramWebhookPayload = {
            object: "instagram",
            entry: [
                {
                    id: accountId,
                    time: 1761559200,
                    messaging: [
                        {
                            sender: { id: "user-2" },
                            recipient: { id: accountId },
                            timestamp: 1761559200000,
                            message: { mid: "mid-1", text: "Which book first?" }
                        }
                    ]
                }
            ]
        };

        expect(WebhookEventHelper.toReplyRequests(payload)).toEqual([
            {
                channel: "message",
                eventId: "message:mid-1",
                messageId: "mid-1",
                senderId: "user-2",
                text: "Which book first?",
                receivedAt: "2025-10-27T10:00:00.000Z"
            }
        ]);
    });

    test("leaves out the account's own comments and messages, deletions and empty messages", () => {
        const payload: InstagramWebhookPayload = {
            object: "instagram",
            entry: [
                {
                    id: accountId,
                    time: 1761559200,
                    changes: [
                        { field: "comments", value: { id: "c1", text: "Thanks!", from: { id: accountId } } },
                        { field: "mentions", value: { id: "c2", text: "hi", from: { id: "user-1" } } }
                    ],
                    messaging: [
                        {
                            sender: { id: accountId },
                            recipient: { id: "user-2" },
                            timestamp: 1761559200000,
                            message: { mid: "m1", text: "Our reply", is_echo: true }
                        },
                        {
                            sender: { id: "user-2" },
                            recipient: { id: accountId },
                            timestamp: 1761559200000,
                            message: { mid: "m2", is_deleted: true }
                        },
                        {
                            sender: { id: "user-2" },
                            recipient: { id: accountId },
                            timestamp: 1761559200000,
                            message: { mid: "m3", text: "   " }
                        },
                        { sender: { id: "user-2" }, recipient: { id: accountId }, timestamp: 1761559200000 }
                    ]
                }
            ]
        };

        expect(WebhookEventHelper.toReplyRequests(payload)).toEqual([]);
    });

    test("ignores payloads for other objects", () => {
        expect(WebhookEventHelper.toReplyRequests({ object: "page", entry: [] })).toEqual([]);
    });

    test("names executions the same way every time, within the Step Functions limits", () => {
        const request = {
            channel: "message" as const,
            eventId: "message:aWdfZAG1faWQZD-a-very-long-message-id",
            senderId: "user-2",
            text: "hi",
            receivedAt: "2026-10-27T10:00:00.000Z"
        };

        const executionName = WebhookEventHelper.toExecutionName(request);

        expect(executionName).toBe(WebhookEventHelper.toExecutionName({ ...request }));
        expect(executionName).toMatch(/^message-[0-9a-f]{40}$/);
    });
});
