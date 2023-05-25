import fs from "node:fs";
import path from "node:path";

export const readPackageJson = async () => {
  const packageJsonPath = new URL("../../package.json", import.meta.url);

  return JSON.parse(
    await fs.promises.readFile(packageJsonPath, { encoding: "utf8" })
  ) as {
    [key: string]: unknown;

    version: string;
    description: string;
  };
};

export const fileExists = async (path: URL | string) =>
  Boolean(await fs.promises.stat(path).catch(() => false));

export const invokeInDirectory = async <T>(
  directory: string,
  callback: (
    previousWorkingDirectory: string,
    currentWorkingDirectory: string
  ) => T
) => {
  const cwd = process.cwd();
  process.chdir(directory);

  return Promise.resolve(callback(cwd, directory)).finally(() => {
    process.chdir(cwd);
  });
};

export const importFile = async <T>(filePath: string): Promise<T> => {
  const resolvedPath = path.resolve(filePath);
  const fileDirectory = path.dirname(resolvedPath);
  return invokeInDirectory(fileDirectory, async () =>
    import(resolvedPath).then((module) => (module.default ?? module) as T)
  );
};
