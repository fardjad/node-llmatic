/* eslint-disable @typescript-eslint/naming-convention */
import type { Cradle } from "../container.ts";
import type { LlmAdapter } from "../llm-adapter.ts";
import type { OperationHandler } from "../operation-handler.ts";
import type {
  CreateEmbeddingOkResponse,
  CreateEmbeddingRequest,
  Datum,
} from "../types/create-embedding.ts";
import type { RouteHandlerMethod } from "fastify";

export default class CreateEmbeddingHandler implements OperationHandler {
  operationId = "createEmbedding";
  #llmAdapter: LlmAdapter;

  constructor({ llmAdapter }: Cradle) {
    this.#llmAdapter = llmAdapter;
  }

  handle: RouteHandlerMethod = async (request, reply) => {
    const body = request.body as CreateEmbeddingRequest;
    const { input, model } = body;

    if (Array.isArray(input) && typeof input[0] !== "string") {
      // FIXME: figure out how to handle numeric inputs
      throw new TypeError("Only string inputs are supported");
    }

    const inputStrings = Array.isArray(input) ? input : [input];

    const embeddings = await Promise.all(
      inputStrings.map(async (input: string) =>
        this.#llmAdapter.createEmbedding({
          input,
          model,
        }),
      ),
    );

    const data: Datum[] = embeddings.map((embedding, index) => ({
      index,
      embedding,
      object: "embedding",
    }));

    const response: CreateEmbeddingOkResponse = {
      data,
      object: "list",
      model,
      usage: {
        prompt_tokens: 0,
        total_tokens: 0,
      },
    };

    return response;
  };
}
