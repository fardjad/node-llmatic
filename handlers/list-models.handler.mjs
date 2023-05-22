/* eslint-disable camelcase */
import { diTokens } from "../container.mjs";

export default class ListModelsHandler {
  static operationId = "listModels";
  #llmAdapter;

  constructor({ [diTokens.llmAdapter]: llmAdapter }) {
    this.#llmAdapter = llmAdapter;
  }

  handle() {
    const model = {
      id: this.#llmAdapter.modelName,
      object: "model",
      owned_by: "unknown",
      created: 0,
      permission: [],
    };

    return {
      object: "list",
      data: [model],
    };
  }
}
