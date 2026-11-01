import { ErrorBase } from "./error-base.model";

type ErrorName = "WEBHOOK_ERROR";

export class WebhookError extends ErrorBase<ErrorName> {}
