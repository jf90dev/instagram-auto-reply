import "reflect-metadata";
import { container, Lifecycle } from "tsyringe";

import { MongoDbClient } from "../../../shared/clients/mongodb.client";
import { ParameterStoreClient } from "../../../shared/clients/parameter-store.client";
import { StepFunctionsClient } from "../../../shared/clients/step-functions.client";
import { ReceivedCommentRepository } from "../../../shared/repositories/received-comment.repository";
import { LoggerService } from "../../../shared/services/logger.service";
import { WebhookService } from "../../../shared/services/webhook.service";

container.register("LoggerService", { useClass: LoggerService }, { lifecycle: Lifecycle.Singleton });
container.register("ParameterStoreClient", { useClass: ParameterStoreClient }, { lifecycle: Lifecycle.Singleton });
container.register("MongoDbClient", { useClass: MongoDbClient }, { lifecycle: Lifecycle.Singleton });
container.register("StepFunctionsClient", { useClass: StepFunctionsClient });
container.register("ReceivedCommentRepository", { useClass: ReceivedCommentRepository });
container.register("WebhookService", { useClass: WebhookService });

export const DependencyContainer = container;
