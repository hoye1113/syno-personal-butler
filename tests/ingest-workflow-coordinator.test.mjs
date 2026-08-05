import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { IngestWorkflowCoordinator, IngestWorkflowStore } from "../apps/syno/syno/ingest-workflow-coordinator.mjs";

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-ingest-workflow-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const scheduled = [];
  const ingest = {
    receipts: 0,
    async receive(payload) {
      this.receipts += 1;
      return {
        artifact: {
          id: `artifact-${this.receipts}`,
          kind: payload.kind,
          dedupeKey: `source-${payload.value}`,
          sourceDescriptor: {},
        },
        proposalPending: true,
      };
    },
    async propose(artifactId) {
      return {
        candidate: { id: `candidate-${artifactId}` },
        proposal: { id: `proposal-${artifactId}` },
      };
    },
  };
  const store = new IngestWorkflowStore({ root });
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
  });
  return { root, scheduled, ingest, store, coordinator };
}

test("receive persists an immediate Workflow receipt and deduplicates a retried platform message", async (t) => {
  const { scheduled, ingest, coordinator } = await fixture(t);
  const context = { ownerKey: "owner", channel: "weixin", threadKey: "main", messageId: "wx-1" };

  const first = await coordinator.receive({ kind: "url", value: "https://example.com/a" }, context);
  const replay = await coordinator.receive({ kind: "url", value: "https://example.com/a" }, context);

  assert.equal(first.workflow.stage, "received");
  assert.equal(replay.workflow.id, first.workflow.id);
  assert.equal(replay.duplicate, true);
  assert.equal(ingest.receipts, 1);
  assert.equal(scheduled.length, 1);
  assert.equal((await coordinator.status(first.workflow.id)).artifactId, first.artifact.id);
});

test("receive reuses the same URL or file content across channels and platform messages", async (t) => {
  const { coordinator, ingest } = await fixture(t);
  const firstUrl = await coordinator.receive(
    { kind: "url", value: "https://example.com/article?utm_source=weixin&id=7" },
    { ownerKey: "owner", channel: "weixin", messageId: "wx-url" },
  );
  const secondUrl = await coordinator.receive(
    { kind: "url", value: "https://example.com/article?id=7" },
    { ownerKey: "owner", channel: "feishu", messageId: "fs-url" },
  );
  const bytes = Buffer.from("# same file");
  const firstFile = await coordinator.receive(
    { kind: "markdown", name: "one.md", base64: bytes.toString("base64") },
    { ownerKey: "owner", channel: "weixin", messageId: "wx-file" },
  );
  const secondFile = await coordinator.receive(
    { kind: "markdown", name: "renamed.md", base64: bytes.toString("base64") },
    { ownerKey: "owner", channel: "feishu", messageId: "fs-file" },
  );

  assert.equal(secondUrl.workflow.id, firstUrl.workflow.id);
  assert.equal(secondFile.workflow.id, firstFile.workflow.id);
  assert.equal(ingest.receipts, 2);
});

test("a terminal URL Workflow does not suppress a later source snapshot check", async (t) => {
  const { scheduled, coordinator, store, ingest } = await fixture(t);
  const first = await coordinator.receive(
    { kind: "url", value: "https://example.com/versioned" },
    { ownerKey: "owner", channel: "weixin", messageId: "version-1" },
  );
  await scheduled.shift()();
  for (const stage of ["awaiting_decision", "approved", "executing", "validating", "committed", "indexed", "reported"]) {
    await store.update(first.workflow.id, { stage });
  }
  const second = await coordinator.receive(
    { kind: "url", value: "https://example.com/versioned" },
    { ownerKey: "owner", channel: "feishu", messageId: "version-2" },
  );
  assert.notEqual(second.workflow.id, first.workflow.id);
  assert.equal(second.duplicate, false);
  assert.equal(ingest.receipts, 2);
});

test("scheduled preparation advances a Workflow without storing source content", async (t) => {
  const { root, scheduled, coordinator } = await fixture(t);
  const receipt = await coordinator.receive(
    { kind: "text", value: "private source body that must not enter workflow metadata" },
    { ownerKey: "owner", channel: "feishu", threadKey: "main", messageId: "fs-1" },
  );

  await scheduled.shift()();
  const workflow = await coordinator.status(receipt.workflow.id);
  assert.equal(workflow.stage, "proposed");
  assert.equal(workflow.candidateId, `candidate-${receipt.artifact.id}`);
  assert.equal(workflow.proposalId, `proposal-${receipt.artifact.id}`);
  const persisted = await fs.readFile(path.join(root, `${workflow.id}.json`), "utf8");
  assert.doesNotMatch(persisted, /private source body/);
});

