import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  OpenCodeCognitiveRuntime,
  OpenCodeSessionBindingStore,
} from "../apps/syno/syno/opencode-cognitive-runtime.mjs";

async function temporaryFile(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-binding-store-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return path.join(root, "bindings.json");
}

test("Binding mutations use the latest state under one process lock", async (t) => {
  const file = await temporaryFile(t);
  const stores = Array.from({ length: 4 }, () => new OpenCodeSessionBindingStore({ file }));
  await Promise.all(Array.from({ length: 100 }, (_, index) =>
    stores[index % stores.length].bind({
      ownerKey: `owner-${index}`,
      threadKey: "main",
      openCodeSessionId: `session-${index}`,
    })));
  const bindings = await stores[0].list();
  assert.equal(bindings.length, 100);
  assert.equal(new Set(bindings.map((item) => item.openCodeSessionId)).size, 100);
  assert.ok(bindings.every((item) => item.lifecycle === "available"));
  const persisted = JSON.parse(await fs.readFile(file, "utf8"));
  assert.equal(persisted.version, 2);
  assert.equal(persisted.bindings.some((item) => Object.hasOwn(item, "active")), false);
});

test("acquire and beginDelete are one in-memory atomic competition", async (t) => {
  const file = await temporaryFile(t);
  const store = new OpenCodeSessionBindingStore({ file });
  await store.bind({ ownerKey: "owner", threadKey: "main", openCodeSessionId: "session-one" });
  const lease = await store.acquire("owner", "main");
  assert.ok(lease);
  assert.equal(await store.beginDelete("session-one"), null);
  lease.release();
  const deletion = await store.beginDelete("session-one");
  assert.ok(deletion);
  assert.equal(await store.acquire("owner", "main"), null);
  deletion.release();
  assert.ok(await store.acquire("owner", "main"));
});

test("long leases only warn and are never force released", async (t) => {
  const file = await temporaryFile(t);
  let now = new Date("2026-07-29T00:00:00Z");
  const store = new OpenCodeSessionBindingStore({
    file,
    clock: () => now,
    leaseWarningMs: 60_000,
  });
  await store.bind({ ownerKey: "owner", openCodeSessionId: "session-long" });
  const lease = await store.acquire("owner", "main");
  now = new Date("2026-07-29T00:02:00Z");
  assert.equal(store.leaseWarnings()[0].elapsedMs, 120_000);
  assert.equal(await store.beginDelete("session-long"), null);
  lease.release();
  assert.ok(await store.beginDelete("session-long"));
});

test("retention cleanup skips a leased Session and treats delete 404 as converged", async (t) => {
  const file = await temporaryFile(t);
  let now = new Date("2026-07-01T00:00:00Z");
  const store = new OpenCodeSessionBindingStore({ file, clock: () => now });
  await store.bind({ ownerKey: "owner", openCodeSessionId: "session-leased" });
  const lease = await store.acquire("owner", "main");
  now = new Date("2026-09-01T00:00:00Z");
  let deleteCalls = 0;
  const runtime = new OpenCodeCognitiveRuntime({
    bindings: store,
    client: {
      async deleteSession() {
        deleteCalls += 1;
        throw Object.assign(new Error("already gone"), { status: 404 });
      },
    },
    clock: () => now,
  });
  assert.equal((await runtime.cleanupExpired()).busy, 1);
  assert.equal(deleteCalls, 0);
  lease.release();
  assert.equal((await runtime.cleanupExpired()).deleted, 1);
  assert.equal(deleteCalls, 1);
  assert.equal((await store.list()).length, 0);
});

test("restart quarantine switches to a clean Session and tells the Owner", async (t) => {
  const file = await temporaryFile(t);
  const store = new OpenCodeSessionBindingStore({ file });
  await store.bind({ ownerKey: "owner", threadKey: "main", openCodeSessionId: "session-old" });
  const client = {
    async getSession() { throw Object.assign(new Error("cannot confirm"), { code: "ECONNRESET" }); },
    async createSession() { return { id: "session-clean" }; },
    async sendMessage() { return { parts: [{ type: "text", text: "模型结果" }] }; },
    async deleteSession() {},
  };
  const runtime = new OpenCodeCognitiveRuntime({ client, bindings: store });
  const recovery = await runtime.recoverBindings();
  assert.equal(recovery.quarantined, 1);
  const result = await runtime.run({ text: "继续" }, { ownerKey: "owner", threadKey: "main", allowedTools: [] });
  assert.equal(result.conversationId, "session-clean");
  assert.match(result.text, /^上下文状态无法确认，已切换到干净新会话。/);
  assert.match(result.text, /模型结果/);
});

test("404 recovery removes a missing Binding and delete unknown remains read-only", async (t) => {
  const file = await temporaryFile(t);
  let now = new Date("2026-07-01T00:00:00Z");
  const store = new OpenCodeSessionBindingStore({ file, clock: () => now });
  await store.bind({ ownerKey: "owner", openCodeSessionId: "session-missing" });
  const missingRuntime = new OpenCodeCognitiveRuntime({
    bindings: store,
    client: {
      async getSession() { throw Object.assign(new Error("gone"), { status: 404 }); },
      async deleteSession() {},
    },
    clock: () => now,
  });
  assert.equal((await missingRuntime.recoverBindings()).removed, 1);
  assert.equal((await store.list()).length, 0);

  await store.bind({ ownerKey: "owner", openCodeSessionId: "session-unknown" });
  now = new Date("2026-09-01T00:00:00Z");
  let deleteCalls = 0;
  const unknownRuntime = new OpenCodeCognitiveRuntime({
    bindings: store,
    client: {
      async deleteSession() { deleteCalls += 1; throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }); },
      async getSession() { return { id: "session-unknown" }; },
    },
    clock: () => now,
  });
  assert.equal((await unknownRuntime.cleanupExpired()).deletingUnknown, 1);
  assert.equal((await store.list())[0].lifecycle, "deleting_unknown");
  assert.equal((await unknownRuntime.recoverBindings()).deletingUnknown, 1);
  assert.equal(deleteCalls, 1, "recovery must reconcile read-only instead of retrying delete");
});

test("newConversation keeps the old Binding active when replace fails and tracks the new orphan", async () => {
  const orphaned = [];
  const bindings = {
    async active() { return { ownerKey: "owner", threadKey: "main", openCodeSessionId: "session-old", lifecycle: "available" }; },
    async replace() { throw Object.assign(new Error("disk full"), { code: "ENOSPC" }); },
    addOrphan(id) { orphaned.push(id); },
  };
  const runtime = new OpenCodeCognitiveRuntime({
    bindings,
    client: { async createSession() { return { id: "session-orphan" }; } },
  });
  await assert.rejects(runtime.newConversation({ ownerKey: "owner", threadKey: "main" }), { code: "ENOSPC" });
  assert.deepEqual(orphaned, ["session-orphan"]);
  assert.equal((await bindings.active()).openCodeSessionId, "session-old");
});
