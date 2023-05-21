import fs from "node:fs";
import prettier from "prettier";

const OPENAI_OAS_URL =
  "https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml";

const response = await fetch(OPENAI_OAS_URL, {
  redirect: "follow",
});

const text = await response.text();
const formattedText = prettier.format(text, { parser: "yaml" });

fs.writeFileSync(new URL("../api.oas.yml", import.meta.url), formattedText, {
  encoding: "utf8",
});
