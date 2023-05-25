/* eslint-disable no-await-in-loop */
import { Resolver } from "@stoplight/json-ref-resolver";
import { paramCase, pascalCase } from "change-case";
import "http-status-codes";
import { getReasonPhrase } from "http-status-codes";
import yaml from "js-yaml";
import { JSONPath as jsonPath } from "jsonpath-plus";
import fs from "node:fs";
import {
  quicktype,
  InputData,
  JSONSchemaInput,
  FetchingJSONSchemaStore,
} from "quicktype-core";

const typesDirectory = new URL("../src/types", import.meta.url);
fs.mkdirSync(typesDirectory, { recursive: true });

const oas = yaml.load(
  fs.readFileSync(new URL("../api.oas.yml", import.meta.url), "utf8")
);
const resolver = new Resolver();
const { result: resolvedOas } = await resolver.resolve(oas);

const quicktypeJSONSchema = async (sources) => {
  const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());
  for (const { name, schema } of sources) {
    await schemaInput.addSource({ name, schema });
  }

  const inputData = new InputData();
  inputData.addInput(schemaInput);

  return quicktype({
    inputData,
    lang: "typescript",
    rendererOptions: {
      "just-types": true,
      "runtime-typecheck": false,
      "prefer-types": true,
    },
  });
};

const operationIds = [
  "createChatCompletion",
  "createCompletion",
  "createEmbedding",
  "listModels",
  "retrieveModel",
];

for (const operationId of operationIds) {
  const operation = jsonPath({
    path: `$.paths.*[?(@.operationId === '${operationId}')]`,
    json: resolvedOas,
  })[0];

  const requestBodySchema = jsonPath({
    path: "$.requestBody.content['application/json'].schema",
    json: operation,
  })[0];

  const statusCodes = jsonPath({
    path: "$.responses.*.content['application/json'].schema^^^~",
    json: operation,
  });

  const responseBodySchemas = jsonPath({
    path: "$.responses.*.content['application/json'].schema",
    json: operation,
  });

  const responseBodySchemaPairs = statusCodes.map((statusCode, index) => ({
    statusCode,
    schema: responseBodySchemas[index],
  }));

  const requestSource = {
    name: `${operationId}Request`,
    schema: JSON.stringify(requestBodySchema),
  };

  const responseSources = responseBodySchemaPairs.map(
    ({ statusCode, schema }) => ({
      name: pascalCase(
        `${operationId} ${getReasonPhrase(statusCode)} Response`
      ),
      schema: JSON.stringify(schema),
    })
  );

  const sources = [requestSource, ...responseSources].filter(
    (source) => source.schema !== undefined
  );

  const { lines } = await quicktypeJSONSchema(sources);
  const fileName = new URL(`${typesDirectory}/${paramCase(operationId)}.ts`);
  fs.writeFileSync(fileName, lines.join("\n"), "utf8");
}
