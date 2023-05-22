/* eslint-disable camelcase */
import { diTokens } from "../container.mjs";

export default class RetrieveModelHandler {
  static operationId = "retrieveModel";
  #llmAdapter;

  constructor({ [diTokens.llmAdapter]: llmAdapter }) {
    this.#llmAdapter = llmAdapter;
  }

  handle(request, reply) {
    const { model: modelName } = request.params;

    if (modelName !== this.#llmAdapter.modelName) {
      reply.code(404);
      throw new Error(`Model ${modelName} not found`);
    }

    return {
      id: this.#llmAdapter.modelName,
      object: "model",
      owned_by: "unknown",
      created: 0,
      permission: [],
    };
  }
}
