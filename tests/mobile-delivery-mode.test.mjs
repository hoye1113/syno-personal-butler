import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ChannelConversationHandler } from "../apps/syno/syno/channel-conversation-handler.mjs";
import { MobileDeliveryMode } from "../apps/syno/syno/mobile-delivery-mode.mjs";
import { createControlMutationLock, routeSynoApi } from "../apps/syno/syno/runtime.mjs";
import { runCutover } from "../scripts/cutover-mobile-delivery.mjs";

test("MobileDeliveryMode keeps v2 cutover behind Owner, ingress and legacy gates", () => {
  const mode = new MobileDeliveryMode();
  assert.equal(mode.current(), "legacy");
  assert.throws(() => mode.set("v2"), { code: "MOBILE_V2_CUTOVER_BLOCKED" });
  assert.equal(mode.set("shadow"), "shadow");
  assert.equal(mode.set("v2", { ownerAcceptance: true, ingressFrozen: true, legacyNonTerminal: 0 }), "v2");
});

test("MobileDeliveryMode persists an approved transition and restores it after Host restart", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-mobile-delivery-mode-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateFile = path.join(root, "mobile-delivery-mode.json");
  const first = new MobileDeliveryMode({ stateFile });
  await first.commit("shadow");
  const restored = new MobileDeliveryMode({ stateFile });
  await restored.load();
  assert.equal(restored.current(), "shadow");
  await assert.rejects(
    restored.commit("v2", { ownerAcceptance: true, ingressFrozen: true, legacyNonTerminal: 1 }),
    { code: "MOBILE_V2_CUTOVER_BLOCKED" },
  );
  await restored.commit("v2", { ownerAcceptance: true, ingressFrozen: true, legacyNonTerminal: 0, evidenceRef: "owner-r6" });
  const final = new MobileDeliveryMode({ stateFile });
  await final.load();
  assert.equal(final.current(), "v2");
});

test("mobile cutover requires owner evidence and drains all legacy requests before persisting v2", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-mobile-cutover-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const mode = new MobileDeliveryMode({ stateFile: path.join(root, "mode.json") });
  const acceptance = {
    status: "owner_passed",
    performedBy: "owner",
    result: "passed",
    checks: [{ performedBy: "owner", result: "passed", evidenceRef: "ops/acceptance/r6.json" }],
  };
  const store = { async list() { return [{ status: "delivered" }]; } };
  const preview = await runCutover({ acceptance, store, mode, ingressFrozen: true, confirm: false });
  assert.equal(preview.status, "preview_only");
  assert.equal(mode.current(), "legacy");
  const persisted = await runCutover({ acceptance, store, mode, ingressFrozen: true, confirm: true });
  assert.equal(persisted.status, "persisted");
  assert.equal(mode.current(), "v2");
});

test("v2 mobile handler persists before returning and sends final through the same Outbox", async () => {
  const updates = [];
  const events = [];
  const acceptedRequests = {
    async accept(input) {
      return {
        created: true,
        request: {
          requestId: "request-v2-1",
          ownerKey: input.ownerKey,
          originChannel: input.originChannel,
          platformMessageId: input.platformMessageId,
          threadKey: input.threadKey,
        },
      };
    },
    async update(id, patch) { updates.push({ id, patch }); return { requestId: id, ...patch }; },
  };
  const outbox = {
    async enqueue(input) {
      const event = { eventId: `event-${events.length + 1}`, ...input };
      events.push(event);
      return { created: true, event };
    },
  };
  const handler = new ChannelConversationHandler({
    runtime: { async run() { return { text: "最终结果" }; } },
    core: {},
    ingest: {},
    pendingDecisions: {},
    acceptedRequests,
    channelDeliveryOutbox: outbox,
    mobileDeliveryMode: new MobileDeliveryMode({ mode: "v2" }),
  });
  const response = await handler.handle({
    id: "wx-v2-1",
    ownerKey: "owner",
    senderId: "owner",
    contextToken: "ctx",
    channel: "weixin",
    text: "移动 v2 测试",
  });
  assert.equal(response.deferredDelivery, true);
  assert.equal(events[0].responseKind, "ack");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(events[1].responseKind, "final");
  assert.equal(events[1].targetChannel, "weixin");
  assert.equal(updates.some((item) => item.patch.status === "final_pending"), true);
});

