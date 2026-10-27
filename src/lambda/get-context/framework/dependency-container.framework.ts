import "reflect-metadata";
import { container, Lifecycle } from "tsyringe";

import { InstagramGraphClient } from "../../../shared/clients/instagram-graph.client";
import { MongoDbClient } from "../../../shared/clients/mongodb.client";
import { ParameterStoreClient } from "../../../shared/clients/parameter-store.client";
import { AutoReplyConfigRepository } from "../../../shared/repositories/auto-reply-config.repository";
import { ReplyRepository } from "../../../shared/repositories/reply.repository";
import { LoggerService } from "../../../shared/services/logger.service";
import { ReplyContextService } from "../../../shared/services/reply-context.service";

container.register("LoggerService", { useClass: LoggerService }, { lifecycle: Lifecycle.Singleton });
container.register("ParameterStoreClient", { useClass: ParameterStoreClient }, { lifecycle: Lifecycle.Singleton });
container.register("MongoDbClient", { useClass: MongoDbClient }, { lifecycle: Lifecycle.Singleton });
container.register("InstagramGraphClient", { useClass: InstagramGraphClient });
container.register("AutoReplyConfigRepository", { useClass: AutoReplyConfigRepository });
container.register("ReplyRepository", { useClass: ReplyRepository });
container.register("ReplyContextService", { useClass: ReplyContextService });

export const DependencyContainer = container;
