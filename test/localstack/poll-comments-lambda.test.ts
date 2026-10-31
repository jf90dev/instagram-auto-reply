import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { MongoClient } from "mongodb";

import { CommentPollResult } from "../../src/shared/models/auto-reply/comment-poll-result.model";

const lambdaFunctionName = "Local-InstagramAutoReply-PollComments";
// The Mockoon stub returns one comment from another user and one reply from the account itself.
const stubCommentId = "local-poll-comment-1";

describe("Poll Comments Lambda Integration Tests", () => {
    const client = new LambdaClient({
        region: "eu-west-1",
        endpoint: "http://localhost:4566",
        disableHostPrefix: true,
        credentials: { accessKeyId: "test", secretAccessKey: "test" }
    });
    const mongoClient = new MongoClient("mongodb://localhost:27017");
    const receivedComments = mongoClient.db("themanualformen").collection<{ _id: string }>("received_comments");

    const poll = async (): Promise<CommentPollResult> => {
        const response = await client.send(
            new InvokeCommand({
                FunctionName: lambdaFunctionName,
                Payload: JSON.stringify({ id: `PollCommentsTest-${Date.now()}` })
            })
        );
        return JSON.parse(Buffer.from(response.Payload!).toString());
    };

    afterAll(async () => {
        await mongoClient.close();
    });

    it("Passes on a new comment once, and skips it on the next run", async () => {
        await receivedComments.deleteOne({ _id: stubCommentId });

        expect(await poll()).toEqual({ postsChecked: 1, recentComments: 1, newComments: 1 });
        expect(await receivedComments.findOne({ _id: stubCommentId })).not.toBeNull();

        expect(await poll()).toEqual({ postsChecked: 1, recentComments: 1, newComments: 0 });
    }, 60000);
});
