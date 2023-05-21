import assert from "node:assert";
import { glob } from "glob";
import { diTokens } from "../container.mjs";

export const validateHandler = (handler, file) => {
  assert.strictEqual(
    typeof handler.handle,
    "function",
    `Missing "handle" method in ${file}`
  );

  assert.strictEqual(
    typeof handler.constructor.operationId,
    "string",
    `Missing "operationId" static property in ${file}`
  );
};

const createOpenapiGlueService = async ({ openapiConfig, container }) => {
  const routeHandlerFiles = await glob("**/*.handler.mjs", {
    cwd: openapiConfig.handlersDirectory,
    absolute: true,
  });

  const handlers = await Promise.all(
    routeHandlerFiles.map(async (file) => {
      const { default: handlerConstructor } = await import(file);
      const handler = container.build(handlerConstructor);
      validateHandler(handler, file);
      return handler;
    })
  );

  return Object.fromEntries(
    handlers.map((handler) => {
      const { operationId } = handler.constructor;
      return [operationId, handler.handle.bind(handler)];
    })
  );
};

export const createOpenapiGlueConfig = async ({
  [diTokens.openapiConfig]: openapiConfig,
  [diTokens.container]: container,
}) => {
  const service = await createOpenapiGlueService({
    openapiConfig,
    container,
  });

  return {
    specification: openapiConfig.oasDocument,
    service,
    securityHandlers: {},
  };
};
