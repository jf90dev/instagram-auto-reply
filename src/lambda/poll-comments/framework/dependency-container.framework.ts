import "reflect-metadata";
import { container, Lifecycle } from "tsyringe";

import { InstagramGraphClient } from "../../../shared/clients/instagram-graph.client";
import { MongoDbClient } from "../../../shared/clients/mongodb.client";
import { ParameterStoreClient } from "../../../shared/clients/parameter-store.client";
import { StepFunctionsClient } from "../../../shared/clients/step-functions.client";
import { ReceivedCommentRepository } from "../../../shared/repositories/received-comment.repository";
import { CommentPollingService } from "../../../shared/services/comment-polling.service";
import { LoggerService } from "../../../shared/services/logger.service";

container.register("LoggerService", { useClass: LoggerService }, { lifecycle: Lifecycle.Singleton });
container.register("ParameterStoreClient", { useClass: ParameterStoreClient }, { lifecycle: Lifecycle.Singleton });
container.register("MongoDbClient", { useClass: MongoDbClient }, { lifecycle: Lifecycle.Singleton });
container.register("InstagramGraphClient", { useClass: InstagramGraphClient });
container.register("StepFunctionsClient", { useClass: StepFunctionsClient });
container.register("ReceivedCommentRepository", { useClass: ReceivedCommentRepository });
container.register("CommentPollingService", { useClass: CommentPollingService });

export const DependencyContainer = container;
