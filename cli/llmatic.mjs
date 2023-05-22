import { program } from "commander";
import { readPackageJson } from "./utils.mjs";

const { version, description } = await readPackageJson();

program
  .version(version)
  .description(description)
  .command("init", "configure LLMatic")
  .command("start", "start LLMatic server");

await program.parseAsync(process.argv);
