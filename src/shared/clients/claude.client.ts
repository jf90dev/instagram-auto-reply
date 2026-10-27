import Anthropic from "@anthropic-ai/sdk";
import { inject, injectable } from "tsyringe";

import { ParameterStoreClient } from "./parameter-store.client";
import { ClaudeStructuredResponse } from "../models/claude/claude-structured-response.model";
import { ClaudeError } from "../models/error-handling/claude-error.model";

/**
 * The Claude API. The API key is read from Parameter Store on first use.
 */
@injectable()
export class ClaudeClient {
    private readonly model = process.env.CLAUDE_MODEL!;
    private readonly apiKeyParameterName = process.env.ANTHROPIC_API_KEY_PARAMETER_NAME!;
    // Only set locally, where Mockoon stands in for the Claude API.
    private readonly baseUrl = process.env.ANTHROPIC_BASE_URL;
    private client?: Anthropic;

    constructor(@inject("ParameterStoreClient") private parameterStoreClient: ParameterStoreClient) {}

    /**
     * Sends one message and asks for a JSON answer matching `schema`. The system prompt is cached,
     * so it should not change from request to request. If the model declines for policy reasons,
     * the API retries on its default fallback model.
     */
    async createStructuredMessage(
        systemPrompt: string,
        userMessage: string,
        schema: { [key: string]: unknown }
    ): Promise<ClaudeStructuredResponse> {
        const client = await this.getClient();

        try {
            const response = await client.beta.messages.create({
                model: this.model,
                max_tokens: 16000,
                betas: ["server-side-fallback-2026-07-01"],
                fallbacks: "default",
                output_config: {
                    effort: "medium",
                    format: { type: "json_schema", schema: schema }
                },
                system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
                messages: [{ role: "user", content: userMessage }]
            });

            const textBlock = response.content.find(block => block.type === "text");

            return {
                stopReason: response.stop_reason,
                text: textBlock?.type === "text" ? textBlock.text : undefined,
                model: response.model
            };
        } catch (error) {
            throw new ClaudeError({
                name: "CLAUDE_ERROR",
                message: `Claude request to ${this.model} failed`,
                cause: error
            });
        }
    }

    private async getClient(): Promise<Anthropic> {
        if (!this.client) {
            const apiKey = await this.parameterStoreClient.getParameterValue(this.apiKeyParameterName);
            this.client = new Anthropic({ apiKey: apiKey, baseURL: this.baseUrl });
        }
        return this.client;
    }
}
