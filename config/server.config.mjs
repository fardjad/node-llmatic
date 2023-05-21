import fs from "node:fs";
import yaml from "js-yaml";

export const serverConfig = {
  handlersDirectory: new URL("../handlers", import.meta.url),
  oasDocument: yaml.load(
    fs.readFileSync(new URL("../api.oas.yml", import.meta.url), {
      encoding: "utf8",
    })
  ),
};