test("recover and retryDue resume only nonterminal or retryable Workflows", async (t) => {
  const { scheduled, ingest, store, coordinator } = await fixture(t);
  const received = await coordinator.receive(
    { kind: "markdown", value: "# note" },
    { ownerKey: "owner", channel: "web", threadKey: "main", messageId: "web-1" },
  );
  scheduled.length = 0;
  await store.update(received.workflow.id, {
    stage: "failed_retryable",
    nextRetryAt: "2020-01-01T00:00:00.000Z",
    lastError: { code: "TEMP", message: "temporary", retryable: true },
  });

  const recovered = await coordinator.recover();
  assert.equal(recovered.scheduled, 1);
  assert.equal(scheduled.length, 1);
  const retried = await coordinator.retryDue(10);
  assert.equal(retried.processed, 1);
  assert.equal(ingest.receipts, 1);
  assert.equal((await coordinator.listPending("owner")).length, 1);
});

test("remote analysis receives compiled context while local-only capture never calls the model", async (t) => {
  const { root, scheduled, ingest, store } = await fixture(t);
  let analyses = 0;
  ingest.propose = async (artifactId) => ({
    candidate: { id: `candidate-${artifactId}` },
    proposal: { id: `proposal-${artifactId}`, sourceType: "text", sourceDigest: "a".repeat(64), proposalDigest: "b".repeat(64) },
  });
  ingest.readArtifact = async () => ({ id: "artifact", body: "safe body" });
  ingest.enrichProposal = async (artifactId, analysis, options) => ({
    candidate: { id: `candidate-${artifactId}` },
    proposal: {
      id: `proposal-${artifactId}`, sourceType: "text", sourceDigest: "a".repeat(64),
      proposalDigest: "c".repeat(64), rulesDigest: options.rulesDigest, analysis,
    },
  });
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
    contextCompiler: { async compile() { return { rulesDigest: "d".repeat(64) }; } },
    async analyze() { analyses += 1; return { canonicalTags: ["ai_agent"] }; },
  });

  await coordinator.receive({ kind: "text", value: "remote" }, { ownerKey: "owner", channel: "web", messageId: "remote-1" });
  await scheduled.shift()();
  await coordinator.receive({ kind: "text", value: "local", analysisMode: "local-only" }, { ownerKey: "owner", channel: "web", messageId: "local-1" });
  await scheduled.shift()();

  assert.equal(analyses, 1);
  assert.equal((await coordinator.listPending("owner")).length, 2);
});

test("URL preparation automatically assigns OpenCode to the WebBridge after direct HTTP is forbidden", async (t) => {
  const { scheduled, store } = await fixture(t);
  let proposes = 0;
  const browserCalls = [];
  const events = [];
  const ingest = {
    async receive(payload) { return { artifact: { id: "artifact-browser", kind: payload.kind, dedupeKey: "browser-key" }, proposalPending: true }; },
    async readArtifact() { return { id: "artifact-browser", source: "https://example.com/blocked" }; },
    async applyBrowserSnapshot(id, observation) { browserCalls.push({ id, observation }); },
    async propose() {
      proposes += 1;
      if (proposes === 1) throw new Error("来源返回 HTTP 403");
      return { candidate: { id: "candidate-browser" }, proposal: { id: "proposal-browser", sourceType: "url", sourceDigest: "a".repeat(64), proposalDigest: "b".repeat(64) } };
    },
  };
  const browserCapture = {
    authorize(input) { browserCalls.push({ authorize: input }); return { browserSessionId: "syno-capture-workflow-browser" }; },
    observation() { return { status: "completed", finalUrl: "https://example.com/blocked", content: "browser content", contentDigest: "c".repeat(64), browserSessionId: "syno-capture-workflow-browser" }; },
  };
  const runtimeCalls = [];
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
    browserCapture,
    browserRuntime: { async run(request, context) { runtimeCalls.push({ request, context }); } },
    onEvent: async (event) => { events.push(event.type); },
  });
  const receipt = await coordinator.receive({ kind: "url", value: "https://example.com/blocked" }, { ownerKey: "owner", channel: "weixin", messageId: "browser-1" });
  await scheduled.shift()();
  const workflow = await coordinator.status(receipt.workflow.id);
  assert.equal(workflow.stage, "proposed");
  assert.equal(workflow.fetchMethod, "kimi_webbridge");
  assert.equal(workflow.fallbackReason, "http_forbidden");
  assert.equal(runtimeCalls[0].context.browserWorkflowId, workflow.id);
  assert.deepEqual(runtimeCalls[0].context.allowedTools, [
    "syno_browser_status", "syno_browser_navigate", "syno_browser_snapshot", "syno_browser_list_tabs",
  ]);
  assert.equal(browserCalls[0].authorize.exactUrl, "https://example.com/blocked");
  assert.equal(browserCalls[1].id, "artifact-browser");
  assert.ok(events.includes("capture.direct.started"));
  assert.ok(events.includes("capture.direct.failed"));
  assert.ok(events.includes("capture.browser.fallback_started"));
  assert.ok(events.includes("capture.browser.snapshot_received"));
  assert.ok(events.includes("capture.browser.completed"));
});

