import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { ConversationStore } from "../apps/syno/syno/conversation-store.mjs";

// 守护 R6（按会话串行化读-改-写）与 O9（prune 单文件隔离）。

test("concurrent append calls on the same conversation do not lose messages (R6)", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-conv-r6-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new ConversationStore({ root, clock: () => new Date("2026-08-02T00:00:00.000Z") });
  const created = await store.create({ id: "conv-r6", channel: "web" });
  // 并发触发多次 append；若没有按会话串行化，读-改-写会交错丢失更新（最终只剩 ~1 条）。
  // 串行化后所有消息都落地。
  const N = 12;
  await Promise.all(Array.from({ length: N }, (_, i) => store.append("conv-r6", { role: "assistant", content: `msg-${i}` })));
  const after = await store.get("conv-r6");
  assert.equal(after.messages.length, created.messages.length + N);
  // 12 条全部落地即证明串行化生效（顺序按串行提交，但内容集合必须完整）。
  const contents = after.messages.map((m) => m.content);
  for (let i = 0; i < N; i += 1) assert.ok(contents.includes(`msg-${i}`), `缺失 msg-${i}`);
});

test("concurrent addSummary calls on the same conversation keep every summary (R6)", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-conv-r6sum-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new ConversationStore({ root, clock: () => new Date("2026-08-02T00:00:00.000Z") });
  await store.create({ id: "conv-sum", channel: "web" });
  await Promise.all(Array.from({ length: 8 }, (_, i) => store.addSummary("conv-sum", { text: `摘要-${i}` })));
  const after = await store.get("conv-sum");
  assert.equal(after.summaries.length, 8);
});

test("prune skips a corrupt conversation file without aborting the sweep (O9)", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-conv-o9-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const clockState = { now: new Date("2026-08-02T00:00:00.000Z") };
  const store = new ConversationStore({ root, clock: () => clockState.now });
  // 一个健康的 active 会话。
  await store.create({ id: "conv-healthy", channel: "web" });
  // 一个损坏的会话文件（非法 JSON）。
  await fs.writeFile(path.join(root, "conv-corrupt.json"), "{ this is not valid json", "utf8");
  // prune 不得抛；损坏文件被跳过，健康文件不受影响。
  const removed = await store.prune();
  assert.ok(Array.isArray(removed));
  assert.ok(await store.get("conv-healthy"), "健康会话应仍可读");
  // 损坏文件原样保留（prune 只跳过，不删未知文件）。
  await assert.doesNotReject(fs.access(path.join(root, "conv-corrupt.json")));
});
