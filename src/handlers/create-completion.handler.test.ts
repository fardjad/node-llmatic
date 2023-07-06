/* eslint-disable @typescript-eslint/naming-convention */
import type { Cradle } from "../container.ts";
import { type LlmAdapter } from "../llm-adapter.ts";
import { createTestContainer } from "../test-support/test-container.ts";
import type { CreateCompletionRequest } from "../types/create-completion.ts";
import type { AwilixContainer } from "awilix";
import { type MockObject, expect, mockObject } from "earl";
import { test } from "node:test";

const testModelId = "test-model-id";
let testContainer: AwilixContainer<Cradle> | undefined;
let llmAdapter: MockObject<LlmAdapter> | undefined;

const createCompletionRequest: CreateCompletionRequest = {
  stream: false,

  best_of: 3,
  echo: true,
  frequency_penalty: 1,
  logit_bias: { "50256": -100 },
  logprobs: 5,
  max_tokens: 100,
  model: testModelId,
  n: 2,
  presence_penalty: 1.5,
  prompt: ["prompt1", "prompt2"],
  stop: "stop",
  suffix: "suffix",
  temperature: 0,
  top_p: 0.1,
};

await test("createCompletionHandler", async (t) => {
  t.beforeEach(async () => {
    llmAdapter = mockObject<LlmAdapter>({
      async createCompletion(createCompletionRequest, abortSignal, callback) {
        const { prompt, n } = createCompletionRequest;

        const count = prompt.length * (n ?? 1);
        for (let index = 0; index < count; index++) {
          callback({
            finishReason: "stop",
            index,
            text: `token ${index}`,
          });
        }
      },
    });
  });

  t.afterEach(async () => {
    await testContainer?.dispose();
    testContainer = undefined;
  });

  await t.test("stream cannot be set if best_of > 1", async (t) => {
    testContainer = await createTestContainer(llmAdapter!);
    const fastifyServer = testContainer.resolve("fastifyServer");

    const payload = JSON.stringify({
      model: testModelId,
      prompt: "test-prompt",

      best_of: 2,
      stream: true,
    } as CreateCompletionRequest);
    const response = await fastifyServer.inject({
      url: "/v1/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      payload,
    });

    expect(response.statusCode).toEqual(400);
  });

  await t.test("valid request with no errors", async () => {
    testContainer = await createTestContainer(llmAdapter!);
    const fastifyServer = testContainer.resolve("fastifyServer");

    const response = await fastifyServer.inject({
      url: "/v1/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      payload: JSON.stringify(createCompletionRequest),
    });

    expect(response.statusCode).toEqual(200);
    expect(llmAdapter!.createCompletion).toHaveBeenCalledWith(
      {
        model: testModelId,
        bestOf: createCompletionRequest.best_of,
        echo: createCompletionRequest.echo,
        frequencyPenalty: createCompletionRequest.frequency_penalty,
        logitBias: createCompletionRequest.logit_bias,
        logprobs: createCompletionRequest.logprobs,
        maxTokens: createCompletionRequest.max_tokens,
        n: createCompletionRequest.n,
        presencePenalty: createCompletionRequest.presence_penalty,
        // TODO: make this more specific
        prompt: expect.satisfies((prompt) => Array.isArray(prompt)),
        stop: (Array.isArray(createCompletionRequest.stop)
          ? createCompletionRequest.stop
          : [createCompletionRequest.stop]) as string[],
        suffix: createCompletionRequest.suffix,
        temperature: createCompletionRequest.temperature,
        topP: createCompletionRequest.top_p,
      },
      expect.anything(),
      expect.anything(),
    );
  });
});
