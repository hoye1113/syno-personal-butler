import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { LearningService } from "../apps/syno/syno/learning-service.mjs";
import { PostIngestCandidateStore } from "../apps/syno/syno/post-ingest-candidates.mjs";
import { createSynoRuntime } from "../apps/syno/syno/runtime.mjs";

// 服务级联动：teach-back 证据 committed 后，完成钩子按 knowledgeRef 关闭复习候选。
// 交接点契约——候选系统管首教前，LearningState 管首教后。
test("teach-back evidence closes the review candidate and hands over to LearningState", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-review-loop-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const clockState = { now: new Date("2026-07-28T00:00:00.000Z") };
  const knowledgeRef = "vault/02-Resources/AI and Agents/Context Engineering.md";
  const candidates = new PostIngestCandidateStore({ root: path.join(root, "candidates"), clock: () => clockState.now });
  await candidates.record({ workflow: { id: "workflow-1", artifactId: "a1" }, commit: { path: knowledgeRef }, proposal: {} });
  await candidates.markReviewPresented("workflow-1", { presentedAt: "2026-07-29T08:00:00.000Z" });

  // 主人在复习窗口内交付原创讲解 → learning.submit → learning.evidence.record → learning.record
  const learning = new LearningService({ opsRoot: path.join(root, "ops"), clock: () => clockState.now });
  const result = await learning.record({
    knowledgeRef,
    producer: "user",
    inputMode: "teach-back",
    assistedLevel: "none",
    isReview: true,
    rawOutput: "上下文工程的核心是把模型需要的信息分层组织，按任务阶段动态装配，而不是一股脑塞进提示词。",
    rubric: { accurate: 0.9, explained: 0.8, applied: 0.8, discriminated: 0.8 },
    selfAssessment: "mostly",
  });
  assert.equal(result.evidence.passed, true);
  assert.equal(result.evidence.knowledgeRef, knowledgeRef);

  // runtime onCommitted 完成钩子的契约：learning.evidence.record committed → 按 knowledgeRef 关闭候选
  const hits = await candidates.completeReviewByKnowledgeRef(result.evidence.knowledgeRef, {
    evidenceId: result.evidence.id,
    jobId: "job-learning-1",
  });
  assert.equal(hits, 1);
  const record = JSON.parse(await fs.readFile(path.join(root, "candidates", "workflow-1.json"), "utf8"));
  assert.equal(record.reviewOpportunity.status, "done");
  assert.equal(record.reviewOpportunity.evidenceRef, result.evidence.id);
  assert.equal(record.learningCandidate.status, "learning");

  // 首教后由 LearningState 接管：state 落盘且 nextReviewAt 在未来（复习曲线 [1,3,7,14,30,60] 首个间隔 3 天）
  assert.ok(new Date(result.state.nextReviewAt) > clockState.now);
  assert.equal(result.state.reviewIntervalDays, 3);
  // 候选 done 之后不再出现在待推送/活跃集合
  assert.equal((await candidates.dueReviews({ now: new Date("2026-07-30T00:00:00.000Z") })).length, 0);
  assert.equal((await candidates.findActiveReviews({ now: clockState.now })).length, 0);
});

test("createSynoRuntime wires reviewReminders into signal sources and proactive delivery", () => {
  process.env.NODE_ENV = "test";
  const runtime = createSynoRuntime({});
  assert.equal(runtime.reviewReminders?.constructor?.name, "ReviewReminderSource");
  assert.equal(runtime.signalSources.reviewReminders, runtime.reviewReminders);
  assert.equal(typeof runtime.proactive.onSignalsDelivered, "function");
});
