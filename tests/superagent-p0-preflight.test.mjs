// Prevents a test consumer or an unisolated Worker from starting on good-looking self-reports alone.
import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptsTestMessage,
  assertWorkerBoundaryProbes,
  connectIsolatedFeishu,
  runWorkerBoundaryProbes,
} from "../experiments/superagent-p0/preflight.mjs";

const config = {
  appId: "test-app",
  productionAppId: "production-app",
  chatIds: ["chat-test"],
  databasePath: "/tmp/p0-test/runtime.db",
  inboxRoot: "/tmp/p0-test/inbox",
  outboxRoot: "/tmp/p0-test/outbox",
  productionDatabasePath: "/tmp/p0-production/runtime.db",
  productionInboxRoot: "/tmp/p0-production/inbox",
  productionOutboxRoot: "/tmp/p0-production/outbox",
  publishTarget: "test-target",
  productionPublishTarget: "production-target",
};

test("a production app ID, publish target, or state path blocks before lock or connection", async () => {
  for (const wrong of [
    { ...config, appId: "production-app" },
    { ...config, publishTarget: "production-target" },
    { ...config, databasePath: config.productionDatabasePath },
    { ...config, inboxRoot: config.productionInboxRoot },
    { ...config, outboxRoot: config.productionOutboxRoot },
  ]) {
    let locked = false;
    let connected = false;
    await assert.rejects(
      connectIsolatedFeishu({
        config: wrong,
        lock: { acquire: async () => { locked = true; } },
        connect: async () => { connected = true; },
      }),
      /隔离/,
    );
    assert.equal(locked, false);
    assert.equal(connected, false);
  }
});

test("a subscription lock failure prevents connection", async () => {
  let connected = false;
  await assert.rejects(
    connectIsolatedFeishu({
      config,
      lock: { acquire: async () => { throw new Error("already locked"); } },
      connect: async () => { connected = true; },
    }),
    /already locked/,
  );
  assert.equal(connected, false);
});

test("an isolated connection accepts only its test Chat and releases its lease on close", async () => {
  let released = false;
  const handle = await connectIsolatedFeishu({
    config,
    lock: { acquire: async () => ({ release: async () => { released = true; } }) },
    connect: async () => ({ id: "synthetic-connection" }),
  });
  assert.equal(handle.connection.id, "synthetic-connection");
  assert.equal(acceptsTestMessage(config, { chatId: "chat-test" }), true);
  assert.equal(acceptsTestMessage(config, { chatId: "chat-other" }), false);
  await handle.close();
  assert.equal(released, true);
});

test("Worker boundary probes reject a permissive launcher and accept actual denials plus positive paths", async () => {
  const results = await runWorkerBoundaryProbes(async (probe) => ({
    outcome: ["outside_file", "sentinel_credential", "unapproved_network"].includes(probe) ? "denied" : "allowed",
  }));
  assert.doesNotThrow(() => assertWorkerBoundaryProbes(results));
  const permissive = await runWorkerBoundaryProbes(async () => ({ outcome: "allowed" }));
  assert.throws(() => assertWorkerBoundaryProbes(permissive), /outside_file|sentinel_credential|unapproved_network/);
});
