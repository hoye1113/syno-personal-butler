import assert from "node:assert/strict";
import test from "node:test";

import {
  SESSION_STATE_KNOWN,
  SESSION_RECOVERY_STRATEGY,
  canFallbackAfterAttempt,
  filterControlledMessages,
  inspectSessionRecoveryCapabilities,
  normalizeSessionState,
  sessionStateAfterFailure,
  selectSessionRecoveryStrategy,
} from "../apps/syno/syno/session-safety.mjs";

test("Session fallback safety is fail-closed and controlled-message copy strips tool data", () => {
  assert.equal(normalizeSessionState("unexpected"), SESSION_STATE_KNOWN.UNKNOWN);
  assert.equal(sessionStateAfterFailure({ effectBefore: 1, effectAfter: 2 }), SESSION_STATE_KNOWN.DIRTY);
  assert.equal(sessionStateAfterFailure({ effectBefore: 1, effectAfter: 1 }), SESSION_STATE_KNOWN.UNKNOWN);
  assert.equal(canFallbackAfterAttempt({ sessionStateKnown: "clean", abortConfirmed: true }), true);
  assert.equal(canFallbackAfterAttempt({ sessionStateKnown: "unknown", abortConfirmed: true }), false);
  assert.equal(canFallbackAfterAttempt({ sessionStateKnown: "clean", abortConfirmed: false }), false);
  assert.equal(canFallbackAfterAttempt({ sessionStateKnown: "clean", abortConfirmed: true, irreversibleEffect: true }), false);
  assert.deepEqual(filterControlledMessages([
    { role: "user", parts: [{ type: "text", text: "问题" }, { type: "tool-call", text: "ignore" }] },
    { role: "tool", parts: [{ type: "text", text: "secret" }] },
    { role: "assistant", parts: [{ type: "tool-result", text: "ignore" }, { type: "text", text: "回答" }] },
  ]), [
    { role: "user", parts: [{ type: "text", text: "问题" }] },
    { role: "assistant", parts: [{ type: "text", text: "回答" }] },
  ]);
  assert.deepEqual(inspectSessionRecoveryCapabilities({}), {
    readMessages: "unsupported_by_client",
    fork: "unsupported_by_client",
    clone: "unsupported_by_client",
    strategy: SESSION_RECOVERY_STRATEGY.RETAIN_CURRENT_SESSION,
    conservativeFallback: "clean_and_abort_confirmed_only",
  });
  assert.equal(selectSessionRecoveryStrategy({ fork: "verified" }), SESSION_RECOVERY_STRATEGY.ATTEMPT_SESSION);
  assert.equal(selectSessionRecoveryStrategy({ readMessages: "verified" }), SESSION_RECOVERY_STRATEGY.CONTROLLED_MESSAGE_COPY);
  assert.equal(selectSessionRecoveryStrategy({ fork: "unknown", readMessages: "unknown" }), SESSION_RECOVERY_STRATEGY.RETAIN_CURRENT_SESSION);
});
