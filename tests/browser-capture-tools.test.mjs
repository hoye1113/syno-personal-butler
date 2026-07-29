import assert from "node:assert/strict";
import test from "node:test";

import { createBrowserCaptureTools } from "../apps/syno/syno/browser-capture-tools.mjs";

test("browser capture tools are context-bound and expose no URL or action arguments", () => {
  const adapter = { status() {}, navigate() {}, snapshot() {}, listTabs() {}, closeSession() {} };
  const tools = createBrowserCaptureTools(adapter);
  assert.deepEqual(tools.map((item) => item.name), [
    "browser.status", "browser.navigate", "browser.snapshot", "browser.list_tabs", "browser.close_session",
  ]);
  for (const item of tools) assert.deepEqual(item.inputSchema, { type: "object", properties: {}, additionalProperties: false });
});

test("browser capture tools reject main Session and require explicit close authorization", async () => {
  const calls = [];
  const adapter = { closeSession(input) { calls.push(input); return { closed: 1 }; } };
  const close = createBrowserCaptureTools(adapter).find((item) => item.name === "browser.close_session");
  await assert.rejects(() => close.execute({}, { threadKey: "main", browserWorkflowId: "workflow-1" }), /capture Session/);
  await assert.rejects(() => close.execute({}, { threadKey: "capture:artifact-1", browserWorkflowId: "workflow-1" }), /明确请求/);
  assert.deepEqual(await close.execute({}, { threadKey: "capture:artifact-1", browserWorkflowId: "workflow-1", browserCloseAuthorized: true }), { closed: 1 });
  assert.deepEqual(calls, [{ workflowId: "workflow-1" }]);
});
