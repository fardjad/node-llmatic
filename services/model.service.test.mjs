/* eslint-disable camelcase */

import { test } from "node:test";
import assert from "node:assert";
import { createContainer, diTokens } from "../container.mjs";
import awilix from "awilix";

const modelNames = ["foo", "bar"];
const container = await createContainer([
  {
    token: diTokens.modelConfig,
    resolver: () => awilix.asValue({ modelNames }),
  },
]);
const modelService = container.resolve(diTokens.modelService);

test("getModels", async () => {
  const models = await modelService.getModels();

  assert.strictEqual(models.object, "list");
  assert.equal(models.data.length, modelNames.length);
});

test("getModel", async (t) => {
  await t.test("should return undefined if model does not exist", async () => {
    const model = await modelService.getModel("nonexistent");
    assert.equal(model, undefined);
  });

  await t.test("should return the model if it exists", async () => {
    const model = await modelService.getModel(modelNames[0]);
    assert.deepEqual(model, {
      created: 0,
      id: "foo",
      object: "model",
      owned_by: "unknown",
      permission: [],
    });
  });
});
