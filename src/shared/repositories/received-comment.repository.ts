import { inject, injectable } from "tsyringe";

import { MongoDbClient } from "../clients/mongodb.client";
import { RECEIVED_COMMENTS_COLLECTION } from "../constants/mongodb-collections.constant";
import { MongoDbError } from "../models/error-handling/mongodb-error.model";

type ReceivedCommentDocument = { _id: string; receivedAt: Date };

/**
 * The ids of every comment the poller has already passed on, so each comment gets one reply.
 */
@injectable()
export class ReceivedCommentRepository {
    constructor(@inject("MongoDbClient") private mongoDbClient: MongoDbClient) {}

    /**
     * The ids from `commentIds` that have not been received before.
     */
    async findNewCommentIds(commentIds: string[]): Promise<string[]> {
        if (commentIds.length === 0) {
            return [];
        }

        const collection =
            await this.mongoDbClient.getCollection<ReceivedCommentDocument>(RECEIVED_COMMENTS_COLLECTION);

        try {
            const receivedComments = await collection
                .find({ _id: { $in: commentIds } }, { projection: { _id: 1 } })
                .toArray();
            const receivedCommentIds = new Set(receivedComments.map(comment => comment._id));

            return commentIds.filter(commentId => !receivedCommentIds.has(commentId));
        } catch (error) {
            throw new MongoDbError({
                name: "MONGODB_ERROR",
                message: `Failed to look up ${commentIds.length} ids in ${RECEIVED_COMMENTS_COLLECTION}`,
                cause: error
            });
        }
    }

    async markAsReceived(commentId: string): Promise<void> {
        const collection =
            await this.mongoDbClient.getCollection<ReceivedCommentDocument>(RECEIVED_COMMENTS_COLLECTION);

        try {
            await collection.updateOne(
                { _id: commentId },
                { $setOnInsert: { receivedAt: new Date() } },
                { upsert: true }
            );
        } catch (error) {
            throw new MongoDbError({
                name: "MONGODB_ERROR",
                message: `Failed to mark comment ${commentId} as received in ${RECEIVED_COMMENTS_COLLECTION}`,
                cause: error
            });
        }
    }
}
