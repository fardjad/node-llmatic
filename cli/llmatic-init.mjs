import fs from "node:fs";
import path from "node:path";
import { input } from "@inquirer/prompts";
import select, { Separator } from "@inquirer/select";
import Downloader from "nodejs-file-downloader";
import isValidFilename from "valid-filename";
import { config } from "../config.mjs";

const downloadFile = (url, fileName) => {
  const downloader = new Downloader({
    url,
    directory: "./models",
    fileName,
    skipExistingFileName: true,
    maxAttempts: 3,
    shouldStop(error) {
      if (error.statusCode && error.statusCode === 404) {
        return true;
      }
    },
    onProgress(percentage) {
      process.stdout.write(
        `\r${String(Number(percentage).toFixed(2)).padStart(6, "0")}%`
      );
    },
  });

  return downloader.download();
};

const menu = async () => {
  const answer = await select({
    message: "What do you want to do?",
    choices: [
      {
        name: "Download a model",
        value: "download",
      },
      {
        name: "Generate a config file",
        value: "generateConfig",
      },
      new Separator(),
      {
        name: "Exit",
        value: "exit",
      },
    ],
  });

  if (answer === "download") {
    return downloadModel();
  }

  if (answer === "generateConfig") {
    return generateConfig();
  }
};

const generateConfig = async () => {
  const files = await fs.promises.readdir("./models");
  const binFiles = files.filter((file) => path.extname(file) === ".bin");

  if (binFiles.length === 0) {
    console.log("\n\n❌ No models found in ./models\n\n");
    return menu();
  }

  const choices = binFiles.map((file) => ({
    value: file,
  }));

  const answer = await select({
    message: "Select a model:",
    choices,
  });

  const newConfig = {
    ...config,
    llmConfig: { ...config.llmConfig, path: `./models/${answer}` },
  };

  await fs.promises.writeFile(
    "./llmatic.config.json",
    JSON.stringify(newConfig, null, 2)
  );

  console.log("\n\n📝 Generated config file: llmatic.config.json\n\n");

  return menu();
};

const downloadModel = async () => {
  const url = await input({
    message: "Enter the model URL:",
    validate(value) {
      try {
        // eslint-disable-next-line no-new
        new URL(value);
        return true;
      } catch {
        return "Please enter a valid URL";
      }
    },
  });

  const suggestedFileName = new URL(url).pathname.split("/").pop();
  const fileName = await input({
    message: "Enter the file name (will skip download if file exists):",
    default: suggestedFileName,
    validate(value) {
      if (!isValidFilename(value)) {
        return "Please enter a valid file name";
      }

      if (path.extname(value) !== ".bin") {
        return "File name must end with .bin";
      }

      return true;
    },
  });

  await downloadFile(url, fileName);
  return menu();
};

await menu();
