import "reflect-metadata";
import { container, Lifecycle } from "tsyringe";

import { ParameterStoreClient } from "../../../shared/clients/parameter-store.client";
import { StepFunctionsClient } from "../../../shared/clients/step-functions.client";
import { LoggerService } from "../../../shared/services/logger.service";
import { WebhookService } from "../../../shared/services/webhook.service";

container.register("LoggerService", { useClass: LoggerService }, { lifecycle: Lifecycle.Singleton });
container.register("ParameterStoreClient", { useClass: ParameterStoreClient }, { lifecycle: Lifecycle.Singleton });
container.register("StepFunctionsClient", { useClass: StepFunctionsClient });
container.register("WebhookService", { useClass: WebhookService });

export const DependencyContainer = container;
