import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { ApprovalAdvisor, minimalAdvice } from "../apps/syno/syno/approval-advisor.mjs";
import { IngestService } from "../apps/syno/syno/ingest-service.mjs";
import { routeSynoApi } from "../apps/syno/syno/runtime.mjs";

const ARTIFACT_ID = "artifact-20260720-ef20760f";

async function writeArtifactState(stateRoot, id, overrides = {}) {
  const state = {
    payload: { kind: "url", value: "https://mp.weixin.qq.com/s/abc", title: "Anthropic Agent 工程实战指南" },
    ownerId: "local-user", channel: "weixin", status: "proposed", created: "2026-07-20T07:00:00.000Z",
    prepared: { content: "本书内容全部基于 Anthropic 官方发布的 15 篇 Agent 工程核心技术博客。", sourceUrl: "https://mp.weixin.qq.com/s/abc", sourceType: "url" },
    candidate: { id: "candidate-x", artifactId: id, title: "Anthropic Agent 工程实战指南", summary: "摘要", status: "proposed", confidence: 0.8, dedupeMatches: [], created: "2026-07-20T07:00:00.000Z" },
    proposal: { id: "ingest-x", candidateId: "candidate-x", status: "proposed", suggestedPath: `vault/00-Inbox/anthropic-agent-${id.slice(-8)}.md`, suggestedTags: [], suggestedLinks: [], risk: "additive", created: "2026-07-20T07:00:00.000Z" },
    ...overrides,
  };
  await fs.mkdir(stateRoot, { recursive: true });
  await fs.writeFile(path.join(stateRoot, `${id}.json`), JSON.stringify(state), "utf8");
  return state;
}

function fakeJob({ operation = "ingest.apply", reason = "请求会修改长期事实源，需要一次审批" } = {}) {
  const intent = operation === "ingest.apply" ? "curate_note" : operation;
  return { id: "job-test", intent, status: "awaiting_approval", request: { operation, summary: `Syno operation: ${operation}` }, decision: { reason, risk: "low", approval: "single" } };
}

function loadRequestFor(action, artifactId = ARTIFACT_ID) {
  return async () => ({ kind: "syno-operation", operation: "ingest.apply", intent: "curate_note", payload: { artifactId, decision: { action } }, text: "执行确定性操作：ingest.apply" });
}

test("IngestService.readArtifact returns content-bearing fields from local state", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-advisor-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stateRoot = path.join(root, "ingest");
  await writeArtifactState(stateRoot, ARTIFACT_ID);
  const ingest = new IngestService({ knowledge: { async search() { return []; } }, stateRoot });
  const art = await ingest.readArtifact(ARTIFACT_ID);
  assert.equal(art.id, ARTIFACT_ID);
  assert.equal(art.title, "Anthropic Agent 工程实战指南");
  assert.match(art.body, /Anthropic 官方发布/);
  assert.equal(art.source, "https://mp.weixin.qq.com/s/abc");
  assert.equal(art.proposedPath, `vault/00-Inbox/anthropic-agent-${ARTIFACT_ID.slice(-8)}.md`);
  assert.equal(art.risk, "additive");
  assert.deepEqual(art.dedupeMatches, []);
  assert.equal(art.status, "proposed");
});

test("IngestService.readArtifact throws ARTIFACT_MISSING when absent", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-advisor-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const ingest = new IngestService({ knowledge: { async search() { return []; } }, stateRoot: path.join(root, "ingest") });
  await assert.rejects(() => ingest.readArtifact("artifact-missing"), (error) => error.code === "ARTIFACT_MISSING");
});

