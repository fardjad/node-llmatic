import fs from "node:fs";
import path from "node:path";

export const readPackageJson = async () => {
  const packageJSONPath = new URL("../package.json", import.meta.url);
  return JSON.parse(await fs.promises.readFile(packageJSONPath));
};

export const fileExists = async (path) =>
  Boolean(await fs.promises.stat(path).catch(() => false));

export const invokeInDirectory = async (directory, callback) => {
  const cwd = process.cwd();
  process.chdir(directory);

  return Promise.resolve(callback(cwd, directory)).finally(() => {
    process.chdir(cwd);
  });
};

export const importFile = async (filePath) => {
  const resolvedPath = path.resolve(filePath);
  const fileDirectory = path.dirname(resolvedPath);
  return invokeInDirectory(fileDirectory, () =>
    import(resolvedPath).then((module) => module.default ?? module)
  );
};
