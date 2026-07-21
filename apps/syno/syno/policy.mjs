const PROFILE_ROOTS = Object.freeze({
  "syno-read": [],
  "syno-ops": ["ops"],
  "syno-curate": ["vault", "ops"],
  "syno-code": ["apps", "contracts", "config", "docs", "scripts", "tests", "AGENTS.md", "README.md", "package.json"],
});

const HIGH_RISK_INTENTS = new Set([
  "overwrite_note",
  "delete",
  "move",
  "new_moc",
  "new_tag",
  "migrate_integrate",
  "code_change",
]);
const COMPLEX_INTENTS = new Set(["complex_analysis"]);
const LOCAL_CONTROL_INTENTS = new Set(["system_control"]);

const WRITE_INTENTS = new Set([
  "create_action",
  "create_content_idea",
  "create_content_brief",
  "create_memory_proposal",
  "record_learning_evidence",
  "create_output_opportunity",
  "create_goal",
  "create_claim",
  "create_evidence_candidate",
  "create_knowledge_profile",
  "approve_evidence_candidate",
  "create_report",
  "settings_change",
  "curate_note",
  "migrate_note",
  ...HIGH_RISK_INTENTS,
]);

function inferIntent(request = {}) {
  if (request.intent) return String(request.intent);
  const text = String(request.text || request.message || "").toLowerCase();
  if (/删除|delete|移除/.test(text)) return "delete";
  if (/覆盖|overwrite/.test(text)) return "overwrite_note";
  if (/移动|move|重命名|rename/.test(text)) return "move";
  if (/新建\s*moc|new\s+moc/.test(text)) return "new_moc";
  if (/新标签|新 tag|new tag/.test(text)) return "new_tag";
  if (/^(?:\/任务\s+|任务[：:]|待办[：:]|提醒我|新增行动)/u.test(text.trim())) return "create_action";
  if (/代码|code|实现|修复/.test(text)) return "code_change";
  if (/选题|content idea/.test(text)) return "create_content_idea";
  if (/brief|内容策划|制作说明/.test(text)) return "create_content_brief";
  if (/收录|整理成笔记|curate/.test(text)) return "curate_note";
  if (/记住|长期记忆/.test(text)) return "create_memory_proposal";
  if (/搜索|查找|找一下|search/.test(text)) return "search";
  return "chat";
}

function evaluate(request = {}, context = {}) {
  const intent = inferIntent(request);
  const developmentMode = context.developmentMode === true;
  const highRisk = HIGH_RISK_INTENTS.has(intent);
  const localControl = LOCAL_CONTROL_INTENTS.has(intent);
  const writes = WRITE_INTENTS.has(intent);
  const profile = localControl
    ? "syno-read"
    : intent === "code_change"
    ? "syno-code"
    : highRisk || intent === "curate_note" || intent === "migrate_note"
      ? "syno-curate"
      : writes
        ? "syno-ops"
        : "syno-read";
  const trustedAutomation = context.trustedAutomation === true && intent === "create_report";
  const approval = highRisk ? "double" : localControl || (writes && !trustedAutomation) ? "single" : "none";
  const risk = highRisk ? "high" : localControl || writes ? "low" : "read";
  const executor = "cognitive-runtime";
  const denied = intent === "code_change" && !developmentMode;
  return Object.freeze({
    intent,
    profile,
    approval,
    risk,
    executor,
    allowedRoots: PROFILE_ROOTS[profile],
    // Every fact-source write is transactional. The actual diff decides whether
    // it may auto-merge or must pause for a second approval.
    needsWorktree: writes,
    autoCommit: false,
    validators: ["changed-paths", ...(writes ? ["ops-contracts"] : []), ...(profile === "syno-curate" ? ["markdown", "vault-contract"] : [])],
    allowed: !denied,
    reason: denied
      ? "开发模式默认关闭，拒绝由 Syno 修改自身代码"
      : localControl
        ? "本机生命周期控制需要主人显式确认并写入审计事件"
      : highRisk
        ? "命中确定性高风险意图，需要隔离工作区与双审批"
      : writes
        ? "请求会修改长期事实源，需要一次审批"
        : "只读请求可直接执行",
  });
}

export { COMPLEX_INTENTS, HIGH_RISK_INTENTS, LOCAL_CONTROL_INTENTS, PROFILE_ROOTS, evaluate, inferIntent };
