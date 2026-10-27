import { ErrorBase } from "./error-base.model";

type ErrorName = "PARAMETER_STORE_ERROR";

export class ParameterStoreError extends ErrorBase<ErrorName> {}
