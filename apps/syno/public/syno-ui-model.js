((root) => {
  const TODAY_TARGETS = Object.freeze({ approval: "jobs", commitment: "jobs", review: "learn", output: "create", goal: "create" });
  const OUTPUT_ACTIONS = Object.freeze({
    accept: Object.freeze({ label: "接受机会" }),
    draft: Object.freeze({ label: "提交我的草稿", needsOutput: true }),
    practice: Object.freeze({ label: "提交一次演练", needsOutput: true }),
    publish: Object.freeze({ label: "记录发布与反馈", needsFeedback: true }),
    dismiss: Object.freeze({ label: "暂不创作" }),
  });

  function todayTarget(item) {
    if (!item) return "knowledge";
    return TODAY_TARGETS[item.kind] || "knowledge";
  }

  function outputActions(opportunity) {
    return (opportunity?.allowedActions || []).map((action) => ({ action, ...OUTPUT_ACTIONS[action] })).filter((item) => item.label);
  }

  const INTENT_LABELS = Object.freeze({
    curate_note: "收录", create_content_idea: "内容创意", create_content_brief: "内容大纲",
    create_action: "行动", create_memory_proposal: "记忆候选", goals_create: "目标",
    complex_analysis: "分析", search: "搜索", chat: "对话",
  });

  function intentLabel(intent) {
    return INTENT_LABELS[intent] || intent || "任务";
  }

  // 待澄清任务的动作按钮：标签随拟执行的结果而变（收录/丢弃/批准合并），
  // 而非千篇一律的「批准/拒绝」。建议结果尚未就绪时返回空数组（等待管家读取后再填）。
  function adviceButtons(job) {
    const advice = job?.advice;
    const action = advice?.detail?.action;
    if (job?.phase === "merge") return [{ action: "approve", label: "批准合并", kind: "accent" }, { action: "reject", label: "拒绝", kind: "ghost" }];
    if (action === "create") return [{ action: "approve", label: "收录", kind: "accent" }, { action: "reject", label: "拒绝收录", kind: "ghost" }];
    if (action === "reject") return [{ action: "approve", label: "丢弃", kind: "accent" }, { action: "reject", label: "保留", kind: "ghost" }];
    if (action === "append-source" || action === "link-only" || action === "keep-separate") return [{ action: "approve", label: "批准合并", kind: "accent" }, { action: "reject", label: "拒绝", kind: "ghost" }];
    if (advice) return [{ action: "approve", label: "批准", kind: "accent" }, { action: "reject", label: "拒绝", kind: "ghost" }];
    return [];
  }

  // 文件扩展名 → kind 映射（大小写不敏感）。
  function fileKindFromName(name) {
    const ext = String(name || "").toLowerCase().split(".").pop();
    const map = { pdf: "pdf", md: "markdown", markdown: "markdown", txt: "txt", docx: "docx", html: "html", htm: "html" };
    if (!map[ext]) throw new Error(`暂不支持该格式：仅支持 PDF、Markdown、TXT、DOCX、HTML`);
    return map[ext];
  }

  // 纯映射器：把 job + 缓存的 advice 映射成卡片视图模型（供测试与渲染共用）。
  function adviceViewModel(job) {
    const advice = job?.advice || null;
    return {
      intentLabel: intentLabel(job?.intent),
      advice,
      buttons: adviceButtons(job),
      loading: !advice,
      degraded: advice?.via === "fallback" || advice?.via === "minimal",
    };
  }

  root.SynoUiModel = Object.freeze({ todayTarget, outputActions, intentLabel, adviceButtons, adviceViewModel, fileKindFromName });
})(globalThis);
