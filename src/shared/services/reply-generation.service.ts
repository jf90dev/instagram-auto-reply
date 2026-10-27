import { inject, injectable } from "tsyringe";

import { LoggerService } from "./logger.service";
import { ClaudeClient } from "../clients/claude.client";
import { ReplyPolicyHelper } from "../helpers/reply-policy.helper";
import { ReplyPromptHelper } from "../helpers/reply-prompt.helper";
import { GeneratedReply } from "../models/auto-reply/generated-reply.model";
import { ReplyContext } from "../models/auto-reply/reply-context.model";
import { ClaudeError } from "../models/error-handling/claude-error.model";

@injectable()
export class ReplyGenerationService {
    constructor(
        @inject("LoggerService") private logger: LoggerService,
        @inject("ClaudeClient") private claudeClient: ClaudeClient
    ) {}

    /**
     * Asks Claude whether and how to reply. A refusal, or a reply that breaks the hard rules,
     * becomes an escalation so a person looks at it instead.
     */
    async generateReply(context: ReplyContext): Promise<ReplyContext> {
        try {
            const response = await this.claudeClient.createStructuredMessage(
                ReplyPromptHelper.buildSystemPrompt(context.config),
                ReplyPromptHelper.buildUserMessage(context),
                ReplyPromptHelper.replySchema
            );

            if (response.stopReason === "refusal") {
                return { ...context, generatedReply: this.escalation("Claude declined to answer", response.model) };
            }

            const generatedReply = response.text
                ? ReplyPromptHelper.parseGeneratedReply(response.text, response.model)
                : undefined;

            if (!generatedReply) {
                throw new ClaudeError({
                    name: "CLAUDE_ERROR",
                    message: `Claude's answer for ${context.request.eventId} did not match the reply schema (stop reason ${response.stopReason})`
                });
            }

            this.logger.info(
                `Claude decided to ${generatedReply.decision} ${context.request.eventId}: ${generatedReply.reason}`
            );

            return { ...context, generatedReply: this.applyReplyRules(generatedReply, context) };
        } catch (error) {
            this.logger.errorMessage(`Failed to generate a reply for ${context.request.eventId}: ${error}`);
            throw error;
        }
    }

    private applyReplyRules(generatedReply: GeneratedReply, context: ReplyContext): GeneratedReply {
        if (generatedReply.decision !== "reply") {
            return generatedReply;
        }

        const replyProblem = ReplyPolicyHelper.findReplyProblem(
            generatedReply.replyText,
            context.request.channel,
            context.config.allowedLinks
        );

        if (!replyProblem) {
            return generatedReply;
        }

        this.logger.warn(`Escalating ${context.request.eventId}: ${replyProblem}`);
        return { ...generatedReply, decision: "escalate", reason: replyProblem };
    }

    private escalation(reason: string, model: string): GeneratedReply {
        return { decision: "escalate", replyText: "", reason: reason, model: model };
    }
}
