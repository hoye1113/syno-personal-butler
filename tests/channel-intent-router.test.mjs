import assert from "node:assert/strict";
import test from "node:test";

import { ChannelIntentRouter } from "../apps/syno/syno/channel-intent-router.mjs";
import { CapabilityPresenter } from "../apps/syno/syno/capability-presenter.mjs";

test("ChannelIntentRouter recognizes natural-language new conversation without catching ordinary text", () => {
  const router = new ChannelIntentRouter();
  assert.equal(router.classify("重新开个对话").kind, "new_conversation");
  assert.equal(router.classify("帮我新建一个会话").kind, "new_conversation");
  assert.equal(router.classify("清空这段上下文").kind, "new_conversation");
  assert.equal(router.classify("把这段文章重新开头写").kind, "normal_conversation");
});

test("ChannelIntentRouter recognizes capability, status, continuation, and browser close intents", () => {
  const router = new ChannelIntentRouter();
  assert.equal(router.classify("你能做什么").kind, "show_capabilities");
  assert.equal(router.classify("刚才的文件怎么样了").kind, "capture_status");
  assert.equal(router.classify("待我确认的收录").kind, "list_pending_capture");
  assert.equal(router.classify("继续刚才的收录").kind, "continue_browser_capture");
  assert.equal(router.classify("继续第2项收录").index, 2);
  assert.equal(router.classify("请关闭收录标签").kind, "close_capture_tabs");
});

test("CapabilityPresenter gives a human summary without exposing internal tool identifiers", () => {
  const presenter = new CapabilityPresenter();
  const result = presenter.describe({
    runtime: { ready: true },
    pendingCaptureCount: 2,
    browserCapture: { available: true },
  });
  assert.match(result.text, /问答/);
  assert.match(result.text, /收录/);
  assert.match(result.text, /2/);
  assert.match(result.text, /浏览器/);
  assert.doesNotMatch(result.text, /syno_browser_|capture\.start|ToolRegistry/);
});
