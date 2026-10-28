import test from "node:test";
import assert from "node:assert/strict";

import { captureHasBlockingConflict, captureTargetExists, formatCaptureReport, shouldNotifyWorkflowEvent } from "../packages/syno-core/capture-conflict.mjs";

test("only same-source or same-content duplicates block capture", () => {
  assert.equal(captureHasBlockingConflict({ duplicateAssessment: { sameSource: true } }), true);
  assert.equal(captureHasBlockingConflict({ duplicateAssessment: { updateStatus: "same" } }), true);
  assert.equal(captureHasBlockingConflict({ duplicateAssessment: { updateStatus: "updated" } }), true);
  assert.equal(captureHasBlockingConflict({
    risk: "merge",
    unresolved: ["关系候选均为弱关联", "新标签候选：ai"],
    duplicateAssessment: { sameSource: false, updateStatus: "new", matches: ["a", "b", "c"] },
  }), false, "弱关联不再强制主人澄清");
  assert.equal(captureHasBlockingConflict({}), false);
});

test("retryable workflow failures are not announced as failures", () => {
  assert.equal(shouldNotifyWorkflowEvent("workflow.failed", { stage: "failed_retryable" }, { retryable: true }), false);
  assert.equal(shouldNotifyWorkflowEvent("workflow.failed", { stage: "failed_terminal" }, { retryable: false }), true);
  assert.equal(shouldNotifyWorkflowEvent("workflow.reported", { stage: "reported" }), true);
  assert.equal(shouldNotifyWorkflowEvent("workflow.proposed", {}), false);
});

test("an existing suggested target path is a conflict", () => {
  const notes = [{ path: "vault/02-Resources/A/n.md" }];
  assert.equal(captureTargetExists(notes, "vault/02-Resources/A/n.md"), true);
  assert.equal(captureTargetExists(notes, "vault/02-Resources/A/other.md"), false);
  assert.equal(captureTargetExists(notes, ""), false);
});

test("complete capture report retains the publishing status", () => {
  const text = formatCaptureReport({
    path: "vault/00-Inbox/complete.md",
    completionStatus: "complete",
    source: { reliability: "trusted", verificationStatus: "verified" },
  }, { publishingMode: "feishu" });

  assert.match(text, /^✅ 收录已保存\n/);
  assert.match(text, /· 内容核验：verified/);
  assert.match(text, /没有未披露的验证事项。/);
  assert.match(text, /Wiki／目录／图片状态待核验$/);
});

test("capture report groups verification details and translates internal labels", () => {
  const text = formatCaptureReport({
    path: "vault/00-Inbox/2114746056005329363-a4957f5b.md",
    completionStatus: "incomplete",
    source: { reliability: "unverified", verificationStatus: "unverified" },
    duplicateOrRelations: { matches: [], relations: [] },
    candidates: { claims: [{}, {}, {}, {}], evidence: [] },
    unverifiedIssues: [
      "来源或内容尚未通过事实核验",
      "文中飞书模板链接为占位入口，未实际核验",
      "作者使用的 Dot 及 Grok Bot、Muse 当前能力描述未经核实，可能已过时",
      "账号实践数据（浏览量、时间线）无法核验",
      "新标签候选：content-operations",
      "新标签候选：xiaohongshu",
      "新标签候选：workflow",
      "新标签候选：agents",
    ],
  });

  assert.equal(text, [
    "📥 收录已保存 · 待验证",
    "",
    "📂 保存位置",
    "vault/00-Inbox/2114746056005329363-a4957f5b.md",
    "",
    "🔎 核验状态",
    "· 来源可信度：未验证",
    "· 内容核验：未验证",
    "· 知识状态：已收录（captured），不代表已掌握",
    "",
    "🧩 内容提取",
    "· 主张候选：4 条",
    "· 证据候选：0 条",
    "· 重复候选：0 条",
    "· 已说明关系：0 条",
    "",
    "⚠️ 尚未验证",
    "· 来源或内容尚未通过事实核验",
    "· 文中飞书模板链接为占位入口，未实际核验",
    "· 作者使用的 Dot 及 Grok Bot、Muse 当前能力描述未经核实，可能已过时",
    "· 账号实践数据（浏览量、时间线）无法核验",
    "",
    "🏷 新标签候选",
    "#content-operations #xiaohongshu #workflow #agents",
  ].join("\n"));
});
