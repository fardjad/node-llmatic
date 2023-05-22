/* eslint-disable camelcase */
import assert from "node:assert";
import { diTokens } from "../container.mjs";
import { randomUUID } from "node:crypto";

export default class CreateChatCompletionHandler {
  static operationId = "createChatCompletion";

  #llmService;

  constructor({ [diTokens.llmService]: llmService }) {
    this.#llmService = llmService;
  }

  #formatChatLog(chat = []) {
    const rawChatText = chat
      .map((item) => `${item.role}: ${item.content}`)
      .join("\n");

    return `${rawChatText}\nassistant:`;
  }

  // FIXME: This is a mess. Refactor.
  async handle(request, reply) {
    const {
      model,
      messages,
      temperature,
      top_p,
      n,
      stream,
      stop,
      max_tokens,
      presence_penalty,
      frequency_penalty,
      logit_bias,
    } = {
      temperature: 1,
      top_p: 1,
      n: 1,
      stream: false,
      max_tokens: 16,
      presence_penalty: 0,
      frequency_penalty: 0,
      ...request.body,
      stop: null,
      logit_bias: null,
    };

    assert.equal(n, 1, "n != 1 is not supported");
    assert.equal(stop, null, "stop is not supported");
    assert.equal(logit_bias, null, "logit_bias is not supported");

    const prompt = this.#formatChatLog(messages);

    const config = {
      prompt,
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
              object: "chat.completion.chunk",
              created,
              model,
              choices: [
                {
                  delta: { content: text },
                  index: 0,
                  finish_reason: finishReason,
                },
              ],
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

    return {
      id,
      object: "chat.completion",
      created,
      model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: tokens.join(""),
          },
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
