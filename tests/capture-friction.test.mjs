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

  assert.match(text, /^✅ 已收录\n/);
  assert.match(text, /保存至 00-Inbox\ncomplete\.md/);
  assert.match(text, /没有未披露的验证事项。/);
  assert.match(text, /Wiki／目录／图片状态待核验/);
  assert.match(text, /已收录，不代表已掌握$/);
});

test("minimal receipt preserves nonzero signals and unrecognized verification details", () => {
  const text = formatCaptureReport({
    path: "vault/02-Resources/A/n.md",
    completionStatus: "incomplete",
    candidates: { claims: [{}, {}], evidence: [{}, {}] },
    duplicateOrRelations: { matches: [{}], relations: [{}, {}, {}] },
    unverifiedIssues: [
      "无法归类的自定义核验事项",
      "新标签候选：one",
      "新标签候选：two",
      "新标签候选：three",
      "新标签候选：four",
      "新标签候选：five",
    ],
  });

  assert.doesNotMatch(text, /主张/);
  assert.match(text, /保存至 02-Resources\/A\nn\.md/);
  assert.match(text, /· 2 条证据候选\n· 1 个重复候选\n· 3 条已说明关系/);
  assert.match(text, /待核验 1 项\n· 无法归类的自定义核验事项/);
  assert.match(text, /one · two · three · 等 5 项/);
});

test("capture report keeps only actionable information in the receipt", () => {
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
    "📥 已收录，待核验",
    "",
    "保存至 00-Inbox",
    "2114746056005329363-a4957f5b.md",
    "",
    "待核验 3 项",
    "· 来源正文及外部链接尚未核验",
    "· Dot、Grok Bot、Muse 的能力描述可能过时",
    "· 浏览量、时间线等账号数据无法独立核验",
    "",
    "新标签",
    "content-operations · xiaohongshu · workflow · agents",
    "",
    "已收录，不代表已掌握",
  ].join("\n"));
});
