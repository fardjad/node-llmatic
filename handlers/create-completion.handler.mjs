/* eslint-disable camelcase */
import assert from "node:assert";
import { diTokens } from "../container.mjs";
import { randomUUID } from "node:crypto";

export default class CreateCompletionHandler {
  static operationId = "createCompletion";

  #llmService;

  constructor({ [diTokens.llmService]: llmService }) {
    this.#llmService = llmService;
  }

  // FIXME: This is a mess. Refactor.
  async handle(request, reply) {
    const {
      model,
      prompt,
      suffix,
      max_tokens,
      temperature,
      top_p,
      n,
      stream,
      logprobs,
      echo,
      stop,
      presence_penalty,
      frequency_penalty,
      best_of,
      logit_bias,
    } = {
      suffix: null,
      max_tokens: 16,
      temperature: 1,
      top_p: 1,
      n: 1,
      stream: false,
      logprobs: 0,
      echo: false,
      presence_penalty: 0,
      frequency_penalty: 0,
      best_of: 1,
      ...request.body,
      logit_bias: null,
      stop: null,
    };

    assert.equal(logprobs, 0, "logprobs is not supported");
    assert.equal(n, 1, "n != 1 is not supported");
    assert.equal(best_of, 1, "best_of != 1 is not supported");
    assert.equal(stop, null, "stop is not supported");
    assert.equal(logit_bias, null, "logit_bias is not supported");

    const config = {
      prompt: Array.isArray(prompt) ? prompt[0] : prompt,
      nTokPredict: max_tokens,
      temp: temperature,
      topP: top_p,
      presencePenalty: presence_penalty,
      frequencyPenalty: frequency_penalty,
    };

    const tokens = [];
    const completionIterator = await this.#llmService.createCompletion(config);

    const id = randomUUID();
    const created = Date.now();

    if (stream) {
      return reply.sse(
        (async function* () {
          for await (const { text, finishReason } of completionIterator) {
            if (text === "\n\n<end>\n") {
              break;
            }

            const data = {
              id,
              object: "text_completion",
              created,
              choices: [
                {
                  text,
                  index: 0,
                  logprobs: null,
                  finish_reason: finishReason,
                },
              ],
              model,
            };

            yield { data: JSON.stringify(data) };
          }

          yield { data: "[DONE]" };
        })()
      );
    }

    let finish_reason = null;
    for await (const { text, finishReason } of completionIterator) {
      finish_reason = finishReason;

      if (text === "\n\n<end>\n") {
        break;
      }

      tokens.push(text);
    }

    finish_reason = finish_reason ?? "stop";

    const text = `${echo ? prompt : ""}${tokens.join("")}${suffix ?? ""}`;

    return {
      id,
      object: "text_completion",
      created,
      model,
      choices: [
        {
          text,
          index: 0,
          logprobs: null,
          finish_reason,
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }
}
