/* eslint-disable @typescript-eslint/naming-convention */
import type { Cradle } from "../container.ts";
import type { LlmAdapter } from "../llm-adapter.ts";
import type { OperationHandler } from "../operation-handler.ts";
import type {
  ListModelsOkResponse,
  ModelObject,
} from "../types/list-models.ts";
import type { RouteHandlerMethod } from "fastify";

export default class ListModelsHandler implements OperationHandler {
  operationId = "listModels";
  #llmAdapter: LlmAdapter;

  constructor({ llmAdapter }: Cradle) {
    this.#llmAdapter = llmAdapter;
  }

  handle: RouteHandlerMethod = async (request, reply) => {
    const adapterModels = await this.#llmAdapter.listModels();

    const data: ModelObject[] = adapterModels.map((model) => ({
      id: model.id,
      created: model.created,
      owned_by: model.ownedBy,
      object: "model",

      // Not part of the spec
      permission: [],
    }));

    const response: ListModelsOkResponse = {
      data,
      object: "list",
    };

    // To preserve model.permissions
    void reply.header("Content-Type", "application/json; charset=utf-8");
    void reply.serializer(JSON.stringify);

    return response;
  };
}
