import type { Cradle } from "../container.ts";
import type { LlmAdapter } from "../llm-adapter.ts";
import { createTestContainer } from "../test-support/test-container.ts";
import type { AwilixContainer } from "awilix";
import { type MockObject, expect, mockObject } from "earl";
import { test } from "node:test";

const testModelId = "test-model-id";
let testContainer: AwilixContainer<Cradle> | undefined;
let llmAdapter: MockObject<LlmAdapter> | undefined;

test.beforeEach(() => {
  llmAdapter = mockObject<LlmAdapter>({
    async listModels() {
      return [{ created: 0, id: testModelId, ownedBy: "ownedBy" }];
    },
  });
});

test.afterEach(async () => {
  await testContainer!.dispose();
  testContainer = undefined;
});

await test("listModelsHandler", async () => {
  testContainer = await createTestContainer(llmAdapter!);
  const fastifyServer = testContainer.resolve("fastifyServer");
  const response = await fastifyServer.inject({
    url: "/v1/models",
    method: "GET",
    headers: {},
  });

  expect(response.statusCode).toEqual(200);
  expect(llmAdapter!.listModels).toHaveBeenCalled();
});
