import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { IngestService, isAllowedIngestPath, proposalAllowsWriteJob } from "../apps/syno/syno/ingest-service.mjs";
import { ClaimEvidenceService } from "../apps/syno/syno/claim-evidence-service.mjs";
import { GoalService } from "../apps/syno/syno/goal-service.mjs";
import { LearningService, calibrationFor, reviewIntervalDays } from "../apps/syno/syno/learning-service.mjs";
import { OutputService } from "../apps/syno/syno/output-service.mjs";
import { TodayService } from "../apps/syno/syno/today-service.mjs";
import { ConversationRouter } from "../apps/syno/syno/conversation-router.mjs";
import { SignalSourceRegistry } from "../apps/syno/syno/signal-source-registry.mjs";
import { KnowledgeMaintenanceSource } from "../apps/syno/syno/knowledge-maintenance-source.mjs";
import { validateVaultContract } from "../apps/syno/syno/validator.mjs";

test("ConversationRouter keeps one owner conversation across channels and explicit threads", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-conversation-router-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const router = new ConversationRouter({ stateFile: path.join(root, "routing.json") });
  const web = await router.resolve({ ownerKey: "owner", channel: "web" });
  const weixin = await router.resolve({ ownerKey: "owner", channel: "weixin" });
  assert.equal(weixin, web);
  const focused = await router.resolve({ ownerKey: "owner", channel: "web", threadKey: "project-hermes" });
  assert.notEqual(focused, web);
  assert.equal(await router.resolve({ ownerKey: "owner", channel: "feishu", threadKey: "project-hermes" }), focused);
});

test("ingest returns an immediate Artifact then builds an additive proposal", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-ingest-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new IngestService({
    intake: { async prepare(payload) { return { sourceType: payload.kind, text: `受控正文：${payload.value}` }; } },
    knowledge: { async search() { return []; } },
    opsRoot: path.join(root, "ops"), stateRoot: path.join(root, "state"),
    clock: () => new Date("2026-07-17T08:00:00.000Z"),
  });
  const receipt = await service.receive({ kind: "text", value: "Agent Harness 的关键是反馈回路" });
  assert.match(receipt.artifact.id, /^artifact-/);
  assert.equal(receipt.proposalPending, true);
  assert.equal((await service.status(receipt.artifact.id)).status, "received");
  const { proposal } = await service.propose(receipt.artifact.id);
  assert.equal(proposal.risk, "additive");
  assert.match(proposal.suggestedPath, /^vault\/00-Inbox\//);
  assert.equal((await service.propose(receipt.artifact.id)).proposal.id, proposal.id);
  await assert.rejects(fs.access(path.join(root, "ops", "artifacts")), { code: "ENOENT" });
  const legacyStateFile = path.join(root, "state", `${receipt.artifact.id}.json`);
  const legacyState = JSON.parse(await fs.readFile(legacyStateFile, "utf8"));
  delete legacyState.artifact;
  await fs.writeFile(legacyStateFile, JSON.stringify(legacyState), "utf8");
  const applied = await service.apply(receipt.artifact.id, { workspace: root, decision: { action: "create" } });
  assert.equal(applied.applied, true);
  assert.equal(applied.completionStatus, "incomplete");
  const note = await fs.readFile(path.join(root, applied.path), "utf8");
  assert.match(note, /factual_status: unverified/);
  assert.match(note, /^tags: \["notes"\]$/m);
  assert.match(note, /^created: 2026-07-17$/m);
  assert.match(note, /^source: /m);
  assert.match(note, /^description: /m);
  assert.match(note, /^link_status: orphan$/m);
  await fs.mkdir(path.join(root, "config"), { recursive: true });
  await fs.copyFile(path.resolve("config/vault-contract.json"), path.join(root, "config", "vault-contract.json"));
  await validateVaultContract(root, [applied.path], { intent: "curate_note" });
  assert.equal(applied.lifecycle.proposal.status, "applied");
  assert.equal(applied.lifecycle.candidate.status, "accepted");
  assert.equal(applied.lifecycle.artifact.status, "accepted");
});

