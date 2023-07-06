/* eslint-disable @typescript-eslint/naming-convention */
import type { Cradle } from "../container.ts";
import type { LlmAdapter } from "../llm-adapter.ts";
import type { OperationHandler } from "../operation-handler.ts";
import type { SseHelper } from "../sse-helper.ts";
import type {
  Choice,
  CreateCompletionOkResponse,
  CreateCompletionRequest,
} from "../types/create-completion.ts";
import type { RouteHandlerMethod } from "fastify";
import shortUUID from "short-uuid";

export default class CreateCompletionHandler implements OperationHandler {
  operationId = "createCompletion";
  #llmAdapter: LlmAdapter;
  #sseHelper: SseHelper;

  constructor({ llmAdapter, sseHelper }: Cradle) {
    this.#llmAdapter = llmAdapter;
    this.#sseHelper = sseHelper;
  }

  handle: RouteHandlerMethod = async (request, reply) => {
    const body = request.body as CreateCompletionRequest;

    const {
      model,
      best_of,
      stream,
      prompt,
      echo,
      frequency_penalty,
      logit_bias,
      max_tokens,
      logprobs,
      presence_penalty,
      stop,
      suffix,
      temperature,
      top_p,
      n,
    } = body;

    if (best_of != null && stream) {
      void reply.status(400);
      throw new Error("stream cannot be set if best_of is set");
    }

    const promptValidationError = () => {
      void reply.status(400);
      throw new Error("prompt must be a string or an array of strings");
    };

    if (typeof prompt !== "string") {
      if (!Array.isArray(prompt)) {
        promptValidationError();
      }

      if (prompt!.some((x) => typeof x !== "string")) {
        promptValidationError();
      }
    }

    const abortController = new AbortController();
    request.raw.once("close", () => {
      if (request.raw.destroyed) {
        abortController.abort();
      }
    });

    const id = `cmpl-${shortUUID.generate()}`;
    const choiceTokens: string[][] = [];
    const choices: Choice[] = [];

    await this.#llmAdapter.createCompletion(
      {
        model,
        bestOf: best_of,
        echo,
        frequencyPenalty: frequency_penalty,
        logitBias: logit_bias,
        maxTokens: max_tokens,
        logprobs,
        n,
        presencePenalty: presence_penalty,
        prompt: (Array.isArray(prompt)
          ? prompt
          : [prompt].filter(Boolean)) as string[],
        stop: (Array.isArray(stop) ? stop : [stop].filter(Boolean)) as string[],
        suffix,
        temperature,
        topP: top_p,
      },
      abortController.signal,
      ({
        finishReason,
        index,
        text,
        // TODO: Figure out how to handle logprobs
        logprobs,
      }) => {
        if (stream) {
          this.#sseHelper.sse(
            reply,
            this.#createResponseObject(id, model, [
              { finish_reason: finishReason, index, text },
            ]),
          );

          return;
        }

        if (choices[index] == null) {
          choices[index] = {
            index,
          };
        }

        choices[index].finish_reason = finishReason;
        if (choiceTokens[index] == null) {
          choiceTokens[index] = [];
        }

        choiceTokens[index].push(text);
      },
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

      choice.text = choiceTokens[index].join("");
      choice.finish_reason = choice.finish_reason ?? "stop";
    }

    const response: CreateCompletionOkResponse = {
      ...this.#createResponseObject(id, model, choices),
      usage: {
        completion_tokens: 0,
        prompt_tokens: 0,
        total_tokens: 0,
      },
    };

    return response;
  };

  #createResponseObject(
    id: string,
    model: string,
    choices: Choice[],
  ): CreateCompletionOkResponse {
    return {
      id,
      choices: choices.filter(Boolean),
      created: Math.floor(Date.now() / 1000),
      model,
      object: "text_completion",
    };
  }
}
