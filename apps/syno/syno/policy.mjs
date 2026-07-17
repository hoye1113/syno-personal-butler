const PROFILE_ROOTS = Object.freeze({
  "syno-read": [],
  "syno-ops": ["ops"],
  "syno-curate": ["vault", "ops"],
  "syno-code": ["apps", "contracts", "config", "docs", "scripts", "tests"],
});

const HIGH_RISK_INTENTS = new Set([
  "overwrite_note",
  "delete",
  "move",
  "new_moc",
  "new_tag",
  "code_change",
]);

const WRITE_INTENTS = new Set([
  "create_action",
  "create_content_idea",
  "create_content_brief",
  "create_memory_proposal",
  "create_report",
  "curate_note",
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
  const explicitComplexity = request.complexity === "complex" || context.complexity === "complex";
  const highRisk = HIGH_RISK_INTENTS.has(intent);
  const writes = WRITE_INTENTS.has(intent);
  const profile = intent === "code_change"
    ? "syno-code"
    : highRisk || intent === "curate_note"
      ? "syno-curate"
      : writes
        ? "syno-ops"
        : "syno-read";
  const trustedAutomation = context.trustedAutomation === true && intent === "create_report";
  const approval = highRisk ? "double" : writes && !trustedAutomation ? "single" : "none";
  const risk = highRisk ? "high" : writes ? "low" : "read";
  const executor = highRisk || explicitComplexity ? "claude" : "opencode";
  return Object.freeze({
    intent,
    profile,
    approval,
    risk,
    executor,
    allowedRoots: PROFILE_ROOTS[profile],
    needsWorktree: highRisk,
    autoCommit: writes && !highRisk,
    validators: ["changed-paths", ...(profile === "syno-curate" ? ["markdown", "vault-contract"] : [])],
    reason: highRisk
      ? "命中确定性高风险意图，需要隔离工作区与双审批"
      : writes
        ? "请求会修改长期事实源，需要一次审批"
        : "只读请求可直接执行",
  });
}

export { HIGH_RISK_INTENTS, PROFILE_ROOTS, evaluate, inferIntent };
