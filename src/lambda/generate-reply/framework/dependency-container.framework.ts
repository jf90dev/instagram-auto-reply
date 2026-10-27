import "reflect-metadata";
import { container, Lifecycle } from "tsyringe";

import { ClaudeClient } from "../../../shared/clients/claude.client";
import { ParameterStoreClient } from "../../../shared/clients/parameter-store.client";
import { LoggerService } from "../../../shared/services/logger.service";
import { ReplyGenerationService } from "../../../shared/services/reply-generation.service";

container.register("LoggerService", { useClass: LoggerService }, { lifecycle: Lifecycle.Singleton });
container.register("ParameterStoreClient", { useClass: ParameterStoreClient }, { lifecycle: Lifecycle.Singleton });
container.register("ClaudeClient", { useClass: ClaudeClient }, { lifecycle: Lifecycle.Singleton });
container.register("ReplyGenerationService", { useClass: ReplyGenerationService });

export const DependencyContainer = container;
