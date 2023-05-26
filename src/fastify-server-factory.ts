import type { Cradle } from "./container.ts";
import type { OperationHandler } from "./operation-handler.ts";
import fastifyStatic from "@fastify/static";
import Ajv from "ajv";
import fastify from "fastify";
import openapiGlue from "fastify-openapi-glue";
import { glob } from "glob";
import yaml from "js-yaml";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import swaggerUiDist from "swagger-ui-dist";
import traverse from "traverse";

// FIXME: fix the types
const createOpenapiGlueService = async ({ container }: Partial<Cradle>) => {
  const routeHandlerFiles = await glob("**/*.handler.[tj]s", {
    cwd: new URL("handlers", import.meta.url),
    absolute: true,
  });

  const handlers = await Promise.all(
    routeHandlerFiles.map(async (file) => {
      const { default: handlerConstructor } = (await import(file)) as {
        default: (...arguments_: any[]) => OperationHandler;
      };
      return container!.build(handlerConstructor);
    })
  );

  return Object.fromEntries(
    handlers.map((handler) => [
      handler.operationId,
      handler.handle.bind(handler),
    ])
  );
};

// FIXME: fix the types
const configureOpenapiGlue = async ({
  container,
  fastifyServer,
  openapiDocument,
}: Partial<Cradle> & { openapiDocument: any }) => {
  const schemaCompilers = {
    body: new Ajv(),
    params: new Ajv(),
    querystring: new Ajv(),
    headers: new Ajv(),
  };

  fastifyServer!.setValidatorCompiler((request) => {
    if (!request.httpPart) {
      throw new Error("Missing httpPart");
    }

    const compiler = schemaCompilers[request.httpPart] as Ajv | undefined;
    if (!compiler) {
      throw new Error(`Missing compiler for ${request.httpPart}`);
    }

    // OpenAI OAS is not entirely valid/compatible, so we need to remove some properties
    // eslint-disable-next-line unicorn/no-array-for-each
    traverse(request.schema).forEach(function (value) {
      if (!this.key) return;

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

  const service = await createOpenapiGlueService({ container });

  await fastifyServer!.register(openapiGlue, {
    specification: openapiDocument as Record<string, unknown>,
    prefix: "/v1",
    service,
    securityHandlers: {},
  });
};

// FIXME: fix the types
const configureSwaggerUi = async ({
  fastifyServer,
  openapiDocument,
}: Partial<Cradle> & { openapiDocument: any }) => {
  await fastifyServer!.register(fastifyStatic, {
    root: swaggerUiDist.getAbsoluteFSPath(),
    prefix: "/swagger-ui/",
  });

  fastifyServer!.get("/", (request, reply) =>
    reply.sendFile(
      "index.html",
      fileURLToPath(new URL("../public", import.meta.url))
    )
  );

  fastifyServer!.get("/api.oas.yml", (request, reply) => {
    const newOas = {
      ...(openapiDocument as Record<string, unknown>),
      servers: [
        {
          url: `${request.protocol}://${request.hostname}/v1`,
        },
      ],
    };

    return reply.type("text/yaml").send(yaml.dump(newOas));
  });
};

export const createFastifyServer = async ({ container }: Cradle) => {
  const fastifyServer = fastify({
    logger: false,
  });

  const openapiDocument = yaml.load(
    await fs.promises.readFile(new URL("../api.oas.yml", import.meta.url), {
      encoding: "utf8",
    })
  );

  await configureSwaggerUi({ fastifyServer, openapiDocument });
  await configureOpenapiGlue({ container, fastifyServer, openapiDocument });

  return fastifyServer;
};
