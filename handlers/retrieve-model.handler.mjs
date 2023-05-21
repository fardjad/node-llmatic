import { diTokens } from "../container.mjs";

export default class RetrieveModelHandler {
  static operationId = "retrieveModel";
  #modelService;

  constructor({ [diTokens.modelService]: modelService }) {
    this.#modelService = modelService;
  }

  handle(request, reply) {
    const { model: modelName } = request.params;
    const model = this.#modelService.getModel(modelName);

    if (!model) {
      reply.code(404);
      throw new Error(`Model ${modelName} not found`);
    }

    return model;
  }
}
