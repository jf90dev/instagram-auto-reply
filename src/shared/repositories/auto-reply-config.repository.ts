import { inject, injectable } from "tsyringe";

import { MongoDbClient } from "../clients/mongodb.client";
import { DEFAULT_AUTO_REPLY_CONFIG } from "../constants/default-auto-reply-config.constant";
import { AUTO_REPLY_CONFIG_ID, CONFIG_COLLECTION } from "../constants/mongodb-collections.constant";
import { AutoReplyConfig } from "../models/auto-reply/auto-reply-config.model";
import { MongoDbError } from "../models/error-handling/mongodb-error.model";

type AutoReplyConfigDocument = Partial<AutoReplyConfig> & { _id: string };

@injectable()
export class AutoReplyConfigRepository {
    constructor(@inject("MongoDbClient") private mongoDbClient: MongoDbClient) {}

    /**
     * The `auto_reply` config document, with defaults for anything it leaves out.
     */
    async getConfig(): Promise<AutoReplyConfig> {
        const collection = await this.mongoDbClient.getCollection<AutoReplyConfigDocument>(CONFIG_COLLECTION);

        try {
            const document = await collection.findOne({ _id: AUTO_REPLY_CONFIG_ID });
            const { _id, ...storedConfig } = document ?? { _id: AUTO_REPLY_CONFIG_ID };

            return { ...DEFAULT_AUTO_REPLY_CONFIG, ...storedConfig };
        } catch (error) {
            throw new MongoDbError({
                name: "MONGODB_ERROR",
                message: `Failed to read ${CONFIG_COLLECTION} document ${AUTO_REPLY_CONFIG_ID}`,
                cause: error
            });
        }
    }
}
