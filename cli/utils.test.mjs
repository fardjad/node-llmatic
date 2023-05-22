import { test } from "node:test";
import assert from "node:assert";
import { readPackageJson, fileExists } from "./utils.mjs";

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
