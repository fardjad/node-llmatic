/* eslint-disable camelcase */
import { diTokens } from "../container.mjs";

export default class CreateEmbeddingHandler {
  static operationId = "createEmbedding";
  #llmAdapter;

  constructor({ [diTokens.llmAdapter]: llmAdapter }) {
    this.#llmAdapter = llmAdapter;
  }

  async handle(request) {
    const { input, model } = request.body;

    const embedding = await this.#llmAdapter.getEmbedding({
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