test("ApprovalAdvisor.generate reads artifact and enriches reason via Provider (via:butler)", async () => {
  const calls = [];
  const provider = { async complete(messages) { calls.push(messages); return { message: { content: "这是一篇 Anthropic Agent 指南，与你的学习目标高度相关，建议收录。" } }; } };
  const ingest = { async readArtifact() { return { id: ARTIFACT_ID, title: "Anthropic Agent 工程实战指南", body: "正文", source: "https://mp.weixin.qq.com/s/abc", proposedPath: "vault/00-Inbox/x.md", risk: "additive", dedupeMatches: [] }; } };
  const advisor = new ApprovalAdvisor({ provider, ingest, clock: () => new Date("2026-07-22T06:00:00Z") });
  const advice = await advisor.generate(fakeJob(), { loadRequest: loadRequestFor("create") });
  assert.equal(advice.via, "butler");
  assert.match(advice.whatIsIt, /《Anthropic Agent 工程实战指南》/);
  assert.match(advice.whatIsIt, /微信/);
  assert.equal(advice.recommendation, "approve");
  assert.match(advice.recommendationLabel, /收录/);
  assert.match(advice.reason, /建议收录/);
  assert.equal(advice.generatedAt, "2026-07-22T06:00:00.000Z");
  assert.equal(calls.length, 1);
  assert.equal(advice.detail.action, "create");
  assert.equal(advice.caveat, "");
});

