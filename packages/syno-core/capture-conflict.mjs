import { formatNotice } from "./text-format.mjs";

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

// 收录终态只改变呈现，不改变核验语义：captured/unverified 仍如实保留，不用排版掩盖未验证状态。
function formatCaptureReport(result = {}, { publishingMode = "disabled" } = {}) {
  const complete = result.completionStatus === "complete";
  const issues = (Array.isArray(result.unverifiedIssues) ? result.unverifiedIssues : [])
    .map((item) => String(item).trim())
    .filter(Boolean);
  const tagIssues = issues.filter((item) => item.startsWith("新标签候选："));
  const verificationIssues = issues.filter((item) => !item.startsWith("新标签候选："));
  const verificationLabel = (value) => value === "unverified" || !value ? "未验证" : String(value);
  return formatNotice({
    title: complete ? "✅ 收录已保存" : "📥 收录已保存 · 待验证",
    sections: [
      { icon: "📂", heading: "保存位置", lines: [result.path || "知识记录已写入"] },
      { icon: "🔎", heading: "核验状态", lines: [
        `· 来源可信度：${verificationLabel(result.source?.reliability)}`,
        `· 内容核验：${verificationLabel(result.source?.verificationStatus)}`,
        "· 知识状态：已收录（captured），不代表已掌握",
      ] },
      { icon: "🧩", heading: "内容提取", lines: [
        `· 主张候选：${result.candidates?.claims?.length || 0} 条`,
        `· 证据候选：${result.candidates?.evidence?.length || 0} 条`,
        `· 重复候选：${result.duplicateOrRelations?.matches?.length || 0} 条`,
        `· 已说明关系：${result.duplicateOrRelations?.relations?.length || 0} 条`,
      ] },
      verificationIssues.length
        ? { icon: "⚠️", heading: "尚未验证", lines: verificationIssues.map((item) => `· ${item}`) }
        : { icon: "✅", heading: "验证事项", lines: ["没有未披露的验证事项。"] },
      tagIssues.length ? { icon: "🏷", heading: "新标签候选", lines: [
        tagIssues.map((item) => `#${item.slice("新标签候选：".length).trim()}`).join(" "),
      ] } : null,
    ],
    footer: complete ? (publishingMode === "disabled" ? "云端发布未启用" : "Wiki／目录／图片状态待核验") : undefined,
  });
}

function shouldNotifyWorkflowEvent(type, workflow = {}, error = null) {
  if (type === "workflow.reported") return true;
  if (type !== "workflow.failed") return false;
  if (workflow.stage === "failed_retryable" || error?.retryable === true) return false;
  return true;
}

export { captureHasBlockingConflict, captureTargetExists, formatCaptureReport, shouldNotifyWorkflowEvent };
