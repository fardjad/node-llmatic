/* eslint-disable @typescript-eslint/naming-convention */
import type { Cradle } from "../container.ts";
import type { LlmAdapter } from "../llm-adapter.ts";
import type { OperationHandler } from "../operation-handler.ts";
import type { RetrieveModelOkResponseObject } from "../types/retrieve-model.ts";
import type { RouteHandlerMethod } from "fastify";

type RequestParameters = {
  model: string;
};

export default class RetrieveModelHandler implements OperationHandler {
  operationId = "retrieveModel";
  readonly #llmAdapter: LlmAdapter;

  constructor({ llmAdapter }: Cradle) {
    this.#llmAdapter = llmAdapter;
  }

  handle: RouteHandlerMethod = async (request, reply) => {
    const parameters: RequestParameters = request.params as RequestParameters;

    const { model } = parameters;
    const adapterModels = await this.#llmAdapter.listModels();
    const adapterModel = adapterModels.find(
      (adapterModel) => adapterModel.id === model,
    );

    if (!adapterModel) {
      void reply.status(404);
      return;
    }

    const response: RetrieveModelOkResponseObject = {
      created: 0,
      id: adapterModel.id,
      object: "model",
      owned_by: adapterModel.ownedBy,

      // Not part of the spec
      permission: [],
    };

    // To preserve model.permissions
    void reply.header("Content-Type", "application/json; charset=utf-8");
    void reply.serializer(JSON.stringify);

    return response;
  };
}
