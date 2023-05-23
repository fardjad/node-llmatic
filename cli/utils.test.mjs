import {
  readPackageJson,
  fileExists,
  invokeInDirectory,
  importFile,
} from "./utils.mjs";
import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("readPackageJson", async () => {
  const { version } = await readPackageJson();
  assert.strictEqual(typeof version, "string");
});

test("fileExists", async (t) => {
  await t.test("file exists", async () => {
    const exists = await fileExists(new URL(import.meta.url));
    assert.strictEqual(exists, true);
  });

  await t.test("file does not exist", async () => {
    const exists = await fileExists("/does/not/exist");
    assert.strictEqual(exists, false);
  });
});

await test("invokeInDirectory", async (t) => {
  const newPath = path.resolve(fileURLToPath(new URL("../", import.meta.url)));

  await t.test(
    "should invoke a function in the specific directory",
    async () => {
      const cwd = process.cwd();
      const result = await invokeInDirectory(
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

    const result = await invokeInDirectory(newPath, async () => {
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

test("importFile", async () => {
  const utils = await importFile(
    fileURLToPath(new URL("utils.mjs", import.meta.url))
  );
  assert.ok(utils);
});
