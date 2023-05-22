import fs from "node:fs";

export const readPackageJson = async () => {
  const packageJSONPath = new URL("../package.json", import.meta.url);
  return JSON.parse(await fs.promises.readFile(packageJSONPath));
};

export const fileExists = async (path) =>
  Boolean(await fs.promises.stat(path).catch(() => false));