test("mobile delivery diagnostics expose only aggregate AcceptedRequest, Outbox and Unknown status", async () => {
  const result = await routeSynoApi({
    mobileDeliveryMode: { snapshot: () => ({ mode: "legacy", supportedModes: ["legacy", "shadow", "v2"] }) },
    acceptedRequests: { async list() { return [{ status: "accepted" }, { status: "delivered" }]; } },
    channelDeliveryOutbox: { async list() { return [{ status: "pending" }, { status: "delivery_unknown" }]; } },
    reconciliationCases: { async list() { return [{ status: "open" }]; } },
  }, { method: "GET" }, new URL("http://localhost/api/syno/mobile-delivery"), async () => ({}));
  assert.deepEqual(result, {
    mode: "legacy",
    supportedModes: ["legacy", "shadow", "v2"],
    acceptedRequests: { total: 2, byStatus: { accepted: 1, delivered: 1 } },
    outbox: { total: 2, byStatus: { pending: 1, delivery_unknown: 1 } },
    unknownCases: { total: 1, byStatus: { open: 1 } },
    proactive: { eligibleSignals: 0, pendingBundles: 0, deliveryUnknown: 0, homeChannel: null, homeTargetAvailable: false, lastDeliveredAt: null },
  });
});

test("proactive preview API is read-only and returns only the redacted release summary", async () => {
  let calls = 0;
  const expected = {
    enabled: false,
    homeChannel: "weixin",
    homeTargetAvailable: true,
    eligibleSignals: 2,
    bundle: { bundleId: "proactive-redacted", signalCount: 2, remainingCount: 0 },
  };
  const result = await routeSynoApi({
    proactive: {
      async preview() {
        calls += 1;
        return expected;
      },
    },
  }, { method: "GET" }, new URL("http://localhost/api/syno/proactive/preview"), async () => {
    throw new Error("GET preview must not read a request body");
  });

  assert.equal(calls, 1);
  assert.deepEqual(result, expected);
});

test("proactive release API separates migration, controlled test and live enable gates", async () => {
  const calls = [];
  let outboxRecords = [];
  const values = {
    "notifications.proactiveDeliveryEnabled": false,
    "notifications.proactiveReleaseEvidence": null,
    "notifications.proactiveTestEventId": null,
  };
  const runtime = {
    channels: { homeChannel: "weixin" },
    proactive: {
      async migrateLedger() { calls.push(["migrate"]); return { status: "migrated", version: 2 }; },
      async triggerTest(runId) { calls.push(["test", runId]); return { eventId: "outbox-test-1", runId }; },
      async releaseStatus() { return { migrationComplete: true }; },
    },
    channelDeliveryOutbox: {
      async list() { return outboxRecords; },
      async get(eventId) {
        const event = outboxRecords.find((item) => item.eventId === eventId);
        if (!event) throw Object.assign(new Error("missing"), { code: "ENOENT" });
        return event;
      },
    },
    settingsRegistry: {
      async get(key) { return values[key]; },
      async set(key, value, options) {
        values[key] = value;
        calls.push(["set", key, value, options.confirmed, options.evidenceRef, options.releaseEvidenceVerified, options.proactiveTestAuthorizationVerified]);
        return { key, value };
      },
    },
  };

  const migrated = await routeSynoApi(
    runtime,
    { method: "POST" },
    new URL("http://localhost/api/syno/proactive/migrate"),
    async () => ({ confirmed: true }),
  );
  assert.equal(migrated.status, "migrated");

  const testEvent = await routeSynoApi(
    runtime,
    { method: "POST" },
    new URL("http://localhost/api/syno/proactive/test"),
    async () => ({ confirmed: true, runId: "release-20260730" }),
  );
  assert.equal(testEvent.eventId, "outbox-test-1");

  await assert.rejects(
    routeSynoApi(
      runtime,
      { method: "POST" },
      new URL("http://localhost/api/syno/settings"),
      async () => ({ key: "notifications.proactiveDeliveryEnabled", value: true, confirmed: true, evidenceEventId: "outbox-test-1" }),
    ),
    { code: "PROACTIVE_TEST_REQUIRED" },
  );

  outboxRecords = [{
    eventId: "outbox-test-1",
    sourceType: "proactive_bundle",
    ownerKey: "local-user",
    targetChannel: "weixin",
    deliveryKey: "proactive-test:release-20260730:weixin:v1",
    status: "delivered",
  }];
  const confirmation = await routeSynoApi(
    runtime,
    { method: "POST" },
    new URL("http://localhost/api/syno/proactive/confirm-test"),
    async () => ({
      confirmed: true,
      eventId: "outbox-test-1",
      runId: "release-20260730",
      visibleCount: 1,
      order: "single",
      result: "passed",
    }),
  );
  assert.equal(confirmation.value.performedBy, "owner");

  const enabled = await routeSynoApi(
    runtime,
    { method: "POST" },
    new URL("http://localhost/api/syno/settings"),
    async () => ({ key: "notifications.proactiveDeliveryEnabled", value: true, confirmed: true, evidenceEventId: "outbox-test-1" }),
  );
  assert.equal(enabled.value, true);
  assert.deepEqual(calls, [
    ["migrate"],
    ["test", "release-20260730"],
    ["set", "notifications.proactiveReleaseEvidence", {
      eventId: "outbox-test-1",
      runId: "release-20260730",
      homeChannel: "weixin",
      visibleCount: 1,
      order: "single",
      performedBy: "owner",
      result: "passed",
      confirmedAt: confirmation.value.confirmedAt,
    }, true, undefined, true, undefined],
    ["set", "notifications.proactiveDeliveryEnabled", true, true, "outbox-test-1", undefined, undefined],
  ]);
});

