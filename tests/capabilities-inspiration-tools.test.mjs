import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { InspirationStore } from "../packages/syno-core/inspiration-store.mjs";
import { recordInspirationFeedback } from "../packages/syno-dsh-plugin/plugins/capabilities/inspiration-tools.mjs";

async function fixture(t, { clock } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-capabilities-inspiration-"));
  const opsRoot = path.join(root, "ops");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new InspirationStore({ opsRoot, ...(clock ? { clock } : {}) });
  const events = [];
  return {
    store,
    events,
    call: (args, options = {}) => recordInspirationFeedback({
      opsRoot,
      recordEvent: async (name, data) => events.push({ name, data }),
      ...(clock ? { clock } : {}),
      ...args,
    }, options),
  };
}

async function deliveredCard(store, { ownerKey = "local-user" } = {}) {
  const card = await store.create({ date: "2026-09-04", sampledRefs: ["vault/a.md", "vault/b.md"], text: "串联文本" });
  await store.markDelivered(card.id, "event-1", ownerKey ? { ownerKey } : {});
  return card;
}

test("no card awaiting feedback → recorded:false and nothing written", async (t) => {
  const { store, events, call } = await fixture(t);
  assert.deepEqual(await call({ feedback: "useful" }), { recorded: false, reason: "no_card_awaiting" });
  assert.equal((await store.list()).length, 0);
  assert.equal(events.length, 0);
});

test("delivered card → records feedback once and fires the event", async (t) => {
  const { store, events, call } = await fixture(t);
  const card = await deliveredCard(store);
  assert.deepEqual(await call({ feedback: "not_useful" }), { recorded: true, inspirationId: card.id, feedback: "not_useful" });
  assert.equal((await store.list())[0].status, "feedback");
  assert.equal(events.length, 1);
  assert.equal(events[0].name, "inspiration.feedback.recorded");
  assert.deepEqual(await call({ feedback: "useful" }), { recorded: false, reason: "no_card_awaiting" });
  assert.equal((await store.list()).filter((record) => record.feedback).length, 1);
});

test("card delivered beyond the feedback TTL → no_card_awaiting", async (t) => {
  let nowMs = new Date("2026-09-04T12:35:00+08:00").getTime();
  const { store, call } = await fixture(t, { clock: () => new Date(nowMs) });
  await deliveredCard(store);
  nowMs += 25 * 60 * 60 * 1000;
  assert.deepEqual(await call({ feedback: "useful" }), { recorded: false, reason: "no_card_awaiting" });
  assert.equal((await store.list())[0].feedback || null, null);
});

test("exact inspirationId respects delivery owner and is read-only after feedback", async (t) => {
  const { store, call } = await fixture(t);
  const card = await deliveredCard(store);
  const ownerless = await store.create({ date: "2026-09-03", sampledRefs: ["vault/a.md", "vault/b.md"], text: "无主卡" });
  await store.markDelivered(ownerless.id, "event-0");

  assert.deepEqual(await call({ feedback: "useful", inspirationId: ownerless.id }),
    { recorded: false, reason: "not_delivered_to_owner", inspirationId: ownerless.id });

  assert.deepEqual(await call({ feedback: "neutral", inspirationId: card.id }),
    { recorded: true, inspirationId: card.id, feedback: "neutral" });
  assert.deepEqual(await call({ feedback: "useful", inspirationId: card.id }),
    { recorded: false, reason: "already_recorded", inspirationId: card.id, feedback: "neutral" });
});

test("exact inspirationId backfills beyond the 24h TTL window", async (t) => {
  let nowMs = new Date("2026-09-04T12:35:00+08:00").getTime();
  const { store, call } = await fixture(t, { clock: () => new Date(nowMs) });
  const card = await deliveredCard(store);
  nowMs += 30 * 60 * 60 * 1000;
  assert.deepEqual(await call({ feedback: "useful", inspirationId: card.id }),
    { recorded: true, inspirationId: card.id, feedback: "useful" });
});

test("illegal feedback value is rejected", async (t) => {
  const { store, call } = await fixture(t);
  await deliveredCard(store);
  await assert.rejects(call({ feedback: "meh" }), /灵感反馈取值无效/);
});
