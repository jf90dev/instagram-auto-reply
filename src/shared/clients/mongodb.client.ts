import { Collection, Db, Document, MongoClient } from "mongodb";
import { inject, injectable } from "tsyringe";

import { ParameterStoreClient } from "./parameter-store.client";
import { MongoDbError } from "../models/error-handling/mongodb-error.model";

/**
 * The MongoDB connection. It is opened on first use and kept open for the lifetime of the Lambda
 * container, so warm invocations don't reconnect.
 */
@injectable()
export class MongoDbClient {
    private readonly uriParameterName = process.env.MONGODB_URI_PARAMETER_NAME!;
    private readonly databaseName = process.env.MONGODB_DATABASE_NAME!;
    private database?: Db;

    constructor(@inject("ParameterStoreClient") private parameterStoreClient: ParameterStoreClient) {}

    async getCollection<T extends Document>(collectionName: string): Promise<Collection<T>> {
        const database = await this.getDatabase();
        return database.collection<T>(collectionName);
    }

    private async getDatabase(): Promise<Db> {
        if (this.database) {
            return this.database;
        }

        try {
            const uri = await this.parameterStoreClient.getParameterValue(this.uriParameterName);
            const client = new MongoClient(uri, { maxPoolSize: 1, serverSelectionTimeoutMS: 5000 });
            await client.connect();
            this.database = client.db(this.databaseName);
            return this.database;
        } catch (error) {
            throw new MongoDbError({
                name: "MONGODB_ERROR",
                message: `Failed to connect to MongoDB database ${this.databaseName}`,
                cause: error
            });
        }
    }
}
