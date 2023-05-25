import { createFastifyServer } from "./fastify-server-factory.ts";
import type { LlmAdapter } from "./llm-adapter.ts";
import { SseHelper } from "./sse-helper.ts";
import awilix from "awilix";

export type Cradle = {
  container: awilix.AwilixContainer;
  llmConfig: unknown;
  llmAdapter: LlmAdapter;
  sseHelper: SseHelper;
  fastifyServer: Awaited<ReturnType<typeof createFastifyServer>>;
};

/**
 * Use these tokens for registrations and resolutions to avoid the problems of
 * hardcoded strings.
 */
export const diTokens: { [k in keyof Cradle]: k } = {
  container: "container",
  llmConfig: "llmConfig",
  llmAdapter: "llmAdapter",
  sseHelper: "sseHelper",
  fastifyServer: "fastifyServer",
};

export type ContainerRegistration = {
  token: keyof Cradle;
  resolver: () => Promise<awilix.Resolver<unknown>> | awilix.Resolver<unknown>;
};

export const applyOverrides = (
  registrations: ContainerRegistration[],
  registrationOverrides: ContainerRegistration[]
) => {
  const registrationOverridesCopy = [...registrationOverrides];

  const result: ContainerRegistration[] = [];

  for (const { token, resolver } of registrations) {
    const overrideIndex = registrationOverridesCopy.findIndex(
      (override) => override.token === token
    );
    if (overrideIndex === -1) {
      result.push({ token, resolver });
    } else {
      const override = registrationOverridesCopy.splice(overrideIndex, 1)[0];
      result.push({ token, resolver: override.resolver });
    }
  }

  for (const override of registrationOverridesCopy) {
    result.push(override);
  }

  return result;
};

/**
 * Create and configure the Awilix container. Async resolvers and overrides
 * are supported (can be useful for testing).
 */
export const createContainer = async (
  registerationOverrides: ContainerRegistration[] = []
) => {
  const container = awilix.createContainer<Cradle>({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  const orderedRegistrations: ContainerRegistration[] = [
    {
      token: diTokens.container,
      resolver: () => awilix.asValue(container),
    },
    {
      token: diTokens.sseHelper,
      resolver: () =>
        awilix.asClass(SseHelper, { lifetime: awilix.Lifetime.SINGLETON }),
    },
    {
      token: diTokens.llmConfig,
      resolver() {
        throw new Error("llmConfig must be overridden");
      },
    },
    {
      token: diTokens.llmAdapter,
      resolver() {
        throw new Error("llmAdapter must be overridden");
      },
    },
    {
      token: diTokens.fastifyServer,
      resolver: async () =>
        awilix.asValue(await createFastifyServer(container.cradle)),
    },
  ];

  const newRegistrations = applyOverrides(
    orderedRegistrations,
    registerationOverrides
  );

  for (const { token, resolver } of newRegistrations) {
    // eslint-disable-next-line no-await-in-loop
    container.register({ [token]: await Promise.resolve(resolver()) });
  }

  return container;
};
