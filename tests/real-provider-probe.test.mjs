import test from "node:test";
import assert from "node:assert/strict";

import { parseOptions, summarizeTrials } from "../scripts/probe-provider-real.mjs";

test("real Provider probe requires explicit live confirmation and never accepts a token argument", () => {
  assert.throws(() => parseOptions([]), (error) => error.code === "LIVE_PROBE_CONFIRMATION_REQUIRED");
  assert.throws(() => parseOptions(["--confirm-live", "--token", "secret"]), (error) => error.code === "LIVE_PROBE_SECRET_ARGUMENT_DENIED");
  assert.equal(parseOptions(["--confirm-live", "--trials", "5"]).trials, 5);
});

test("real Provider probe summarizes only operational evidence", () => {
  const summary = summarizeTrials([{ success: true, latencyMs: 10 }, { success: false, latencyMs: 20 }]);
  assert.equal(summary.successRate, 0.5);
  assert.deepEqual(summary.latencyMs, { p50: 10, p95: 20 });
});
