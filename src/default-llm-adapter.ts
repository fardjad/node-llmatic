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
import { cpus } from "node:os";
import path from "node:path";
import { LlamaChatSession, LlamaContext, type LlamaContextOptions, type LlamaChatSessionOptions, LlamaChatPromptWrapper, type LLamaChatPromptOptions, type LlamaModelOptions, LlamaModel } from 'node-llama-cpp';

type DefaultLlmAdapterConfig = LlamaContextOptions & LlamaModelOptions & LlamaChatSessionOptions & LLamaChatPromptOptions;

export default class DefaultLlmAdapter extends LlmAdapter {
  abortController = new AbortController();
  readonly #llmConfig: DefaultLlmAdapterConfig;
  #loaded = false;
  readonly #llamaNode: LlamaChatSession;
  readonly #llamaContext: LlamaContext;
  readonly #llamaModel: LlamaModel;

  constructor(llmConfig: DefaultLlmAdapterConfig) {
    super();

    this.#llmConfig = { ...DefaultLlmAdapter.defaultConfig, ...llmConfig };
    this.#llamaModel = new LlamaModel(this.#llmConfig);
    this.#llamaContext = new LlamaContext({ ...this.#llmConfig, model: this.#llamaModel });
    this.#llamaNode = new LlamaChatSession({ ...this.#llmConfig, context: this.#llamaContext });
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

    return [0];
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
      maxTokens: request.maxTokens ?? this.#llmConfig.maxTokens,
      temperature: request.temperature ?? this.#llmConfig.temperature,
      topP: request.topP ?? this.#llmConfig.topP,
      repeatPenalty: {
        presencePenalty:
          request.presencePenalty ?? (this.#llmConfig.repeatPenalty ? this.#llmConfig.repeatPenalty.presencePenalty : undefined),
        frequencyPenalty:
          request.frequencyPenalty ?? (this.#llmConfig.repeatPenalty ? this.#llmConfig.repeatPenalty.frequencyPenalty : undefined),
      }
    } satisfies Partial<LLamaChatPromptOptions>;
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
      repeatPenalty: {
        presencePenalty: 1.1,
        frequencyPenalty: 1.1
      }
    };
  }

  async #load() {
    if (this.#loaded) return;

    await this.#llamaNode.init();

    this.#loaded = true;
  }

  async #invokeLlamaNode<T>(
    invocationConfig: Partial<LLamaChatPromptOptions & { prompt: string }>,
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

    const handleAbort = () => {
      callerAbortSignal.removeEventListener("abort", handleAbort);
      this.abortController.abort();
    };

    // eslint-disable-next-line unicorn/consistent-function-scoping
    const stop = () => {
      this.abortController.abort();
    };

    callerAbortSignal.addEventListener("abort", handleAbort);
    return this.#llamaNode
      .prompt(
          invocationConfig.prompt ?? '',
        {
          ...this.#llmConfig,
          ...invocationConfig,
          signal: callerAbortSignal,
          onToken: (tokens) => {
              const decodedTokens = this.#llamaContext.decode(tokens);
              tokensGenerated += 1;

              let finishReason: FinishReason;
              if (tokensGenerated >= invocationConfig.maxTokens!) {
                  finishReason = "length";
                  this.abortController.abort();
              }
              
              onToken({ token: decodedTokens, finishReason, stop });
          }
        }
      )
      .then((result) => {
          if (result && onComplete) {
              onComplete();
          }
      })
      .catch((error: unknown) => {
        throw error;
      })
      .finally(() => {
        callerAbortSignal.removeEventListener("abort", handleAbort);
      });
  }
}
