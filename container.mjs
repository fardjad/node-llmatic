import awilix from "awilix";
import { openapiConfig } from "./config/openapi.config.mjs";
import { createOpenapiGlueConfig } from "./server/openapi-glue-config-factory.mjs";
import { createFastifyServer } from "./server/fastify-server-factory.mjs";
import { modelConfig } from "./config/model.config.mjs";
import { ModelService } from "./services/model.service.mjs";
import { llmConfig } from "./config/llm.config.mjs";
import { LLMService } from "./services/llm.service.mjs";

export const diTokens = {
  container: "container",

  openapiConfig: "openapiConfig",
  modelConfig: "modelConfig",
  llmConfig: "llmConfig",

  modelService: "modelService",
  llmService: "llmService",

  openapiGlueConfig: "openapiGlueConfig",
  fastifyServer: "fastifyServer",
};

/**
 * Create and configure the Awilix container.
 *
 * @param {import("awilix").NameAndRegistrationPair<any>} registerOverrides
 * @returns {Promise<import("awilix").AwilixContainer>}
 */
export const createContainer = async (registerOverrides) => {
  const container = awilix.createContainer({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  container.register({
    [diTokens.container]: awilix.asValue(container),

    [diTokens.openapiConfig]: awilix.asValue(openapiConfig),
    [diTokens.modelConfig]: awilix.asValue(modelConfig),
    [diTokens.llmConfig]: awilix.asValue(llmConfig),

    [diTokens.modelService]: awilix.asClass(ModelService, {
      lifetime: awilix.Lifetime.SINGLETON,
    }),
    [diTokens.llmService]: awilix.asClass(LLMService, {
      lifetime: awilix.Lifetime.SINGLETON,
    }),

    ...registerOverrides,
  });

  container.register({
    [diTokens.openapiGlueConfig]: awilix.asValue(
      await createOpenapiGlueConfig(container.cradle)
    ),
  });
  container.register({
    [diTokens.fastifyServer]: awilix.asValue(
      await createFastifyServer(container.cradle)
    ),
  });

  return container;
};
