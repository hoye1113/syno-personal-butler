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

// 回执只压缩展示，不删除核验事实：可安全合并的同类项归纳，无法识别的原文继续保留。
function compactVerificationIssues(issues) {
  const sourceIssue = "来源或内容尚未通过事实核验";
  const hasSourceIssue = issues.includes(sourceIssue);
  const hasLinkIssue = issues.some((item) => /链接.*未实际核验|占位入口/u.test(item));
  const compacted = [];
  if (hasSourceIssue) compacted.push(hasLinkIssue ? "来源正文及外部链接尚未核验" : "来源正文尚未通过事实核验");
  for (const issue of issues) {
    if (issue === sourceIssue) continue;
    if (/链接.*未实际核验|占位入口/u.test(issue)) {
      if (!hasSourceIssue) compacted.push("外部链接尚未核验");
      continue;
    }
    const capability = /^作者使用的 (.+?) 当前能力描述未经核实，可能已过时$/u.exec(issue);
    if (capability) {
      compacted.push(`${capability[1].replace(/ 及 /gu, "、")} 的能力描述可能过时`);
      continue;
    }
    const accountData = /^账号实践数据（(.+?)）无法核验$/u.exec(issue);
    if (accountData) {
      compacted.push(`${accountData[1]}等账号数据无法独立核验`);
      continue;
    }
    compacted.push(issue);
  }
  return compacted;
}

// 主人回执只保留结果、位置和需要行动的信息；主张数等内部指标仍留在 Workflow，不占据首屏。
function formatCaptureReport(result = {}, { publishingMode = "disabled" } = {}) {
  const complete = result.completionStatus === "complete";
  const issues = (Array.isArray(result.unverifiedIssues) ? result.unverifiedIssues : [])
    .map((item) => String(item).trim())
    .filter(Boolean);
  const tags = issues.filter((item) => item.startsWith("新标签候选："))
    .map((item) => item.slice("新标签候选：".length).trim())
    .filter(Boolean);
  const verificationIssues = compactVerificationIssues(issues.filter((item) => !item.startsWith("新标签候选：")));
  const pathParts = String(result.path || "").replace(/\\/gu, "/").split("/").filter(Boolean);
  const fileName = pathParts.pop();
  const directory = pathParts.join("/").replace(/^vault\//u, "");
  const locationLines = fileName ? [`保存至 ${directory || "vault"}`, fileName] : ["知识记录已写入"];
  const actionableStats = [
    result.candidates?.evidence?.length ? `${result.candidates.evidence.length} 条证据候选` : "",
    result.duplicateOrRelations?.matches?.length ? `${result.duplicateOrRelations.matches.length} 个重复候选` : "",
    result.duplicateOrRelations?.relations?.length ? `${result.duplicateOrRelations.relations.length} 条已说明关系` : "",
  ].filter(Boolean);
  const visibleTags = tags.length > 4 ? [...tags.slice(0, 3), `等 ${tags.length} 项`] : tags;
  const publishingFooter = complete ? (publishingMode === "disabled" ? "云端发布未启用" : "Wiki／目录／图片状态待核验") : "";
  return formatNotice({
    title: complete ? "✅ 已收录" : "📥 已收录，待核验",
    sections: [
      { lines: locationLines },
      actionableStats.length ? { lines: actionableStats.map((item) => `· ${item}`) } : null,
      verificationIssues.length
        ? { heading: `待核验 ${verificationIssues.length} 项`, lines: verificationIssues.map((item) => `· ${item}`) }
        : { lines: ["没有未披露的验证事项。"] },
      visibleTags.length ? { heading: "新标签", lines: [visibleTags.join(" · ")] } : null,
    ],
    footer: [publishingFooter, "已收录，不代表已掌握"].filter(Boolean).join("\n"),
  });
}

function shouldNotifyWorkflowEvent(type, workflow = {}, error = null) {
  if (type === "workflow.reported") return true;
  if (type !== "workflow.failed") return false;
  if (workflow.stage === "failed_retryable" || error?.retryable === true) return false;
  return true;
}

export { captureHasBlockingConflict, captureTargetExists, formatCaptureReport, shouldNotifyWorkflowEvent };
