import assert from "node:assert/strict";
import test from "node:test";

import {
  canServeBusiness,
  readinessHttpStatus,
  requiresSynoReady,
  runtimeNotReady,
} from "../apps/syno/syno/server-readiness.mjs";

test("OpenCode MCP bootstrap route does not wait on the runtime it is initializing", () => {
  assert.equal(requiresSynoReady("/api/syno/opencode/mcp"), false);
  assert.equal(requiresSynoReady("/api/syno/health"), false);
  assert.equal(requiresSynoReady("/api/syno/readiness"), false);
  assert.equal(requiresSynoReady("/api/syno/today"), true);
});

test("readiness maps only ready to HTTP 200 and returns a bounded rejection", () => {
  assert.equal(readinessHttpStatus("ready"), 200);
  for (const state of ["starting", "degraded", "stopping"]) assert.equal(readinessHttpStatus(state), 503);
  assert.equal(canServeBusiness("starting"), false);
  assert.equal(canServeBusiness("stopping"), false);
  assert.equal(canServeBusiness("ready"), true);
  assert.equal(canServeBusiness("degraded"), true);
  assert.deepEqual(runtimeNotReady("degraded"), {
    ok: false,
    code: "RUNTIME_NOT_READY",
    state: "degraded",
  });
});
