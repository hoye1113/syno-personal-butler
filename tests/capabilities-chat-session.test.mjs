import assert from "node:assert/strict";
import test from "node:test";

import { chatReadContext, isLiveChatSession } from "../packages/syno-dsh-plugin/plugins/capabilities/chat-session.mjs";

// 门禁按会话 id 形态白名单判定：Host 路由线程 syno-<threadKey>-<uuid32>，
// DSH 微信通道 weixin-<ownerKey>-<uuid>；其余一律 fail closed。

test("Host chat threads and DSH weixin sessions count as live chat", () => {
  assert.equal(isLiveChatSession(`syno-main-${"a".repeat(32)}`), true);
  assert.equal(isLiveChatSession("weixin-local-user-2c1f4f2e-1f5b-4c8b-9a0e-3f6a7b8c9d0e"), true);
});

test("proactive, capture, job and malformed session ids stay outside the gate", () => {
  for (const id of [
    `syno-proactive-${"b".repeat(32)}`,   // 主动运营
    `syno-capture-artifact-123-${"c".repeat(32)}`, // 收录线程（正常路径本插件不挂载）
    `syno-main-${"A".repeat(32)}`,        // 大写 uuid 不是 Host 生成形态
    "syno-main-short",
    "weixin-local-user-not-a-uuid",
    "main",
    "",
    null,
    undefined,
  ]) {
    assert.equal(isLiveChatSession(id), false, `应拒绝：${String(id)}`);
  }
});

test("chatReadContext carries the session identity and pins the channel marker", () => {
  const session = `syno-main-${"d".repeat(32)}`;
  assert.deepEqual(chatReadContext(session), { channel: "chat", sessionId: session });
  assert.equal(chatReadContext(`syno-proactive-${"e".repeat(32)}`), null);
  assert.equal(chatReadContext(null), null);
});
