const OUTPUT_ACTIONABLE_STATUSES = Object.freeze(["suggested", "accepted", "drafting", "practiced"]);
const OUTPUT_TERMINAL_STATUSES = Object.freeze(["published", "dismissed"]);
const ACTIONABLE = new Set(OUTPUT_ACTIONABLE_STATUSES);
const OUTPUT_TRANSITIONS = Object.freeze({
  accept: Object.freeze({ from: Object.freeze(["suggested"]), status: "accepted" }),
  draft: Object.freeze({ from: Object.freeze(["accepted", "drafting"]), status: "drafting" }),
  practice: Object.freeze({ from: Object.freeze(["drafting", "practiced"]), status: "practiced" }),
  publish: Object.freeze({ from: Object.freeze(["drafting", "practiced"]), status: "published" }),
  dismiss: Object.freeze({ from: OUTPUT_ACTIONABLE_STATUSES, status: "dismissed" }),
});

function isActionableOutput(value) {
  return ACTIONABLE.has(typeof value === "string" ? value : value?.status);
}

function presentOutputOpportunity(opportunity) {
  return {
    ...opportunity,
    actionable: isActionableOutput(opportunity),
    allowedActions: Object.entries(OUTPUT_TRANSITIONS).filter(([, transition]) => transition.from.includes(opportunity.status)).map(([action]) => action),
  };
}

function outputTransition(action, status) {
  const transition = OUTPUT_TRANSITIONS[action];
  return transition?.from.includes(status) ? transition : null;
}

export { OUTPUT_ACTIONABLE_STATUSES, OUTPUT_TERMINAL_STATUSES, OUTPUT_TRANSITIONS, isActionableOutput, outputTransition, presentOutputOpportunity };