test("URL safety failures never escalate to the browser fallback", async (t) => {
  const { scheduled, store } = await fixture(t);
  let browserRuns = 0;
  const ingest = {
    async receive(payload) { return { artifact: { id: "artifact-unsafe", kind: payload.kind, dedupeKey: "unsafe" }, proposalPending: true }; },
    async propose() { throw Object.assign(new Error("不允许收录本机或内网 URL"), { code: "URL_UNSAFE" }); },
    async readArtifact() { return { source: "http://127.0.0.1:4317/private" }; },
  };
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
    browserCapture: { authorize() { throw new Error("must not authorize"); } },
    browserRuntime: { async run() { browserRuns += 1; } },
  });
  const receipt = await coordinator.receive({ kind: "url", value: "http://127.0.0.1:4317/private" }, { ownerKey: "owner", channel: "web", messageId: "unsafe-url" });
  await scheduled.shift()();
  assert.equal(browserRuns, 0);
  assert.equal((await coordinator.status(receipt.workflow.id)).stage, "failed_terminal");
});

test("remote analysis blocks secrets found in outbound metadata before calling the model", async (t) => {
  const { scheduled, ingest, store } = await fixture(t);
  let analyses = 0;
  ingest.propose = async (artifactId) => ({
    candidate: { id: `candidate-${artifactId}` },
    proposal: {
      id: `proposal-${artifactId}`, sourceType: "text", sourceDigest: "a".repeat(64),
      proposalDigest: "b".repeat(64),
    },
  });
  ingest.readArtifact = async () => ({
    id: "artifact",
    title: "api_key = must-not-leak-123456",
    body: "ordinary body",
    relationCandidates: [],
  });
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
    contextCompiler: { async compile() { return { rulesDigest: "d".repeat(64) }; } },
    async analyze() { analyses += 1; return {}; },
  });
  const receipt = await coordinator.receive(
    { kind: "text", value: "ordinary body" },
    { ownerKey: "owner", channel: "web", messageId: "metadata-secret" },
  );
  await scheduled.shift()();
  assert.equal(analyses, 0);
  assert.equal((await store.get(receipt.workflow.id)).stage, "failed_terminal");
});

test("decide binds an Owner decision to the durable Workflow", async (t) => {
  const { scheduled, ingest, store } = await fixture(t);
  ingest.revise = async (artifactId) => ({
    candidate: { id: `candidate-${artifactId}` },
    proposal: { id: "proposal-revised", proposalDigest: "e".repeat(64) },
  });
  const decisions = [];
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
    async decisionExecutor(input) { decisions.push(input.decision); return { job: { id: "job-1", status: "completed" } }; },
  });
  const receipt = await coordinator.receive(
    { kind: "text", value: "decision" },
    { ownerKey: "owner", channel: "web", messageId: "decision-1" },
  );
  await scheduled.shift()();
  await store.update(receipt.workflow.id, { stage: "awaiting_decision", jobId: "job-1" });

  await assert.rejects(
    () => coordinator.decide(receipt.workflow.id, { action: "approve" }, { ownerKey: "other" }),
    { code: "INGEST_WORKFLOW_OWNER_MISMATCH" },
  );
  const result = await coordinator.decide(receipt.workflow.id, { action: "approve", code: "ABC123" }, { ownerKey: "owner" });
  assert.equal(result.workflow.stage, "approved");
  assert.equal(decisions[0].code, "ABC123");
});

