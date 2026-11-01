import { createHmac } from "crypto";

import { WebhookSignatureHelper } from "../../src/shared/helpers/webhook-signature.helper";

describe("WebhookSignatureHelper", () => {
    const appSecret = "test-app-secret";
    const body = JSON.stringify({ object: "instagram", entry: [] });
    const signatureFor = (text: string, secret: string) =>
        `sha256=${createHmac("sha256", secret).update(text, "utf8").digest("hex")}`;

    test("accepts a body signed with the app secret", () => {
        expect(WebhookSignatureHelper.isValidSignature(body, signatureFor(body, appSecret), appSecret)).toBe(true);
    });

    test("rejects a body signed with another secret", () => {
        expect(WebhookSignatureHelper.isValidSignature(body, signatureFor(body, "other"), appSecret)).toBe(false);
    });

    test("rejects a body changed after signing", () => {
        const signature = signatureFor(body, appSecret);
        expect(WebhookSignatureHelper.isValidSignature(`${body} `, signature, appSecret)).toBe(false);
    });

    test("rejects a missing or malformed header", () => {
        expect(WebhookSignatureHelper.isValidSignature(body, undefined, appSecret)).toBe(false);
        expect(WebhookSignatureHelper.isValidSignature(body, "sha1=abc", appSecret)).toBe(false);
        expect(WebhookSignatureHelper.isValidSignature(body, "sha256=abc", appSecret)).toBe(false);
    });
});
