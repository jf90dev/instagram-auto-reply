import { DescribeExecutionCommand, SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { MongoClient } from "mongodb";

import { ReplyRecord } from "../../src/shared/models/auto-reply/reply-record.model";
import { ReplyRequest } from "../../src/shared/models/auto-reply/reply-request.model";

const stateMachineArn = "arn:aws:states:eu-west-1:000000000000:stateMachine:Local-InstagramAutoReply-StateMachine";

describe("Instagram Auto Reply Step Function Integration Tests", () => {
    const sfnClient = new SFNClient({
        region: "eu-west-1",
        endpoint: "http://localhost:4566",
        disableHostPrefix: true,
        credentials: { accessKeyId: "test", secretAccessKey: "test" }
    });
    const mongoClient = new MongoClient("mongodb://localhost:27017");
    const database = mongoClient.db("themanualformen");

    const setMode = async (mode: "auto" | "review") => {
        await database
            .collection<{ _id: string; mode: string }>("config")
            .updateOne({ _id: "auto_reply" }, { $set: { mode: mode } }, { upsert: true });
    };

    const runExecution = async (request: ReplyRequest): Promise<string> => {
        const startOutput = await sfnClient.send(
            new StartExecutionCommand({
                stateMachineArn: stateMachineArn,
                name: `StepFunctionsTest-${Date.now()}`,
                input: JSON.stringify(request)
            })
        );

        let status = "RUNNING";
        while (status === "RUNNING") {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const execution = await sfnClient.send(
                new DescribeExecutionCommand({ executionArn: startOutput.executionArn })
            );
            status = execution.status ?? "";
        }
        return status;
    };

    const commentRequest = (): ReplyRequest => {
        const commentId = `step-functions-test-${Date.now()}`;
        return {
            channel: "comment",
            eventId: `comment:${commentId}`,
            // A new sender each run, so reruns don't reach the per-person daily reply limit.
            senderId: `local-sender-${commentId}`,
            senderUsername: "local_commenter",
            text: "This hit hard",
            receivedAt: new Date().toISOString(),
            commentId: commentId,
            mediaId: "local-media-1"
        };
    };

    afterAll(async () => {
        await mongoClient.close();
    });

    it("Stores Claude's reply as a draft in review mode", async () => {
        await setMode("review");
        const request = commentRequest();

        expect(await runExecution(request)).toBe("SUCCEEDED");

        const record = await database.collection<ReplyRecord>("replies").findOne({ eventId: request.eventId });
        expect(record).toMatchObject({ status: "draft", replyText: expect.any(String) });
        expect(record?.sentReplyId).toBeUndefined();
    }, 60000);

    it("Sends Claude's reply in auto mode", async () => {
        await setMode("auto");
        const request = commentRequest();

        expect(await runExecution(request)).toBe("SUCCEEDED");

        const record = await database.collection<ReplyRecord>("replies").findOne({ eventId: request.eventId });
        expect(record).toMatchObject({ status: "sent", sentReplyId: "local-comment-reply-1" });
    }, 60000);
});
