import "reflect-metadata";
import { container, Lifecycle } from "tsyringe";

import { InstagramGraphClient } from "../../../shared/clients/instagram-graph.client";
import { ParameterStoreClient } from "../../../shared/clients/parameter-store.client";
import { LoggerService } from "../../../shared/services/logger.service";
import { ReplySendingService } from "../../../shared/services/reply-sending.service";

container.register("LoggerService", { useClass: LoggerService }, { lifecycle: Lifecycle.Singleton });
container.register("ParameterStoreClient", { useClass: ParameterStoreClient }, { lifecycle: Lifecycle.Singleton });
container.register("InstagramGraphClient", { useClass: InstagramGraphClient });
container.register("ReplySendingService", { useClass: ReplySendingService });

export const DependencyContainer = container;
