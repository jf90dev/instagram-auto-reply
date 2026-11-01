import { createHash } from "crypto";

import { ReplyRequest } from "../models/auto-reply/reply-request.model";

export class ExecutionNameHelper {
    /**
     * A Step Functions execution name (at most 80 characters of [A-Za-z0-9-_]) that is the same
     * every time the same comment or message is passed on, whether by the webhook or the poller,
     * so Step Functions refuses a second execution for it.
     */
    static forReplyRequest(request: ReplyRequest): string {
        const eventHash = createHash("sha256").update(request.eventId).digest("hex").slice(0, 40);
        return `${request.channel}-${eventHash}`;
    }
}
