import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { AgentHost } from "../apps/syno/syno/agent-host.mjs";
import { ChannelConversationHandler } from "../apps/syno/syno/channel-conversation-handler.mjs";
import { FakeExecutor } from "../apps/syno/syno/executors.mjs";
import { IngestService } from "../apps/syno/syno/ingest-service.mjs";
import { IngestWorkflowCoordinator, IngestWorkflowStore } from "../apps/syno/syno/ingest-workflow-coordinator.mjs";
import { JobStore } from "../apps/syno/syno/job-store.mjs";
import { ProjectService } from "../apps/syno/syno/project-service.mjs";
import { SynoToolBridge } from "../apps/syno/syno/syno-tool-bridge.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";
import { parseProjectDirective } from "../apps/syno/syno/project-directive.mjs";
import { PATHS } from "../apps/syno/syno/paths.mjs";

const PROJECT_A = "project-20260824-aaaaaaaa";
const PROJECT_B = "project-20260824-bbbbbbbb";
const PROJECT_C = "project-20260824-cccccccc";

function fixedClock() {
  return new Date("2026-08-24T10:00:00.000Z");
}

function makeGitGuard() {
  return {
    async changedPaths() { return []; },
    async changes() { return []; },
    async commitPaths(paths) { return { committed: Boolean(paths.length), paths }; },
    async prepareWorktree(id) { return { branch: `syno/job/${id}`, directory: path.join(os.tmpdir(), `syno-project-worktree-${id}`), base: "base" }; },
    async pinWorktree() { return { commit: "commit", diffHash: "hash", preview: "", changes: [] }; },
    async mergeWorktree() { return { merged: true, commit: "merge" }; },
    async removeWorktree() {},
  };
}

async function makeProjectFixture(t) {
  const root = path.join(PATHS.runtimeRoot, "tests", `project-propagation-${process.pid}-${Date.now()}`);
  await fs.mkdir(root, { recursive: true });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  let nextId = 0;
  const projects = new ProjectService({
    opsRoot: path.join(root, "ops"),
    clock: fixedClock,
    idFactory: () => [
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      "cccccccc-cccc-cccc-cccc-cccccccccccc",
    ][nextId++],
  });
  const first = await projects.createProject({ title: "Project A", objective: "A", doneCondition: "done" }, { ownerKey: "owner-a" });
  const second = await projects.createProject({ title: "Project B", objective: "B", doneCondition: "done" }, { ownerKey: "owner-a" });
  const third = await projects.createProject({ title: "Project C", objective: "C", doneCondition: "done" }, { ownerKey: "owner-a" });
  return { root, projects, first: first.project, second: second.project, third: third.project };
}

test("parseProjectDirective accepts only a leading directive and keeps the model body clean", () => {
  const parsed = parseProjectDirective("\n/project project-20260824-aaaaaaaa\n请继续整理 Project A\n");
  assert.deepEqual(parsed, {
    projectRef: PROJECT_A,
    textWithoutDirective: "请继续整理 Project A",
    hadDirective: true,
  });
  const ordinary = "普通消息\n/project project-20260824-aaaaaaaa";
  assert.deepEqual(parseProjectDirective(ordinary), {
    projectRef: "",
    textWithoutDirective: ordinary,
    hadDirective: false,
  });
  assert.throws(
    () => parseProjectDirective("/project project-20260824-aaaaaaaa extra\n正文"),
    (error) => error.code === "PROJECT_DIRECTIVE_INVALID",
  );
  assert.throws(
    () => parseProjectDirective("/project project-20260824-aaaaaaaa"),
    (error) => error.code === "PROJECT_DIRECTIVE_BODY_REQUIRED",
  );
});

