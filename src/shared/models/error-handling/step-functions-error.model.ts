import { ErrorBase } from "./error-base.model";

type ErrorName = "STEP_FUNCTIONS_ERROR";

export class StepFunctionsError extends ErrorBase<ErrorName> {}
