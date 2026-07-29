import assert from "node:assert/strict";
import test from "node:test";

import { BrowserCaptureAdapter } from "../apps/syno/syno/browser-capture-adapter.mjs";

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}

test("BrowserCaptureAdapter reports daemon and extension health without leaking paths", async () => {
  const calls = [];
  const adapter = new BrowserCaptureAdapter({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return response({ running: true, extension_connected: true, version: "v1.11.3", extension_version: "1.11.3" });
    },
  });
  const health = await adapter.health();
  assert.deepEqual(health, { available: true, daemonVersion: "1.11.3", extensionVersion: "1.11.3" });
  assert.equal(calls[0].url, "http://127.0.0.1:10086/status");
  assert.doesNotMatch(JSON.stringify(health), /Users|skills|extension_id/);
});

test("BrowserCaptureAdapter navigates and snapshots one exact URL in one workflow session", async () => {
  const requests = [];
  const adapter = new BrowserCaptureAdapter({
    fetchImpl: async (url, init) => {
      if (url.endsWith("/status")) return response({ running: true, extension_connected: true, version: "v1.11.3", extension_version: "1.11.3" });
      const body = JSON.parse(init.body);
      requests.push(body);
      if (body.action === "navigate") return response({ success: true, url: body.args.url, tabId: "tab-1" });
      if (body.action === "snapshot") return response({ success: true, url: "https://example.com/article", title: "Article", tree: "正文内容" });
      throw new Error(`unexpected ${body.action}`);
    },
  });
  const result = await adapter.capture({ workflowId: "workflow-abc", exactUrl: "https://example.com/article" });
  assert.equal(result.status, "completed");
  assert.equal(result.finalUrl, "https://example.com/article");
  assert.equal(result.content, "正文内容");
  assert.equal(requests[0].action, "navigate");
  assert.equal(requests[0].session, "syno-capture-workflow-abc");
  assert.equal(requests[1].action, "snapshot");
  assert.equal(requests[1].session, requests[0].session);
});

test("BrowserCaptureAdapter unwraps the live WebBridge command envelope", async () => {
  const adapter = new BrowserCaptureAdapter({
    fetchImpl: async (url, init) => {
      if (url.endsWith("/status")) return response({ running: true, extension_connected: true });
      const body = JSON.parse(init.body);
      if (body.action === "navigate") return response({ ok: true, data: { success: true, url: body.args.url } });
      return response({ ok: true, data: { success: true, url: body.args.url, title: "Example", tree: "浏览器正文" } });
    },
  });
  const result = await adapter.capture({ workflowId: "workflow-envelope", exactUrl: "https://example.com/article" });
  assert.equal(result.status, "completed");
  assert.equal(result.content, "浏览器正文");
});

test("BrowserCaptureAdapter rejects unsafe URLs and arbitrary browser actions", async () => {
  const adapter = new BrowserCaptureAdapter({ fetchImpl: async () => { throw new Error("must not call daemon"); } });
  await assert.rejects(() => adapter.capture({ workflowId: "workflow-unsafe", exactUrl: "http://127.0.0.1:4317/secret" }), /URL/);
  await assert.rejects(() => adapter.capture({ workflowId: "workflow-unsafe-query", exactUrl: "https://example.com/article?token=secret" }), /URL/);
  await assert.rejects(() => adapter.capture({ workflowId: "workflow-unsafe-private", exactUrl: "http://172.20.0.1/article" }), /URL/);
  await assert.rejects(() => adapter.capture({ workflowId: "workflow-unsafe-ipv6", exactUrl: "http://[::1]/article" }), /URL/);
  await assert.rejects(() => adapter.command({ workflowId: "workflow-unsafe", action: "click", args: {} }), /不允许/);
});

test("BrowserCaptureAdapter pauses when a page requires user interaction", async () => {
  const adapter = new BrowserCaptureAdapter({
    fetchImpl: async (url, init) => {
      if (url.endsWith("/status")) return response({ running: true, extension_connected: true, version: "v1.11.3", extension_version: "1.11.3" });
      const body = JSON.parse(init.body);
      if (body.action === "navigate") return response({ success: true, url: body.args.url, tabId: "tab-1" });
      return response({ success: true, url: body.args.url, title: "登录", tree: "请登录后继续，验证码" });
    },
  });
  const result = await adapter.capture({ workflowId: "workflow-login", exactUrl: "https://example.com/private" });
  assert.equal(result.status, "interaction_required");
  assert.match(result.interactionHint, /登录|验证/);
});

test("BrowserCaptureAdapter treats an empty login redirect as interaction required", async () => {
  const adapter = new BrowserCaptureAdapter({
    fetchImpl: async (url, init) => {
      if (url.endsWith("/status")) return response({ running: true, extension_connected: true });
      const body = JSON.parse(init.body);
      if (body.action === "navigate") return response({ success: true, url: body.args.url });
      return response({ success: true, url: "https://example.com/login", title: "", tree: "" });
    },
  });
  const result = await adapter.capture({ workflowId: "workflow-empty-login", exactUrl: "https://example.com/article" });
  assert.equal(result.status, "interaction_required");
  assert.match(result.interactionHint, /继续/);
});

test("BrowserCaptureAdapter refreshes the page after owner interaction instead of reusing stale state", async () => {
  let snapshots = 0;
  const adapter = new BrowserCaptureAdapter({
    fetchImpl: async (url, init) => {
      if (url.endsWith("/status")) return response({ running: true, extension_connected: true });
      const body = JSON.parse(init.body);
      if (body.action === "navigate") return response({ success: true, url: body.args.url });
      snapshots += 1;
      return snapshots === 1
        ? response({ success: true, url: "https://example.com/login", title: "验证码", tree: "请验证" })
        : response({ success: true, url: "https://example.com/login", title: "正文", tree: "已完成正文" });
    },
  });
  const first = await adapter.capture({ workflowId: "workflow-resume", exactUrl: "https://example.com/login" });
  assert.equal(first.status, "interaction_required");
  const continued = await adapter.continue({ workflowId: "workflow-resume" });
  assert.equal(continued.status, "completed");
  assert.equal(continued.content, "已完成正文");
});

test("BrowserCaptureAdapter expires capture sessions and still permits local cleanup", async () => {
  let now = new Date("2026-07-28T10:00:00Z");
  const adapter = new BrowserCaptureAdapter({
    clock: () => now,
    fetchImpl: async () => response({ success: true, tree: "unused" }),
  });
  const task = adapter.authorize({ workflowId: "workflow-expiry", exactUrl: "https://example.com/article" });
  assert.match(task.expiresAt, /2026-07-28T12:00:00/);
  now = new Date("2026-07-28T12:01:00Z");
  await assert.rejects(() => adapter.snapshot({ workflowId: "workflow-expiry" }), /过期/);
  assert.deepEqual(await adapter.closeSession({ workflowId: "workflow-expiry" }), { closed: 0, expired: true });
});
