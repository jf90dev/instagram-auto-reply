import { createHmac, timingSafeEqual } from "crypto";

export class WebhookSignatureHelper {
    /**
     * Meta signs every webhook body with the app secret and sends it as
     * `X-Hub-Signature-256: sha256=<hex HMAC-SHA256>`.
     */
    static isValidSignature(rawBody: string, signatureHeader: string | undefined, appSecret: string): boolean {
        const signaturePrefix = "sha256=";

        if (!signatureHeader || !signatureHeader.startsWith(signaturePrefix)) {
            return false;
        }

        const receivedSignature = Buffer.from(signatureHeader.slice(signaturePrefix.length), "hex");
        const expectedSignature = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();

        if (receivedSignature.length !== expectedSignature.length) {
            return false;
        }

        return timingSafeEqual(receivedSignature, expectedSignature);
    }
}
