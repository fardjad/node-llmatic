import { EventEmitter } from "node:events";
import path from "node:path";
import { EventIterator } from "event-iterator";
import { LLamaCpp } from "llama-node/dist/llm/llama-cpp.js";
import { LLM as LlamaNode } from "llama-node";
import { diTokens } from "./container.mjs";

export default class DefaultLLMAdapter {
  #llamaNode = new LlamaNode(LLamaCpp);
  #llmConfig;
  #loaded = false;

  constructor({ [diTokens.llmConfig]: llmConfig }) {
    this.#llmConfig = llmConfig;
  }

  async load() {
    if (this.#loaded) return;

    await this.#llamaNode.load(this.#llmConfig);
    this.#loaded = true;
  }

  #createCompletionEventEmitter(completionConfig) {
    const eventEmitter = new EventEmitter();
    const abortController = new AbortController();
    let numberOfGeneratedTokens = 0;
    let finishReason = null;

    this.#llamaNode
      .createCompletion(
        {
          ...this.#llmConfig,
          ...completionConfig,
          // Limiting the number of generated tokens here causes createCompletion to never finish
          nTokPredict: Number.POSITIVE_INFINITY,
        },
        (response) => {
          numberOfGeneratedTokens += 1;

          if (numberOfGeneratedTokens >= completionConfig.nTokPredict) {
            finishReason = "length";
          }

          eventEmitter.emit("data", {
            text: response.token,
            finishReason,
          });

          if (finishReason) {
            abortController.abort();
          }
        },
        abortController.signal
      )
      .catch((error) => {
        if (error.type !== "Aborted") {
          eventEmitter.emit("error", error);
        }
      })
      .then(() => {
        eventEmitter.emit("end");
      });

    return eventEmitter;
  }

  async createCompletion(completionConfig) {
    await this.load();

    const eventEmitter = this.#createCompletionEventEmitter(completionConfig);

    return new EventIterator(({ push, stop, fail }) => {
      eventEmitter.on("data", push);
      eventEmitter.on("end", stop);
      eventEmitter.on("error", fail);

      return () => {
        eventEmitter.removeAllListeners();
      };
    });
  }

  async getEmbedding(embedingConfig) {
    await this.load();

    return this.#llamaNode.getEmbedding({
      ...this.#llmConfig,
      ...embedingConfig,
    });
  }

  get modelName() {
    return path.basename(this.#llmConfig.path);
  }
}
