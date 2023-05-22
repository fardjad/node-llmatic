import { cpus } from "node:os";
import { EventEmitter } from "node:events";
import { fileURLToPath } from "node:url";
import assert from "node:assert";
import { EventIterator } from "event-iterator";

import { LLamaCpp } from "llama-node/dist/llm/llama-cpp.js";
import { LLM as LlamaNode } from "llama-node";
import { diTokens } from "../container.mjs";

export class LLMService {
  #llamaNode = new LlamaNode(LLamaCpp);
  #config;
  #invocationConfig;
  #loaded = false;

  // TODO: Configure this via environment variables
  constructor({ [diTokens.llmConfig]: { loadConfig, invocationConfig } }) {
    assert.equal(
      loadConfig.path instanceof URL,
      true,
      "loadConfig.path must be a URL"
    );

    this.#config = {
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

      ...loadConfig,
      path: fileURLToPath(loadConfig.path),
    };

    this.#invocationConfig = {
      nThreads: cpus().length,
      nTokPredict: Number.POSITIVE_INFINITY,
      topK: 40,
      topP: 0.95,
      temp: 0,
      repeatPenalty: 1.1,

      ...invocationConfig,
    };
  }

  async #load() {
    if (this.#loaded) return;

    await this.#llamaNode.load(this.#config);
    this.#loaded = true;
  }

  #createCompletionEventEmitter(config) {
    const eventEmitter = new EventEmitter();
    const abortController = new AbortController();
    let numberOfGeneratedTokens = 0;
    let finishReason = null;

    this.#llamaNode
      .createCompletion(
        {
          ...this.#invocationConfig,
          ...config,
          nTokPredict: Number.POSITIVE_INFINITY,
        },
        (response) => {
          numberOfGeneratedTokens += 1;

          if (numberOfGeneratedTokens >= config.nTokPredict) {
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

  async createCompletion(config) {
    await this.#load();

    const eventEmitter = this.#createCompletionEventEmitter(config);

    return new EventIterator(({ push, stop, fail }) => {
      eventEmitter.on("data", push);
      eventEmitter.on("end", stop);
      eventEmitter.on("error", fail);

      return () => {
        eventEmitter.removeAllListeners();
      };
    });
  }

  async getEmbedding(config) {
    await this.#load();

    return this.#llamaNode.getEmbedding({
      ...this.#invocationConfig,
      ...config,
    });
  }
}
