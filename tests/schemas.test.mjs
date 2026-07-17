import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildTopicDraftFromInbox } from "../apps/syno/inbox-import.mjs";
import { validateContractRecord } from "../apps/syno/syno/schema-registry.mjs";

test("all public contracts are JSON Schema objects with stable identifiers", async () => {
  const root = path.resolve("contracts");
  const files = (await fs.readdir(root)).filter((file) => file.endsWith(".json"));
  assert.ok(files.length >= 7);
  for (const file of files) {
    const schema = JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.match(schema.$id, /^https:\/\/syno\.local\/contracts\//);
    assert.equal(schema.type, "object");
    assert.ok(Array.isArray(schema.required));
  }
});

test("Afu topic drafts satisfy the executable ContentIdea contract", async () => {
  const candidate = {
    title: "知识库如何成为创作系统", dedupeKey: "abcdef1234", suggestedStage: "去重中",
    sourcePath: "vault/00-Inbox/source.md", sourceUrl: "https://example.com/source",
    author: "", source: "", tags: [], excerpt: "把知识检索、主张与排期连成可验证的创作闭环。",
  };
  const draft = buildTopicDraftFromInbox(candidate, "2026-07-17");
  const field = (name) => new RegExp(`^${name}:\\s*["']?(.+?)["']?\\s*$`, "m").exec(draft.content)?.[1];
  await validateContractRecord("content-idea", {
    type: field("type"), topic_id: field("topic_id"), title: candidate.title,
    status: field("status"), stage: field("stage"), source_inbox_path: candidate.sourcePath,
  });
});

test("knowledge-loop contracts reject AI-authored mastery and stale volatile claims", async () => {
  const baseEvidence = {
    id: "learning-1", knowledgeRef: "vault/note.md", producer: "user", inputMode: "teach-back",
    rawArtifactRef: "ops/artifacts/answer.md", assistedLevel: "prompted",
    rubric: { accurate: 1, explained: 1, applied: 1, discriminated: 1 }, rubricScore: 0.9,
    selfAssessment: "mostly", calibration: "aligned", passed: true, isReview: false,
    misconceptions: [], demonstratedAt: "2026-07-17T08:00:00.000Z", nextReviewAt: "2026-07-24T08:00:00.000Z",
  };
  await validateContractRecord("learning-evidence", baseEvidence);
  await assert.rejects(validateContractRecord("learning-evidence", { ...baseEvidence, producer: "ai" }), /producer/);
  const volatile = {
    id: "claim-1", statement: "当前模型支持某项能力", stability: "volatile", status: "candidate",
    evidenceRefs: [], updated: "2026-07-17T08:00:00.000Z",
  };
  await assert.rejects(validateContractRecord("claim", volatile), /复核时间/);
  await validateContractRecord("claim", { ...volatile, reviewAfter: "2026-07-24T08:00:00.000Z" });
});

test("settings permissions are disjoint", async () => {
  const registry = {
    version: 1,
    agentAdjustable: ["notifications.quietHours"],
    confirmationRequired: ["provider.modelId"],
    immutable: ["provider.token", "policy.rules", "toolRegistry"],
  };
  await validateContractRecord("settings-registry", registry);
  await assert.rejects(validateContractRecord("settings-registry", {
    ...registry,
    confirmationRequired: ["notifications.quietHours"],
  }), /不能重叠/);
});
