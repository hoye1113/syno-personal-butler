const OPERATION_INTENTS = Object.freeze({
  "reports.create": "create_report",
  "actions.create": "create_action",
  "memory.proposals.create": "create_memory_proposal",
  "ingest.apply": "curate_note",
  "ingest.apply-batch": "curate_note",
  "learning.evidence.record": "record_learning_evidence",
  "outputs.opportunity.create": "create_output_opportunity",
  "outputs.opportunity.progress": "create_output_opportunity",
  "goals.create": "create_goal",
  "claims.create": "create_claim",
  "evidence.candidates.create": "create_evidence_candidate",
  "evidence.candidates.approve": "approve_evidence_candidate",
  "notes.edit": "overwrite_note",
  "content.brief.create": "create_content_brief",
  "memory.promote": "curate_note",
  "inbox.import": "create_content_idea",
  "inbox.import-batch": "create_content_idea",
  "settings.save": "settings_change",
  "windows.service.install": "system_control",
  "windows.service.uninstall": "system_control",
  "wiki.compile": "curate_note",
  "wiki.todos.generate": "curate_note",
  "wiki.todos.accept": "create_content_idea",
  "wiki.todos.reject": "create_action",
  "topics.schedule": "create_action",
  "topics.unschedule": "create_action",
  "topics.revert-import": "delete",
});

function intentForOperation(operation, payload = {}) {
  if (operation === "topics.disposition") {
    return payload.action === "归档" ? "move" : "overwrite_note";
  }
  return OPERATION_INTENTS[operation] || null;
}

function buildOperationRequest(operation, payload = {}, extra = {}) {
  const intent = intentForOperation(operation, payload);
  if (!intent) {
    const error = new Error(`未注册的确定性操作：${operation}`);
    error.code = "UNKNOWN_OPERATION";
    throw error;
  }
  return {
    ...extra,
    kind: "syno-operation",
    operation,
    intent,
    payload,
    text: extra.text || `执行确定性操作：${operation}`,
  };
}

function assertRegisteredOperation(job) {
  if (job.request?.kind !== "syno-operation") return null;
  const expected = intentForOperation(job.request.operation, job.request.payload || {});
  if (!expected) {
    const error = new Error(`未注册的确定性操作：${job.request.operation}`);
    error.code = "UNKNOWN_OPERATION";
    throw error;
  }
  if (job.intent !== expected || job.decision?.intent !== expected || job.request.intent !== expected) {
    const error = new Error(`操作 ${job.request.operation} 的 Policy 意图不一致`);
    error.code = "OPERATION_INTENT_MISMATCH";
    throw error;
  }
  return expected;
}

export { OPERATION_INTENTS, assertRegisteredOperation, buildOperationRequest, intentForOperation };
