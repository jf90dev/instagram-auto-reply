import { DEFAULT_AUTO_REPLY_CONFIG } from "../../src/shared/constants/default-auto-reply-config.constant";
import { ReplyPolicyHelper } from "../../src/shared/helpers/reply-policy.helper";
import { AutoReplyConfig } from "../../src/shared/models/auto-reply/auto-reply-config.model";
import { ReplyRequest } from "../../src/shared/models/auto-reply/reply-request.model";

const now = new Date("2026-10-27T12:00:00.000Z");
const accountUserId = "account-1";
const comment: ReplyRequest = {
    channel: "comment",
    eventId: "comment:1",
    senderId: "user-1",
    text: "Great post",
    receivedAt: "2026-10-27T11:59:00.000Z",
    commentId: "1"
};
const message: ReplyRequest = { ...comment, channel: "message", eventId: "message:1", commentId: undefined };

const skipReasonFor = (
    request: ReplyRequest,
    configChanges: Partial<AutoReplyConfig> = {},
    repliesSentToSenderToday = 0
) =>
    ReplyPolicyHelper.findSkipReason({
        request: request,
        config: { ...DEFAULT_AUTO_REPLY_CONFIG, ...configChanges },
        accountUserId: accountUserId,
        repliesSentToSenderToday: repliesSentToSenderToday,
        now: now
    });

describe("ReplyPolicyHelper.findSkipReason", () => {
    test("allows a fresh comment or message from someone else", () => {
        expect(skipReasonFor(comment)).toBeUndefined();
        expect(skipReasonFor(message)).toBeUndefined();
    });

    test("respects the kill switch and the channel switches", () => {
        expect(skipReasonFor(comment, { isEnabled: false })).toBe("Auto-reply is switched off");
        expect(skipReasonFor(comment, { replyToComments: false })).toBe("Replies to comments are switched off");
        expect(skipReasonFor(message, { replyToMessages: false })).toBe("Replies to direct messages are switched off");
    });

    test("never replies to the account itself", () => {
        expect(skipReasonFor({ ...comment, senderId: accountUserId })).toBe("Sent by the account itself");
    });

    test("stops at the daily limit per person", () => {
        expect(skipReasonFor(comment, { maxRepliesPerUserPerDay: 3 }, 2)).toBeUndefined();
        expect(skipReasonFor(comment, { maxRepliesPerUserPerDay: 3 }, 3)).toContain("Already replied");
    });

    test("skips direct messages outside Instagram's 24 hour window", () => {
        expect(skipReasonFor({ ...message, receivedAt: "2026-10-26T11:00:00.000Z" })).toContain("older than 24");
    });
});

describe("ReplyPolicyHelper.findReplyProblem", () => {
    test("accepts a normal reply", () => {
        expect(ReplyPolicyHelper.findReplyProblem("Keep going.", "comment", [])).toBeUndefined();
    });

    test("rejects empty and over-long replies", () => {
        expect(ReplyPolicyHelper.findReplyProblem("  ", "comment", [])).toBe("Reply is empty");
        expect(ReplyPolicyHelper.findReplyProblem("a".repeat(1001), "message", [])).toContain("more than the 1000");
    });

    test("only allows links on the allow list", () => {
        expect(ReplyPolicyHelper.findReplyProblem("See https://example.com/x", "comment", [])).toContain(
            "https://example.com/x"
        );
        expect(
            ReplyPolicyHelper.findReplyProblem("See https://themanualformen.com/books", "comment", [
                "themanualformen.com"
            ])
        ).toBeUndefined();
    });
});
