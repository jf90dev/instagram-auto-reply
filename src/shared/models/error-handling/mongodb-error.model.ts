import { ErrorBase } from "./error-base.model";

type ErrorName = "MONGODB_ERROR";

export class MongoDbError extends ErrorBase<ErrorName> {}
