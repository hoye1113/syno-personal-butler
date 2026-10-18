import test from "node:test";
import assert from "node:assert/strict";
import { CORE_CHAT_TOOL_NAMES, isCoreChatToolName } from "../config/deepseek-harness/syno-tool-sets.mjs";
import { BUSINESS_TOOL_NAMES } from "../packages/syno-core/business-tools.mjs";

test("chat allowlist contains the business tools while browser mechanics remain capture-only", () => {
  for (const name of BUSINESS_TOOL_NAMES) {
    assert.ok(CORE_CHAT_TOOL_NAMES.includes(name));
    assert.equal(isCoreChatToolName(`syno_${name.replaceAll(".", "_")}`), true);
  }
  for (const name of ["bash", "fs.write", "browser.navigate", "code_change", "system_control", "jobs.arbitrary_execute"]) assert.equal(isCoreChatToolName(name), false);
});
