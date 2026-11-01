import { createHmac } from "crypto";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const lambdaFunctionName = "Local-InstagramAutoReply-ReceiveWebhook";
// Placeholder values created by the localstack:setup task.
const appSecret = "local-app-secret";
const verifyToken = "local-verify-token";

describe("Receive Webhook Lambda Integration Tests", () => {
    const client = new LambdaClient({
        region: "eu-west-1",
        endpoint: "http://localhost:4566",
        disableHostPrefix: true,
        credentials: { accessKeyId: "test", secretAccessKey: "test" }
    });

    const invoke = async (event: object) => {
        const response = await client.send(
            new InvokeCommand({ FunctionName: lambdaFunctionName, Payload: JSON.stringify(event) })
        );
        return JSON.parse(Buffer.from(response.Payload!).toString());
    };

    const functionUrlEvent = (method: string, options: { body?: string; headers?: object; query?: object }) => ({
        version: "2.0",
        rawPath: "/",
        headers: options.headers ?? {},
        queryStringParameters: options.query,
        body: options.body,
        isBase64Encoded: false,
        requestContext: { requestId: `ReceiveWebhookTest-${Date.now()}`, http: { method: method } }
    });

    it("Answers Meta's subscription check with the challenge", async () => {
        const result = await invoke(
            functionUrlEvent("GET", {
                query: { "hub.mode": "subscribe", "hub.verify_token": verifyToken, "hub.challenge": "12345" }
            })
        );

        expect(result).toMatchObject({ statusCode: 200, body: "12345" });
    }, 30000);

    it("Rejects a subscription check with the wrong verify token", async () => {
        const result = await invoke(
            functionUrlEvent("GET", {
                query: { "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "12345" }
            })
        );

        expect(result.statusCode).toBe(403);
    }, 30000);

    it("Rejects a notification with a bad signature", async () => {
        const result = await invoke(
            functionUrlEvent("POST", {
                body: JSON.stringify({ object: "instagram", entry: [] }),
                headers: { "x-hub-signature-256": "sha256=0000" }
            })
        );

        expect(result.statusCode).toBe(401);
    }, 30000);

    it("Accepts a signed comment notification", async () => {
        const body = JSON.stringify({
            object: "instagram",
            entry: [
                {
                    id: "17840000000000000",
                    time: Math.floor(Date.now() / 1000),
                    changes: [
                        {
                            field: "comments",
                            value: {
                                id: `webhook-test-${Date.now()}`,
                                text: "This hit hard",
                                from: { id: "local-sender-2", username: "local_commenter" },
                                media: { id: "local-media-1" }
                            }
                        }
                    ]
                }
            ]
        });
        const signature = `sha256=${createHmac("sha256", appSecret).update(body).digest("hex")}`;

        const result = await invoke(functionUrlEvent("POST", { body, headers: { "x-hub-signature-256": signature } }));

        expect(result).toMatchObject({ statusCode: 200, body: "OK" });
    }, 30000);
});
