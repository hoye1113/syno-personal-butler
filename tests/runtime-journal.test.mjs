import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { RuntimeJournal } from "../apps/syno/syno/runtime-journal.mjs";

test("RuntimeJournal persists ordered JSONL events and redacts credentials", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-runtime-journal-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const journal = new RuntimeJournal({ root, now: () => new Date("2026-07-28T06:00:00.000Z") });

  await journal.record("opencode.start.requested", {
    pid: 4242,
    authorization: "Bearer must-not-leak",
    nested: { token: "must-not-leak", state: "starting" },
  });
  await journal.record("channel.message.failed", {
    channel: "weixin",
    error: { code: "OPENCODE_NOT_RUNNING", message: "OpenCode 尚未运行" },
  }, { level: "error" });

  const lines = (await fs.readFile(path.join(root, "syno-runtime-2026-07-28.jsonl"), "utf8"))
    .trim().split(/\r?\n/).map(JSON.parse);
  assert.deepEqual(lines.map((line) => line.event), [
    "opencode.start.requested",
    "channel.message.failed",
  ]);
  assert.equal(lines[0].data.authorization, "[REDACTED]");
  assert.equal(lines[0].data.nested.token, "[REDACTED]");
  assert.doesNotMatch(JSON.stringify(lines), /must-not-leak/);
  assert.equal(lines[1].level, "error");
});

test("RuntimeJournal redacts unlabeled provider keys, JWTs and secret query values", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-runtime-journal-dlp-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const journal = new RuntimeJournal({ root, now: () => new Date("2026-07-28T06:00:00.000Z") });
  await journal.record("diagnostic", {
    message: `${"sk-proj-" + "abcdefghijklmnopqrstuvwxyz123456"} eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature https://example.com/?token=must-not-leak`,
  });
  const log = await fs.readFile(path.join(root, "syno-runtime-2026-07-28.jsonl"), "utf8");
  assert.doesNotMatch(log, /sk-proj-|eyJhbGci|must-not-leak/);
});