test("reject persists the Artifact before making the Workflow terminal", async (t) => {
  const { scheduled, ingest, store } = await fixture(t);
  let attempts = 0;
  let republished = 0;
  ingest.markApplied = async () => {
    attempts += 1;
    if (attempts === 1) throw Object.assign(new Error("state temporarily locked"), { code: "EBUSY", retryable: true });
  };
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
    async decisionExecutor() { return { job: { id: "job-reject", status: "rejected" } }; },
    async onProposed() { republished += 1; },
  });
  const receipt = await coordinator.receive(
    { kind: "text", value: "reject atomically" },
    { ownerKey: "owner", channel: "web", messageId: "reject-atomic" },
  );
  await scheduled.shift()();
  const publishedBeforeReject = republished;
  await store.update(receipt.workflow.id, { stage: "awaiting_decision", jobId: "job-reject" });

  await assert.rejects(
    coordinator.decide(receipt.workflow.id, { action: "reject" }, { ownerKey: "owner" }),
    { code: "EBUSY" },
  );
  const workflow = await store.get(receipt.workflow.id);
  assert.equal(workflow.stage, "failed_retryable");
  assert.equal(workflow.lastError.code, "EBUSY");
  assert.equal(workflow.pendingAction, "reject");
  await coordinator.recover();
  await scheduled.shift()();
  assert.equal((await store.get(receipt.workflow.id)).stage, "rejected");
  assert.equal(republished, publishedBeforeReject);
});

test("reject intent is durable before the irreversible Job rejection", async (t) => {
  const { scheduled, ingest, store } = await fixture(t);
  const originalUpdate = store.update.bind(store);
  let intentFailures = 1;
  store.update = async (id, patch) => {
    if (patch.pendingAction === "reject" && intentFailures > 0) {
      intentFailures -= 1;
      throw Object.assign(new Error("workflow file locked"), { code: "EBUSY", retryable: true });
    }
    return originalUpdate(id, patch);
  };
  let rejectedJobs = 0;
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
    async decisionExecutor() {
      rejectedJobs += 1;
      return { job: { id: "job-reject", status: "rejected" } };
    },
  });
  const receipt = await coordinator.receive(
    { kind: "text", value: "persist intent first" },
    { ownerKey: "owner", channel: "web", messageId: "reject-intent-first" },
  );
  await scheduled.shift()();
  await store.update(receipt.workflow.id, { stage: "awaiting_decision", jobId: "job-reject" });

  await assert.rejects(
    coordinator.decide(receipt.workflow.id, { action: "reject" }, { ownerKey: "owner" }),
    { code: "EBUSY" },
  );
  assert.equal(rejectedJobs, 0);
  assert.equal((await store.get(receipt.workflow.id)).stage, "awaiting_decision");
});

test("reject recovery reconciles a Job rejected after durable intent without republishing", async (t) => {
  const { scheduled, ingest, store } = await fixture(t);
  ingest.markApplied = async () => {};
  let rejectedJobs = 0;
  let jobStatus = "awaiting_approval";
  let republished = 0;
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
    async decisionExecutor() {
      rejectedJobs += 1;
      jobStatus = "rejected";
      throw Object.assign(new Error("process stopped after Job rejection"), { code: "ECONNRESET", retryable: true });
    },
    async reconcileExecution() { return { status: jobStatus }; },
    async onProposed() { republished += 1; },
  });
  const receipt = await coordinator.receive(
    { kind: "text", value: "recover rejected job" },
    { ownerKey: "owner", channel: "web", messageId: "reject-job-recovery" },
  );
  await scheduled.shift()();
  const publishedBeforeReject = republished;
  await store.update(receipt.workflow.id, {
    stage: "awaiting_decision",
    jobId: "job-reject",
  });

  await assert.rejects(
    coordinator.decide(receipt.workflow.id, { action: "reject" }, { ownerKey: "owner" }),
    { code: "ECONNRESET" },
  );
  assert.equal((await store.get(receipt.workflow.id)).pendingAction, "reject");
  assert.equal(rejectedJobs, 1);
  await coordinator.recover();
  await scheduled.shift()();
  assert.equal((await store.get(receipt.workflow.id)).stage, "rejected");
  assert.equal(rejectedJobs, 1);
  assert.equal(republished, publishedBeforeReject);
});

