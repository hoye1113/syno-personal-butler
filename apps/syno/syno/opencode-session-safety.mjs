const SESSION_STATE_KNOWN = Object.freeze({
  CLEAN: "clean",
  UNKNOWN: "unknown",
  DIRTY: "dirty",
});

function normalizeSessionState(value) {
  return Object.values(SESSION_STATE_KNOWN).includes(value)
    ? value
    : SESSION_STATE_KNOWN.UNKNOWN;
}

/** A fallback requires both a clean remote state and a confirmed abort. */
function canFallbackAfterAttempt({ sessionStateKnown, abortConfirmed, irreversibleEffect = false } = {}) {
  return normalizeSessionState(sessionStateKnown) === SESSION_STATE_KNOWN.CLEAN
    && abortConfirmed === true
    && irreversibleEffect !== true;
}

function sessionStateAfterFailure({ effectBefore = 0, effectAfter = effectBefore, irreversibleEffect = false } = {}) {
  if (irreversibleEffect === true || Number(effectAfter) > Number(effectBefore)) {
    return SESSION_STATE_KNOWN.DIRTY;
  }
  return SESSION_STATE_KNOWN.UNKNOWN;
}

/** Copy only controlled text if a future OpenCode read/fork seam is available. */
function filterControlledMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.flatMap((message) => {
    const role = message?.role;
    if (role !== "user" && role !== "assistant") return [];
    const parts = Array.isArray(message.parts) ? message.parts : [];
    const text = parts
      .filter((part) => part?.type === "text")
      .map((part) => String(part.text || ""))
      .join("")
      .trim();
    return text ? [{ role, parts: [{ type: "text", text }] }] : [];
  });
}

function inspectSessionRecoveryCapabilities(client) {
  return Object.freeze({
    readMessages: typeof client?.readMessages === "function" ? "verified_by_client" : "unsupported_by_client",
    fork: typeof client?.forkSession === "function" ? "verified_by_client" : "unsupported_by_client",
    clone: typeof client?.cloneSession === "function" ? "verified_by_client" : "unsupported_by_client",
    conservativeFallback: "clean_and_abort_confirmed_only",
  });
}

export {
  SESSION_STATE_KNOWN,
  canFallbackAfterAttempt,
  filterControlledMessages,
  inspectSessionRecoveryCapabilities,
  normalizeSessionState,
  sessionStateAfterFailure,
};