test("Bilibili ingest requires and renders the canonical v2 source profile", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-bilibili-v2-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new IngestService({
    stateRoot: path.join(root, "state"),
    knowledge: { async search() { return []; }, async findBySource() { return []; } },
    intake: {
      async prepare() {
        return {
          sourceType: "bilibili-opus",
          sourceUrl: "https://www.bilibili.com/opus/123456",
          content: "专栏正文",
          sourceProfile: { opusId: "123456" },
        };
      },
    },
    clock: () => new Date("2026-07-28T08:00:00.000Z"),
  });
  const receipt = await service.receive({ kind: "url", value: "https://www.bilibili.com/opus/123456" });
  await service.propose(receipt.artifact.id);
  await assert.rejects(
    service.apply(receipt.artifact.id, { workspace: root, decision: { action: "create" } }),
    { code: "INGEST_BILIBILI_PROFILE_INCOMPLETE" },
  );
  await service.enrichProposal(receipt.artifact.id, {
    quality: { status: "accepted", reasons: [] },
    materialTier: "S",
    sourceProfile: {
      sourceTier: "C1",
      sourceForm: "lecture",
      contentForm: "dialogue",
      dialogueFidelity: "reconstructed",
      questionSource: "editorial",
      voiceBasis: "attributed_paraphrase",
      factualStatus: "partial",
      factualReviewed: "2026-07-28",
      verificationScope: "column_only",
      verificationBasis: ["column"],
    },
    canonicalBody: [
      "> 人物、主题、核心问题和阅读导航。",
      "## 开场",
      "## 01 为什么需要这个机制",
      "**编者问：** 为什么？\n\n**专栏整理：** 因为需要证据。",
      "## 02 如何落地",
      "**编者问：** 如何做？\n\n**专栏整理：** 从最小闭环开始。",
      "## 03 有什么取舍",
      "**编者问：** 边界是什么？\n\n**专栏整理：** 不把摘要当掌握。",
      "## 限制与边界",
      "只核对了专栏内容，未核对外部原页。",
      "## 知识连接",
      "当前为 orphan，等待真实关联。",
      "## 来源说明",
      "依据 B 站专栏 column 整理。",
    ].join("\n\n"),
    unresolved: [],
  });
  const applied = await service.apply(receipt.artifact.id, { workspace: root, decision: { action: "create" } });
  const note = await fs.readFile(path.join(root, applied.path), "utf8");
  assert.match(note, /^ingest_workflow: bilibili_opus_ingest_v2$/m);
  assert.match(note, /^source_type: bilibili_opus$/m);
  assert.match(note, /^opus_id: "123456"$/m);
  assert.match(note, /^content_form: dialogue$/m);
  assert.match(note, /^question_source: editorial$/m);
  assert.match(note, /^verification_scope: column_only$/m);
  assert.match(note, /^## 03 有什么取舍$/m);
  assert.equal(applied.completionStatus, "incomplete");
  const state = await service.status(receipt.artifact.id);
  assert.equal(state.proposal.sourceReport.status, "incomplete");
  assert.equal(state.proposal.sourceReport.checks.semanticReview, false);
  assert.deepEqual(state.proposal.sourceReport.sourcesRead, ["column"]);
});

test("a quality-rejected proposal cannot create a write Job", () => {
  assert.equal(proposalAllowsWriteJob({ quality: { status: "rejected" } }), false);
  assert.equal(proposalAllowsWriteJob({ quality: { status: "limited" } }), true);
});

test("model-proposed ingest paths cannot target canonical system rules", () => {
  assert.equal(isAllowedIngestPath("vault/02-Resources/AI and Agents/note.md"), true);
  assert.equal(isAllowedIngestPath("vault/99-System/Skills/forged.md"), false);
  assert.equal(isAllowedIngestPath("vault/AGENTS.md"), false);
  assert.equal(isAllowedIngestPath("vault/00-Inbox/../../99-System/forged.md"), false);
});

