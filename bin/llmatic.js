#!/usr/bin/env node
import childProcess from "node:child_process";

childProcess.fork(
  new URL("../src/cli/llmatic.ts", import.meta.url),
  process.argv.slice(2),
  {
    execArgv: ["--no-warnings", "--loader", "tsx"],
  },
);
