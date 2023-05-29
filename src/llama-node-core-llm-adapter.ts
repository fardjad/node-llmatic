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
import { type Generate, ModelType } from "@llama-node/core";
import { type LLMError, LLM as LlamaNode } from "llama-node";
import { LLMRS, type LoadConfig } from "llama-node/dist/llm/llm-rs.js";
import { cpus } from "node:os";
import path from "node:path";

type LlamaNodeCoreLlmAdapterConfig = LoadConfig & Generate;

export default class LlamaNodeCoreLlmAdapter extends LlmAdapter {
  #llmConfig: LlamaNodeCoreLlmAdapterConfig;
  #loaded = false;
  #llamaNode = new LlamaNode(LLMRS);

  constructor(llmConfig: LlamaNodeCoreLlmAdapterConfig) {
    super();

    this.#llmConfig = {
      ...LlamaNodeCoreLlmAdapter.defaultConfig,
      ...llmConfig,
    };
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
            createChatCompletionRequest
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
    let temperature = request.temperature ?? this.#llmConfig.temperature;
    // Temp=0 leads to a crash
    if (request.temperature === 0) {
      temperature = 1e-5;
    }

    return {
      numPredict: request.maxTokens ?? this.#llmConfig.numPredict ?? undefined,
      temperature,
      topP: request.topP ?? this.#llmConfig.topP,
    } satisfies Partial<Generate>;
  }

  static get defaultConfig() {
    return {
      // Load config
      enableLogging: false,
      modelType: ModelType.Mpt,
      numCtxTokens: 4096,
      useMmap: true,

      // Generate config
      numThreads: cpus().length,
      numPredict: 32_768,
      batchSize: 128,
      repeatLastN: 64,
      repeatPenalty: 1.1,
      temperature: 0,
      topK: 40,
      topP: 0.95,
      seed: 0,
      float16: false,
      feedPrompt: true,
    } satisfies Partial<LoadConfig & Generate>;
  }

  async #load() {
    if (this.#loaded) return;

    await this.#llamaNode.load({
      ...LlamaNodeCoreLlmAdapter.defaultConfig,
      ...this.#llmConfig,
    });

    this.#loaded = true;
  }

  async #invokeLlamaNode<T>(
    generateConfig: Partial<Generate>,
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
    onComplete?: () => void
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
          ...generateConfig,
        },
        ({ token, completed }) => {
          // "llama-node" always emits "\n\n<end>\n" at the end of inference
          if (completed) {
            if (onComplete) onComplete();
            return;
          }

          tokensGenerated += 1;

          let finishReason: FinishReason;
          if (tokensGenerated >= generateConfig.numPredict!) {
            finishReason = "length";
            abortController.abort();
          }

          onToken({ token, finishReason, stop });
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
