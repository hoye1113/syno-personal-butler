import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { WeixinSessionMap } from "../packages/syno-dsh-plugin/plugins/channel-weixin/session-map.mjs";

test("weixin session map persists, reads back and clears owner/thread bindings", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-weixin-map-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const map = new WeixinSessionMap({ file: path.join(root, "sessions.json") });

  assert.equal(await map.get("local-user:main"), null);
  await map.set("local-user:main", "weixin-local-user-abc");
  assert.equal(await map.get("local-user:main"), "weixin-local-user-abc");
  await map.set("local-user:other", "weixin-local-user-def");
  assert.equal(await map.get("local-user:other"), "weixin-local-user-def");

  await map.clear("local-user:main");
  assert.equal(await map.get("local-user:main"), null);
  assert.equal(await map.get("local-user:other"), "weixin-local-user-def");
});