test("ingest drops model-proposed relations whose target note cannot be resolved", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-relation-target-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const existing = "vault/02-Resources/existing.md";
  await fs.mkdir(path.join(root, "vault", "02-Resources"), { recursive: true });
  await fs.writeFile(path.join(root, existing), "# Existing", "utf8");
  const service = new IngestService({
    stateRoot: path.join(root, "state"),
    knowledge: {
      async search() { return [{ path: existing, title: "Existing", excerpt: "现有笔记摘要", sensitive: false }]; },
      async read(target) {
        if (target !== existing) throw Object.assign(new Error("missing"), { code: "ENOENT" });
        return { path: target };
      },
    },
    intake: { async prepare(payload) { return { sourceType: "text", content: payload.value }; } },
  });
  const receipt = await service.receive({ kind: "text", value: "relation material" });
  await service.propose(receipt.artifact.id);
  const { proposal } = await service.enrichProposal(receipt.artifact.id, {
    relations: [
      { type: "supports", target: existing, reason: "可验证目标" },
      { type: "supports", target: "vault/02-Resources/invented.md", reason: "幻觉目标" },
      { type: "supports", target: "../../outside.md", reason: "逃逸目标" },
    ],
  });
  assert.deepEqual(proposal.relations, [{ type: "supports", target: existing, reason: "可验证目标" }]);
});

test("ingest preserves SourceDescriptor through receipt, proposal, and completion", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-source-ingest-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new IngestService({
    stateRoot: path.join(root, "state"),
    knowledge: { async search() { return []; } },
    intake: {
      async prepare(payload) {
        return {
          sourceType: "url",
          sourceUrl: payload.value,
          content: "Reference content",
          title: "Reference",
          author: "Primary Author",
          sourceTier: "primary",
          reliability: "traceable",
          verificationStatus: "partial",
        };
      },
    },
    clock: () => new Date("2026-07-28T08:00:00.000Z"),
  });
  const receipt = await service.receive(
    { kind: "url", value: "https://example.com/post?utm_source=wechat&id=7" },
    { ownerId: "owner", channel: "weixin", messageId: "wx-42" },
  );
  assert.equal(receipt.artifact.sourceDescriptor.canonicalUrl, "https://example.com/post?id=7");
  const prepared = await service.propose(receipt.artifact.id);
  assert.equal(prepared.proposal.sourceDescriptor.author, "Primary Author");
  assert.equal(prepared.proposal.sourceDescriptor.sourceTier, "primary");
  assert.equal(prepared.proposal.sourceDescriptor.reliability, "traceable");
  const completed = await service.apply(receipt.artifact.id, { workspace: root, decision: { action: "create" } });
  assert.equal(completed.source.verificationStatus, "partial");
  const note = await fs.readFile(path.join(root, completed.path), "utf8");
  assert.match(note, /source_verification: partial/);
  assert.match(note, /^source: "https:\/\/example\.com\/post\?id=7"$/m);
});

test("ingest persists a revision as a new proposal without applying the old decision", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-ingest-revision-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new IngestService({
    stateRoot: path.join(root, "state"),
    knowledge: { async search() { return []; } },
    intake: { async prepare(payload) { return { sourceType: "text", text: payload.value, title: "原方案" }; } },
    clock: () => new Date("2026-07-28T08:00:00.000Z"),
  });
  const receipt = await service.receive({ kind: "text", value: "需要调整的内容" });
  const original = await service.propose(receipt.artifact.id);
  const revised = await service.revise(receipt.artifact.id, "标题改成更适合小白的表述");
  assert.notEqual(revised.proposal.id, original.proposal.id);
  assert.equal(revised.proposal.previousProposalId, original.proposal.id);
  assert.equal(revised.proposal.revisionRequest, "标题改成更适合小白的表述");
  assert.equal((await service.status(receipt.artifact.id)).proposal.id, revised.proposal.id);
});

