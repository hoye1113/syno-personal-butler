// P4.2 red test: a normal immediate text reply must persist its event and processed inbox
// before the external delivery is attempted. The same path must be idempotent on replay.
process.env.NODE_ENV = "test";

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  applyRoute,
  executeNative,
  openBusinessView,
} from "../../syno-autoloop-p0/examples/syno-p0/commands.ts";
import { rows } from "../../syno-autoloop-p0/kernel/evolve.ts";
import { parseRules } from "../../syno-autoloop-p0/protocol/rules.ts";
import { openHostHandover } from "../experiments/superagent-p0/host-handover.mjs";

const APP_ID = "cli_test";
const CHAT_ID = "oc_test";
const OWNER_ID = "ou_test";
const NOW = 1000;
const ENV = { secret: "syno-p4-reply-evidence-test", publicUrl: "" };

function configureRules(db) {
  const rules = parseRules(JSON.stringify({
    timezone: "Asia/Shanghai",
    sources: {},
    agents: {},
    rules: [],
  }), NOW, "Asia/Shanghai");
  executeNative(db, "rules", [rules], NOW, ENV);
}

function openDb() {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p4-reply-evidence-"));
  const file = path.join(root, "shared.db");
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  openBusinessView(db);
  configureRules(db);
  return { root, db };
}

function eventsOf(view, messageId) {
  return rows(view, "events").filter((event) => event.key === messageId);
}

function inboxOf(view, messageId) {
  return view.get("records", `inbox:${JSON.stringify([APP_ID, messageId])}`);
}

test("immediate text reply records one event and one processed inbox before delivery", async () => {
  const { root, db } = openDb();
  try {
    const handover = openHostHandover({ db, now: () => NOW, instanceId: "host-new" });
    const messageId = "om_reply_evidence";
    let deliverCalls = 0;
    const outcome = await handover.sendOrdinaryReply({
      appId: APP_ID,
      messageId,
      chatId: CHAT_ID,
      ownerId: OWNER_ID,
      text: "reply body",
      deliver: async () => {
        deliverCalls += 1;
        const view = openBusinessView(db);
        assert.equal(eventsOf(view, messageId).length, 1, "delivery 前必须有且只有一条 event");
        assert.equal(inboxOf(view, messageId)?.receipt?.contextId, `capture:legacy_reply_${messageId}`);
        return { accepted: true, providerMessageId: "pm-1" };
      },
    });
    assert.equal(outcome.status, "accepted");
    assert.equal(deliverCalls, 1);

    const view = openBusinessView(db);
    const events = eventsOf(view, messageId);
    assert.equal(events.length, 1);
    assert.equal(events[0].source, "legacy-handover");
    assert.equal(events[0].type, "reply.request");
    const inbox = inboxOf(view, messageId);
    assert.equal(inbox?.kind, "inbox");
    assert.equal(inbox?.receipt.contextId, `capture:legacy_reply_${messageId}`);
    assert.equal(inbox?.receipt.version, 1);

    assert.deepEqual(
      rows(view, "records").filter((row) => ["task", "attempt", "delivery"].includes(row.kind)),
      [],
      "普通回复不得创建 domain Task/Attempt/delivery",
    );

    const duplicate = await handover.sendOrdinaryReply({
      appId: APP_ID,
      messageId,
      chatId: CHAT_ID,
      ownerId: OWNER_ID,
      text: "reply body",
      deliver: async () => {
        deliverCalls += 1;
        return { accepted: true };
      },
    });
    assert.equal(duplicate.status, "accepted");
    assert.equal(duplicate.duplicate, true);
    assert.equal(deliverCalls, 1, "重复回复不得再次投递");
    assert.equal(eventsOf(openBusinessView(db), messageId).length, 1);
    assert.equal(inboxOf(openBusinessView(db), messageId)?.receipt.contextId, `capture:legacy_reply_${messageId}`);
  } finally {
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("ordinary reply does not duplicate pre-existing reply evidence", async () => {
  const { root, db } = openDb();
  try {
    const messageId = "om_reply_fixture";
    const contextId = `capture:reply_${messageId}`;
    executeNative(db, "ingest", ["feishu-test", {
      id: messageId,
      type: "reply.request",
      subject: contextId,
      summary: "fixture reply",
      detail: JSON.stringify({ appId: APP_ID, chatId: CHAT_ID, ownerId: OWNER_ID }),
    }], NOW, ENV);
    applyRoute(db, {
      commandId: `route-${messageId}`,
      appId: APP_ID,
      messageId,
      contextId,
      expectedVersion: null,
      ownerId: OWNER_ID,
      replyTo: CHAT_ID,
      now: NOW,
    });

    const handover = openHostHandover({ db, now: () => NOW, instanceId: "host-new" });
    const outcome = await handover.sendOrdinaryReply({
      appId: APP_ID,
      messageId,
      chatId: CHAT_ID,
      ownerId: OWNER_ID,
      text: "fixture reply body",
      deliver: async () => ({ accepted: true }),
    });
    assert.equal(outcome.status, "accepted");

    const view = openBusinessView(db);
    assert.equal(eventsOf(view, messageId).length, 1);
    assert.equal(inboxOf(view, messageId)?.receipt.contextId, contextId);
    assert.equal(inboxOf(view, messageId)?.receipt.version, 1);
  } finally {
    db.close();
    rmSync(root, { recursive: true, force: true });
  }
});
