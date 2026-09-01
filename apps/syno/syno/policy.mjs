const PROFILE_ROOTS = Object.freeze({
  "syno-read": [],
  "syno-ops": ["ops"],
  "syno-curate": ["vault", "ops"],
});

// 结构性边界（2026-09-01 D9）：管家能力内不存在改代码/系统控制。这两个意图不再是
// 可开启的开关，而是永远拒绝；开关、syno-code profile 与相关操作注册已物理删除。
const FORBIDDEN_INTENTS = new Set(["code_change", "system_control"]);

const HIGH_RISK_INTENTS = new Set([
  "overwrite_note",
  "delete",
  "move",
  "new_moc",
  "new_tag",
  "migrate_integrate",
]);
const COMPLEX_INTENTS = new Set(["complex_analysis"]);

const WRITE_INTENTS = new Set([
  "create_action",
  "create_content_idea",
  "create_content_brief",
  "create_memory_proposal",
  "create_output_opportunity",
  "create_goal",
  "create_project",
  "update_project_status",
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
  if (/选题|content idea/.test(text)) return "create_content_idea";
  if (/brief|内容策划|制作说明/.test(text)) return "create_content_brief";
  if (/收录|整理成笔记|curate/.test(text)) return "curate_note";
  if (/记住|长期记忆/.test(text)) return "create_memory_proposal";
  if (/搜索|查找|找一下|search/.test(text)) return "search";
  return "chat";
}

function evaluate(request = {}, context = {}) {
  const intent = inferIntent(request);
  // trust-but-clarify：所有写入默认自动执行（approval 恒为 none）。code_change /
  // system_control 是结构性禁区（D9），无条件拒绝，没有任何开关可以放开。
  // 收录的"冲突澄清"由收录层按系统歧义单独触发，不经此字段。
  const highRisk = HIGH_RISK_INTENTS.has(intent);
  const writes = WRITE_INTENTS.has(intent);
  const profile = highRisk || intent === "curate_note" || intent === "migrate_note"
    ? "syno-curate"
    : writes
      ? "syno-ops"
      : "syno-read";
  const approval = "none";
  const risk = highRisk ? "high" : writes ? "low" : "read";
  const executor = "cognitive-runtime";
  const denied = FORBIDDEN_INTENTS.has(intent);
  return Object.freeze({
    intent,
    profile,
    approval,
    risk,
    executor,
    allowedRoots: PROFILE_ROOTS[profile],
    // Every fact-source write is transactional: it runs in an isolated worktree
    // and merges only after validators pass. Conflict clarification (ingest) and
    // source-root boundary rejection (agent-host) pause or block outside Policy.
    needsWorktree: writes,
    validators: ["changed-paths", ...(writes ? ["ops-contracts"] : []), ...(profile === "syno-curate" ? ["markdown", "vault-contract"] : [])],
    allowed: !denied,
    reason: denied
      ? intent === "code_change"
        ? "管家不修改项目代码：代码变更只由主人在开发流程中进行"
        : "管家不做本机生命周期控制：装卸服务请使用安装脚本手动执行"
      : highRisk
        ? "高风险意图默认自动执行（已隔离工作区）；收录冲突或源码越界时单独处理"
        : writes
          ? "写入请求默认自动执行（已隔离工作区）；收录冲突时暂停澄清"
          : "只读请求可直接执行",
  });
}

export { COMPLEX_INTENTS, FORBIDDEN_INTENTS, HIGH_RISK_INTENTS, PROFILE_ROOTS, evaluate, inferIntent };
