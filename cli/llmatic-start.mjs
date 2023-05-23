/* eslint-disable unicorn/no-process-exit */
import { createContainer, diTokens } from "../container.mjs";
import { llmAdapterOption } from "./common-options.mjs";
import { fileExists, importFile, readPackageJson } from "./utils.mjs";
import awilix from "awilix";
import { Option, program } from "commander";
import fs from "node:fs";

const { version } = await readPackageJson();

program
  .version(version)
  .description("Start LLMatic server")
  .addOption(
    new Option("-c, --config [path]", "config file path").default(
      "llmatic.config.json"
    )
  )
  .addOption(llmAdapterOption)
  .addOption(
    new Option("-p --port [port]", "port to listen on").default("3000")
  )
  .addOption(
    new Option("-h --host [port]", "host to listen on").default("localhost")
  )
  .action(
    async ({
      llmAdapter: llmAdapterPath,
      config: configFilePath,
      port,
      host,
    }) => {
      if (!(await fileExists(configFilePath))) {
        console.error(`File ${configFilePath} not found.`);
        process.exit(1);
      }

      const llmConfig = JSON.parse(
        await fs.promises.readFile(configFilePath, "utf8")
      );

      const container = await createContainer([
        {
          token: diTokens.llmConfig,
          resolver() {
            return awilix.asValue(llmConfig);
          },
        },
        {
          token: diTokens.llmAdapter,
          async resolver() {
            return awilix.asClass(await importFile(llmAdapterPath));
          },
        },
      ]);
      const fastifyServer = container.resolve(diTokens.fastifyServer);
      await fastifyServer.listen({ port: Number(port), host });
    }
  );

await program.parseAsync(process.argv);
