import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-shutdown-failure-"));
Object.assign(process.env, { NODE_ENV: "test", SYNO_REPO_ROOT: root, SYNO_LOCAL_DATA: path.join(root, "local"), SYNO_RUNTIME_ROOT: path.join(root, ".runtime") });
delete process.env.SYNO_KNOWLEDGE_ROOT;
const { createSynoRuntime } = await import("../apps/syno/syno/runtime.mjs");
test.after(() => fs.rm(root, { recursive: true, force: true }));
test("runtime close rejects cleanup failure, retains caller's lease and can retry", async () => {
  const events = [];
  let fail = true, released = false;
  const runtime = createSynoRuntime({ journal: { record: async event => { events.push(event); } }, harnessSupervisor: {
    status: () => ({ ready: false, profiles: {} }),
    stop: async () => { if (fail) throw Object.assign(new Error("fixture alive"), { code: "HARNESS_PROCESS_TREE_ALIVE" }); },
  } });
  await assert.rejects(runtime.close().then(() => { released = true; }), { code: "HARNESS_PROCESS_TREE_ALIVE" });
  assert.equal(released, false);
  assert.equal(events.includes("syno.shutdown.completed"), false);
  assert.equal(events.includes("syno.shutdown.harness_stop_failed"), true);
  fail = false;
  await runtime.close().then(() => { released = true; });
  assert.equal(released, true);
  assert.equal(events.filter(event => event === "syno.shutdown.completed").length, 1);
});
