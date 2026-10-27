import { ErrorBase } from "./error-base.model";

type ErrorName = "CLAUDE_ERROR";

export class ClaudeError extends ErrorBase<ErrorName> {}
