import { Option } from "commander";
import { fileURLToPath } from "node:url";

export const llmAdapterOption = new Option(
  "-a, --llm-adapter <path>",
  "llm adapter path"
).default(
  fileURLToPath(new URL("../default-llm-adapter.mjs", import.meta.url))
);
