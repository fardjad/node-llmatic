/* eslint-disable no-await-in-loop */
import {
  LlmAdapter,
  type LlmAdapterCreateChatCompletionRequest,
  type LlmAdapterCreateChatCompletionResponse,
  type LlmAdapterCreateCompletionRequest,
  type LlmAdapterCreateCompletionResponse,
  type LlmAdapterCreateEmbeddingRequest,
  type LlmAdapterCreateEmbeddingResponse,
  type LlmAdapterModel,
  Role,
} from "llmatic/llm-adapter";

type AdapterConfig = Record<string, unknown>;

export default class CustomLlmAdapter extends LlmAdapter {
  #llmConfig: Record<string, unknown>;

  constructor(llmConfig: AdapterConfig) {
    super();

    this.#llmConfig = { ...CustomLlmAdapter.defaultConfig, ...llmConfig };
  }

  async createChatCompletion(
    createChatCompletionRequest: LlmAdapterCreateChatCompletionRequest,
    abortSignal: AbortSignal,
    onData: (data: LlmAdapterCreateChatCompletionResponse) => void
  ): Promise<void> {
    const { messages, n } = createChatCompletionRequest;

    const count = messages.length * (n ?? 1);
    for (let tokenIndex = 0; tokenIndex < count; tokenIndex++) {
      onData({
        finishReason: "stop",
        index: 0,
        delta:
          tokenIndex === 0
            ? { role: Role.Assistant }
            : { content: `token ${tokenIndex}\n` },
      });
    }
  }

  async listModels(): Promise<LlmAdapterModel[]> {
    return [
      {
        id: "fake-model",
        created: 0,
        ownedBy: "unknown",
      },
    ];
  }

  async createEmbedding({
    model,
    input,
  }: LlmAdapterCreateEmbeddingRequest): Promise<LlmAdapterCreateEmbeddingResponse> {
    return [0];
  }

  async createCompletion(
    createCompletionRequest: LlmAdapterCreateCompletionRequest,
    abortSignal: AbortSignal,
    onData: (data: LlmAdapterCreateCompletionResponse) => void
  ): Promise<void> {
    const { prompt, n } = createCompletionRequest;

    const count = prompt.length * (n ?? 1);
    for (let index = 0; index < count; index++) {
      onData({
        finishReason: "stop",
        index,
        text: `token ${index}`,
      });
    }
  }

  static get defaultConfig() {
    return {};
  }
}
