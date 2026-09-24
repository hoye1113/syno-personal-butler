import { InspirationStore } from "../../../../packages/syno-core/inspiration-store.mjs";

const INSPIRATION_FEEDBACK_TOOL_NAME = "syno_core_inspiration_record_feedback";
const DEFAULT_OWNER_KEY = "local-user";

let sharedStore = null;

function storeFor({ opsRoot, clock } = {}) {
  if (opsRoot || clock) {
    return new InspirationStore({
      ...(opsRoot ? { opsRoot } : {}),
      ...(clock ? { clock } : {}),
    });
  }
  if (!sharedStore) sharedStore = new InspirationStore({});
  return sharedStore;
}

async function recordInspirationFeedback({
  feedback,
  inspirationId,
  opsRoot,
  clock = null,
  ownerKey = DEFAULT_OWNER_KEY,
  recordEvent = null,
} = {}) {
  const store = storeFor({ opsRoot, clock });
  if (inspirationId) {
    const exact = await store.feedbackTarget(inspirationId, { ownerKey });
    if (!exact.found) return { recorded: false, reason: exact.reason, inspirationId: String(inspirationId) };
    if (exact.alreadyRecorded) {
      return { recorded: false, reason: "already_recorded", inspirationId: exact.record.id, feedback: exact.record.feedback };
    }
    const updated = await store.recordFeedback(exact.record.id, feedback);
    await recordEvent?.("inspiration.feedback.recorded", { inspirationId: updated.id, feedback: updated.feedback })?.catch(() => {});
    return { recorded: true, inspirationId: updated.id, feedback: updated.feedback };
  }
  const card = await store.latestAwaitingFeedback();
  if (!card) return { recorded: false, reason: "no_card_awaiting" };
  const updated = await store.recordFeedback(card.id, feedback);
  await recordEvent?.("inspiration.feedback.recorded", { inspirationId: card.id, feedback: updated.feedback })?.catch(() => {});
  return { recorded: true, inspirationId: card.id, feedback: updated.feedback };
}

export { INSPIRATION_FEEDBACK_TOOL_NAME, recordInspirationFeedback };
