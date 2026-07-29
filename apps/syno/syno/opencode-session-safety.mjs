const SESSION_STATE_KNOWN = Object.freeze({
  CLEAN: "clean",
  UNKNOWN: "unknown",
  DIRTY: "dirty",
});

const SESSION_RECOVERY_STRATEGY = Object.freeze({
  ATTEMPT_SESSION: "attempt_session",
  CONTROLLED_MESSAGE_COPY: "controlled_message_copy",
  RETAIN_CURRENT_SESSION: "retain_current_session",
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
  const readMessages = typeof client?.readMessages === "function" ? "client_seam_only" : "unsupported_by_client";
  const fork = typeof client?.forkSession === "function" ? "client_seam_only" : "unsupported_by_client";
  const clone = typeof client?.cloneSession === "function" ? "client_seam_only" : "unsupported_by_client";
  return Object.freeze({
    readMessages,
    fork,
    clone,
    strategy: selectSessionRecoveryStrategy({ readMessages, fork, clone }),
    conservativeFallback: "clean_and_abort_confirmed_only",
  });
}

function selectSessionRecoveryStrategy({ readMessages, fork, clone } = {}) {
  if (fork === "verified" || clone === "verified") return SESSION_RECOVERY_STRATEGY.ATTEMPT_SESSION;
  if (readMessages === "verified") return SESSION_RECOVERY_STRATEGY.CONTROLLED_MESSAGE_COPY;
  return SESSION_RECOVERY_STRATEGY.RETAIN_CURRENT_SESSION;
}

export {
  SESSION_STATE_KNOWN,
  SESSION_RECOVERY_STRATEGY,
  canFallbackAfterAttempt,
  filterControlledMessages,
  inspectSessionRecoveryCapabilities,
  normalizeSessionState,
  sessionStateAfterFailure,
  selectSessionRecoveryStrategy,
};