test("ingest detects a changed snapshot from the same canonical source", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-source-update-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new IngestService({
    stateRoot: path.join(root, "state"),
    knowledge: {
      async search() { return []; },
      async findBySource({ canonicalUrl }) {
        assert.equal(canonicalUrl, "https://example.com/article");
        return [{ path: "vault/02-Resources/article.md", sourceDigest: "a".repeat(64) }];
      },
    },
    intake: {
      async prepare(payload) {
        return { sourceType: "url", sourceUrl: payload.value, content: "updated content" };
      },
    },
  });
  const receipt = await service.receive({ kind: "url", value: "https://example.com/article?utm_source=wechat" });
  const { proposal } = await service.propose(receipt.artifact.id);
  assert.equal(proposal.duplicateAssessment.sameSource, true);
  assert.equal(proposal.duplicateAssessment.updateStatus, "changed");
  assert.deepEqual(proposal.duplicateAssessment.matches, ["vault/02-Resources/article.md"]);
  assert.equal(proposal.risk, "merge");
});

test("dedupe matches force merge review instead of silent overwrite", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-ingest-dedupe-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new IngestService({
    intake: { async prepare() { return { sourceType: "text", text: "重复素材" }; } },
    knowledge: { async search() { return [{ path: "vault/existing.md" }]; } },
    opsRoot: path.join(root, "ops"), stateRoot: path.join(root, "state"),
  });
  const receipt = await service.receive({ kind: "text", value: "重复素材" });
  const { proposal } = await service.propose(receipt.artifact.id);
  assert.equal(proposal.risk, "merge");
  await assert.rejects(service.apply(receipt.artifact.id, { workspace: root }), /显式收录决策/);
  await fs.mkdir(path.join(root, "vault"), { recursive: true });
  await fs.writeFile(path.join(root, "vault", "existing.md"), "# Existing\n", "utf8");
  const merged = await service.apply(receipt.artifact.id, { workspace: root, decision: { action: "append-source" } });
  assert.match(await fs.readFile(path.join(root, "vault", "existing.md"), "utf8"), /收录补充/);
  assert.equal(merged.lifecycle.proposal.status, "applied");
});

test("ingest failures are durable and additive proposals support one approved batch", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-ingest-batch-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let fail = true;
  const service = new IngestService({
    intake: { async prepare(payload) { if (fail) throw Object.assign(new Error("source unavailable"), { retryable: true }); return { sourceType: "text", content: payload.value, text: payload.value }; } },
    knowledge: { async search() { return []; } }, opsRoot: path.join(root, "ops"), stateRoot: path.join(root, "state"),
  });
  const failed = await service.receive({ kind: "text", value: "first" });
  await assert.rejects(service.propose(failed.artifact.id), /source unavailable/);
  assert.deepEqual((await service.status(failed.artifact.id)).error, { code: "INGEST_PROPOSAL_FAILED", message: "source unavailable", retryable: true });
  fail = false;
  await service.propose(failed.artifact.id);
  const second = await service.receive({ kind: "text", value: "second" });
  await service.propose(second.artifact.id);
  const batch = await service.applyBatch([failed.artifact.id, second.artifact.id], { workspace: root, decision: { action: "create" } });
  assert.equal(batch.applied, 2);
  assert.equal(batch.changedPaths.filter((item) => item.startsWith("vault/")).length, 2);
  assert.equal(batch.changedPaths.filter((item) => item.startsWith("ops/artifacts/")).length, 6);
});

test("pending intake includes new receipts and orders the newest first", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-ingest-pending-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateRoot = path.join(root, "state");
  await fs.mkdir(stateRoot, { recursive: true });
  await fs.writeFile(path.join(stateRoot, "artifact-old.json"), JSON.stringify({
    status: "received", created: "2026-07-19T08:00:00.000Z",
    artifact: { id: "artifact-old", created: "2026-07-19T08:00:00.000Z" },
  }), "utf8");
  await fs.writeFile(path.join(stateRoot, "artifact-new.json"), JSON.stringify({
    status: "proposed", created: "2026-07-20T08:00:00.000Z",
    artifact: { id: "artifact-new", created: "2026-07-20T08:00:00.000Z" },
    candidate: { artifactId: "artifact-new", title: "最新收录", created: "2026-07-20T08:01:00.000Z" },
  }), "utf8");
  const service = new IngestService({
    knowledge: { async search() { return []; } },
    stateRoot,
  });

  assert.deepEqual((await service.pending()).map((item) => item.id), ["artifact-new", "artifact-old"]);
});

