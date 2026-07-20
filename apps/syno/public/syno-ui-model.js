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

  root.SynoUiModel = Object.freeze({ todayTarget, outputActions });
})(globalThis);
