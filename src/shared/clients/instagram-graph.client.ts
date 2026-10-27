import { inject, injectable } from "tsyringe";

import { ParameterStoreClient } from "./parameter-store.client";
import { InstagramError } from "../models/error-handling/instagram-error.model";
import { InstagramComment } from "../models/instagram/instagram-comment.model";
import { InstagramMedia } from "../models/instagram/instagram-media.model";
import {
    InstagramConversation,
    InstagramConversationList,
    InstagramMessage
} from "../models/instagram/instagram-message.model";
import { InstagramSentReply } from "../models/instagram/instagram-sent-reply.model";

/**
 * The Instagram API with Instagram Login (graph.instagram.com) for the account the access token
 * belongs to.
 */
@injectable()
export class InstagramGraphClient {
    private readonly graphApiUrl = process.env.INSTAGRAM_GRAPH_API_URL!;
    private readonly accessTokenParameterName = process.env.INSTAGRAM_ACCESS_TOKEN_PARAMETER_NAME!;
    private readonly userIdParameterName = process.env.INSTAGRAM_USER_ID_PARAMETER_NAME!;

    constructor(@inject("ParameterStoreClient") private parameterStoreClient: ParameterStoreClient) {}

    async getAccountUserId(): Promise<string> {
        return this.parameterStoreClient.getParameterValue(this.userIdParameterName);
    }

    async getComment(commentId: string): Promise<InstagramComment> {
        return this.request<InstagramComment>("GET", commentId, { fields: "id,text,timestamp,from,parent_id" });
    }

    async getMedia(mediaId: string): Promise<InstagramMedia> {
        return this.request<InstagramMedia>("GET", mediaId, { fields: "id,caption,permalink" });
    }

    /**
     * The latest messages of the conversation with one Instagram user, newest first.
     */
    async getRecentConversationMessages(instagramUserId: string, messageLimit: number): Promise<InstagramMessage[]> {
        const conversations = await this.request<InstagramConversationList>("GET", "me/conversations", {
            platform: "instagram",
            user_id: instagramUserId
        });

        if (conversations.data.length === 0) {
            return [];
        }

        const conversation = await this.request<InstagramConversation>("GET", conversations.data[0].id, {
            fields: `messages.limit(${messageLimit}){id,message,created_time,from}`
        });

        return conversation.messages?.data ?? [];
    }

    async replyToComment(commentId: string, text: string): Promise<InstagramSentReply> {
        return this.request<InstagramSentReply>("POST", `${commentId}/replies`, undefined, { message: text });
    }

    async sendDirectMessage(recipientId: string, text: string): Promise<InstagramSentReply> {
        const accountUserId = await this.getAccountUserId();

        return this.request<InstagramSentReply>("POST", `${accountUserId}/messages`, undefined, {
            recipient: { id: recipientId },
            message: { text: text }
        });
    }

    private async request<T>(
        method: "GET" | "POST",
        path: string,
        query?: { [name: string]: string },
        body?: unknown
    ): Promise<T> {
        const url = `${this.graphApiUrl}/${path}${query ? `?${new URLSearchParams(query).toString()}` : ""}`;
        const accessToken = await this.parameterStoreClient.getParameterValue(this.accessTokenParameterName);

        let response: Response;
        try {
            response = await fetch(url, {
                method: method,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    ...(body ? { "Content-Type": "application/json" } : {})
                },
                body: body ? JSON.stringify(body) : undefined
            });
        } catch (error) {
            throw new InstagramError({
                name: "INSTAGRAM_ERROR",
                message: `Instagram request ${method} /${path} failed to connect`,
                cause: error
            });
        }

        const responseText = await response.text();

        if (!response.ok) {
            throw new InstagramError({
                name: "INSTAGRAM_ERROR",
                message: `Instagram request ${method} /${path} returned ${response.status}: ${responseText}`
            });
        }

        return JSON.parse(responseText) as T;
    }
}