test("only user-produced practice updates mastery and schedules repetition", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-learning-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new LearningService({ opsRoot: path.join(root, "ops"), clock: () => new Date("2026-07-17T08:00:00.000Z") });
  await assert.rejects(service.record({ producer: "ai" }), /主人亲自输出/);
  await assert.rejects(service.record({ producer: "user", rawArtifactRef: "invented" }), /原始输出/);
  const result = await service.record({
    producer: "user", knowledgeRef: "vault/agent-loop.md", inputMode: "teach-back",
    rawOutput: "我会先用自己的话解释 Tool Loop，然后给出失败恢复的例子、适用边界和在 Syno 中的具体应用。",
    assistedLevel: "prompted",
    rubric: { accurate: 1, explained: 1, applied: 1, discriminated: 1 }, selfAssessment: "mostly", isReview: false,
    misconceptions: ["忽略了失败恢复"],
  });
  assert.equal(result.state.stage, "expressed");
  assert.equal(result.evidence.rubricScore, 0.9);
  assert.equal(result.evidence.calibration, "aligned");
  assert.equal(result.state.reviewIntervalDays, 1);
  const reviewed = await service.record({
    producer: "user", knowledgeRef: "vault/agent-loop.md", inputMode: "quiz",
    rawOutput: "这次复习我重新说明了工具白名单、审批边界，以及 Provider 离线后为什么必须保持相同模型重试。", assistedLevel: "none",
    rubric: { accurate: 1, explained: 1, applied: 1, discriminated: 0 }, selfAssessment: "solid", isReview: true,
    misconceptions: [],
  });
  assert.equal(reviewed.state.reviewCount, 1);
  assert.equal(reviewed.state.reviewIntervalDays, 3);
  assert.equal(calibrationFor("solid", 0.5), "fluency-illusion");
  assert.equal(reviewIntervalDays({ passed: false, isReview: true, reviewCount: 5 }), 1);
  const due = await service.due({ now: new Date("2026-07-21T08:00:00.000Z") });
  assert.equal(due[0].knowledgeRef, "vault/agent-loop.md");
});

test("output opportunities and teach-back prompts make output a mastery mechanism", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-output-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new OutputService({ opsRoot: path.join(root, "ops"), clock: () => new Date("2026-07-17T08:00:00.000Z") });
  const prompt = service.teachBackPrompt({ title: "Tool Loop Agent", claims: ["claim-1"] });
  assert.equal(prompt.questions.length, 4);
  assert.match(prompt.evidenceRule, /主人亲自/);
  const { opportunity } = await service.createOpportunity({
    title: "为什么 Harness 比模型排行榜更重要", format: "deep-article", goalRefs: ["goal-1"],
    knowledgeRefs: ["vault/harness.md"], reason: "当前目标相关且缺少可教给小白的完整论证", priority: 90,
  });
  assert.equal(opportunity.status, "suggested");
  assert.equal(opportunity.priority, 90);
  const accepted = await service.progress(opportunity.id, { action: "accept" });
  assert.equal(accepted.opportunity.status, "accepted");
  assert.equal(accepted.opportunity.outline.length, 4);
  const drafted = await service.progress(opportunity.id, { action: "draft", userOutput: "这是我基于证据写出的完整观点草稿，包含主张、证据、反方观点、边界以及下一步实践。" });
  assert.equal(drafted.opportunity.status, "drafting");
  assert.match(drafted.opportunity.userArtifactRef, /^ops\/artifacts\/output\//);
  await assert.rejects(service.progress(opportunity.id, { action: "publish", feedback: "" }), /发布反馈/);
  const published = await service.progress(opportunity.id, { action: "publish", feedback: "读者仍不理解 Harness 与 Agent 的区别，需要补一个小白例子。" });
  assert.equal(published.opportunity.status, "published");
  assert.match(published.opportunity.feedback, /小白例子/);
  const { opportunity: next } = await service.createOpportunity({ title: "继续讲清 Tool Loop", reason: "仍需主人输出", priority: 20 });
  await service.progress(next.id, { action: "accept" });
  assert.equal((await service.list())[0].id, next.id, "actionable output must rank ahead of terminal history");
});

