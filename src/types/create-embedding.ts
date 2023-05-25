export type CreateEmbeddingRequest = {
  /**
   * Input text to get embeddings for, encoded as a string or array of tokens. To get
   * embeddings for multiple inputs in a single request, pass an array of strings or array of
   * token arrays. Each input must not exceed 8192 tokens in length.
   */
  input: Array<number[] | number | string> | string;
  /**
   * ID of the model to use. You can use the [List models](/docs/api-reference/models/list)
   * API to see all of your available models, or see our [Model
   * overview](/docs/models/overview) for descriptions of them.
   */
  model: string;
  /**
   * A unique identifier representing your end-user, which can help OpenAI to monitor and
   * detect abuse. [Learn more](/docs/guides/safety-best-practices/end-user-ids).
   */
  user?: string;
};

export type CreateEmbeddingOkResponse = {
  data: Datum[];
  model: string;
  object: string;
  usage: Usage;
  [property: string]: any;
};

export type Datum = {
  embedding: number[];
  index: number;
  object: string;
  [property: string]: any;
};

export type Usage = {
  prompt_tokens: number;
  total_tokens: number;
  [property: string]: any;
};
