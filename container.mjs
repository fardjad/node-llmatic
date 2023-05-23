import { createFastifyServer } from "./fastify-server-factory.mjs";
import awilix from "awilix";

/**
 * Use these tokens for registrations and resolutions to avoid the problems of
 * hardcoded strings.
 */
export const diTokens = {
  container: "container",
  llmConfig: "llmConfig",
  llmAdapter: "llmApatper",
  fastifyServer: "fastifyServer",
};

/**
 *
 * @param {{token: string, resolver: () => any}[]} registrations
 * @param {{token: string, resolver: () => any}[]} registrationOverrides
 * @returns {{token: string, resolver: () => any}[]}
 */
export const applyOverrides = (registrations, registrationOverrides) => {
  const registrationOverridesCopy = [...registrationOverrides];

  const result = [];

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
 *
 * @param {{token: string, resolver: () => any}[]} registerationOverrides
 * @returns {Promise<import("awilix").AwilixContainer>}
 */
export const createContainer = async (registerationOverrides = []) => {
  const container = awilix.createContainer({
    injectionMode: awilix.InjectionMode.PROXY,
  });

  const orderedRegistrations = [
    { token: diTokens.container, resolver: () => awilix.asValue(container) },
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
