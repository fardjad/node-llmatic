import type { Cradle } from "../container.ts";
import type { LlmAdapter } from "../llm-adapter.ts";
import { createTestContainer } from "../test-support/test-container.ts";
import type { CreateEmbeddingRequest } from "../types/create-embedding.ts";
import type { AwilixContainer } from "awilix";
import { type MockObject, expect, mockObject } from "earl";
import { test } from "node:test";

const testModelId = "test-model-id";
let testContainer: AwilixContainer<Cradle> | undefined;
let llmAdapter: MockObject<LlmAdapter> | undefined;

await test("createEmbeddingHandler", async (t) => {
  t.beforeEach(async () => {
    llmAdapter = mockObject<LlmAdapter>({
      async createEmbedding({ model, input }) {
        return [0];
      },
    });
  });

  t.afterEach(async () => {
    await testContainer!.dispose();
    testContainer = undefined;
  });

  await t.test("single string input", async () => {
    testContainer = await createTestContainer(llmAdapter!);
    const fastifyServer = testContainer.resolve("fastifyServer");
    const testModelInput = "test-model-input";

    const payload = JSON.stringify({
      model: testModelId,
      input: testModelInput,
    } as CreateEmbeddingRequest);

    const response = await fastifyServer.inject({
      url: "/v1/embeddings",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      payload,
    });

    expect(response.statusCode).toEqual(200);
    expect(llmAdapter!.createEmbedding).toHaveBeenCalledWith({
      input: testModelInput,
      model: testModelId,
    });
  });

  await t.test("multiple strings input", async () => {
    testContainer = await createTestContainer(llmAdapter!);
    const fastifyServer = testContainer.resolve("fastifyServer");
    const testModelInput = ["input1", "input2"];

    const payload = JSON.stringify({
      model: testModelId,
      input: testModelInput,
    } as CreateEmbeddingRequest);

    const response = await fastifyServer.inject({
      url: "/v1/embeddings",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      payload,
    });

    expect(response.statusCode).toEqual(200);
    expect(llmAdapter!.createEmbedding).toHaveBeenNthCalledWith(1, {
      input: testModelInput[0],
      model: testModelId,
    });
    expect(llmAdapter!.createEmbedding).toHaveBeenNthCalledWith(2, {
      input: testModelInput[1],
      model: testModelId,
    });
  });
});
