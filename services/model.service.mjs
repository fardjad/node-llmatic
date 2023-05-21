/* eslint-disable camelcase */

import { diTokens } from "../container.mjs";

export class ModelService {
  #modelConfig;

  #createModelObject(modelName) {
    return {
      id: modelName,
      object: "model",
      owned_by: "unknown",
      created: 0,
      permission: [],
    };
  }

  constructor({ [diTokens.modelConfig]: modelConfig }) {
    this.#modelConfig = modelConfig;
  }

  getModels() {
    return {
      object: "list",
      data: this.#modelConfig.modelNames.map((modelName) =>
        this.#createModelObject(modelName)
      ),
    };
  }

  getModel(modelName) {
    return this.getModels().data.find((model) => model.id === modelName);
  }
}
