import { ErrorBase } from "./error-base.model";

type ErrorName = "INSTAGRAM_ERROR";

export class InstagramError extends ErrorBase<ErrorName> {}
