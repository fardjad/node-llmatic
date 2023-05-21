import { test } from "node:test";
import assert from "node:assert";
import { validateHandler } from "./openapi-glue-config-factory.mjs";

test("validateHandler", async (t) => {
  await t.test("missing handle method", () => {
    const handler = {};
    assert.throws(() => validateHandler(handler));
  });

  await t.test("missing operationId static property", () => {
    const handler = { handle() {} };
    assert.throws(() => validateHandler(handler));
  });

  await t.test("valid handler", () => {
    class Handler {
      static operationId = "test";
      handle() {}
    }

    const handler = new Handler();
    validateHandler(handler);
  });
});