test("changing Home Channel pauses proactive delivery and invalidates channel-bound release state", async () => {
  const calls = [];
  const values = {
    "notifications.proactiveDeliveryEnabled": true,
    "notifications.proactiveReleaseEvidence": { eventId: "outbox-old", homeChannel: "weixin" },
    "notifications.proactiveTestEventId": "outbox-pending-old",
  };
  const runtime = {
    channels: {
      homeChannel: "weixin",
      status() { return { weixin: { home: true }, feishu: { home: false } }; },
      async setHome(channel) {
        this.homeChannel = channel;
        calls.push(["home", channel]);
        return { weixin: { home: false }, feishu: { home: true } };
      },
    },
    settingsRegistry: {
      async set(key, value, options) {
        values[key] = value;
        calls.push(["set", key, value, options]);
        return { key, value };
      },
    },
    channelDeliveryOutbox: {
      async beginProactiveTargetCutover(ownerKey, channel) {
        calls.push(["freeze", ownerKey, channel]);
        return { release() { calls.push(["release", ownerKey, channel]); } };
      },
    },
  };

  await routeSynoApi(
    runtime,
    { method: "POST" },
    new URL("http://localhost/api/syno/channels/home"),
    async () => ({ channel: "feishu" }),
  );

  assert.equal(values["notifications.proactiveDeliveryEnabled"], false);
  assert.equal(values["notifications.proactiveReleaseEvidence"], null);
  assert.equal(values["notifications.proactiveTestEventId"], null);
  assert.equal(runtime.channels.homeChannel, "feishu");
  assert.deepEqual(calls.map((item) => item.slice(0, 3)), [
    ["set", "notifications.proactiveDeliveryEnabled", false],
    ["freeze", "local-user", "weixin"],
    ["home", "feishu"],
    ["set", "notifications.proactiveReleaseEvidence", null],
    ["set", "notifications.proactiveTestEventId", null],
    ["release", "local-user", "weixin"],
  ]);
});

test("invalid Home Channel leaves proactive release state untouched", async () => {
  const calls = [];
  const runtime = {
    channels: {
      homeChannel: "weixin",
      status() { return { weixin: { home: true }, feishu: { home: false } }; },
      async setHome() { throw new Error("must not be called"); },
    },
    settingsRegistry: {
      async set(...args) { calls.push(args); },
    },
  };

  await assert.rejects(
    routeSynoApi(
      runtime,
      { method: "POST" },
      new URL("http://localhost/api/syno/channels/home"),
      async () => ({ channel: "missing" }),
    ),
    { code: "CHANNEL_NOT_FOUND" },
  );
  assert.deepEqual(calls, []);
});

