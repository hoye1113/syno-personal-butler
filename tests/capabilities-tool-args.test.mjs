import { test } from "node:test";
import assert from "node:assert/strict";

import { assertIntegerRange, canonicalToolName } from "../packages/syno-dsh-plugin/plugins/capabilities/tool-args.mjs";

test("canonical tool names are the default; bridge mode rolls back to dev names", () => {
  assert.equal(canonicalToolName("syno_core_knowledge_search", "plugin"), "syno_knowledge_search");
  assert.equal(canonicalToolName("syno_core_knowledge_search", undefined), "syno_knowledge_search");
  assert.equal(canonicalToolName("syno_core_knowledge_search", ""), "syno_knowledge_search");
  assert.equal(canonicalToolName("syno_core_knowledge_read_snippet", ""), "syno_knowledge_read_snippet");
  assert.equal(canonicalToolName("syno_core_knowledge_search", "bridge"), "syno_core_knowledge_search");
});

test("assertIntegerRange accepts empty values and rejects out-of-range integers", () => {
  assert.doesNotThrow(() => assertIntegerRange(undefined, 1, 10, "limit"));
  assert.doesNotThrow(() => assertIntegerRange(5, 1, 10, "limit"));
  for (const value of [0, 11, 1.5, "abc"]) {
    assert.throws(() => assertIntegerRange(value, 1, 10, "limit"), (error) => error.code === "TOOL_INPUT_INVALID");
  }
});