test("AgentHost persists explicit Project context, rejects wrong Owner and non-active bindings", async (t) => {
  const { root, projects, first, second, third } = await makeProjectFixture(t);
  const store = new JobStore({ opsRoot: path.join(root, "ops"), clock: fixedClock });
  const host = new AgentHost({
    store,
    executor: new FakeExecutor(),
    gitGuard: makeGitGuard(),
    projectService: projects,
  });

  const projectJob = await host.receive(
    { intent: "create_action", text: "Project A action" },
    { ownerKey: "owner-a", channel: "web", senderId: "owner-a", messageId: "job-a", projectRef: first.projectRef },
  );
  assert.equal(projectJob.job.status, "completed");
  assert.equal(projectJob.job.projectRef, first.projectRef);
  assert.equal((await store.get(projectJob.job.id)).projectRef, first.projectRef);

  const ordinaryJob = await host.receive(
    { intent: "chat", text: "no project" },
    { ownerKey: "owner-a", channel: "web", senderId: "owner-a", messageId: "job-none" },
  );
  assert.equal(Object.hasOwn(ordinaryJob.job, "projectRef"), false);

  await assert.rejects(
    host.receive({ intent: "chat", text: "wrong owner" }, {
      ownerKey: "owner-b", channel: "web", senderId: "owner-b", messageId: "job-wrong-owner", projectRef: first.projectRef,
    }),
    (error) => error.code === "PROJECT_OWNER_MISMATCH",
  );

  await projects.updateProjectStatus(second.projectRef, "paused", { ownerKey: "owner-a" });
  await assert.rejects(
    host.receive({ intent: "chat", text: "paused project" }, {
      ownerKey: "owner-a", channel: "web", senderId: "owner-a", messageId: "job-paused", projectRef: second.projectRef,
    }),
    (error) => error.code === "PROJECT_NOT_BINDABLE",
  );

  const dedupeContext = { ownerKey: "owner-a", channel: "web", senderId: "owner-a", messageId: "job-identity", projectRef: first.projectRef };
  await host.receive({ intent: "chat", text: "same message" }, dedupeContext);
  await assert.rejects(
    host.receive({ intent: "chat", text: "same message" }, { ...dedupeContext, projectRef: third.projectRef }),
    (error) => error.code === "PROJECT_CONTEXT_IDENTITY_CONFLICT",
  );
});

test("explicit Project context survives Artifact intake and Workflow creation without cross-project dedupe", async (t) => {
  const { root, projects, first, second } = await makeProjectFixture(t);
  const received = [];
  const ingest = {
    async receive(payload, context) {
      received.push({ payload, context });
      return {
        artifact: { id: "artifact-project-a", kind: payload.kind, dedupeKey: "project-a-source", sourceDescriptor: {} },
        proposalPending: true,
      };
    },
  };
  const store = new IngestWorkflowStore({ root: path.join(root, "workflow-state"), clock: fixedClock });
  const coordinator = new IngestWorkflowCoordinator({ ingest, store, schedule: () => {}, projectService: projects, clock: fixedClock });
  const receipt = await coordinator.receive(
    { kind: "text", value: "Project A knowledge" },
    { ownerKey: "owner-a", channel: "web", threadKey: "main", messageId: "capture-a", projectRef: first.projectRef },
  );

  assert.equal(received[0].context.projectRef, first.projectRef);
  assert.equal(received[0].context.ownerId, "owner-a");
  assert.equal(receipt.workflow.projectRef, first.projectRef);
  assert.equal((await store.get(receipt.workflow.id)).projectRef, first.projectRef);

  const scopedA = await coordinator.receive(
    { kind: "url", value: "https://example.com/project-aware" },
    { ownerKey: "owner-a", channel: "web", threadKey: "main", messageId: "capture-url-a", projectRef: first.projectRef },
  );
  const scopedB = await coordinator.receive(
    { kind: "url", value: "https://example.com/project-aware" },
    { ownerKey: "owner-a", channel: "web", threadKey: "main", messageId: "capture-url-b", projectRef: second.projectRef },
  );
  const unscoped = await coordinator.receive(
    { kind: "url", value: "https://example.com/project-aware" },
    { ownerKey: "owner-a", channel: "web", threadKey: "main", messageId: "capture-url-none" },
  );
  assert.notEqual(scopedA.workflow.id, scopedB.workflow.id);
  assert.notEqual(scopedA.workflow.id, unscoped.workflow.id);
  assert.equal(scopedB.workflow.projectRef, second.projectRef);
  assert.equal(Object.hasOwn(unscoped.workflow, "projectRef"), false);

  await assert.rejects(
    coordinator.receive(
      { kind: "text", value: "Wrong Owner knowledge" },
      { ownerKey: "owner-b", channel: "web", threadKey: "main", messageId: "capture-b", projectRef: first.projectRef },
    ),
    (error) => error.code === "PROJECT_OWNER_MISMATCH",
  );
});