test("reject recovery converges when Artifact rejection persisted before Workflow terminal update failed", async (t) => {
  const { scheduled, ingest, store } = await fixture(t);
  let markAppliedCalls = 0;
  ingest.markApplied = async () => { markAppliedCalls += 1; };
  const originalUpdate = store.update.bind(store);
  let rejectTransitionFailures = 1;
  store.update = async (id, patch) => {
    if (patch.stage === "rejected" && rejectTransitionFailures > 0) {
      rejectTransitionFailures -= 1;
      throw Object.assign(new Error("workflow file locked"), { code: "EBUSY", retryable: true });
    }
    return originalUpdate(id, patch);
  };
  let republished = 0;
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
    async decisionExecutor() { return { job: { id: "job-reject", status: "rejected" } }; },
    async onProposed() { republished += 1; },
  });
  const receipt = await coordinator.receive(
    { kind: "text", value: "reject terminal recovery" },
    { ownerKey: "owner", channel: "web", messageId: "reject-terminal-recovery" },
  );
  await scheduled.shift()();
  const publishedBeforeReject = republished;
  await store.update(receipt.workflow.id, { stage: "awaiting_decision", jobId: "job-reject" });
  await assert.rejects(
    coordinator.decide(receipt.workflow.id, { action: "reject" }, { ownerKey: "owner" }),
    { code: "EBUSY" },
  );
  assert.equal((await store.get(receipt.workflow.id)).pendingAction, "reject");
  await coordinator.recover();
  await scheduled.shift()();
  assert.equal((await store.get(receipt.workflow.id)).stage, "rejected");
  assert.equal(markAppliedCalls, 2);
  assert.equal(republished, publishedBeforeReject);
});

test("a canonical rule change supersedes the old approval and schedules a replacement Workflow", async (t) => {
  const { scheduled, ingest, store } = await fixture(t);
  let rulesDigest = "a".repeat(64);
  ingest.propose = async (artifactId) => ({
    candidate: { id: `candidate-${artifactId}` },
    proposal: {
      id: `proposal-${artifactId}`,
      sourceType: "text",
      sourceDigest: "b".repeat(64),
      proposalDigest: "c".repeat(64),
      rulesDigest,
    },
  });
  ingest.enrichProposal = async (artifactId, _analysis, options) => ({
    candidate: { id: `candidate-${artifactId}` },
    proposal: {
      id: `proposal-${artifactId}`,
      sourceType: "text",
      sourceDigest: "b".repeat(64),
      proposalDigest: "c".repeat(64),
      rulesDigest: options.rulesDigest,
    },
  });
  const decisions = [];
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
    contextCompiler: { async compile() { return { rulesDigest }; } },
    async decisionExecutor(input) {
      decisions.push(input.decision);
      return { job: { id: "job-old", status: "canceled" } };
    },
  });
  const receipt = await coordinator.receive(
    { kind: "text", value: "rule-bound" },
    { ownerKey: "owner", channel: "web", messageId: "rules-1" },
  );
  await scheduled.shift()();
  await store.update(receipt.workflow.id, { stage: "awaiting_decision", jobId: "job-old" });

  rulesDigest = "d".repeat(64);
  await assert.rejects(
    () => coordinator.decide(receipt.workflow.id, { action: "approve" }, { ownerKey: "owner" }),
    (error) => error.code === "INGEST_RULES_CHANGED" && Boolean(error.replacementWorkflowId),
  );

  assert.equal((await store.get(receipt.workflow.id)).stage, "superseded");
  assert.equal(decisions[0].action, "modify");
  const replacement = (await store.list()).find((item) => item.id !== receipt.workflow.id);
  assert.equal(replacement.stage, "received");
  assert.equal(replacement.artifactId, receipt.artifact.id);
  assert.equal(scheduled.length, 1);
});

