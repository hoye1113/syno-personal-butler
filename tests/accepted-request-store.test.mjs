import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { AcceptedRequestStore } from "../apps/syno/syno/accepted-request-store.mjs";
import { AcceptedRequestRecoveryWorker } from "../apps/syno/syno/accepted-request-recovery.mjs";
import { runDpapi } from "../apps/syno/syno/provider-credential-store.mjs";

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-accepted-request-"));
  const protect = async (value) => `ciphertext:${Buffer.from(value, "utf8").toString("base64")}`;
  const unprotect = async (value) => Buffer.from(String(value).replace(/^ciphertext:/, ""), "base64").toString("utf8");
  const store = new AcceptedRequestStore({
    root: path.join(root, "accepted-requests"),
    payloadRoot: path.join(root, "accepted-request-payloads"),
    lockFile: path.join(root, "locks", "accepted-requests.lock"),
    protect,
    unprotect,
  });
  return { root, store };
}

test("AcceptedRequest persists encrypted payload before returning the accepted fact", async (t) => {
  const { root, store } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const result = await store.accept({
    ownerKey: "owner-a",
    originChannel: "weixin",
    platformMessageId: "wx-1",
    payload: { text: "PRIVATE TEST BODY", deliveryTarget: { toUserId: "owner-a" } },
    deliveryTarget: { toUserId: "owner-a", contextToken: "encrypted-only" },
  });
  assert.equal(result.created, true);
  assert.equal(result.request.status, "accepted");
  assert.equal(result.request.payloadKind, "text");
  const metadata = await fs.readFile(path.join(root, "accepted-requests", `${result.request.requestId}.json`), "utf8");
  assert.doesNotMatch(metadata, /PRIVATE TEST BODY|encrypted-only/);
  const restored = await store.get(result.request.requestId, { includePayload: true });
  assert.equal(restored.payload.text, "PRIVATE TEST BODY");
  assert.equal(restored.payload.deliveryTarget.contextToken, "encrypted-only");
});

test("messageDedupKey is an atomic unique constraint across concurrent accepts", async (t) => {
  const { root, store } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const results = await Promise.all(Array.from({ length: 20 }, (_, index) => store.accept({
    ownerKey: "owner-a",
    originChannel: "feishu",
    platformMessageId: "fs-duplicate",
    payload: { text: `attempt-${index}` },
  })));
  assert.equal(results.filter((item) => item.created).length, 1);
  assert.equal(new Set(results.map((item) => item.request.requestId)).size, 1);
  assert.equal((await store.list()).length, 1);
});

test("same platform message id remains isolated across Owner identities", async (t) => {
  const { root, store } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const first = await store.accept({ ownerKey: "owner-a", originChannel: "weixin", platformMessageId: "same", payload: { text: "a" } });
  const second = await store.accept({ ownerKey: "owner-b", originChannel: "weixin", platformMessageId: "same", payload: { text: "b" } });
  assert.equal(first.created, true);
  assert.equal(second.created, true);
  assert.equal((await store.list()).length, 2);
});

test("claim lease permits one worker and expired claims recover", async (t) => {
  const { root } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let now = new Date("2026-07-29T00:00:00.000Z");
  const protect = async (value) => value;
  const unprotect = async (value) => value;
  const store = new AcceptedRequestStore({
    root: path.join(root, "accepted-requests"),
    payloadRoot: path.join(root, "accepted-request-payloads"),
    lockFile: path.join(root, "locks", "accepted-request.lock"),
    leaseMs: 30_000,
    clock: () => now,
    protect,
    unprotect,
  });
  const accepted = await store.accept({ ownerKey: "owner-a", originChannel: "feishu", platformMessageId: "claim-1", payload: { text: "safe" } });
  const first = await store.claim(accepted.request.requestId, { workerId: "worker-a" });
  const second = await store.claim(accepted.request.requestId, { workerId: "worker-b" });
  assert.equal(first.claimed, true);
  assert.equal(second.claimed, false);
  now = new Date("2026-07-29T00:00:31.000Z");
  assert.equal((await store.recoverExpired()).length, 1);
  assert.equal((await store.claim(accepted.request.requestId, { workerId: "worker-b" })).claimed, true);
});

test("payload digest detects ciphertext replacement with another valid payload", async (t) => {
  const { root, store } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const accepted = await store.accept({ ownerKey: "owner-a", originChannel: "weixin", platformMessageId: "tamper-1", payload: { text: "original" } });
  const payloadFile = path.join(root, "accepted-request-payloads", `${accepted.request.payloadRef}.dpapi`);
  await fs.writeFile(payloadFile, `ciphertext:${Buffer.from(JSON.stringify({ text: "changed" }), "utf8").toString("base64")}`);
  await assert.rejects(store.get(accepted.request.requestId, { includePayload: true }), { code: "ACCEPTED_REQUEST_PAYLOAD_TAMPERED" });
});

test("Windows DPAPI payload does not persist message text in metadata or ciphertext", { skip: process.platform !== "win32" }, async (t) => {
  const { root } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new AcceptedRequestStore({
    root: path.join(root, "accepted-requests"),
    payloadRoot: path.join(root, "accepted-request-payloads"),
    lockFile: path.join(root, "locks", "accepted-request.lock"),
    protect: (value) => runDpapi("protect", value),
    unprotect: (value) => runDpapi("unprotect", value),
  });
  const accepted = await store.accept({ ownerKey: "owner-a", originChannel: "weixin", platformMessageId: "dpapi-1", payload: { text: "DPAPI PRIVATE MESSAGE" } });
  const metadata = await fs.readFile(path.join(root, "accepted-requests", `${accepted.request.requestId}.json`), "utf8");
  const ciphertext = await fs.readFile(path.join(root, "accepted-request-payloads", `${accepted.request.payloadRef}.dpapi`), "utf8");
  assert.doesNotMatch(metadata, /DPAPI PRIVATE MESSAGE/);
  assert.doesNotMatch(ciphertext, /DPAPI PRIVATE MESSAGE/);
  assert.equal((await store.get(accepted.request.requestId, { includePayload: true })).payload.text, "DPAPI PRIVATE MESSAGE");
});

test("AcceptedRequestRecoveryWorker claims durable requests and never retries an unknown write itself", async (t) => {
  const { root, store } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const accepted = await store.accept({ ownerKey: "owner-a", originChannel: "feishu", platformMessageId: "recover-1", payload: { text: "recovery" } });
  const seen = [];
  const worker = new AcceptedRequestRecoveryWorker({
    store,
    processRequest: async (request) => {
      seen.push(request.payload.text);
      return { status: "waiting_provider" };
    },
  });
  const report = await worker.runOnce();
  assert.deepEqual(report, { scanned: 1, claimed: 1, completed: 0, retryable: 1, unavailable: 0 });
  assert.deepEqual(seen, ["recovery"]);
  assert.equal((await store.get(accepted.request.requestId)).status, "waiting_provider");
});