test("IngestService persists the trusted Project context in local Artifact state", async (t) => {
  const { root, projects, first } = await makeProjectFixture(t);
  const service = new IngestService({
    intake: { async prepare(payload) { return { sourceType: payload.kind, text: payload.value }; } },
    knowledge: { async search() { return []; } },
    opsRoot: path.join(root, "ops"),
    stateRoot: path.join(root, "ingest-state"),
    projectService: projects,
    clock: fixedClock,
  });
  const receipt = await service.receive({ kind: "text", value: "project body" }, { ownerId: "owner-a", projectRef: first.projectRef });
  const state = JSON.parse(await fs.readFile(path.join(root, "ingest-state", `${receipt.artifact.id}.json`), "utf8"));
  assert.equal(state.projectRef, first.projectRef);
  await assert.rejects(
    service.receive({ kind: "text", value: "wrong owner" }, { ownerId: "owner-b", projectRef: first.projectRef }),
    (error) => error.code === "PROJECT_OWNER_MISMATCH",
  );
});

test("Tool Bridge carries server-bound Project context into ToolRegistry execution", async () => {
  let receivedContext;
  const tools = new ToolRegistry([{
    name: "knowledge.search",
    description: "Search",
    risk: "read",
    permission: "syno-read",
    retry: "safe",
    version: "1",
    inputSchema: { type: "object", required: ["query"], properties: { query: { type: "string" } }, additionalProperties: false },
    outputSchema: { type: "object" },
    execute: async (_input, context) => {
      receivedContext = context;
      return { projectRef: context.projectRef || null };
    },
  }]);
  const bridge = new SynoToolBridge({ tools, token: "bridge-secret" });
  const release = bridge.bindContext({ ownerKey: "owner-a", threadKey: "main", messageId: "bridge-project", projectRef: PROJECT_A, allowedTools: ["knowledge_search"] });
  const response = await bridge.handle({
    authorization: "Bearer bridge-secret",
    body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "knowledge_search", arguments: { query: "context" } } },
  });
  release();
  assert.equal(receivedContext.ownerId, "owner-a");
  assert.equal(receivedContext.projectRef, PROJECT_A);
  assert.match(response.result.content[0].text, new RegExp(PROJECT_A));
});

test("chat ingress strips a valid Project directive and never sends malformed directives to the model", async (t) => {
  const { projects, first } = await makeProjectFixture(t);
  const runs = [];
  const handler = new ChannelConversationHandler({
    runtime: { async run(request, context) { runs.push({ request, context }); return { runId: "run-1", text: "ok" }; } },
    core: { async execute() { throw new Error("不应进入 Job fallback"); } },
    ingest: { async receive() { throw new Error("不应进入收录"); } },
    projects,
    pendingDecisions: {},
  });
  const accepted = await handler.handle({ channel: "web", id: "chat-a", ownerKey: "owner-a", text: `/project ${first.projectRef}\n请回答` });
  assert.equal(accepted.text, "ok");
  assert.equal(runs[0].request.text, "请回答");
  assert.equal(runs[0].context.projectRef, first.projectRef);

  const rejected = await handler.handle({ channel: "web", id: "chat-b", ownerKey: "owner-a", text: "/project project-20260824-aaaaaaaa extra\n请回答" });
  assert.match(rejected.text, /PROJECT_DIRECTIVE_INVALID|Project 指令格式无效/);
  assert.equal(runs.length, 1);
});
