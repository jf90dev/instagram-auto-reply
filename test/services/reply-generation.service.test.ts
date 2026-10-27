import "reflect-metadata";

import { ClaudeClient } from "../../src/shared/clients/claude.client";
import { DEFAULT_AUTO_REPLY_CONFIG } from "../../src/shared/constants/default-auto-reply-config.constant";
import { ReplyContext } from "../../src/shared/models/auto-reply/reply-context.model";
import { ClaudeStructuredResponse } from "../../src/shared/models/claude/claude-structured-response.model";
import { LoggerService } from "../../src/shared/services/logger.service";
import { ReplyGenerationService } from "../../src/shared/services/reply-generation.service";

const context: ReplyContext = {
    request: {
        channel: "comment",
        eventId: "comment:1",
        senderId: "user-1",
        text: "Great post",
        receivedAt: "2026-10-27T10:00:00.000Z",
        commentId: "1"
    },
    config: DEFAULT_AUTO_REPLY_CONFIG,
    shouldReply: true,
    conversation: []
};

const serviceAnswering = (response: ClaudeStructuredResponse) => {
    const claudeClient = { createStructuredMessage: jest.fn().mockResolvedValue(response) };
    return new ReplyGenerationService(new LoggerService(), claudeClient as unknown as ClaudeClient);
};

const answer = (decision: string, replyText: string) =>
    JSON.stringify({ decision: decision, replyText: replyText, reason: "test reason" });

describe("ReplyGenerationService", () => {
    test("keeps a reply that passes the rules", async () => {
        const service = serviceAnswering({ stopReason: "end_turn", text: answer("reply", "Keep going."), model: "m" });

        const result = await service.generateReply(context);

        expect(result.generatedReply).toEqual({
            decision: "reply",
            replyText: "Keep going.",
            reason: "test reason",
            model: "m"
        });
    });

    test("escalates a reply with a link that is not allowed", async () => {
        const service = serviceAnswering({
            stopReason: "end_turn",
            text: answer("reply", "Buy it at https://example.com"),
            model: "m"
        });

        const result = await service.generateReply(context);

        expect(result.generatedReply?.decision).toBe("escalate");
        expect(result.generatedReply?.reason).toContain("https://example.com");
    });

    test("escalates when Claude declines", async () => {
        const service = serviceAnswering({ stopReason: "refusal", model: "m" });

        const result = await service.generateReply(context);

        expect(result.generatedReply?.decision).toBe("escalate");
    });

    test("fails when the answer doesn't match the schema, so the step can retry", async () => {
        const service = serviceAnswering({ stopReason: "max_tokens", text: '{"decision":', model: "m" });

        await expect(service.generateReply(context)).rejects.toMatchObject({ name: "CLAUDE_ERROR" });
    });
});
