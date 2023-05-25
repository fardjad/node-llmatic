import {
  LlmAdapter,
  type LlmAdapterCreateChatCompletionRequest,
  type LlmAdapterCreateChatCompletionResponse,
  type LlmAdapterCreateCompletionRequest,
  type LlmAdapterCreateCompletionResponse,
  type LlmAdapterCreateEmbeddingRequest,
  type LlmAdapterCreateEmbeddingResponse,
  type LlmAdapterModel,
} from "./llm-adapter.ts";
import type { LlamaInvocation } from "@llama-node/llama-cpp";
import type { LoadConfig } from "llama-node/dist/llm/llama-cpp.js";
import { cpus } from "node:os";

type DefaultLlmAdapterConfig = LoadConfig &
  LlamaInvocation & { modelPath: string };

export default class DefaultLlmAdapter extends LlmAdapter {
  async createChatCompletion(
    createChatCompletionRequest: LlmAdapterCreateChatCompletionRequest,
    abortSignal: AbortSignal,
    onData: (data: LlmAdapterCreateChatCompletionResponse) => void
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async listModels(): Promise<LlmAdapterModel[]> {
    throw new Error("Method not implemented.");
  }

  async createEmbedding({
    model,
    input,
  }: LlmAdapterCreateEmbeddingRequest): Promise<LlmAdapterCreateEmbeddingResponse> {
    throw new Error("Method not implemented.");
  }

  async createCompletion(
    createCompletionRequest: LlmAdapterCreateCompletionRequest,
    abortSignal: AbortSignal,
    onData: (data: LlmAdapterCreateCompletionResponse) => void
  ): Promise<void> {
    throw new Error("Method not implemented.");
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
