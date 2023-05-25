/* eslint-disable @typescript-eslint/naming-convention */
import type { Cradle } from "../container.ts";
import type { LlmAdapter } from "../llm-adapter.ts";
import type { OperationHandler } from "../operation-handler.ts";
import type { SseHelper } from "../sse-helper.ts";
import {
  type ChoiceMessage,
  type CreateChatCompletionOkResponse,
  type CreateChatCompletionRequest,
  Role,
} from "../types/create-chat-completion.ts";
import type { Choice } from "../types/create-chat-completion.ts";
import type { RouteHandlerMethod } from "fastify";
import shortUUID from "short-uuid";

type Chunk = Choice & {
  delta: Partial<ChoiceMessage>;
};
export default class CreateChatCompletionHandler implements OperationHandler {
  operationId = "createChatCompletion";

  #llmAdapter: LlmAdapter;
  #sseHelper: SseHelper;

  constructor({ llmAdapter, sseHelper }: Cradle) {
    this.#llmAdapter = llmAdapter;
    this.#sseHelper = sseHelper;
  }

  handle: RouteHandlerMethod = async (request, reply) => {
    const body = request.body as CreateChatCompletionRequest;

    const {
      frequency_penalty,
      logit_bias,
      max_tokens,
      messages,
      model,
      n,
      presence_penalty,
      stop,
      stream,
      temperature,
      top_p,
    } = body;

    const abortController = new AbortController();
    request.raw.once("close", () => {
      if (request.raw.destroyed) {
        abortController.abort();
      }
    });

    const id = `chatcmpl-${shortUUID.generate()}`;
    const choiceTokens: string[][] = [];
    const choices: Choice[] = [];

    await this.#llmAdapter.createChatCompletion(
      {
        messages,
        model,
        frequencyPenalty: frequency_penalty,
        logitBias: logit_bias,
        maxTokens: max_tokens,
        n,
        presencePenalty: presence_penalty,
        stop: (Array.isArray(stop) ? stop : [stop].filter(Boolean)) as string[],
        temperature,
        topP: top_p,
      },
      abortController.signal,
      ({ index, delta, finishReason }) => {
        if (stream) {
          this.#sseHelper.sse(
            reply,
            this.#createResponseChunk(id, model, {
              delta,
              index,
            })
          );

          return;
        }

        if (choices[index] == null) {
          choices[index] = {
            index,
            message: { role: Role.Assistant, content: "" },
          };
        }

        choices[index].finish_reason = finishReason;

        if (delta.role) {
          choices[index].message!.role = delta.role;
        }

        if (choiceTokens[index] == null) {
          choiceTokens[index] = [];
        }

        if (delta.content) {
          choiceTokens[index].push(delta.content);
        }
      }
    );

    if (stream) {
      this.#sseHelper.sse(reply, "[DONE]");
      reply.raw.end();
      return;
    }

    for (const [index, choice] of choices.entries()) {
      if (!choice) {
        continue;
      }

      choice.message!.role = Role.Assistant;
      choice.message!.content = choiceTokens[index].join("");
    }

    const response: CreateChatCompletionOkResponse = {
      ...this.#createResponse(id, model, choices),
      usage: {
        completion_tokens: 0,
        prompt_tokens: 0,
        total_tokens: 0,
      },
    };

    return response;
  };

  #createResponse(
    id: string,
    model: string,
    choices: Choice[]
  ): CreateChatCompletionOkResponse {
    return {
      id,
      model,
      choices: choices.filter(Boolean),
      created: Date.now(),
      object: "chat.completion",
    };
  }

  #createResponseChunk(
    id: string,
    model: string,
    deltaChoice: Chunk
  ): CreateChatCompletionOkResponse {
    return {
      id,
      model,
      choices: [deltaChoice],
      created: Date.now(),
      object: "chat.completion.chunk",
    };
  }
}
