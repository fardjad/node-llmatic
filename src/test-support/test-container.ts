import { createContainer } from "../container.ts";
import type { LlmAdapter } from "../llm-adapter.ts";
import awilix from "awilix";

// TODO: Allow overriding sseHelper and add seperate tests for stream=true and stream=false
export const createTestContainer = async (llmadapter: LlmAdapter) => {
  const container = createContainer([
    {
      token: "llmConfig",
      resolver: () => awilix.asValue({}),
    },
    {
      token: "llmAdapter",
      resolver: () => awilix.asValue(llmadapter),
    },
  ]);

  return container;
};