test("a proposal notification failure becomes a durable retryable Workflow failure", async (t) => {
  const { scheduled, ingest, store } = await fixture(t);
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
    async onProposed() {
      throw Object.assign(new Error("outbox unavailable"), { code: "OUTBOX_DOWN", retryable: true });
    },
  });
  const receipt = await coordinator.receive(
    { kind: "text", value: "notify failure" },
    { ownerKey: "owner", channel: "web", messageId: "notify-1" },
  );
  await scheduled.shift()();
  const failed = await coordinator.status(receipt.workflow.id);
  assert.equal(failed.stage, "failed_retryable");
  assert.equal(failed.lastError.code, "OUTBOX_DOWN");
});

test("recover resumes extracting and republishes a proposal after either crash window", async (t) => {
  const { scheduled, ingest, store } = await fixture(t);
  const published = [];
  ingest.status = async (artifactId) => ({
    candidate: { id: `candidate-${artifactId}` },
    proposal: { id: `proposal-${artifactId}` },
  });
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
    async onProposed({ workflow }) { published.push(workflow.id); },
  });
  const extracting = await coordinator.receive(
    { kind: "text", value: "extracting crash" },
    { ownerKey: "owner", channel: "web", messageId: "crash-extracting" },
  );
  const proposed = await coordinator.receive(
    { kind: "text", value: "proposal crash" },
    { ownerKey: "owner", channel: "web", messageId: "crash-proposed" },
  );
  scheduled.length = 0;
  await store.update(extracting.workflow.id, { stage: "extracting" });
  await store.update(proposed.workflow.id, { stage: "extracting" });
  await store.update(proposed.workflow.id, {
    stage: "proposed",
    candidateId: `candidate-${proposed.artifact.id}`,
    proposalId: `proposal-${proposed.artifact.id}`,
  });

  const report = await coordinator.recover();
  assert.equal(report.scheduled, 2);
  while (scheduled.length) await scheduled.shift()();
  assert.equal((await store.get(extracting.workflow.id)).stage, "proposed");
  assert.ok(published.includes(proposed.workflow.id));
});

test("recover republishes a partially published proposal without creating another write Job", async (t) => {
  const { root, ingest } = await fixture(t);
  ingest.status = async (artifactId) => ({
    candidate: { id: `candidate-${artifactId}` },
    proposal: { id: `proposal-${artifactId}` },
  });
  const store = new IngestWorkflowStore({ root: path.join(root, "publication-workflows") });
  let publishAttempts = 0;
  let writeJobs = 0;
  const scheduled = [];
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
    async onProposed({ workflow }) {
      publishAttempts += 1;
      if (!workflow.jobId) {
        writeJobs += 1;
      }
      await store.update(workflow.id, { stage: "awaiting_decision", jobId: workflow.jobId || "job-stable" });
      if (publishAttempts === 1) throw Object.assign(new Error("outbox unavailable"), { code: "OUTBOX_FAILED", retryable: true });
    },
  });
  const receipt = await coordinator.receive({ kind: "text", value: "durable proposal" }, {
    ownerKey: "owner",
    channel: "weixin",
    messageId: "partial-publication",
  });
  await scheduled.shift()();
  assert.equal((await coordinator.status(receipt.workflow.id)).stage, "failed_retryable");
  await coordinator.recover();
  await scheduled.shift()();
  assert.equal((await coordinator.status(receipt.workflow.id)).stage, "awaiting_decision");
  assert.equal(writeJobs, 1);
  assert.equal(publishAttempts, 2);
});

test("recover reconciles a durable mid-execution Workflow with its authoritative Job", async (t) => {
  const { scheduled, ingest, store } = await fixture(t);
  const coordinator = new IngestWorkflowCoordinator({
    ingest,
    store,
    schedule: (work) => scheduled.push(work),
    async reconcileExecution(workflow) {
      assert.equal(workflow.jobId, "job-mid");
      return { status: "completed", result: { path: "vault/00-Inbox/recovered.md", completionStatus: "complete" } };
    },
  });
  const receipt = await coordinator.receive(
    { kind: "text", value: "mid execution" },
    { ownerKey: "owner", channel: "web", messageId: "mid-execution" },
  );
  await scheduled.shift()();
  await store.update(receipt.workflow.id, { stage: "awaiting_decision", jobId: "job-mid" });
  await store.update(receipt.workflow.id, { stage: "approved" });
  await store.update(receipt.workflow.id, { stage: "executing" });

  const recovered = await coordinator.recover();
  assert.equal(recovered.scheduled, 1);
  await scheduled.shift()();
  assert.equal((await store.get(receipt.workflow.id)).stage, "reported");
});

