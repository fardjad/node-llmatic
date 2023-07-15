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
import type { Generate } from "@llama-node/llama-cpp";
import { type LLMError, LLM as LlamaNode, LLMErrorType } from "llama-node";
import { LLamaCpp, type LoadConfig } from "llama-node/dist/llm/llama-cpp.js";
import { cpus } from "node:os";
import path from "node:path";

type DefaultLlmAdapterConfig = Generate & LoadConfig;

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
    onData: (data: LlmAdapterCreateChatCompletionResponse) => void,
  ): Promise<void> {
    await this.#load();

    const prompt = createChatCompletionRequest.messages
      .map(({ content, role }) => {
        if (role === Role.System) return `${content}\n`;
        return `${role ?? Role.User}: ${content}`;
      })
      .join("\n")
      .concat(`\n${Role.Assistant}: `);

    const bufferedTokens: string[] = [];
    const flushBuffer = (index: number) => {
      while (bufferedTokens.length > 0) {
        onData({
          index,
          delta: { content: bufferedTokens.shift() },
        });
      }
    };

    for (
      let index = 0;
      index < (createChatCompletionRequest.n ?? 1);
      index += 1
    ) {
      let isFirstToken = true;

      await this.#invokeLlamaNode(
        {
          ...this.#openAiCompletionRequestToLlamaNodeInvocation(
            createChatCompletionRequest,
          ),
          prompt,
        },
        abortSignal,
        ({ token, finishReason, stop }) => {
          if (isFirstToken) {
            onData({
              index,
              delta: { role: Role.Assistant },
              finishReason,
            });

            isFirstToken = false;
          }

          if (["\n", Role.User, ":"].includes(token.trim())) {
            bufferedTokens.push(token);
            if (bufferedTokens.join("").trim() === `${Role.User}:`) {
              stop();
              bufferedTokens.length = 0;
            }
          } else {
            flushBuffer(index);
            onData({
              index,
              delta: { content: token },
              finishReason,
            });
          }
        },
        () => {
          flushBuffer(index);
          onData({
            index,
            delta: {},
            finishReason: "stop",
          });
        },
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
    onData: (data: LlmAdapterCreateCompletionResponse) => void,
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
            createCompletionRequest,
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
        },
      );
    }
  }

  #openAiCompletionRequestToLlamaNodeInvocation(
    request:
      | LlmAdapterCreateCompletionRequest
      | LlmAdapterCreateChatCompletionRequest,
  ) {
    return {
      nTokPredict: request.maxTokens ?? this.#llmConfig.nTokPredict,
      temp: request.temperature ?? this.#llmConfig.temp,
      topP: request.topP ?? this.#llmConfig.topP,
      presencePenalty:
        request.presencePenalty ?? this.#llmConfig.presencePenalty,
      frequencyPenalty:
        request.frequencyPenalty ?? this.#llmConfig.frequencyPenalty,
    } satisfies Partial<Generate>;
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
    });

    this.#loaded = true;
  }

  async #invokeLlamaNode<T>(
    invocationConfig: Partial<Generate>,
    callerAbortSignal: AbortSignal,
    onToken: ({
      token,
      finishReason,
      stop,
    }: {
      token: string;
      finishReason: FinishReason;
      stop: () => void;
    }) => void,
    onComplete?: () => void,
  ) {
    let tokensGenerated = 0;
    const abortController = new AbortController();

    const handleAbort = () => {
      callerAbortSignal.removeEventListener("abort", handleAbort);
      abortController.abort();
    };

    const stop = () => {
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

          onToken({ token, finishReason, stop });
        },
        abortController.signal,
      )
      .catch((error: unknown) => {
        // Looks like LLMError is not exported as a Class
        if (Object.getPrototypeOf(error).constructor.name !== "LLMError") {
          throw error;
        }

        const llmError = error as LLMError;
        if (llmError.type !== LLMErrorType.Aborted) {
          throw llmError;
        }
      })
      .finally(() => {
        callerAbortSignal.removeEventListener("abort", handleAbort);
      });
  }
}
