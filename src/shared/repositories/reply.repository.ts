import { inject, injectable } from "tsyringe";

import { MongoDbClient } from "../clients/mongodb.client";
import { REPLIES_COLLECTION } from "../constants/mongodb-collections.constant";
import { ReplyRecord } from "../models/auto-reply/reply-record.model";
import { MongoDbError } from "../models/error-handling/mongodb-error.model";

@injectable()
export class ReplyRepository {
    constructor(@inject("MongoDbClient") private mongoDbClient: MongoDbClient) {}

    /**
     * Inserts the record, or replaces the one already stored for the same event.
     */
    async saveReply(record: ReplyRecord): Promise<void> {
        const collection = await this.mongoDbClient.getCollection<ReplyRecord>(REPLIES_COLLECTION);

        try {
            await collection.replaceOne({ eventId: record.eventId }, record, { upsert: true });
        } catch (error) {
            throw new MongoDbError({
                name: "MONGODB_ERROR",
                message: `Failed to save ${REPLIES_COLLECTION} record for event ${record.eventId}`,
                cause: error
            });
        }
    }

    async countRepliesSentToSenderSince(senderId: string, since: Date): Promise<number> {
        const collection = await this.mongoDbClient.getCollection<ReplyRecord>(REPLIES_COLLECTION);

        try {
            return await collection.countDocuments({ senderId: senderId, status: "sent", recordedAt: { $gte: since } });
        } catch (error) {
            throw new MongoDbError({
                name: "MONGODB_ERROR",
                message: `Failed to count ${REPLIES_COLLECTION} sent to ${senderId} since ${since.toISOString()}`,
                cause: error
            });
        }
    }
}
