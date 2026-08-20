import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { defaultDeepseekKeyLoader } from "../apps/syno/syno/deepseek-key-loader.mjs";

test("defaultDeepseekKeyLoader reads only the deepseek entry and fails closed", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-deepseek-key-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const authFile = path.join(root, "auth.json");
  await fs.writeFile(authFile, JSON.stringify({ deepseek: { type: "api", key: "stored-key" }, opencode: { type: "oauth", refresh: "unrelated" } }));
  assert.equal(await defaultDeepseekKeyLoader({ authFile }), "stored-key");
  await fs.writeFile(authFile, JSON.stringify({ opencode: { type: "oauth" } }));
  assert.equal(await defaultDeepseekKeyLoader({ authFile }), "");
  await fs.writeFile(authFile, "not json");
  assert.equal(await defaultDeepseekKeyLoader({ authFile }), "");
  assert.equal(await defaultDeepseekKeyLoader({ authFile: path.join(root, "missing.json") }), "");
});
