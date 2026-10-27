import { DEFAULT_AUTO_REPLY_CONFIG } from "../../src/shared/constants/default-auto-reply-config.constant";
import { ReplyPromptHelper } from "../../src/shared/helpers/reply-prompt.helper";
import { ReplyContext } from "../../src/shared/models/auto-reply/reply-context.model";

describe("ReplyPromptHelper", () => {
    test("the system prompt includes the brand voice and the link rule", () => {
        const systemPrompt = ReplyPromptHelper.buildSystemPrompt(DEFAULT_AUTO_REPLY_CONFIG);

        expect(systemPrompt).toContain(DEFAULT_AUTO_REPLY_CONFIG.brandVoice);
        expect(systemPrompt).toContain("Do not include any links.");
    });

    test("a comment message includes the caption, the parent comment and the comment", () => {
        const context: ReplyContext = {
            request: {
                channel: "comment",
                eventId: "comment:1",
                senderId: "user-1",
                senderUsername: "reader",
                text: "So true",
                receivedAt: "2026-10-27T10:00:00.000Z"
            },
            config: DEFAULT_AUTO_REPLY_CONFIG,
            shouldReply: true,
            postCaption: "Lesson 1",
            parentCommentText: "Which book is this?",
            conversation: []
        };

        const userMessage = ReplyPromptHelper.buildUserMessage(context);

        expect(userMessage).toContain("<post_caption>\nLesson 1\n</post_caption>");
        expect(userMessage).toContain("<replying_to_comment>\nWhich book is this?\n</replying_to_comment>");
        expect(userMessage).toContain('<comment from="reader">\nSo true\n</comment>');
    });

    test("a direct message includes the earlier messages, oldest first", () => {
        const context: ReplyContext = {
            request: {
                channel: "message",
                eventId: "message:1",
                senderId: "user-1",
                text: "Thanks",
                receivedAt: "2026-10-27T10:00:00.000Z"
            },
            config: DEFAULT_AUTO_REPLY_CONFIG,
            shouldReply: true,
            conversation: [
                { isFromAccount: false, text: "Hi", sentAt: "2026-10-27T09:00:00.000Z" },
                { isFromAccount: true, text: "Hello", sentAt: "2026-10-27T09:01:00.000Z" }
            ]
        };

        expect(ReplyPromptHelper.buildUserMessage(context)).toContain(
            '<earlier_messages oldest_first="true">\nuser: Hi\naccount: Hello\n</earlier_messages>'
        );
    });

    test("parses a valid answer and rejects anything else", () => {
        const answer = JSON.stringify({ decision: "reply", replyText: "Keep going.", reason: "Positive" });

        expect(ReplyPromptHelper.parseGeneratedReply(answer, "claude-opus-5-5")).toEqual({
            decision: "reply",
            replyText: "Keep going.",
            reason: "Positive",
            model: "claude-opus-5-5"
        });
        expect(ReplyPromptHelper.parseGeneratedReply("not json", "model")).toBeUndefined();
        expect(
            ReplyPromptHelper.parseGeneratedReply(
                JSON.stringify({ decision: "post", replyText: "", reason: "" }),
                "model"
            )
        ).toBeUndefined();
    });
});
