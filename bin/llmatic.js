#!/usr/bin/env node
import childProcess from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const tsx =
  import.meta.resolve &&
  // This can be removed once node 18 is EOL
  import.meta.resolve.constructor.name !== "AsyncFunction"
    ? fileURLToPath(import.meta.resolve("tsx/cli"))
    : createRequire(import.meta.url).resolve("tsx/cli");

childProcess.fork(tsx, [
  "--no-warnings",
  fileURLToPath(new URL("../src/cli/llmatic.ts", import.meta.url)),
  ...process.argv.slice(2),
]);
