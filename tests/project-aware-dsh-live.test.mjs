import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { DeepSeekHarnessCognitiveRuntime, DeepSeekHarnessSessionBindingStore } from "../apps/syno/syno/deepseek-harness-cognitive-runtime.mjs";
import { CaptureChunkStore } from "../apps/syno/syno/capture-chunk-store.mjs";
import { DeepSeekHarnessSupervisor } from "../apps/syno/syno/deepseek-harness-supervisor.mjs";
import { IngestService } from "../apps/syno/syno/ingest-service.mjs";
import { IngestWorkflowCoordinator, IngestWorkflowStore } from "../apps/syno/syno/ingest-workflow-coordinator.mjs";
import { JobStore } from "../apps/syno/syno/job-store.mjs";
import { KnowledgeStore } from "../apps/syno/syno/knowledge-store.mjs";
import { PendingDecisionStore } from "../apps/syno/syno/pending-decision.mjs";
import { ProjectService } from "../apps/syno/syno/project-service.mjs";
import { createSynoRuntime } from "../apps/syno/syno/runtime.mjs";
import { SynoToolBridge } from "../apps/syno/syno/syno-tool-bridge.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";

const execFileAsync = promisify(execFile);
const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const LIVE = String(process.env.SYNO_RUN_REAL_DSH || "").trim() === "1";
const OWNER_A = "live-owner-a";
const OWNER_B = "live-owner-b";
const PROJECT_A = "project-20260826-aaaaaaaa";
const PROJECT_B = "project-20260826-bbbbbbbb";
const LIVE_MODEL = "deepseek-v4-flash-vision-exp";

function liveLog(message) {
  if (LIVE) console.error(`[project-aware-dsh-live] ${message}`);
}

function liveEnvironment() {
  assert.ok(String(process.env.SYNO_DSH_ROOT || "").trim(), "SYNO_DSH_ROOT is required for the opt-in live DSH test");
  assert.ok(String(process.env.DEEPSEEK_API_KEY || "").trim(), "DEEPSEEK_API_KEY must be available to the opt-in live DSH test");
  return path.resolve(String(process.env.SYNO_DSH_ROOT).trim());
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(0, "127.0.0.1");
  });
  const address = server.address();
  assert.ok(address && typeof address === "object" && address.port);
  return `http://127.0.0.1:${address.port}/api/syno/bridge/mcp`;
}

async function findFreePort() {
  const probe = http.createServer();
  await new Promise((resolve, reject) => {
    const onError = (error) => {
      probe.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      probe.off("error", onError);
      resolve();
    };
    probe.once("error", onError);
    probe.once("listening", onListening);
    probe.listen(0, "127.0.0.1");
  });
  const address = probe.address();
  const port = address && typeof address === "object" ? address.port : null;
  await new Promise((resolve) => probe.close(() => resolve()));
  assert.ok(port, "the live Web probe must reserve a free TCP port");
  return port;
}

async function closeServer(server) {
  if (!server) return;
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(() => resolve()));
}

function createBridgeServer(getBridge) {
  return http.createServer(async (request, response) => {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    try {
      const bridge = getBridge();
      if (!bridge) throw Object.assign(new Error("bridge not initialized"), { code: "BRIDGE_NOT_READY" });
      const body = raw ? JSON.parse(raw) : {};
      const result = await bridge.handle({ authorization: request.headers.authorization, body });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(result));
    } catch (error) {
      response.writeHead(error.code === "SYNO_BRIDGE_UNAUTHORIZED" ? 401 : 500, { "content-type": "application/json" });
      response.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: error.code || "BRIDGE_FAILED", message: error.message } }));
    }
  });
}

async function bridgeRequest(origin, token, method, params = {}) {
  const response = await fetch(origin, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: `live-${Date.now()}-${Math.random()}`, method, params }),
  });
  assert.equal(response.ok, true, `Bridge HTTP ${response.status}`);
  return response.json();
}

async function waitFor(read, predicate, { timeoutMs = 240_000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await read();
    if (predicate(last)) return last;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`live acceptance wait timed out: ${JSON.stringify(last)}`);
}

async function gitHead() {
  const result = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, windowsHide: true });
  return String(result.stdout || "").trim();
}

async function dshVersion(dshRoot) {
  try {
    const packageJson = JSON.parse(await fs.readFile(path.join(dshRoot, "package.json"), "utf8"));
    return String(packageJson.version || "unknown");
  } catch {
    return "unknown";
  }
}