test("SignalSourceRegistry exposes stale claims, pending intake, output opportunities and maintenance", async () => {
  const registry = new SignalSourceRegistry({
    claims: { async dueClaims() { return [{ id: "claim-1", statement: "模型能力已到复核时间", reviewAfter: "2026-07-17T07:00:00.000Z" }]; } },
    ingest: { async pending() { return [{ id: "artifact-1", title: "待处理资料" }]; } },
    outputs: { async list() { return [
      { id: "output-1", title: "待写文章", priority: 90, status: "drafting" },
      { id: "output-2", title: "已发布文章", priority: 100, status: "published" },
    ]; } },
    maintenance: { async inspect() { return [{ id: "orphan-1", title: "孤立笔记" }]; } },
  });
  const events = await registry.collect({ now: new Date("2026-07-17T08:00:00.000Z") });
  assert.deepEqual(events.map((item) => item.kind), ["claim-review", "ingest-pending", "output-opportunity", "knowledge-maintenance"]);
});

test("output lifecycle exposes one canonical actionable flag to every consumer", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-output-lifecycle-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new OutputService({ opsRoot: path.join(root, "ops"), clock: () => new Date("2026-07-20T08:00:00.000Z") });
  const { opportunity } = await service.createOpportunity({ title: "讲清 Agent Harness", reason: "需要输出验证理解", priority: 80 });
  let records = await service.list();
  assert.equal(records[0].id, opportunity.id);
  assert.equal(records[0].actionable, true);
  assert.deepEqual(records[0].allowedActions, ["accept", "dismiss"]);
  await service.progress(opportunity.id, { action: "accept" });
  await assert.rejects(service.progress(opportunity.id, { action: "publish" }), /创作状态不允许/);
  await service.progress(opportunity.id, { action: "dismiss" });
  records = await service.list();
  assert.equal(records[0].actionable, false);
  assert.deepEqual(records[0].allowedActions, []);

  const events = await new SignalSourceRegistry({ outputs: { async list() { return records; } } }).collect();
  assert.equal(events.some((item) => item.kind === "output-opportunity"), false);
});

test("KnowledgeMaintenanceSource reports orphan notes without inventing writes", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-maintenance-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, "orphan.md"), "# Orphan\n\n没有关系。", "utf8");
  await fs.writeFile(path.join(root, "linked.md"), "# Linked\n\n[[target]]", "utf8");
  await fs.writeFile(path.join(root, "target.md"), "# Target", "utf8");
  const findings = await new KnowledgeMaintenanceSource({ vaultRoot: root }).inspect();
  assert.deepEqual(findings.map((item) => item.path), ["vault/orphan.md"]);
});

test("time-sensitive claims keep supporting and conflicting evidence side by side", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-evidence-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const service = new ClaimEvidenceService({ opsRoot: path.join(root, "ops"), clock: () => new Date("2026-07-17T08:00:00.000Z") });
  const { claim } = await service.createClaim({ statement: "某模型当前支持原生工具调用", stability: "volatile", reviewAfter: "2026-07-24T08:00:00.000Z" });
  const support = await service.createEvidenceCandidate({ claimId: claim.id, sourceRef: "https://vendor.example/docs", sourceTier: "first-party", stance: "supports", excerpt: "官方文档列出 tools。" });
  const conflict = await service.createEvidenceCandidate({ claimId: claim.id, sourceRef: "https://vendor.example/status", sourceTier: "first-party", stance: "contradicts", excerpt: "状态页说明该能力暂时关闭。" });
  const first = await service.approveCandidate({ candidateId: support.candidate.id });
  const second = await service.approveCandidate({ candidateId: conflict.candidate.id });
  assert.notEqual(first.evidence.id, second.evidence.id);
  assert.equal(first.evidence.stance, "supports");
  assert.equal(second.evidence.stance, "contradicts");
  assert.equal((await fs.readdir(path.join(root, "ops", "evidence", "records"))).length, 2);
  const updatedClaim = JSON.parse((await fs.readFile(path.join(root, "ops", "evidence", "claims", `${claim.id}.md`), "utf8")).match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.deepEqual(updatedClaim.evidenceRefs.sort(), [first.evidence.id, second.evidence.id].sort());
  assert.equal(updatedClaim.status, "contested");
  assert.deepEqual(updatedClaim.conflictsWith, [second.evidence.id]);
});