test("a Home switch concurrent with a proactive enable never leaves delivery enabled without matching evidence", async () => {
  const values = {
    "notifications.proactiveDeliveryEnabled": false,
    "notifications.proactiveReleaseEvidence": {
      eventId: "outbox-test-1",
      runId: "release-20260730",
      homeChannel: "weixin",
      visibleCount: 1,
      order: "single",
      performedBy: "owner",
      result: "passed",
      confirmedAt: "2026-07-30T00:00:00.000Z",
    },
    "notifications.proactiveTestEventId": null,
  };
  const outboxRecords = [{
    eventId: "outbox-test-1",
    sourceType: "proactive_bundle",
    ownerKey: "local-user",
    targetChannel: "weixin",
    deliveryKey: "proactive-test:release-20260730:weixin:v1",
    status: "delivered",
  }];
  const settingsSets = [];
  const frozen = [];
  // Gate the enable inside its critical section, after it reads the release evidence but before it commits
  // enabled=true. Without the shared lock a concurrent switch would clear evidence and switch Home while the
  // enable is parked, then the enable would write enabled=true last — yielding new Home + enabled + null evidence.
  let releaseEnable;
  const enableHold = new Promise((resolve) => { releaseEnable = resolve; });
  let enableReadEvidence = false;
  const runtime = {
    controlMutationLock: createControlMutationLock(),
    channels: {
      homeChannel: "weixin",
      status() { return { weixin: { home: true }, feishu: { home: false } }; },
      async setHome(channel) { this.homeChannel = channel; return this.status(); },
    },
    proactive: { async releaseStatus() { return { migrationComplete: true }; } },
    channelDeliveryOutbox: {
      async get(eventId) {
        if (eventId === "outbox-test-1" && !enableReadEvidence) {
          enableReadEvidence = true;
          await enableHold;
        }
        const event = outboxRecords.find((item) => item.eventId === eventId);
        if (!event) throw Object.assign(new Error("missing"), { code: "ENOENT" });
        return event;
      },
      async beginProactiveTargetCutover(ownerKey, channel) {
        frozen.push(channel);
        return { release() {} };
      },
    },
    settingsRegistry: {
      async get(key) { return values[key]; },
      async set(key, value) { values[key] = value; settingsSets.push([key, value]); return { key, value }; },
    },
  };

  const enable = routeSynoApi(runtime, { method: "POST" }, new URL("http://localhost/api/syno/settings"), async () => ({
    key: "notifications.proactiveDeliveryEnabled",
    value: true,
    confirmed: true,
    evidenceEventId: "outbox-test-1",
  }));
  const switching = routeSynoApi(runtime, { method: "POST" }, new URL("http://localhost/api/syno/channels/home"), async () => ({ channel: "feishu" }));

  await new Promise((resolve) => setImmediate(resolve));
  // The enable holds the control-plane lock at its evidence read; the switch is queued and has mutated nothing.
  assert.equal(enableReadEvidence, true);
  assert.equal(runtime.channels.homeChannel, "weixin");
  assert.deepEqual(settingsSets, []);
  assert.deepEqual(frozen, []);
  assert.equal(values["notifications.proactiveReleaseEvidence"].homeChannel, "weixin");

  releaseEnable();
  await Promise.allSettled([enable, switching]);

  // The switch runs last under the lock and keeps the final word: new Home, delivery paused, evidence cleared.
  assert.equal(runtime.channels.homeChannel, "feishu");
  assert.equal(values["notifications.proactiveDeliveryEnabled"], false);
  assert.equal(values["notifications.proactiveReleaseEvidence"], null);
  assert.equal(values["notifications.proactiveTestEventId"], null);
  assert.deepEqual(frozen, ["weixin"]);
});

test("two concurrent Home switches freeze both the original and the intermediate Home under the control lock", async () => {
  const frozen = [];
  let releaseFirst;
  const firstHold = new Promise((resolve) => { releaseFirst = resolve; });
  let firstCutoverEntered = false;
  const runtime = {
    controlMutationLock: createControlMutationLock(),
    channels: {
      homeChannel: "weixin",
      status() { return { weixin: { home: true }, feishu: { home: false }, windows: { home: false } }; },
      async setHome(channel) { this.homeChannel = channel; return this.status(); },
    },
    settingsRegistry: {
      async get() { return null; },
      async set(key, value) { return { key, value }; },
    },
    channelDeliveryOutbox: {
      async beginProactiveTargetCutover(ownerKey, channel) {
        frozen.push(channel);
        if (!firstCutoverEntered) {
          firstCutoverEntered = true;
          await firstHold;
        }
        return { release() {} };
      },
    },
  };

  const first = routeSynoApi(runtime, { method: "POST" }, new URL("http://localhost/api/syno/channels/home"), async () => ({ channel: "feishu" }));
  const second = routeSynoApi(runtime, { method: "POST" }, new URL("http://localhost/api/syno/channels/home"), async () => ({ channel: "windows" }));

  await new Promise((resolve) => setImmediate(resolve));
  // The first switch froze weixin and holds the lock; the second switch is queued and has not changed Home yet.
  assert.equal(firstCutoverEntered, true);
  assert.deepEqual(frozen, ["weixin"]);
  assert.equal(runtime.channels.homeChannel, "weixin");

  releaseFirst();
  await Promise.allSettled([first, second]);

  // Under the lock the second switch re-reads Home, sees feishu as previousHome, and freezes the intermediate Home.
  assert.deepEqual(frozen.sort(), ["feishu", "weixin"]);
  assert.equal(runtime.channels.homeChannel, "windows");
});
