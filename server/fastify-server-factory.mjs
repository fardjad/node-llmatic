import { FastifySSEPlugin } from "fastify-sse-v2";
import Ajv from "ajv";
import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import openapiGlue from "fastify-openapi-glue";
import swaggerUiDist from "swagger-ui-dist";
import traverse from "traverse";
import yaml from "js-yaml";
import { fileURLToPath } from "node:url";
import { diTokens } from "../container.mjs";

const configureSwaggerUI = async ({ fastifyServer, openapiConfig }) => {
  fastifyServer.register(fastifyStatic, {
    root: swaggerUiDist.getAbsoluteFSPath(),
    prefix: "/swagger-ui/",
  });

  fastifyServer.get("/", (request, reply) => {
    reply.sendFile(
      "index.html",
      fileURLToPath(new URL("../public", import.meta.url))
    );
  });

  fastifyServer.get("/api.oas.yml", (request, reply) => {
    const newOas = {
      ...openapiConfig.oasDocument,
      servers: [
        {
          url: `${request.protocol}://${request.hostname}`,
        },
      ],
    };

    reply.type("text/yaml").send(yaml.dump(newOas));
  });
};

const configureOpenapiGlue = async ({ fastifyServer, openapiGlueConfig }) => {
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

  fastifyServer.register(openapiGlue, openapiGlueConfig);
};

export const createFastifyServer = async ({
  [diTokens.openapiConfig]: openapiConfig,
  [diTokens.openapiGlueConfig]: openapiGlueConfig,
}) => {
  const fastifyServer = fastify({
    logger: true,
  });

  fastifyServer.register(FastifySSEPlugin);
  configureOpenapiGlue({ fastifyServer, openapiGlueConfig });
  configureSwaggerUI({ fastifyServer, openapiConfig });

  return fastifyServer;
};
