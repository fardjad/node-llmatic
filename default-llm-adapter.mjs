import { diTokens } from "./container.mjs";
import { EventIterator } from "event-iterator";
import { LLM as LlamaNode } from "llama-node";
import { LLamaCpp } from "llama-node/dist/llm/llama-cpp.js";
import { EventEmitter } from "node:events";
import { cpus } from "node:os";
import path from "node:path";

export default class DefaultLLMAdapter {
  #llamaNode = new LlamaNode(LLamaCpp);
  #llmConfig;
  #loaded = false;

  constructor({ [diTokens.llmConfig]: llmConfig }) {
    this.#llmConfig = llmConfig;
  }

  async load() {
    if (this.#loaded) return;

    await this.#llamaNode.load({
      ...DefaultLLMAdapter.defaultConfig,
      ...this.#llmConfig,
      // For older versions of llama-node
      path: this.#llmConfig.modelPath,
    });
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
    return path.basename(this.#llmConfig.modelPath);
  }

  static get defaultConfig() {
    return {
      // Load config
      enableLogging: false,
      nParts: 1,
      nGpuLayers: 0,
      f16Kv: false,
      logitsAll: false,
      vocabOnly: false,
      seed: 0,
      useMlock: true,
      embedding: true,
      useMmap: true,
      nCtx: 4096,

      // Invocation config
      nThreads: cpus().length,
      nTokPredict: Number.MAX_SAFE_INTEGER,
      topK: 40,
      topP: 0.95,
      temp: 0,
      repeatPenalty: 1.1,
    };
  }
}
