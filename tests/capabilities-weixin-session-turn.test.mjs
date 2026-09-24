import { test } from "node:test";
import assert from "node:assert/strict";

import { awaitSessionTurn } from "../packages/syno-dsh-plugin/plugins/channel-weixin/session-turn.mjs";

function fakeCtx() {
  const handlers = new Map();
  return {
    on(name, handler) {
      const list = handlers.get(name) || [];
      list.push(handler);
      handlers.set(name, list);
      return () => { handlers.set(name, (handlers.get(name) || []).filter((item) => item !== handler)); };
    },
    emit(name, ...args) {
      for (const handler of [...(handlers.get(name) || [])]) handler(...args);
    },
    count(name) { return (handlers.get(name) || []).length; },
  };
}

const session = (id) => ({ header: { id } });

function assistantEvent(text) {
  return { type: "assistant/message", data: { message: { content: [{ type: "text", text }] } } };
}

test("session turn settles on the claimed weixin turn and returns its text", async () => {
  const ctx = fakeCtx();
  const pending = awaitSessionTurn({
    ctx,
    sessionId: "s1",
    timeoutMs: 5_000,
    dispatch: () => {
      ctx.emit("agent/inbox/claimed", { agent: { session: { id: "s1" } }, message: { source: { kind: "weixin" } }, turn: 7 });
      ctx.emit("session/event", session("s2"), assistantEvent("别的会话"));
      ctx.emit("session/event", session("s1"), assistantEvent("pong"));
      ctx.emit("session/event", session("s1"), { type: "turn/end", data: { turn: 7, reason: { kind: "completed" } } });
    },
  });
  const result = await pending;
  assert.equal(result.text, "pong");
  assert.equal(result.reason, "completed");
  assert.equal(ctx.count("session/event"), 0);
  assert.equal(ctx.count("agent/inbox/claimed"), 0);
});

test("session turn falls back to the first completed turn when no claim is observed", async () => {
  const ctx = fakeCtx();
  const result = await awaitSessionTurn({
    ctx,
    sessionId: "s1",
    timeoutMs: 5_000,
    dispatch: () => {
      ctx.emit("session/event", session("s1"), assistantEvent("fallback"));
      ctx.emit("session/event", session("s1"), { type: "turn/end", data: { turn: 2, reason: { kind: "completed" } } });
    },
  });
  assert.equal(result.text, "fallback");
});

test("session turn ignores claims from other sources and times out without a turn", async () => {
  const ctx = fakeCtx();
  await assert.rejects(awaitSessionTurn({
    ctx,
    sessionId: "s1",
    timeoutMs: 1_000,
    dispatch: () => {
      ctx.emit("agent/inbox/claimed", { agent: { session: { id: "s1" } }, message: { source: { kind: "web" } }, turn: 1 });
      ctx.emit("session/event", session("s1"), assistantEvent("无对应 claim 也算完成"));
    },
  }), (error) => error.code === "CHANNEL_TURN_TIMEOUT");

  const ctx2 = fakeCtx();
  await assert.rejects(awaitSessionTurn({
    ctx: ctx2,
    sessionId: "s1",
    timeoutMs: 1_000,
    dispatch: () => { ctx2.emit("session/event", session("other"), assistantEvent("x")); },
  }), (error) => error.code === "CHANNEL_TURN_TIMEOUT");
  assert.equal(ctx2.count("session/event"), 0);
});
