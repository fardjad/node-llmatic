import { diTokens } from "../container.mjs";

export default class ListModelsHandler {
  static operationId = "listModels";
  #modelService;

  constructor({ [diTokens.modelService]: modelService }) {
    this.#modelService = modelService;
  }

  handle() {
    return this.#modelService.getModels();
  }
}
