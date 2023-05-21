/* eslint-disable camelcase */
import { diTokens } from "../container.mjs";

export default class CreateEmbeddingHandler {
  static operationId = "createEmbedding";
  #llmService;

  constructor({ [diTokens.llmService]: llmService }) {
    this.#llmService = llmService;
  }

  async handle(request) {
    const { input, model } = request.body;

    const embedding = await this.#llmService.getEmbedding({
      prompt: input,
    });

    return {
      object: "list",
      data: [
        {
          object: "embedding",
          embedding,
          index: 0,
        },
      ],
      model,
      usage: {
        prompt_tokens: 0,
        total_tokens: 0,
      },
    };
  }
}
