/* eslint-disable @typescript-eslint/naming-convention */
import type { Cradle } from "../container.ts";
import { type LlmAdapter } from "../llm-adapter.ts";
import { createTestContainer } from "../test-support/test-container.ts";
import {
  Role,
  type CreateChatCompletionRequest,
} from "../types/create-chat-completion.ts";
import type { AwilixContainer } from "awilix";
import { type MockObject, expect, mockObject } from "earl";
import { test } from "node:test";

const testModelId = "test-model-id";
let testContainer: AwilixContainer<Cradle> | undefined;
let llmAdapter: MockObject<LlmAdapter> | undefined;

const createChatCompletionRequest: CreateChatCompletionRequest = {
  messages: [
    { content: "prompt1", role: Role.System },
    { content: "prompt2", role: Role.User },
    { content: "prompt3", role: Role.Assistant },
  ],
  model: testModelId,
  frequency_penalty: 0.5,
  logit_bias: { "50256": -100 },
  max_tokens: 100,
  n: 2,
  presence_penalty: 1.5,
  stop: "stop",
  stream: false,
  temperature: 0,
  top_p: 0.1,
};

await test("createChatCompletionHandler", async (t) => {
  t.beforeEach(async () => {
    llmAdapter = mockObject<LlmAdapter>({
      async createChatCompletion(
        createChatCompletionRequest,
        abortSignal,
        callback
      ) {
        const { messages, n } = createChatCompletionRequest;

        const count = messages.length * (n ?? 1);
        for (let tokenIndex = 0; tokenIndex < count; tokenIndex++) {
          callback({
            finishReason: "stop",
            index: 0,
            delta:
              tokenIndex === 0
                ? { role: Role.Assistant }
                : { content: `token ${tokenIndex}\n` },
          });
        }
      },
    });
  });

  t.afterEach(async () => {
    await testContainer?.dispose();
    testContainer = undefined;
  });

  await t.test("valid request with no errors", async () => {
    testContainer = await createTestContainer(llmAdapter!);
    const fastifyServer = testContainer.resolve("fastifyServer");

    const response = await fastifyServer.inject({
      url: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      payload: JSON.stringify(createChatCompletionRequest),
    });

    expect(response.statusCode).toEqual(200);

    expect(llmAdapter!.createChatCompletion).toHaveBeenCalledWith(
      {
        messages: createChatCompletionRequest.messages,
        model: testModelId,
        frequencyPenalty: createChatCompletionRequest.frequency_penalty,
        logitBias: createChatCompletionRequest.logit_bias,
        maxTokens: createChatCompletionRequest.max_tokens,
        n: createChatCompletionRequest.n,
        presencePenalty: createChatCompletionRequest.presence_penalty,
        stop: (Array.isArray(createChatCompletionRequest.stop)
          ? createChatCompletionRequest.stop
          : [createChatCompletionRequest.stop]) as string[],
        temperature: createChatCompletionRequest.temperature,
        topP: createChatCompletionRequest.top_p,
      },
      expect.anything(),
      expect.anything()
    );
  });
});
