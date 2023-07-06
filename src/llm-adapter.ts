export type FinishReason = undefined | "length" | "stop";
export enum Role {
  Assistant = "assistant",
  System = "system",
  User = "user",
}

export type LlmAdapterModel = { id: string; created: number; ownedBy: string };

export type LlmAdapterCreateEmbeddingRequest = {
  model: string;
  input: string;
};

export type LlmAdapterCreateEmbeddingResponse = number[];

export type LlmAdapterCreateCompletionRequest = {
  bestOf?: number;
  echo?: boolean;
  frequencyPenalty?: number;
  logitBias?: Record<string, any>;
  logprobs?: number;
  maxTokens?: number;
  model: string;
  n?: number;
  presencePenalty?: number;
  // TODO: Support other types
  prompt: string[];
  stop?: string[];
  suffix?: string;
  temperature?: number;
  topP?: number;
};

export type LlmAdapterCreateChatCompletionRequest = {
  frequencyPenalty?: number;
  logitBias?: Record<string, any>;
  maxTokens?: number;
  messages: Array<{
    content: string;
    name?: string;
    role: Role;
  }>;
  model: string;
  n?: number;
  presencePenalty?: number;
  stop?: string[];
  temperature?: number;
  topP?: number;
};

export type LlmAdapterCreateCompletionResponse = {
  index: number;
  // TODO: Figure out the type
  logprobs?: unknown;
  text: string;
  finishReason: FinishReason;
};

export type ChatCompletionDelta = {
  role?: Role;
  content?: string;
};

export type LlmAdapterCreateChatCompletionResponse = {
  index: number;
  delta: ChatCompletionDelta;
  finishReason?: string;
};

export abstract class LlmAdapter {
  static get defaultConfig(): Record<string, unknown> {
    throw new Error("Not implemented");
  }

  abstract listModels(): Promise<LlmAdapterModel[]>;

  abstract createEmbedding({
    model,
    input,
  }: LlmAdapterCreateEmbeddingRequest): Promise<LlmAdapterCreateEmbeddingResponse>;

  abstract createCompletion(
    createCompletionRequest: LlmAdapterCreateCompletionRequest,
    abortSignal: AbortSignal,
    onData: (data: LlmAdapterCreateCompletionResponse) => void,
  ): Promise<void>;

  abstract createChatCompletion(
    createChatCompletionRequest: LlmAdapterCreateChatCompletionRequest,
    abortSignal: AbortSignal,
    onData: (data: LlmAdapterCreateChatCompletionResponse) => void,
  ): Promise<void>;
}
