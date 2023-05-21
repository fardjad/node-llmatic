import { fileURLToPath } from "node:url";
import assert from "node:assert";
import { FastifySSEPlugin } from "fastify-sse-v2";
import { glob } from "glob";
import Ajv from "ajv";
import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import openapiGlue from "fastify-openapi-glue";
import swaggerUiDist from "swagger-ui-dist";
import traverse from "traverse";
import yaml from "js-yaml";
import { diTokens } from "./container.mjs";

const validateRouteHandler = (handler, file) => {
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

const createOpenapiGlueService = async ({ serverConfig, container }) => {
  const routeHandlerFiles = await glob("**/*.handler.mjs", {
    cwd: serverConfig.handlersDirectory,
    absolute: true,
  });

  const handlers = await Promise.all(
    routeHandlerFiles.map(async (file) => {
      const { default: handlerConstructor } = await import(file);
      const handler = container.build(handlerConstructor);
      validateRouteHandler(handler, file);
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

const configureOpenapiGlue = async ({
  container,
  fastifyServer,
  serverConfig,
}) => {
  const schemaCompilers = {
    body: new Ajv(),
    params: new Ajv(),
    querystring: new Ajv(),
    headers: new Ajv(),
  };

  fastifyServer.setValidatorCompiler((request) => {
    if (!request.httpPart) {
      throw new Error("Missing httpPart");
    }

    const compiler = schemaCompilers[request.httpPart];
    if (!compiler) {
      throw new Error(`Missing compiler for ${request.httpPart}`);
    }

    // OpenAI OAS is not entirely valid/compatible, so we need to remove some properties
    // eslint-disable-next-line unicorn/no-array-for-each
    traverse(request.schema).forEach(function (value) {
      if (this.isLeaf && ["nullable", "x-oaiTypeLabel"].includes(this.key)) {
        this.remove();
      }

      if (this.key === "example") {
        this.remove();
      }

      if (this.isLeaf && this.key === "format" && value === "binary") {
        this.remove();
      }
    });

    return compiler.compile(request.schema);
  });

  const service = await createOpenapiGlueService({ serverConfig, container });

  fastifyServer.register(openapiGlue, {
    specification: serverConfig.oasDocument,
    service,
    securityHandlers: {},
  });
};

const configureSwaggerUI = async ({ fastifyServer, serverConfig }) => {
  fastifyServer.register(fastifyStatic, {
    root: swaggerUiDist.getAbsoluteFSPath(),
    prefix: "/swagger-ui/",
  });

  fastifyServer.get("/", (request, reply) => {
    reply.sendFile(
      "index.html",
      fileURLToPath(new URL("public", import.meta.url))
    );
  });

  fastifyServer.get("/api.oas.yml", (request, reply) => {
    const newOas = {
      ...serverConfig.oasDocument,
      servers: [
        {
          url: `${request.protocol}://${request.hostname}`,
        },
      ],
    };

    reply.type("text/yaml").send(yaml.dump(newOas));
  });
};

export const createFastifyServer = async ({
  [diTokens.container]: container,
  [diTokens.serverConfig]: serverConfig,
}) => {
  const fastifyServer = fastify({
    logger: true,
  });

  fastifyServer.register(FastifySSEPlugin);
  configureSwaggerUI({ fastifyServer, serverConfig });
  await configureOpenapiGlue({ container, fastifyServer, serverConfig });

  return fastifyServer;
};
