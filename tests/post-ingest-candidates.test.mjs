import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { PostIngestCandidateStore } from "../apps/syno/syno/post-ingest-candidates.mjs";

test("committed ingest creates rebuildable follow-up candidates without mastery facts", async (t) => {
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

  assert.equal(result.learningCandidate.knowledgeState, "captured");
  assert.equal(result.learningCandidate.masteryDelta, 0);
  assert.ok(result.reviewOpportunity);
  assert.ok(result.outputOpportunity);
  assert.equal(result.evidenceCandidates.length, 2);
  assert.ok(result.evidenceCandidates.some((item) => item.sourceRef === "https://example.com/official"));
  const persisted = await fs.readFile(path.join(root, "workflow-1.json"), "utf8");
  assert.doesNotMatch(persisted, /LearningState|LearningEvidence/);
});
