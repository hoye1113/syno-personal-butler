import { test } from "node:test";
import assert from "node:assert/strict";

import { delegateChannel, resolveChannelOwner } from "../packages/syno-core/channels.mjs";

test("channel owner resolves to dsh only when explicitly set", () => {
  assert.equal(resolveChannelOwner({}), "host");
  assert.equal(resolveChannelOwner({ SYNO_CHANNEL_OWNER: "" }), "host");
  assert.equal(resolveChannelOwner({ SYNO_CHANNEL_OWNER: "host" }), "host");
  assert.equal(resolveChannelOwner({ SYNO_CHANNEL_OWNER: "dsh" }), "dsh");
  assert.equal(resolveChannelOwner({ SYNO_CHANNEL_OWNER: " dsh " }), "dsh");
});

test("delegated channel keeps login/send passthrough but never starts host polling", async () => {
  const calls = [];
  const adapter = {
    async start() { calls.push("start"); return { running: true }; },
    async stop() { calls.push("stop"); return { running: false }; },
    async send(message) { calls.push(`send:${message.text}`); return { delivered: true }; },
    async beginLogin() { calls.push("beginLogin"); return { qrcode: "qr" }; },
    status() { return { id: "weixin", running: true, available: true, ownerBound: true }; },
  };
  const channel = delegateChannel(adapter, "dsh");
  assert.deepEqual(await channel.start(), { delegated: true, owner: "dsh" });
  assert.equal((await channel.status()).delegated, true);
  assert.equal((await channel.status()).running, false);
  assert.equal((await channel.status()).ownerBound, true);
  assert.deepEqual(await channel.beginLogin(), { qrcode: "qr" });
  assert.deepEqual(await channel.send({ text: "hi" }), { delivered: true });
  assert.deepEqual(calls, ["beginLogin", "send:hi"]);
  assert.equal(adapter.status().running, true);
});
