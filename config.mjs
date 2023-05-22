import { cpus } from "node:os";

export const config = {
  // TODO: Support loading a custom external adapter
  llmAdapter: undefined,

  // Contains the config for the default LLM adapter
  llmConfig: {
    // This should be set via the config file
    path: undefined,

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
    nTokPredict: Number.MAX_SAFE_INTEGER,
    topK: 40,
    topP: 0.95,
    temp: 0,
    repeatPenalty: 1.1,
  },
};
