const MODEL_NAME = "Wizard-Vicuna-13B-Uncensored.ggml.q5_1.bin";

export const llmConfig = {
  loadConfig: {
    path: new URL(`../models/${MODEL_NAME}`, import.meta.url),
  },
  invocationConfig: {
    nThreads: 8,
  },
};
