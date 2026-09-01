import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { PostIngestCandidateStore } from "../apps/syno/syno/post-ingest-candidates.mjs";

// D6（2026-09-01）：学习/复习候选已移除；收录后只落输出机会与证据候选。
test("committed ingest creates output and evidence candidates without learning facts", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-post-ingest-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new PostIngestCandidateStore({ root, clock: () => new Date("2026-07-28T00:00:00.000Z") });

  const result = await store.record({
    workflow: { id: "workflow-1", artifactId: "artifact-1" },
    commit: { path: "vault/02-Resources/AI and Agents/Context Engineering.md", knowledgeState: "captured" },
    proposal: {
      canonicalTags: ["ai_agent", "context_engineering"],
      unresolved: ["核对时效主张"],
      claimCandidates: [{ statement: "模型上下文会持续变化", stability: "volatile" }],
      evidenceCandidates: [{ statement: "官方文档描述了上下文限制", sourceRef: "https://example.com/official" }],
    },
  });

  assert.equal(result.learningCandidate, undefined);
  assert.equal(result.reviewOpportunity, undefined);
  assert.ok(result.outputOpportunity);
  assert.equal(result.evidenceCandidates.length, 2);
  assert.ok(result.evidenceCandidates.some((item) => item.sourceRef === "https://example.com/official"));
  assert.deepEqual(result.unresolved, ["核对时效主张"]);
  const persisted = await fs.readFile(path.join(root, "workflow-1.json"), "utf8");
  assert.doesNotMatch(persisted, /LearningState|LearningEvidence|learningCandidate|reviewOpportunity/);
});

test("non-output-relevant ingest records no output opportunity and stays listable", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-post-ingest-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new PostIngestCandidateStore({ root, clock: () => new Date("2026-07-28T00:00:00.000Z") });
  await store.record({
    workflow: { id: "workflow-2", artifactId: "a2" },
    commit: { path: "vault/01-Areas/生活/买菜清单.md" },
    proposal: {},
  });

  const records = await store.list();
  assert.equal(records.length, 1);
  assert.equal(records[0].workflowId, "workflow-2");
  assert.equal(records[0].outputOpportunity, null);
  assert.deepEqual(records[0].evidenceCandidates, []);
});

test("record rejects an invalid workflow id and tolerates a legacy record with learning fields", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-post-ingest-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new PostIngestCandidateStore({ root });
  await assert.rejects(store.record({ workflow: { id: "bad id!" }, commit: {}, proposal: {} }), /Workflow ID 无效/);

  // 历史记录（含 learningCandidate/reviewOpportunity 字段）原样保留可读，不迁移不报错
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, "workflow-legacy.json"), JSON.stringify({
    workflowId: "workflow-legacy",
    learningCandidate: { status: "learning" },
    reviewOpportunity: { status: "done" },
    outputOpportunity: null,
    evidenceCandidates: [],
    unresolved: [],
    createdAt: "2026-07-01T00:00:00.000Z",
  }));
  const records = await store.list();
  assert.equal(records.length, 1);
  assert.equal(records[0].workflowId, "workflow-legacy");
});
