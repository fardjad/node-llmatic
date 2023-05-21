const MODEL_NAME = "wizard-mega-13B.ggml.q5_1.bin";

export const llmConfig = {
  loadConfig: {
    path: new URL(`../models/${MODEL_NAME}`, import.meta.url),
  },
  invocationConfig: {
    nThreads: 8,
  },
};
