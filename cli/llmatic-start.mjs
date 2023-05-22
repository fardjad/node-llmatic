/* eslint-disable unicorn/no-process-exit */

import fs from "node:fs";
import { Option, program } from "commander";
import awilix from "awilix";
import { fileExists, readPackageJson } from "./utils.mjs";
import { createContainer, diTokens } from "../container.mjs";
import { config as defaultConfig } from "../config.mjs";

const { version } = await readPackageJson();

program
  .version(version)
  .description("Start LLMatic server")
  .addOption(
    new Option("-c, --config [path]", "config file path").default(
      "llmatic.config.json"
    )
  )
  .addOption(
    new Option("-p --port [port]", "port to listen on").default("3000")
  )
  .addOption(
    new Option("-h --host [port]", "host to listen on").default("localhost")
  )
  .action(async ({ config: configFilePath, port, host }) => {
    if (!(await fileExists(configFilePath))) {
      console.error(`File ${configFilePath} not found.`);
      process.exit(1);
    }

    const config = {
      ...defaultConfig,
      ...JSON.parse(await fs.promises.readFile(configFilePath, "utf8")),
    };

    const container = await createContainer([
      {
        token: diTokens.llmConfig,
        resolver() {
          return awilix.asValue(config.llmConfig);
        },
      },
    ]);
    const fastifyServer = container.resolve(diTokens.fastifyServer);
    await fastifyServer.listen({ port: Number(port), host });
  });

await program.parseAsync(process.argv);
