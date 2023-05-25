import * as cliUtils from "./cli-utils.ts";
import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

await test("readPackageJson", async () => {
  const { version } = await cliUtils.readPackageJson();
  assert.strictEqual(typeof version, "string");
});

await test("fileExists", async (t) => {
  await t.test("file exists", async () => {
    const exists = await cliUtils.fileExists(new URL(import.meta.url));
    assert.strictEqual(exists, true);
  });

  await t.test("file does not exist", async () => {
    const exists = await cliUtils.fileExists("/does/not/exist");
    assert.strictEqual(exists, false);
  });
});

await test("invokeInDirectory", async (t) => {
  const newPath = path.resolve(fileURLToPath(new URL("../", import.meta.url)));

  await t.test(
    "should invoke a function in the specific directory",
    async () => {
      const cwd = process.cwd();
      const result = await cliUtils.invokeInDirectory(
        newPath,
        (previousWorkingDirectory, currentWorkingDirectory) => {
          assert.strictEqual(previousWorkingDirectory, cwd);
          assert.strictEqual(currentWorkingDirectory, process.cwd());

          return process.cwd();
        }
      );
      assert.strictEqual(process.cwd(), cwd);
      assert.strictEqual(result, newPath);
    }
  );

  await t.test("should await promises before returning a result", async () => {
    let count = 0;

    const result = await cliUtils.invokeInDirectory(newPath, async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      count += 1;

      return count;
    });

    assert.strictEqual(count, 1);
    assert.strictEqual(result, count);
  });
});

await test("importFile", async () => {
  const importedModule = await cliUtils.importFile<typeof cliUtils>(
    fileURLToPath(new URL("cli-utils.ts", import.meta.url))
  );
  assert.strictEqual(importedModule, cliUtils);
});
