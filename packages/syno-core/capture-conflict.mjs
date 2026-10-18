// 收录冲突与通知口径（2026-10-18 P0）：
// 只有「同源/同内容的真重复」才需要主人澄清；弱关联不再阻塞收录，
// 否则每篇同主题文章都要一次确认（实测 Anthropic 调查被 5 篇弱关联挡住）。
function captureHasBlockingConflict(proposal = {}) {
  const duplicate = proposal?.duplicateAssessment || {};
  if (duplicate.sameSource === true) return true;
  return ["same", "updated"].includes(String(duplicate.updateStatus || ""));
}

// 可重试失败不向主人发「未完成」通知：后台会自己重试，等终态再说。
// 目标路径已存在同样是一次真冲突：弱关联自动 keep-separate 若撞上已有笔记，
// apply 会以 INGEST_TARGET_EXISTS 失败；必须在 onProposed 前就转为待确认。
function captureTargetExists(notes = [], suggestedPath = "") {
  return Boolean(suggestedPath) && notes.some((note) => note.path === suggestedPath);
}

function shouldNotifyWorkflowEvent(type, workflow = {}, error = null) {
  if (type === "workflow.reported") return true;
  if (type !== "workflow.failed") return false;
  if (workflow.stage === "failed_retryable" || error?.retryable === true) return false;
  return true;
}

export { captureHasBlockingConflict, captureTargetExists, shouldNotifyWorkflowEvent };
