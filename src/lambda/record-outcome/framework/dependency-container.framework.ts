import "reflect-metadata";
import { container, Lifecycle } from "tsyringe";

import { MongoDbClient } from "../../../shared/clients/mongodb.client";
import { ParameterStoreClient } from "../../../shared/clients/parameter-store.client";
import { ReplyRepository } from "../../../shared/repositories/reply.repository";
import { LoggerService } from "../../../shared/services/logger.service";
import { ReplyOutcomeService } from "../../../shared/services/reply-outcome.service";

container.register("LoggerService", { useClass: LoggerService }, { lifecycle: Lifecycle.Singleton });
container.register("ParameterStoreClient", { useClass: ParameterStoreClient }, { lifecycle: Lifecycle.Singleton });
container.register("MongoDbClient", { useClass: MongoDbClient }, { lifecycle: Lifecycle.Singleton });
container.register("ReplyRepository", { useClass: ReplyRepository });
container.register("ReplyOutcomeService", { useClass: ReplyOutcomeService });

export const DependencyContainer = container;