test("ApprovalAdvisor.generate cleans filename-style titles and formats large word counts", async () => {
  const provider = { async complete() { return { message: { content: "ok" } }; } };
  const ingest = { async readArtifact() { return { id: ARTIFACT_ID, title: "529d70f8-9-Anthropic_Agent_工程实战指南_从入门到生产落地.md", body: "x".repeat(157409), source: "https://mp.weixin.qq.com/s/abc", proposedPath: "vault/00-Inbox/x.md", risk: "additive", dedupeMatches: [] }; } };
  const advisor = new ApprovalAdvisor({ provider, ingest });
  const advice = await advisor.generate(fakeJob(), { loadRequest: loadRequestFor("create") });
  assert.match(advice.whatIsIt, /《Anthropic Agent 工程实战指南 从入门到生产落地》/);
  assert.doesNotMatch(advice.whatIsIt, /\.md/);
  assert.match(advice.whatIsIt, /15\.7 万字/);
  assert.doesNotMatch(advice.whatIsIt, /vault\//);
  assert.equal(advice.detail.proposedPath, "vault/00-Inbox/x.md");
});

test("ApprovalAdvisor.generate falls back to deterministic reason when Provider fails (via:fallback)", async () => {
  const provider = { async complete() { throw new Error("provider down"); } };
  const ingest = { async readArtifact() { return { id: ARTIFACT_ID, title: "X", body: "b", source: "", proposedPath: "vault/00-Inbox/x.md", risk: "additive", dedupeMatches: [] }; } };
  const advisor = new ApprovalAdvisor({ provider, ingest });
  const advice = await advisor.generate(fakeJob({ reason: "请求会修改长期事实源，需要一次审批" }), { loadRequest: loadRequestFor("create") });
  assert.equal(advice.via, "fallback");
  assert.equal(advice.reason, "请求会修改长期事实源，需要一次审批");
  assert.equal(advice.recommendation, "approve");
  assert.equal(advice.caveat, "");
});

test("ApprovalAdvisor.generate surfaces a dedupe caveat on create-with-matches and keeps it when Provider enriches", async () => {
  const provider = { async complete() { return { message: { content: "管家解读：内容重复，建议丢弃重复副本。" } }; } };
  const ingest = { async readArtifact() { return { id: ARTIFACT_ID, title: "重复篇", body: "b", proposedPath: "vault/00-Inbox/x.md", risk: "merge", dedupeMatches: ["vault/00-Inbox/existing.md"] }; } };
  const advisor = new ApprovalAdvisor({ provider, ingest });
  const advice = await advisor.generate(fakeJob(), { loadRequest: loadRequestFor("create") });
  assert.equal(advice.via, "butler");
  assert.match(advice.reason, /管家解读/);
  assert.match(advice.caveat, /查重命中（1 篇）/);
});

test("ApprovalAdvisor.generate surfaces a caveat when rejecting a non-duplicate", async () => {
  const provider = { async complete() { return { message: { content: "ok" } }; } };
  const ingest = { async readArtifact() { return { id: ARTIFACT_ID, title: "唯一篇", body: "b", proposedPath: "", risk: "additive", dedupeMatches: [] }; } };
  const advisor = new ApprovalAdvisor({ provider, ingest });
  const advice = await advisor.generate(fakeJob(), { loadRequest: loadRequestFor("reject") });
  assert.match(advice.recommendationLabel, /丢弃/);
  assert.match(advice.caveat, /未命中查重/);
});

test("ApprovalAdvisor.generate returns minimal advice (no Provider call) for non-ingest operations", async () => {
  const calls = [];
  const provider = { async complete() { calls.push(1); return { message: { content: "x" } }; } };
  const ingest = { async readArtifact() { throw new Error("should not be called"); } };
  const advisor = new ApprovalAdvisor({ provider, ingest });
  const advice = await advisor.generate(fakeJob({ operation: "goals.create" }), { loadRequest: loadRequestFor("create") });
  assert.equal(advice.via, "minimal");
  assert.equal(calls.length, 0);
  assert.match(advice.whatIsIt, /goals\.create/);
});

test("ApprovalAdvisor.generate degrades gracefully when artifact is missing", async () => {
  const provider = { async complete() { return { message: { content: "x" } }; } };
  const ingest = { async readArtifact() { const error = new Error("missing"); error.code = "ARTIFACT_MISSING"; throw error; } };
  const advisor = new ApprovalAdvisor({ provider, ingest });
  const advice = await advisor.generate(fakeJob(), { loadRequest: loadRequestFor("create") });
  assert.equal(advice.via, "fallback");
  assert.match(advice.reason, /原始收录素材已不在本地/);
});

test("minimalAdvice is a pure deterministic fallback with stable shape", () => {
  const advice = minimalAdvice(fakeJob({ operation: "goals.create" }));
  assert.equal(advice.via, "minimal");
  assert.equal(advice.recommendation, "approve");
  assert.equal(advice.caveat, "");
  assert.equal(advice.generatedAt, null);
  assert.ok(typeof advice.whatIsIt === "string" && advice.whatIsIt.length > 0);
});

function inMemoryJobStore(storedJob) {
  let current = { ...storedJob };
  const saves = [];
  return {
    saves,
    async get() { return { ...current }; },
    async loadRequest() { return { kind: "syno-operation", operation: "ingest.apply", payload: { artifactId: ARTIFACT_ID, decision: { action: "create" } } }; },
    async save(job) { current = { ...job }; saves.push(job); return current; },
  };
}

test("GET /api/syno/jobs/:id/advice generates advice on first open then serves cached", async () => {
  const providerCalls = [];
  const provider = { async complete() { providerCalls.push(1); return { message: { content: "建议收录，与目标相关。" } }; } };
  const ingest = { async readArtifact() { return { id: ARTIFACT_ID, title: "T", body: "b", proposedPath: "vault/00-Inbox/t.md", risk: "additive", dedupeMatches: [] }; } };
  const advisor = new ApprovalAdvisor({ provider, ingest });
  const store = inMemoryJobStore({ id: "job-20260722-test", intent: "curate_note", status: "awaiting_approval", request: { operation: "ingest.apply" }, decision: { reason: "r", risk: "low" } });
  const runtime = { jobStore: store, approvalAdvisor: advisor };
  const url = () => new URL("http://127.0.0.1/api/syno/jobs/job-20260722-test/advice");
  const readBody = async () => ({});

  const first = await routeSynoApi(runtime, { method: "GET" }, url(), readBody);
  assert.equal(first.advice.via, "butler");
  assert.equal(providerCalls.length, 1);
  assert.equal(store.saves.length, 1);

  const second = await routeSynoApi(runtime, { method: "GET" }, url(), readBody);
  assert.equal(second.advice.via, "butler");
  assert.equal(providerCalls.length, 1);
  assert.equal(store.saves.length, 1);
});

test("GET /api/syno/jobs/:id/advice returns degraded minimal advice when generation throws", async () => {
  const advisor = { async generate() { throw new Error("boom"); } };
  const store = inMemoryJobStore({ id: "job-20260722-test", intent: "curate_note", status: "awaiting_approval", request: { operation: "ingest.apply" }, decision: { reason: "r" } });
  const runtime = { jobStore: store, approvalAdvisor: advisor };
  const url = () => new URL("http://127.0.0.1/api/syno/jobs/job-20260722-test/advice");
  const result = await routeSynoApi(runtime, { method: "GET" }, url(), async () => ({}));
  assert.equal(result.degraded, true);
  assert.equal(result.advice.via, "minimal");
});
