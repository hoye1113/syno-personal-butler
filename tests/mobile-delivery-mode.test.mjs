import assert from "node:assert/strict";
import test from "node:test";

import { ChannelConversationHandler } from "../apps/syno/syno/channel-conversation-handler.mjs";
import { MobileDeliveryMode } from "../apps/syno/syno/mobile-delivery-mode.mjs";

test("MobileDeliveryMode keeps v2 cutover behind Owner, ingress and legacy gates", () => {
  const mode = new MobileDeliveryMode();
  assert.equal(mode.current(), "legacy");
  assert.throws(() => mode.set("v2"), { code: "MOBILE_V2_CUTOVER_BLOCKED" });
  assert.equal(mode.set("shadow"), "shadow");
  assert.equal(mode.set("v2", { ownerAcceptance: true, ingressFrozen: true, legacyNonTerminal: 0 }), "v2");
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
