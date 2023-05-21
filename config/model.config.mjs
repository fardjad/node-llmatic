import { glob } from "glob";

const modelNames = await glob("*.bin", {
  cwd: new URL("../models", import.meta.url),
});

export const modelConfig = {
  modelNames,
};