function safeClosure(status) {
  const closure = status?.runtimeClosure || {};
  return {
    ok: closure.ok === true,
    base: closure.base || null,
    required: Array.isArray(closure.required) ? closure.required : [],
    missing: Array.isArray(closure.missing) ? closure.missing : [],
    source: closure.source || null,
  };
}

function resultSummary(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    path: stableEvidencePath(item.path),
    title: item.title,
    score: item.score,
    matchReasons: item.matchReasons,
  }));
}

function stableEvidencePath(value) {
  const normalized = String(value || "").replace(/\\/g, "/");
  return normalized.replace(/^\.runtime\/tests\/[^/]+\/vault\//u, "vault/");
}

function observedToolNames(events) {
  const names = new Set();
  for (const event of Array.isArray(events) ? events : []) {
    if (event?.type === "tool/call" && typeof event.data?.name === "string") names.add(event.data.name);
    const messages = event?.type === "assistant/message" ? [event.data?.message] : [];
    for (const message of messages) {
      for (const block of Array.isArray(message?.content) ? message.content : []) {
        if ((block?.type === "tool-call" || block?.kind === "tool-call") && typeof block.name === "string") names.add(block.name);
      }
    }
  }
  return [...names].sort();
}

async function writeEvidence(name, value) {
  const directory = path.join(REPO_ROOT, "ops", "acceptance", "project-aware-knowledge-mvp");
  await fs.mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const file = path.join(directory, `${name}-${stamp}.json`);
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return path.relative(REPO_ROOT, file).replace(/\\/g, "/");
}

async function writeNote(vaultRoot, name, { title, projectRefs = [], body }) {
  const file = path.join(vaultRoot, "02-Resources", name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, [
    "---",
    `title: ${JSON.stringify(title)}`,
    "tags: [notes]",
    "created: 2026-08-26",
    "source: live-test",
    ...(projectRefs.length ? [`project_refs: ${JSON.stringify(projectRefs)}`] : []),
    "---",
    "",
    `# ${title}`,
    "",
    body,
    "",
  ].join("\n"), "utf8");
}

function fakeGitGuard() {
  return {
    async changeSnapshot() { return []; },
    async changedPaths() { return []; },
    async changes() { return []; },
    async prepareWorktree() { return { directory: this.workspaceRoot, branch: "live-acceptance" }; },
    async restoreWorktree() {},
    async commitPaths() { return { committed: true, commit: "live-acceptance" }; },
    async pinWorktree(worktree) { return { ...worktree, commit: "live-acceptance", diffHash: "live-acceptance", changes: [] }; },
    async mergeWorktree() { return { merged: true }; },
    async removeWorktree() {},
    async isAncestor() { return false; },
    workspaceRoot: "",
  };
}

async function createLiveRuntime({ dshRoot, root, bridgeOrigin, bridgeToken }) {
  const opsRoot = path.join(root, "ops");
  const stateRoot = path.join(root, "state");
  const vaultRoot = path.join(root, "vault");
  const projects = new ProjectService({ opsRoot });
  await projects.createProject({ title: "Live Project A", objective: "Verify project-aware DSH retrieval", doneCondition: "A/B/no-project evidence is recorded" }, { ownerKey: OWNER_A, projectRef: PROJECT_A });
  await projects.createProject({ title: "Live Project B", objective: "Verify cross-project isolation", doneCondition: "Project B does not receive A boost" }, { ownerKey: OWNER_A, projectRef: PROJECT_B });
  const knowledge = new KnowledgeStore({ vaultRoot, indexFile: path.join(root, "knowledge-index.json") });
  await writeNote(vaultRoot, "project-b.md", { title: "Project B retrieval", projectRefs: [PROJECT_B], body: "Project-aware retrieval marker." });
  await writeNote(vaultRoot, "shared.md", { title: "Shared retrieval", body: "Project-aware retrieval marker." });

  const ingest = new IngestService({ knowledge, projectService: projects, opsRoot, stateRoot: path.join(stateRoot, "ingest") });
  const ingestWorkflows = new IngestWorkflowCoordinator({
    ingest,
    projectService: projects,
    store: new IngestWorkflowStore({ root: path.join(stateRoot, "workflows") }),
  });
  const jobStore = new JobStore({ opsRoot, payloadRoot: path.join(stateRoot, "job-payloads") });
  const pendingDecisions = new PendingDecisionStore({ file: path.join(stateRoot, "pending-decisions.json") });
  const captureChunksRoot = path.join(stateRoot, "capture-chunks");
  const bindingStore = new DeepSeekHarnessSessionBindingStore({ file: path.join(stateRoot, "harness-bindings.json") });
  const supervisor = new DeepSeekHarnessSupervisor({
    dshRoot,
    localRoot: path.join(root, "harness"),
    bridgeOrigin,
    bridgeToken,
    initializeTimeoutMs: 45_000,
    webReadyTimeoutMs: 120_000,
  });
  const cognitiveRuntime = new DeepSeekHarnessCognitiveRuntime({ supervisor, bindings: bindingStore, tools: null });
  const channels = {
    homeChannel: "web",
    async start() {},
    async stop() {},
    status() { return { homeChannel: "web" }; },
    async send() { return { web: { delivered: true } }; },
  };
  const gitGuard = fakeGitGuard();
  gitGuard.workspaceRoot = root;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  let runtime;
  try {
    runtime = createSynoRuntime({
      projects,
      knowledge,
      ingest,
      ingestWorkflows,
      jobStore,
      pendingDecisions,
      captureChunks: new CaptureChunkStore({ root: captureChunksRoot }),
      harnessSupervisor: supervisor,
      harnessCognitiveRuntime: cognitiveRuntime,
      cognitiveRuntime,
      harnessBindings: bindingStore,
      bridgeToken,
      gitGuard,
      channels,
      cognitiveRuntimeMode: "injected-test",
    });
    await runtime.initialize({ worker: false });
    return { runtime, supervisor, projects, knowledge, ingest, root, vaultRoot, stateRoot, ownerKey: OWNER_A, projectA: PROJECT_A, projectB: PROJECT_B, previousNodeEnv };
  } catch (error) {
    process.env.NODE_ENV = previousNodeEnv;
    await supervisor.stop().catch(() => {});
    throw error;
  }
}

test("real DSH JSON-RPC, Syno Tool Bridge and Project-aware Capture round-trip", { skip: !LIVE, timeout: 360_000 }, async (t) => {
  const dshRoot = liveEnvironment();
  const root = await fs.mkdtemp(path.join(REPO_ROOT, ".runtime", "tests", "project-aware-dsh-live-"));
  const bridgeToken = "live-bridge-token";
  let bridge;
  const server = createBridgeServer(() => bridge);
  const bridgeOrigin = await listen(server);
  let fixture;
  t.after(async () => {
    await fixture?.runtime?.close().catch(() => {});
    await fixture?.supervisor?.stop().catch(() => {});
    await closeServer(server);
    if (fixture?.previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = fixture.previousNodeEnv;
    await fs.rm(root, { recursive: true, force: true });
  });

  fixture = await createLiveRuntime({ dshRoot, root, bridgeOrigin, bridgeToken });
  liveLog("Syno runtime initialized");
  bridge = fixture.runtime.toolBridge;
  const listed = await bridgeRequest(bridgeOrigin, bridgeToken, "tools/list");
  liveLog("Syno Tool Bridge tools/list completed");
  const searchDefinition = listed.result.tools.find((tool) => tool.name === "knowledge_search");
  assert.ok(searchDefinition, "real Syno Bridge must expose knowledge_search");
  assert.equal(Object.hasOwn(searchDefinition.inputSchema.properties || {}, "projectRef"), false);

  const release = bridge.bindContext({
    ownerKey: OWNER_A,
    channel: "web",
    threadKey: "live",
    messageId: "live-capture-message",
    projectRef: PROJECT_A,
    allowedTools: ["capture_start"],
  });
  const received = await bridgeRequest(bridgeOrigin, bridgeToken, "tools/call", {
    name: "capture_start",
    arguments: {
      kind: "personal",
      sourceKind: "personal",
      value: [
        "Project A live acceptance fixture: project-aware retrieval is a ranking aid in Syno.",
        "When a search request carries a server-validated projectRef, a canonical note whose project_refs contains that ref receives PROJECT_BOOST = 3; unrelated notes are not penalized.",
        "This personal fixture records the expected behavior for the project-aware knowledge MVP and is intended to verify the Capture round-trip, not to claim an externally verified fact.",
        "Scope and limitation: the fixture should be rechecked after ranking changes; the source is this Owner-authored acceptance test.",
      ].join("\n\n"),
      title: "Project A live capture",
      analysisMode: "remote",
    },
  });
  release();
  liveLog(`capture.start returned ${String(received.result?.structuredContent?.workflow?.id || "unknown")}`);
  assert.equal(received.result?.isError, false);
  const workflowId = received.result?.structuredContent?.workflow?.id || received.result?.workflow?.id || received.result?.artifact?.workflow?.id;
  assert.match(String(workflowId || ""), /^workflow-/);

  let workflow = await waitFor(
    () => fixture.runtime.ingestWorkflows.status(workflowId),
    (value) => value && ["awaiting_decision", "committed", "reported", "rejected", "superseded", "failed_retryable", "failed_terminal"].includes(value.stage),
  );
  liveLog(`capture workflow reached ${workflow.stage}`);
  if (workflow.stage === "awaiting_decision") {
    const job = await fixture.runtime.host.inspect(workflow.jobId, { ownerKey: OWNER_A, projectRef: PROJECT_A });
    await fixture.runtime.ingestWorkflows.decide(workflowId, { action: "approve", code: job.approvalCode }, {
      ownerKey: OWNER_A,
      senderId: OWNER_A,
      channel: "web",
      threadKey: workflow.threadKey,
      projectRef: PROJECT_A,
    });
    workflow = await waitFor(
      () => fixture.runtime.ingestWorkflows.status(workflowId),
      (value) => value && ["committed", "reported", "rejected", "superseded", "failed_retryable", "failed_terminal"].includes(value.stage),
    );
    liveLog(`capture workflow after approval reached ${workflow.stage}`);
  }
  assert.equal(workflow.stage === "committed" || workflow.stage === "reported", true, JSON.stringify(workflow.lastError || workflow));
  assert.equal(workflow.projectRef, PROJECT_A);
  const job = workflow.jobId ? await fixture.runtime.host.inspect(workflow.jobId, { ownerKey: OWNER_A, projectRef: PROJECT_A }) : null;
  assert.ok(job, "capture must create a Project-bound Job");
  assert.equal(job.projectRef, PROJECT_A);
  const ingestState = await fixture.runtime.ingest.status(workflow.artifactId);
  assert.deepEqual(ingestState.proposal.suggestedProjectRefs, [PROJECT_A]);
  fixture.knowledge.invalidate();
  const notes = await fixture.knowledge.list();
  const capturedNote = notes.find((note) => note.projectRefs.includes(PROJECT_A));
  assert.ok(capturedNote, "capture apply must persist a canonical Note with project_refs");

  await writeNote(fixture.vaultRoot, "project-a-query.md", {
    title: "Project A retrieval",
    projectRefs: [PROJECT_A],
    body: "Project-aware retrieval marker.",
  });
  fixture.knowledge.invalidate();

  async function searchAs(ownerKey, projectRef) {
    const releaseContext = bridge.bindContext({
      ownerKey,
      channel: "web",
      threadKey: "live-search",
      messageId: `live-search-${ownerKey}-${projectRef || "none"}`,
      ...(projectRef ? { projectRef } : {}),
      allowedTools: ["knowledge_search"],
    });
    try {
      const response = await bridgeRequest(bridgeOrigin, bridgeToken, "tools/call", {
        name: "knowledge_search",
        arguments: { query: "retrieval", limit: 10 },
      });
      return response.result;
    } finally {
      releaseContext();
    }
  }

  const aResult = await searchAs(OWNER_A, PROJECT_A);
  const noProjectResult = await searchAs(OWNER_A, "");
  const bResult = await searchAs(OWNER_A, PROJECT_B);
  assert.equal(aResult.isError, false);
  assert.equal(noProjectResult.isError, false);
  assert.equal(bResult.isError, false);
  const decodeToolResult = (result) => JSON.parse(result.content.find((block) => block.type === "text")?.text || "[]");
  const aResults = decodeToolResult(aResult);
  const noProjectResults = decodeToolResult(noProjectResult);
  const bResults = decodeToolResult(bResult);
  const baselineResults = await fixture.knowledge.search("retrieval", { limit: 10 });
  assert.equal(aResults[0].projectRefs.includes(PROJECT_A), true);
  assert.equal(bResults[0].projectRefs.includes(PROJECT_B), true);
  assert.deepEqual(
    noProjectResults.map(({ path: notePath, score, matchReasons }) => ({ path: notePath, score, matchReasons })),
    baselineResults.map(({ path: notePath, score, matchReasons }) => ({ path: notePath, score, matchReasons })),
  );
  assert.ok(aResults.find((item) => item.projectRefs.includes(PROJECT_A)).matchReasons.includes("project"));

  const wrongOwner = await searchAs(OWNER_B, PROJECT_A);
  assert.equal(wrongOwner.isError, true);
  assert.match(wrongOwner.content?.[0]?.text || "", /PROJECT_OWNER_MISMATCH/);
  const status = fixture.supervisor.status("capture");
  liveLog(`capture sidecar completed with model ${status.model || LIVE_MODEL}`);
  const evidence = await writeEvidence("jsonrpc", {
    schema: "project-aware-knowledge-mvp-acceptance",
    status: "PARTIAL",
    phase5: "IN_PROGRESS",
    commit: await gitHead(),
    dshVersion: await dshVersion(dshRoot),
    actualModel: status.model || LIVE_MODEL,
    runtimeClosure: safeClosure(status),
    jsonRpcInitialize: status.ready === true,
    webSearch: { attempted: false, reason: "web chat is recorded by the separate web live test" },
    projectComparison: {
      projectA: resultSummary(aResults),
      noProject: resultSummary(noProjectResults),
      projectB: resultSummary(bResults),
      wrongOwnerRejected: true,
    },
    relation: {
      projectRef: PROJECT_A,
      jobId: job.id,
      workflowId,
      proposalId: ingestState.proposal.id,
      notePath: stableEvidencePath(capturedNote.path),
    },
    ownerObservation: "pending",
    deferred: ["Owner召回改善结论", "直接 DSH ImageAttachmentRef bridge"],
  });
  assert.match(evidence, /^ops\/acceptance\/project-aware-knowledge-mvp\/jsonrpc-/);
});

test("real DSH Web chat invokes the official web_search tool", { skip: !LIVE, timeout: 300_000 }, async (t) => {
  const dshRoot = liveEnvironment();
  const root = await fs.mkdtemp(path.join(REPO_ROOT, ".runtime", "tests", "project-aware-dsh-web-live-"));
  const bridgeToken = "live-web-bridge-token";
  const bridge = new SynoToolBridge({ tools: new ToolRegistry([]), token: bridgeToken, isRuntimeReady: () => true });
  const server = createBridgeServer(() => bridge);
  const bridgeOrigin = await listen(server);
  const previousSurface = process.env.SYNO_DSH_CHAT_SURFACE;
  const previousWebPort = process.env.SYNO_DSH_WEB_PORT;
  const webPort = await findFreePort();
  delete process.env.SYNO_DSH_CHAT_SURFACE;
  process.env.SYNO_DSH_WEB_PORT = String(webPort);
  const supervisor = new DeepSeekHarnessSupervisor({
    dshRoot,
    localRoot: path.join(root, "harness"),
    bridgeOrigin,
    bridgeToken,
    initializeTimeoutMs: 45_000,
    webReadyTimeoutMs: 120_000,
  });
  t.after(async () => {
    await supervisor.stop().catch(() => {});
    await closeServer(server);
    if (previousSurface === undefined) delete process.env.SYNO_DSH_CHAT_SURFACE;
    else process.env.SYNO_DSH_CHAT_SURFACE = previousSurface;
    if (previousWebPort === undefined) delete process.env.SYNO_DSH_WEB_PORT;
    else process.env.SYNO_DSH_WEB_PORT = previousWebPort;
    await fs.rm(root, { recursive: true, force: true });
  });

  const client = await supervisor.start("chat", { provider: "deepseek-official", model: LIVE_MODEL });
  liveLog("Web chat initialized");
  const result = await client.runTurn("project-aware-live-web-search", [{
    type: "text",
    text: "Use the official web_search tool before answering. Search for the current DeepSeek API documentation and reply with a short sentence naming the source domain. Do not answer from memory.",
  }]);
  liveLog("Web search turn completed");
  const toolNames = observedToolNames(result.events);
  const observed = toolNames.includes("web_search");
  liveLog(`Observed Web tool calls: ${toolNames.join(", ") || "none"}`);
  assert.equal(observed, true, "the real Web turn must expose an observed web_search tool call");
  assert.ok(String(result.finalResponse || "").trim(), "the real Web turn must return an assistant response");
  const status = supervisor.status("chat");
  const evidence = await writeEvidence("web-search", {
    schema: "project-aware-knowledge-mvp-acceptance",
    status: "PARTIAL",
    phase5: "IN_PROGRESS",
    commit: await gitHead(),
    dshVersion: await dshVersion(dshRoot),
    actualModel: status.model || LIVE_MODEL,
    runtimeClosure: safeClosure(status),
    webSearch: {
      attempted: true,
      observed,
      toolNames,
      responseNonEmpty: Boolean(String(result.finalResponse || "").trim()),
      eventCount: Array.isArray(result.events) ? result.events.length : 0,
    },
    ownerObservation: "pending",
    deferred: ["Project A/B/no-Project Owner observation", "直接 DSH ImageAttachmentRef bridge"],
  });
  assert.match(evidence, /^ops\/acceptance\/project-aware-knowledge-mvp\/web-search-/);
});