test("Today ranks goals before commitments and reviews with the fixed work mix", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-today-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const goals = new GoalService({ opsRoot: path.join(root, "ops"), clock: () => new Date("2026-07-17T08:00:00.000Z") });
  await goals.create({ title: "完成主动知识闭环", priority: 90, focusAreas: ["AI Agent"] });
  const today = new TodayService({
    goals,
    learning: { async due() { return [{ id: "review-1", knowledgeRef: "vault/harness.md", mastery: 0.4, nextReviewAt: "2026-07-17T07:00:00.000Z" }]; } },
    host: { async list() { return [{ id: "job-1", intent: "create_action", status: "awaiting_approval", risk: "low", request: { summary: "复习" } }]; } },
    clock: () => new Date("2026-07-17T08:00:00.000Z"),
  });
  const snapshot = await today.snapshot({ capacity: 20 });
  assert.equal(snapshot.priorities[0].kind, "goal");
  assert.deepEqual(snapshot.allocation, { digest: 12, ingest: 5, maintenance: 3 });
  assert.deepEqual(snapshot.counts, { goals: 1, commitments: 1, reviews: 1, signals: 0 });
});

test("Today exposes one next action, needs-owner items, recent intake and daily progress", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-today-decision-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const goals = new GoalService({ opsRoot: path.join(root, "ops"), clock: () => new Date("2026-07-20T08:00:00.000Z") });
  await goals.create({ title: "完成今日输出", priority: 90, focusAreas: ["AI Agent"] });
  const today = new TodayService({
    goals,
    learning: { async due() { return [{ id: "review-1", knowledgeRef: "vault/harness.md", mastery: 0.4, nextReviewAt: "2026-07-20T07:00:00.000Z" }]; } },
    host: { async list() { return [
      { id: "job-approval", intent: "ingest.apply", status: "awaiting_approval", risk: "low", updated: "2026-07-20T07:30:00.000Z", request: { summary: "批准收录建议" } },
      { id: "job-done", intent: "chat", status: "completed", risk: "read", updated: "2026-07-20T07:00:00.000Z", request: { summary: "完成微信回复" } },
      { id: "job-old", intent: "chat", status: "failed", risk: "read", updated: "2026-07-19T07:00:00.000Z", request: { summary: "昨日失败" } },
    ]; } },
    signalSources: new SignalSourceRegistry({
      ingest: { async pending() { return [{ id: "artifact-1", status: "proposed", title: "Agent 指南" }]; } },
      outputs: { async list() { return [{ id: "output-1", title: "Agent Harness", priority: 70, status: "drafting" }]; } },
    }),
    clock: () => new Date("2026-07-20T08:00:00.000Z"),
  });

  const snapshot = await today.snapshot({ capacity: 10 });
  assert.equal(snapshot.primary.title, "完成今日输出");
  assert.deepEqual(snapshot.needsYou.map((item) => item.kind), ["approval", "review", "output-opportunity"]);
  assert.ok(snapshot.recentIntake.length === 1 && snapshot.recentIntake[0].id === "artifact-1");
  assert.equal(snapshot.recentIntake[0].status, "proposed");
  assert.equal(snapshot.recentIntake[0].area, "capture");
  assert.equal(snapshot.recentIntake[0].intent, "review-ingest");
  assert.deepEqual(snapshot.progress, { completed: 1, waiting: 1, failed: 0 });
});
