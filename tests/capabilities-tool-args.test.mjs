import { test } from "node:test";
import assert from "node:assert/strict";

import { assertIntegerRange, canonicalToolName } from "../packages/syno-dsh-plugin/plugins/capabilities/tool-args.mjs";

test("canonical tool names switch only in plugin chat-tools mode", () => {
  assert.equal(canonicalToolName("syno_core_knowledge_search", "plugin"), "syno_knowledge_search");
  assert.equal(canonicalToolName("syno_core_jobs_submit", "plugin"), "syno_jobs_submit");
  assert.equal(canonicalToolName("syno_core_knowledge_search", "bridge"), "syno_core_knowledge_search");
  assert.equal(canonicalToolName("syno_core_knowledge_search", ""), "syno_core_knowledge_search");
});

test("assertIntegerRange accepts empty values and rejects out-of-range integers", () => {
  assert.doesNotThrow(() => assertIntegerRange(undefined, 1, 10, "limit"));
  assert.doesNotThrow(() => assertIntegerRange(5, 1, 10, "limit"));
  for (const value of [0, 11, 1.5, "abc"]) {
    assert.throws(() => assertIntegerRange(value, 1, 10, "limit"), (error) => error.code === "TOOL_INPUT_INVALID");
  }
});
