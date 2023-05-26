/* eslint-disable no-await-in-loop */
import {
  type FinishReason,
  LlmAdapter,
  type LlmAdapterCreateChatCompletionRequest,
  type LlmAdapterCreateChatCompletionResponse,
  type LlmAdapterCreateCompletionRequest,
  type LlmAdapterCreateCompletionResponse,
  type LlmAdapterCreateEmbeddingRequest,
  type LlmAdapterCreateEmbeddingResponse,
  type LlmAdapterModel,
  Role,
} from "./llm-adapter.ts";
import type { LlamaInvocation } from "@llama-node/llama-cpp";
import { type LLMError, LLM as LlamaNode } from "llama-node";
import { LLamaCpp, type LoadConfig } from "llama-node/dist/llm/llama-cpp.js";
import { cpus } from "node:os";
import path from "node:path";

type DefaultLlmAdapterConfig = LoadConfig &
  LlamaInvocation & { modelPath: string };

export default class DefaultLlmAdapter extends LlmAdapter {
  #llmConfig: DefaultLlmAdapterConfig;
  #loaded = false;
  #llamaNode = new LlamaNode(LLamaCpp);

  constructor(llmConfig: DefaultLlmAdapterConfig) {
    super();

    this.#llmConfig = { ...DefaultLlmAdapter.defaultConfig, ...llmConfig };
  }

  async createChatCompletion(
    createChatCompletionRequest: LlmAdapterCreateChatCompletionRequest,
    abortSignal: AbortSignal,
    onData: (data: LlmAdapterCreateChatCompletionResponse) => void
  ): Promise<void> {
    await this.#load();

    const prompt = createChatCompletionRequest.messages
      .map(({ content, role }) => {
        if (role === Role.System) return `${content}\n`;
        return `${role ?? Role.User}: ${content}`;
      })
      .join("\n")
      .concat(`${Role.Assistant}: `);

    for (
      let index = 0;
      index < (createChatCompletionRequest.n ?? 1);
      index += 1
    ) {
      let isFirstToken = true;

      await this.#invokeLlamaNode(
        {
          ...this.#openAiCompletionRequestToLlamaNodeInvocation(
            createChatCompletionRequest
          ),
          prompt,
        },
        abortSignal,
        ({ token, finishReason }) => {
          if (isFirstToken) {
            onData({
              index,
              delta: { role: Role.Assistant },
              finishReason,
            });

            isFirstToken = false;
          }

          onData({
            index,
            delta: { content: token },
            finishReason,
          });
        },
        () => {
          onData({
            index,
            delta: {},
            finishReason: "stop",
          });
        }
      );
    }
  }

  async listModels(): Promise<LlmAdapterModel[]> {
    return [
      {
        id: path.basename(this.#llmConfig.modelPath),
        created: 0,
        ownedBy: "unknown",
      },
    ];
  }

  async createEmbedding({
    model,
    input,
  }: LlmAdapterCreateEmbeddingRequest): Promise<LlmAdapterCreateEmbeddingResponse> {
    await this.#load();

    return this.#llamaNode.getEmbedding({
      ...this.#llmConfig,
      prompt: input,
    });
  }

  async createCompletion(
    createCompletionRequest: LlmAdapterCreateCompletionRequest,
    abortSignal: AbortSignal,
    onData: (data: LlmAdapterCreateCompletionResponse) => void
  ): Promise<void> {
    await this.#load();

    for (
      let promptIndex = 0, index = 0;
      index <
      createCompletionRequest.prompt.length * (createCompletionRequest.n ?? 1);
      index += 1,
        promptIndex = (promptIndex + 1) % createCompletionRequest.prompt.length
    ) {
      const prompt = createCompletionRequest.prompt[promptIndex];
      await this.#invokeLlamaNode(
        {
          ...this.#openAiCompletionRequestToLlamaNodeInvocation(
            createCompletionRequest
          ),
          prompt,
        },
        abortSignal,
        ({ token, finishReason }) => {
          onData({
            index,
            text: token,
            finishReason,
          });
        }
      );
    }
  }

  #openAiCompletionRequestToLlamaNodeInvocation(
    request:
      | LlmAdapterCreateCompletionRequest
      | LlmAdapterCreateChatCompletionRequest
  ) {
    return {
      nTokPredict: Math.max(
        request.maxTokens ?? 0,
        this.#llmConfig.nTokPredict
      ),
      temp: request.temperature ?? this.#llmConfig.temp,
      topP: request.topP ?? this.#llmConfig.topP,
      presencePenalty:
        request.presencePenalty ?? this.#llmConfig.presencePenalty,
      frequencyPenalty:
        request.frequencyPenalty ?? this.#llmConfig.frequencyPenalty,
    } satisfies Partial<LlamaInvocation>;
  }

  static get defaultConfig() {
    return {
      // Load config
      enableLogging: true,
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
      nTokPredict: 32_768,
      topK: 40,
      topP: 0.95,
      temp: 0,
      repeatPenalty: 1.1,
    };
  }

  async #load() {
    if (this.#loaded) return;

    await this.#llamaNode.load({
      ...DefaultLlmAdapter.defaultConfig,
      ...this.#llmConfig,

      // For older versions of @llama-node/llama-cpp
      path: this.#llmConfig.modelPath,
    });

    this.#loaded = true;
  }

  async #invokeLlamaNode<T>(
    invocationConfig: Partial<LlamaInvocation>,
    callerAbortSignal: AbortSignal,
    onToken: ({
      token,
      finishReason,
    }: {
      token: string;
      finishReason: FinishReason;
    }) => void,
    onComplete?: () => void
  ) {
    let tokensGenerated = 0;
    const abortController = new AbortController();

    const handleAbort = () => {
      callerAbortSignal.removeEventListener("abort", handleAbort);
      abortController.abort();
    };

    callerAbortSignal.addEventListener("abort", handleAbort);
    return this.#llamaNode
      .createCompletion(
        {
          ...this.#llmConfig,
          ...invocationConfig,
        },
        ({ token, completed }) => {
          // "llama-node" always emits "\n\n<end>\n" at the end of inference
          if (completed) {
            if (onComplete) onComplete();
            return;
          }

          tokensGenerated += 1;

          let finishReason: FinishReason;
          if (tokensGenerated >= invocationConfig.nTokPredict!) {
            finishReason = "length";
            abortController.abort();
          }

          onToken({ token, finishReason });
        },
        abortController.signal
      )
      .catch((error: unknown) => {
        // Looks like LLMError is not exported as a Class
        if (Object.getPrototypeOf(error).constructor.name !== "LLMError") {
          throw error;
        }

        const llmError = error as LLMError;
        if (llmError.type !== "Aborted") {
          throw llmError;
        }
      })
      .finally(() => {
        callerAbortSignal.removeEventListener("abort", handleAbort);
      });
  }
}
