import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { sweepStaleTempFiles } from "../scripts/syno-doctor.mjs";

test("doctor sweep removes only aged lock/index temp files", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-doctor-sweep-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const oldClaim = path.join(root, "locks", "host.lock.123.abc.claim");
  const freshTmp = path.join(root, "knowledge-index-v1.json.9.tmp");
  const unrelated = path.join(root, "keep.json");
  await fs.mkdir(path.dirname(oldClaim), { recursive: true });
  await fs.writeFile(oldClaim, "x");
  await fs.writeFile(freshTmp, "x");
  await fs.writeFile(unrelated, "x");
  const aged = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await fs.utimes(oldClaim, aged, aged);

  const removed = await sweepStaleTempFiles(root, { olderThanMs: 60 * 60 * 1000 });
  assert.deepEqual(removed, ["locks/host.lock.123.abc.claim"]);
  await assert.rejects(fs.stat(oldClaim), { code: "ENOENT" });
  assert.equal((await fs.stat(freshTmp)).isFile(), true);
  assert.equal((await fs.stat(unrelated)).isFile(), true);
});
