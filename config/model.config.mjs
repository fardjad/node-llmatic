import { cleanEnv, str } from "envalid";

const environment = cleanEnv(process.env, {
  LLMATIC_MODEL_NAME: str(),
});

export const modelConfig = {
  modelNames: [environment.LLMATIC_MODEL_NAME],
};
