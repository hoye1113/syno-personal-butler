import assert from "node:assert/strict";
import test from "node:test";

import { requiresSynoReady } from "../apps/syno/syno/server-readiness.mjs";

test("OpenCode MCP bootstrap route does not wait on the runtime it is initializing", () => {
  assert.equal(requiresSynoReady("/api/syno/opencode/mcp"), false);
  assert.equal(requiresSynoReady("/api/syno/health"), true);
  assert.equal(requiresSynoReady("/api/syno/today"), true);
});
