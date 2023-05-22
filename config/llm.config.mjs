import { cleanEnv, str, num } from "envalid";

const environment = cleanEnv(process.env, {
  LLMATIC_MODEL_NAME: str(),
  LLMATIC_N_THREADS: num({ default: 8 }),
});

export const llmConfig = {
  loadConfig: {
    path: new URL(
      `../models/${environment.LLMATIC_MODEL_NAME}`,
      import.meta.url
    ),
  },
  invocationConfig: {
    nThreads: environment.LLMATIC_N_THREADS,
  },
};