test("R2: extract branch caps retryable prepare failures at maxPrepareAttempts (no infinite retry)", async (t) => {
  const { ingest, store, coordinator } = await fixture(t);
  // C3 把 retryDue 接上 60s timer 后，持续 retryable 抛错（如 PROVIDER_RATE_LIMITED）会无限重投、永不升终态。
  // R2：#prepare 的两 catch 分支均按 maxPrepareAttempts 计数并达上限转 failed_terminal。本例锁提取分支。
  ingest.propose = async () => {
    throw Object.assign(new Error("provider rate limited"), { code: "PROVIDER_RATE_LIMITED", retryable: true });
  };
  const receipt = await coordinator.receive(
    { kind: "text", value: "stuck prepare" },
    { ownerKey: "owner", channel: "web", messageId: "r2-extract" },
  );

  let workflow;
  for (let i = 0; i < 8; i += 1) {
    workflow = await coordinator.retry(receipt.workflow.id);
    if (i < 7) {
      // 前 7 次：计数自增、仍 retryable，未到上限——绝不提前升终态、不写 INGEST_PREPARE_EXHAUSTED。
      assert.equal(workflow.stage, "failed_retryable");
      assert.equal(workflow.lastError.code, "PROVIDER_RATE_LIMITED");
      assert.equal(workflow.attempts.prepare, i + 1);
    }
  }
  // 第 8 次命中上限 → 终态，封堵无界重试。
  assert.equal(workflow.stage, "failed_terminal");
  assert.equal(workflow.lastError.code, "INGEST_PREPARE_EXHAUSTED");
  assert.equal(workflow.attempts.prepare, 8);

  // 终态后：retryDue 不再拾取、retry() 拒绝重试（不会再被无限驱动）。
  assert.equal((await coordinator.retryDue(10)).processed, 0);
  await assert.rejects(
    () => coordinator.retry(receipt.workflow.id),
    { code: "INGEST_WORKFLOW_NOT_RETRYABLE" },
  );
});

test("R2: re-publish branch caps retryable publish failures at maxPrepareAttempts", async (t) => {
  const { scheduled, ingest, store, coordinator } = await fixture(t);
  ingest.status = async (artifactId) => ({
    candidate: { id: `candidate-${artifactId}` },
    proposal: { id: `proposal-${artifactId}` },
  });
  // 先让首轮 propose 走通到 proposed（onProposed 此刻未配置 → no-op，attempts.prepare 已计 1），
  // 再配置 onProposed 持续抛 retryable——此后每次 #prepare 经重发布分支重投 proposal。
  const receipt = await coordinator.receive(
    { kind: "text", value: "republish stuck" },
    { ownerKey: "owner", channel: "web", messageId: "r2-republish" },
  );
  await scheduled.shift()();
  assert.equal((await store.get(receipt.workflow.id)).stage, "proposed");
  // 模拟「首轮发布已失败一次」的生产态：stage=failed_retryable 且带 jobId+proposalId——
  // 这正是 retryDue timer 周期性重投的对象；使其连续重试都走重发布分支、验证该路径计数自增与上限。
  await store.update(receipt.workflow.id, { stage: "failed_retryable", jobId: "job-stable" });
  coordinator.configure({
    async onProposed() {
      throw Object.assign(new Error("outbox unavailable"), { code: "OUTBOX_DOWN", retryable: true });
    },
  });

  let workflow;
  for (let i = 0; i < 7; i += 1) {
    workflow = await coordinator.retry(receipt.workflow.id);
    if (i < 6) {
      assert.equal(workflow.stage, "failed_retryable");
      assert.equal(workflow.lastError.code, "OUTBOX_DOWN");
      // 首轮 extract 已计 prepare=1；重发布分支在此之上每次自增 1。
      assert.equal(workflow.attempts.prepare, i + 2);
    }
  }
  // 第 7 次重发布（prepare 累计至 8）命中上限 → 终态。
  assert.equal(workflow.stage, "failed_terminal");
  assert.equal(workflow.lastError.code, "INGEST_PREPARE_EXHAUSTED");
  assert.equal(workflow.attempts.prepare, 8);
  assert.equal((await coordinator.retryDue(10)).processed, 0);
});
