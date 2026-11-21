import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { finalizeTask, openBusinessView, recordVerification, reportWorkerDone } from "../../syno-autoloop-p0/examples/syno-p0/commands.ts";
import { candidateMarkdown, sha256 } from "../experiments/superagent-p0/idea-object.mjs";
import { openNativeButlerRuntime } from "../experiments/superagent-p0/native-butler-runtime.mjs";
import { canonicalMemorySnapshot, memorySnapshot } from "../experiments/superagent-p0/memory-object.mjs";
import { decisionIdForMessage } from "../experiments/superagent-p0/decision-object.mjs";
import {
  MEMORY_PROPOSAL_SCHEMA,
  PREFERENCE_LIMIT,
  assertMemoryRequest,
  buildMemoryPrompt,
  canonicalMemoryProposal,
  memoryResponseSchema,
  parseMemoryModelResponse,
  parseMemoryWorkerResult,
} from "../experiments/superagent-p0/memory-worker-contract.mjs";

const MODEL = "opencode-go/deepseek-v4.1-flash";
const SOURCE_URL = "https://code.claude.com/docs/en/best-practices";
const SOURCE = "P3.3 decision and memory fixture\n";
const message = (id, extra = {}) => ({ appId: "cli_test", messageId: id, chatId: "oc_test", ownerId: "ou_test", ...extra });

function fixture(extra = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-decision-memory-"));
  const vaultRoot = path.join(root, "vault");
  mkdirSync(vaultRoot, { recursive: true });
  const sourcePath = path.join(root, "source.txt");
  writeFileSync(sourcePath, SOURCE);
  const options = {
    databasePath: path.join(root, "runtime", "native.db"),
    vaultRoot,
    sourcePath,
    sourceUrl: SOURCE_URL,
    indexFile: path.join(root, "runtime", "knowledge-index.json"),
    resultRoot: path.join(root, "results"),
    ideaRoot: path.join(root, "ideas"),
    projectRoot: path.join(root, "projects"),
    memoryRoot: path.join(root, "memory"),
    ...extra,
  };
  return { root, options };
}

function writeIdea(runtime, execution, prompt, citations = []) {
  const generatedText = `${prompt}（合成正文）`;
  writeFileSync(execution.artifactPath, candidateMarkdown({
    ideaId: execution.ideaId,
    version: execution.contextVersion,
    action: execution.action,
    metadata: {
      messageId: execution.messageId, taskId: execution.taskId, attemptId: execution.attemptId,
      ideaId: execution.ideaId, contextVersion: execution.contextVersion,
      inputSha256: execution.inputSha256, worker: execution.worker, model: MODEL,
      action: execution.action, promptSha256: sha256(prompt),
      generatedTextSha256: sha256(generatedText), citations,
    },
    prompt,
    generatedText,
    citations,
  }), { flag: "wx" });
}

function newIdea(runtime, id, prompt) {
  const routed = runtime.route(`新建想法：${prompt}`);
  assert.equal(routed.status, "routed", JSON.stringify(routed));
  const execution = runtime.specialist("idea").begin({
    ...message(id), action: routed.action, prompt: routed.prompt,
  });
  writeIdea(runtime, execution, prompt);
  return runtime.specialist("idea").complete(execution);
}

function ideaCitation(runtime, ideaId) {
  const index = runtime.specialist("idea").index(ideaId);
  const previous = index.versions.find((version) => version.version === index.latestVersion);
  const content = readFileSync(previous.path, "utf8");
  const end = Math.min(40, content.length);
  return {
    ideaId, version: previous.version, path: previous.path, sha256: previous.sha256,
    offset: 0, end, excerpt: content.slice(0, end),
  };
}

function continueIdea(runtime, id, ideaId, prompt) {
  const routed = runtime.route(`继续想法 ${ideaId}：${prompt}`);
  assert.equal(routed.status, "routed", JSON.stringify(routed));
  const execution = runtime.specialist("idea").begin({
    ...message(id), action: routed.action, ideaId: routed.ideaId, prompt: routed.prompt,
  });
  writeIdea(runtime, execution, prompt, [ideaCitation(runtime, ideaId)]);
  return runtime.specialist("idea").complete(execution);
}

function completeProject(runtime, execution, goal) {
  const project = runtime.specialist("project");
  project.writeStep(execution, "outline", `# ${goal} 大纲\n\n- 范围`);
  project.completeStep(execution, "outline");
  project.writeStep(execution, "deliverable", `# ${goal} 简报\n\n正文`);
  project.completeStep(execution, "deliverable");
  project.writeManifest(execution);
  project.completeStep(execution, "manifest");
  return project.complete(execution);
}

function newProject(runtime, id, goal) {
  const routed = runtime.route(`新建项目：${goal}`);
  assert.equal(routed.status, "routed", JSON.stringify(routed));
  const execution = runtime.specialist("project").begin({
    ...message(id), action: routed.action, goal: routed.goal,
  });
  return completeProject(runtime, execution, goal);
}

function routeDecision(runtime, id, text) {
  const ambiguous = runtime.route(text);
  assert.equal(ambiguous.status, "ambiguous", JSON.stringify(ambiguous));
  assert.ok(ambiguous.decisionCandidates?.length >= 2, JSON.stringify(ambiguous));
  const created = runtime.createRouteDecision(message(id), ambiguous);
  assert.equal(created.status, "ambiguous");
  return created.decision;
}

function selectCandidate(runtime, id, decision, objectId, extra = {}) {
  const candidate = decision.candidates.find((entry) => entry.objectId === objectId);
  assert.ok(candidate, `decision ${decision.decisionId} has no candidate ${objectId}`);
  return runtime.selectRoute(message(id, extra), { decisionId: decision.decisionId, candidateId: candidate.candidateId });
}

function proposeMemory(runtime, id, scope, value, extra = {}) {
  const routed = runtime.handle({ ...message(id, extra), text: `记忆候选 ${scope}：${value}` });
  assert.equal(routed.domain, "memory", JSON.stringify(routed));
  assert.equal(routed.action, "propose");
  return routed.result;
}

function memoryExecution(runtime, id, decisionId, extra = {}) {
  const decision = runtime.decisions.get(decisionId);
  assert.ok(decision, `missing decision ${decisionId}`);
  const { action = decision.binding.operation, ...rest } = extra;
  return runtime.specialist("memory").begin({
    ...message(id, rest), decisionId, action, worker: "OpenCode",
  });
}

function writeMemoryCandidate(execution, overrides = {}) {
  const snapshot = {
    ...memorySnapshot({
      memoryId: execution.memoryId,
      ownerId: execution.ownerId,
      scope: execution.scope,
      operation: execution.operation,
      decisionId: execution.decisionId,
      expectedVersion: execution.expectedVersion,
      version: execution.targetVersion,
      preference: execution.preference,
      expectedValueSha256: execution.expectedValueSha256,
      valueSha256: execution.valueSha256,
      sourceMessageId: execution.messageId,
      taskId: execution.taskId,
      attemptId: execution.attemptId,
      inputSha256: execution.inputSha256,
    }),
    ...overrides,
  };
  writeFileSync(execution.artifactPath, canonicalMemorySnapshot(snapshot), { flag: "wx" });
  return snapshot;
}

function settleMemory(runtime, id, decisionId, extra = {}) {
  const memory = runtime.specialist("memory");
  const execution = memoryExecution(runtime, id, decisionId, extra);
  assert.ok(execution.taskId, JSON.stringify(execution));
  writeMemoryCandidate(execution);
  return { execution, trace: memory.complete(execution) };
}

function activateMemory(runtime, id, decisionId) {
  const { trace } = settleMemory(runtime, id, decisionId);
  assert.equal(trace.taskState, "completed");
  return trace;
}

test("idea and project multi-candidate questions create one Decision each and only the selected object advances", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const ideaA = newIdea(runtime, "om_dm_idea_a", "决策想法阿尔法");
    const ideaB = newIdea(runtime, "om_dm_idea_b", "决策想法贝塔");
    const ideaDecision = routeDecision(runtime, "om_dm_idea_q", "继续想法：冻结的续写正文");
    assert.equal(ideaDecision.decisionKind, "route.select");
    assert.deepEqual(ideaDecision.action, { action: "continue", prompt: "冻结的续写正文" });
    assert.equal(ideaDecision.candidates.length, 2);
    assert.throws(() => runtime.specialist("idea").trace("task-om_dm_idea_q"), /缺少 Task/);

    const selected = selectCandidate(runtime, "om_dm_idea_sel", ideaDecision, ideaB.ideaId);
    assert.equal(selected.status, "routed");
    assert.equal(selected.domain, "idea");
    assert.equal(selected.execution.ideaId, ideaB.ideaId);
    assert.equal(selected.execution.prompt, "冻结的续写正文");
    assert.equal(selected.execution.contextVersion, 2);
    assert.equal(runtime.specialist("idea").index(ideaA.ideaId).latestVersion, 1);
    assert.equal(runtime.specialist("idea").index(ideaB.ideaId).latestVersion, 1);
    writeIdea(runtime, selected.execution, "冻结的续写正文", [ideaCitation(runtime, ideaB.ideaId)]);
    assert.equal(runtime.specialist("idea").complete(selected.execution).taskState, "completed");
    assert.equal(runtime.specialist("idea").index(ideaB.ideaId).latestVersion, 2);

    const projectA = newProject(runtime, "om_dm_project_a", "决策项目甲");
    const projectB = newProject(runtime, "om_dm_project_b", "决策项目乙");
    const projectDecision = routeDecision(runtime, "om_dm_project_q", "修订项目：冻结的修订正文");
    assert.equal(projectDecision.decisionKind, "route.select");
    assert.deepEqual(projectDecision.action, { action: "revise", revision: "冻结的修订正文" });
    assert.equal(projectDecision.candidates.length, 2);
    const projectSelected = selectCandidate(runtime, "om_dm_project_sel", projectDecision, projectA.projectId);
    assert.equal(projectSelected.status, "routed");
    assert.equal(projectSelected.domain, "project");
    assert.equal(projectSelected.execution.projectId, projectA.projectId);
    assert.equal(projectSelected.execution.revision, "冻结的修订正文");
    assert.equal(projectSelected.execution.planVersion, 2);
    assert.equal(runtime.specialist("project").index(projectB.projectId).latestVersion, 1);
    assert.equal(runtime.specialist("project").index(projectA.projectId).latestVersion, 1);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("route selection replay is idempotent, a different confirmation is inert, and bad owners, candidates and unknown IDs are rejected", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const ideaA = newIdea(runtime, "om_rs_idea_a", "重放想法阿尔法");
    const ideaB = newIdea(runtime, "om_rs_idea_b", "重放想法贝塔");
    const decision = routeDecision(runtime, "om_rs_q", "继续想法：重放冻结正文");
    const first = selectCandidate(runtime, "om_rs_sel", decision, ideaA.ideaId);
    assert.equal(first.status, "routed");
    writeIdea(runtime, first.execution, "重放冻结正文", [ideaCitation(runtime, ideaA.ideaId)]);
    assert.equal(runtime.specialist("idea").complete(first.execution).taskState, "completed");
    const beforeReplayFacts = runtime.factCount();
    const replay = selectCandidate(runtime, "om_rs_sel", decision, ideaA.ideaId);
    assert.equal(replay.status, "routed");
    assert.equal(replay.execution.taskId, first.execution.taskId);
    assert.equal(replay.execution.attemptId, first.execution.attemptId);
    assert.equal(replay.execution.state, "completed");
    assert.equal(runtime.factCount(), beforeReplayFacts);
    assert.equal(runtime.specialist("idea").trace(first.execution.taskId).contextVersion, 2);
    assert.throws(
      () => runtime.selectRoute(message("om_rs_sel"), {
        decisionId: decision.decisionId,
        candidateId: decision.candidates.find((entry) => entry.objectId === ideaB.ideaId).candidateId,
      }),
      /同一确认消息不能更换候选/,
    );

    const beforeFacts = runtime.factCount();
    const other = selectCandidate(runtime, "om_rs_sel_other", decision, ideaB.ideaId);
    assert.equal(other.status, "already_consumed");
    assert.equal(runtime.factCount(), beforeFacts);
    assert.equal(runtime.specialist("idea").index(ideaB.ideaId).latestVersion, 1);

    const wrongOwner = runtime.selectRoute(message("om_rs_sel_owner", { ownerId: "ou_other" }), {
      decisionId: decision.decisionId,
      candidateId: decision.candidates.find((entry) => entry.objectId === ideaA.ideaId).candidateId,
    });
    assert.equal(wrongOwner.status, "owner_mismatch");

    assert.throws(() => runtime.decisions.consume({
      ownerId: "ou_test", appId: "cli_test", messageId: "om_rs_unknown", decisionId: "decision-0000000000000000",
      candidateId: "candidate-1",
    }), /未知 Decision/);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("wrong candidate, cancelled and expired Decisions never start a Task", () => {
  let clock = 1_000_000;
  const first = fixture({ now: () => clock, decisionTtlMs: 1_000 });
  const runtimeFirst = openNativeButlerRuntime(first.options);
  try {
    newIdea(runtimeFirst, "om_guard_idea_a", "守卫想法阿尔法");
    newIdea(runtimeFirst, "om_guard_idea_b", "守卫想法贝塔");
    const decision = routeDecision(runtimeFirst, "om_guard_q", "继续想法：守卫冻结正文");
    assert.throws(
      () => runtimeFirst.selectRoute(message("om_guard_bad_candidate"), {
        decisionId: decision.decisionId, candidateId: "candidate-999",
      }),
      /候选不属于该 Decision/,
    );
    assert.equal(runtimeFirst.decisions.get(decision.decisionId).status, "pending");
    assert.throws(() => runtimeFirst.specialist("idea").trace("task-om_guard_bad_candidate"), /缺少 Task/);
  } finally {
    runtimeFirst.close();
    rmSync(first.root, { recursive: true, force: true });
  }

  const second = fixture({ now: () => clock, decisionTtlMs: 1_000 });
  const runtime2 = openNativeButlerRuntime(second.options);
  try {
    newIdea(runtime2, "om_guard2_idea_a", "守卫二想法阿尔法");
    newIdea(runtime2, "om_guard2_idea_b", "守卫二想法贝塔");
    const cancelled = routeDecision(runtime2, "om_guard2_cancel_q", "继续想法：取消冻结正文");
    const cancelledResult = runtime2.decisions.cancel({ ownerId: "ou_test", decisionId: cancelled.decisionId });
    assert.equal(cancelledResult.status, "cancelled");
    const cancelledSelect = runtime2.selectRoute(message("om_guard2_cancel_sel"), {
      decisionId: cancelled.decisionId, candidateId: cancelled.candidates[0].candidateId,
    });
    assert.equal(cancelledSelect.status, "cancelled");

    const expiring = routeDecision(runtime2, "om_guard2_expire_q", "继续想法：过期冻结正文");
    clock += 1_001;
    const expiredSelect = runtime2.selectRoute(message("om_guard2_expire_sel"), {
      decisionId: expiring.decisionId, candidateId: expiring.candidates[0].candidateId,
    });
    assert.equal(expiredSelect.status, "expired");
    assert.equal(runtime2.decisions.get(expiring.decisionId).status, "expired");
  } finally {
    runtime2.close();
    rmSync(second.root, { recursive: true, force: true });
  }
});

test("an advanced object version makes the old Decision stale, and a consumed confirmation recovers into exactly one domain Task", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const ideaA = newIdea(runtime, "om_stale_idea_a", "版本想法阿尔法");
    const ideaB = newIdea(runtime, "om_stale_idea_b", "版本想法贝塔");
    const oldDecision = routeDecision(runtime, "om_stale_q", "继续想法：旧冻结正文");
    continueIdea(runtime, "om_stale_advance", ideaA.ideaId, "对象已经前进一步");
    assert.equal(runtime.specialist("idea").index(ideaA.ideaId).latestVersion, 2);
    const stale = runtime.selectRoute(message("om_stale_sel"), {
      decisionId: oldDecision.decisionId,
      candidateId: oldDecision.candidates.find((entry) => entry.objectId === ideaA.ideaId).candidateId,
    });
    assert.equal(stale.status, "stale");
    assert.equal(runtime.decisions.get(oldDecision.decisionId).status, "expired");
    assert.throws(() => runtime.specialist("idea").trace("task-om_stale_sel"), /缺少 Task/);

    const fresh = routeDecision(runtime, "om_recover_q", "继续想法：崩溃恢复冻结正文");
    const candidate = fresh.candidates.find((entry) => entry.objectId === ideaB.ideaId);
    const consumed = runtime.decisions.consume({
      ownerId: "ou_test", appId: "cli_test", messageId: "om_recover_sel",
      decisionId: fresh.decisionId, candidateId: candidate.candidateId,
    });
    assert.equal(consumed.status, "consumed");
    const recovered = runtime.selectRoute(message("om_recover_sel"), {
      decisionId: fresh.decisionId, candidateId: candidate.candidateId,
    });
    assert.equal(recovered.status, "routed");
    assert.equal(recovered.execution.messageId, "om_recover_sel");
    assert.equal(recovered.execution.contextVersion, 2);
    writeIdea(runtime, recovered.execution, "崩溃恢复冻结正文");
    const replayed = runtime.selectRoute(message("om_recover_sel"), {
      decisionId: fresh.decisionId, candidateId: candidate.candidateId,
    });
    assert.equal(replayed.execution.taskId, recovered.execution.taskId);
    assert.equal(runtime.specialist("idea").trace(recovered.execution.taskId).contextVersion, 2);
    assert.equal(runtime.specialist("idea").index(ideaB.ideaId).latestVersion, 1);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a memory candidate is pending, cannot confirm itself, and only a later Owner message activates it", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const proposal = proposeMemory(runtime, "om_mem_p1", "owner", "OWNER-CANARY-不喜欢香菜");
    assert.equal(proposal.status, "pending");
    assert.equal(proposal.version, 1);
    const index = memory.index(proposal.memoryId);
    assert.equal(index.status, "pending");
    assert.equal(index.currentVersion, 1);
    assert.equal(index.versions[0].status, "pending");
    assert.equal(memory.recall({ ownerId: "ou_test", contextId: "idea:idea-0000000000000000" }).length, 0);

    assert.throws(
      () => memoryExecution(runtime, "om_mem_p1", proposal.decisionId),
      /同一条提出消息不能确认自己/,
    );
    const activation = settleMemory(runtime, "om_mem_c1", proposal.decisionId);
    assert.equal(activation.trace.taskState, "completed");
    assert.equal(activation.trace.version, 2);
    assert.equal(activation.trace.deliveryState, "queued");
    const active = memory.index(proposal.memoryId);
    assert.equal(active.status, "active");
    assert.equal(active.currentVersion, 2);
    assert.deepEqual(active.versions.map((version) => [version.version, version.status]), [[1, "pending"], [2, "active"]]);
    assert.deepEqual(memory.recall({ ownerId: "ou_test", contextId: "idea:idea-0000000000000000" }), [{
      memoryId: proposal.memoryId, version: 2, scope: "owner", preference: "OWNER-CANARY-不喜欢香菜",
    }]);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("owner, idea and project scopes recall only authorized values and never leak another object or Owner", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const ideaA = newIdea(runtime, "om_scope_idea_a", "作用域想法甲").ideaId;
    const ideaB = newIdea(runtime, "om_scope_idea_b", "作用域想法乙").ideaId;
    const projectB = newProject(runtime, "om_scope_project_b", "作用域项目乙").projectId;

    const owner = proposeMemory(runtime, "om_scope_owner", "owner", "OWNER-CANARY");
    activateMemory(runtime, "om_scope_owner_c", owner.decisionId);
    const a = proposeMemory(runtime, "om_scope_a", `idea:${ideaA}`, "A-CANARY");
    activateMemory(runtime, "om_scope_a_c", a.decisionId);
    const b = proposeMemory(runtime, "om_scope_b", `project:${projectB}`, "B-CANARY");
    activateMemory(runtime, "om_scope_b_c", b.decisionId);
    const hidden = proposeMemory(runtime, "om_scope_hidden", `idea:${ideaB}`, "HIDDEN-CANARY");
    activateMemory(runtime, "om_scope_hidden_c", hidden.decisionId);

    assert.deepEqual(
      memory.recall({ ownerId: "ou_test", contextId: `idea:${ideaA}` }).map((entry) => entry.preference).sort(),
      ["A-CANARY", "OWNER-CANARY"],
    );
    assert.deepEqual(
      memory.recall({ ownerId: "ou_test", contextId: `project:${projectB}` }).map((entry) => entry.preference).sort(),
      ["B-CANARY", "OWNER-CANARY"],
    );
    assert.deepEqual(memory.recall({ ownerId: "ou_other", contextId: `idea:${ideaA}` }), []);
    assert.ok(memory.recall({ ownerId: "ou_test", contextId: `idea:${ideaA}` }).every((entry) => entry.preference !== "B-CANARY"));
    assert.ok(memory.recall({ ownerId: "ou_test", contextId: `idea:${ideaA}` }).every((entry) => entry.preference !== "HIDDEN-CANARY"));
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a pending correction is not recalled; the old active value survives until confirmation, then only the new value is current", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const proposal = proposeMemory(runtime, "om_correct_p", "owner", "OLD-VALUE");
    activateMemory(runtime, "om_correct_a", proposal.decisionId);
    assert.deepEqual(memory.recall({ ownerId: "ou_test", contextId: "idea:idea-1111111111111111" }).map((entry) => entry.preference), ["OLD-VALUE"]);

    const correction = runtime.handle({
      ...message("om_correct_req"), text: `纠正记忆 ${proposal.memoryId}：v2：NEW-VALUE`,
    });
    assert.equal(correction.action, "correct");
    assert.equal(correction.result.status, "pending");
    assert.deepEqual(memory.recall({ ownerId: "ou_test", contextId: "idea:idea-1111111111111111" }).map((entry) => entry.preference), ["OLD-VALUE"]);
    assert.equal(memory.index(proposal.memoryId).currentVersion, 2);

    const settled = settleMemory(runtime, "om_correct_c", correction.result.decisionId);
    assert.equal(settled.trace.version, 3);
    assert.deepEqual(memory.recall({ ownerId: "ou_test", contextId: "idea:idea-1111111111111111" }).map((entry) => entry.preference), ["NEW-VALUE"]);
    const index = memory.index(proposal.memoryId);
    assert.deepEqual(index.versions.map((version) => [version.version, version.status]), [
      [1, "pending"], [2, "superseded"], [3, "active"],
    ]);
    assert.equal(index.versions[1].valueSha256, sha256("OLD-VALUE"));
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("forget binds the exact memory version, leaves a tombstone and rejects stale or old Decisions", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const proposal = proposeMemory(runtime, "om_forget_p", "owner", "TO-FORGET");
    activateMemory(runtime, "om_forget_a", proposal.decisionId);

    assert.throws(
      () => runtime.handle({ ...message("om_forget_wrong"), text: `遗忘记忆 ${proposal.memoryId}：v1` }),
      /记忆版本已变化/,
    );
    const forgetRequest = runtime.handle({
      ...message("om_forget_req"), text: `遗忘记忆 ${proposal.memoryId}：v2`,
    });
    assert.equal(forgetRequest.action, "forget");
    const settled = settleMemory(runtime, "om_forget_c", forgetRequest.result.decisionId);
    assert.equal(settled.trace.version, 3);
    assert.equal(memory.index(proposal.memoryId).status, "revoked");
    assert.equal(memory.index(proposal.memoryId).versions.at(-1).status, "revoked");
    assert.equal(memory.index(proposal.memoryId).versions.at(-1).preference, null);
    assert.deepEqual(memory.recall({ ownerId: "ou_test", contextId: "idea:idea-1111111111111111" }), []);

    const replay = memory.begin({ ...message("om_forget_c"), decisionId: forgetRequest.result.decisionId, action: "forget" });
    assert.equal(replay.state, "completed");
    assert.equal(memory.complete(replay).version, 3);

    const oldValue = memory.index(proposal.memoryId).versions.find((version) => version.version === 2);
    const stale = runtime.decisions.createMemoryDecision({
      ownerId: "ou_test", appId: "cli_test", originMessageId: "om_forget_stale_req",
      originContext: memory.index(proposal.memoryId).contextId,
      binding: {
        memoryId: proposal.memoryId, expectedMemoryVersion: 2, operation: "correct",
        expectedValueSha256: oldValue.valueSha256, pendingValue: "STALE-VALUE",
      },
    });
    assert.throws(
      () => memory.begin({ ...message("om_forget_stale_c"), decisionId: stale.decisionId, action: "correct" }),
      /记忆版本已变化/,
    );
    assert.equal(memory.index(proposal.memoryId).currentVersion, 3);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("confirmation replay, cancel, timeout, stale Attempt, Worker done and Result Lane failure never over-settle", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const proposal = proposeMemory(runtime, "om_lane_p", "owner", "LANE-BASE");
    activateMemory(runtime, "om_lane_a", proposal.decisionId);
    const correction = runtime.handle({ ...message("om_lane_req"), text: `纠正记忆 ${proposal.memoryId}：v2：LANE-NEW` });

    const execution = memoryExecution(runtime, "om_lane_c", correction.result.decisionId);
    const replay = memoryExecution(runtime, "om_lane_c", correction.result.decisionId);
    assert.equal(replay.taskId, execution.taskId);
    assert.equal(replay.attemptId, execution.attemptId);
    assert.throws(
      () => memoryExecution(runtime, "om_lane_c", correction.result.decisionId, { action: "forget" }),
      /确认动作与 Decision 不一致/,
    );

    memory.cancel(execution.taskId);
    writeMemoryCandidate(execution);
    assert.throws(() => memory.complete(execution), /取消已请求/);
    const cancelled = memory.trace(execution.taskId);
    assert.equal(cancelled.taskState, "cancel_requested");
    assert.equal(cancelled.deliveryState, null);
    assert.equal(memory.index(proposal.memoryId).currentVersion, 2);

    // A second, independent memory exercises timeout, stale Attempt and Worker-done without sharing a Context.
    const timeoutMemory = proposeMemory(runtime, "om_lane_p2", "owner", "LANE-TIMEOUT-BASE");
    activateMemory(runtime, "om_lane_a2", timeoutMemory.decisionId);
    const second = runtime.handle({ ...message("om_lane_req2"), text: `纠正记忆 ${timeoutMemory.memoryId}：v2：LANE-TIMEOUT` });
    const timedOut = memoryExecution(runtime, "om_lane_timeout", second.result.decisionId);
    const timeoutTrace = memory.trace(timedOut.taskId);
    assert.equal(timeoutTrace.taskState, "running");
    assert.equal(timeoutTrace.attemptState, "running");
    assert.equal(timeoutTrace.nativeRunState, "claimed");
    assert.equal(timeoutTrace.deliveryState, null);
    assert.equal(memory.index(timeoutMemory.memoryId).currentVersion, 2);
    assert.throws(
      () => memory.complete({ ...timedOut, attemptId: execution.attemptId }),
      /完成时必须仍是当前 Attempt/,
    );

    const db = new DatabaseSync(options.databasePath);
    try {
      db.exec("PRAGMA busy_timeout=5000;");
      openBusinessView(db);
      reportWorkerDone(db, { taskId: timedOut.taskId, attemptId: timedOut.attemptId, now: Date.now() });
    } finally {
      db.close();
    }
    assert.equal(memory.trace(timedOut.taskId).taskState, "running");
    assert.equal(memory.trace(timedOut.taskId).attemptState, "done");
    writeMemoryCandidate(timedOut);
    const settled = memory.complete(timedOut);
    assert.equal(settled.taskState, "completed");
    assert.equal(settled.version, 3);

    const third = proposeMemory(runtime, "om_lane_p3", "owner", "LANE-OTHER");
    activateMemory(runtime, "om_lane_a3", third.decisionId);
    const badCorrection = runtime.handle({ ...message("om_lane_req3"), text: `纠正记忆 ${third.memoryId}：v2：LANE-TAMPER` });
    const badExecution = memoryExecution(runtime, "om_lane_tamper", badCorrection.result.decisionId);
    writeMemoryCandidate(badExecution, { preference: "FORGED-VALUE" });
    assert.throws(() => memory.complete(badExecution), /记忆候选快照与冻结输入不一致/);
    const failed = memory.trace(badExecution.taskId);
    assert.equal(failed.taskState, "running");
    assert.equal(failed.deliveryState, null);
    assert.equal(memory.index(third.memoryId).currentVersion, 2);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("process restart over the same SQLite resumes the consumed Decision once; the same memory queues while another memory settles independently", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  const memoryA = runtime.specialist("memory");
  let proposal;
  let correction;
  let execution;
  try {
    proposal = proposeMemory(runtime, "om_restart_p", "owner", "RESTART-BASE");
    activateMemory(runtime, "om_restart_a", proposal.decisionId);
    correction = runtime.handle({ ...message("om_restart_req"), text: `纠正记忆 ${proposal.memoryId}：v2：RESTART-NEW` });
    execution = memoryExecution(runtime, "om_restart_c", correction.result.decisionId);
    assert.equal(memoryA.trace(execution.taskId).taskState, "running");
  } finally {
    runtime.close();
  }

  const recovered = openNativeButlerRuntime(options);
  try {
    const memory = recovered.specialist("memory");
    const replay = memory.begin({ ...message("om_restart_c"), decisionId: correction.result.decisionId, action: "correct" });
    assert.equal(replay.taskId, execution.taskId);
    assert.equal(replay.attemptId, execution.attemptId);
    writeMemoryCandidate(replay);
    const settled = memory.complete(replay);
    assert.equal(settled.version, 3);
    assert.equal(memory.complete(replay).version, 3);

    const other = proposeMemory(recovered, "om_restart_other", "owner", "INDEPENDENT-MEMORY");
    activateMemory(recovered, "om_restart_other_a", other.decisionId);
    assert.equal(memory.index(other.memoryId).currentVersion, 2);
    assert.equal(memory.index(proposal.memoryId).currentVersion, 3);

    const queuedRequest = recovered.handle({
      ...message("om_restart_req2"), text: `纠正记忆 ${proposal.memoryId}：v3：QUEUED-NEW`,
    });
    const holder = memoryExecution(recovered, "om_restart_hold", queuedRequest.result.decisionId);
    assert.equal(memory.trace(holder.taskId).taskState, "running");
    const contextBefore = memory.trace(holder.taskId).contextVersion;
    const secondRequest = recovered.handle({
      ...message("om_restart_req3"), text: `纠正记忆 ${proposal.memoryId}：v3：QUEUED-STALE`,
    });
    const queued = memoryExecution(recovered, "om_restart_queued", secondRequest.result.decisionId);
    assert.equal(queued.status, "queued");
    assert.equal(memory.trace(holder.taskId).contextVersion, contextBefore);
    assert.throws(() => memory.trace(`task-om_restart_queued`), /缺少 Task/);
    assert.ok(memory.queued().some((entry) => entry.messageId === "om_restart_queued"));

    writeMemoryCandidate(holder);
    assert.equal(memory.complete(holder).version, 4);
    assert.equal(memory.index(proposal.memoryId).currentVersion, 4);

    // Draining a queued confirmation whose exact expected version is now stale terminates it without a Task.
    const drained = memory.drainQueued();
    assert.equal(drained.length, 1, JSON.stringify(drained));
    assert.equal(drained[0].status, "stale");
    assert.equal(drained[0].messageId, "om_restart_queued");
    const staleDecision = recovered.decisions.get(secondRequest.result.decisionId);
    assert.equal(staleDecision.status, "expired");
    assert.equal(staleDecision.expiredReason, "stale-queued");
    assert.equal(staleDecision.consumption?.receipt?.decisionId, secondRequest.result.decisionId);
    assert.equal(memory.queued().length, 0);
    assert.throws(() => memory.trace("task-om_restart_queued"), /缺少 Task/);
    assert.equal(memory.index(proposal.memoryId).currentVersion, 4);

    const afterDrainFacts = recovered.factCount();
    assert.deepEqual(memory.drainQueued(), []);
    assert.equal(recovered.factCount(), afterDrainFacts);
    const staleReplay = memory.begin({
      ...message("om_restart_queued"), decisionId: secondRequest.result.decisionId, action: "correct",
    });
    assert.equal(staleReplay.status, "expired");
    assert.throws(() => memory.trace("task-om_restart_queued"), /缺少 Task/);
    assert.equal(recovered.factCount(), afterDrainFacts);
  } finally {
    recovered.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("different memories confirm in parallel and settle independently while one memory stays queued", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const first = proposeMemory(runtime, "om_par_p1", "owner", "PARALLEL-ONE");
    activateMemory(runtime, "om_par_a1", first.decisionId);
    const second = proposeMemory(runtime, "om_par_p2", "owner", "PARALLEL-TWO");
    activateMemory(runtime, "om_par_a2", second.decisionId);

    const firstRequest = runtime.handle({ ...message("om_par_req1"), text: `纠正记忆 ${first.memoryId}：v2：PARALLEL-ONE-NEW` });
    const secondRequest = runtime.handle({ ...message("om_par_req2"), text: `纠正记忆 ${second.memoryId}：v2：PARALLEL-TWO-NEW` });
    const firstExecution = memoryExecution(runtime, "om_par_c1", firstRequest.result.decisionId);
    const secondExecution = memoryExecution(runtime, "om_par_c2", secondRequest.result.decisionId);
    assert.notEqual(firstExecution.taskId, secondExecution.taskId);
    assert.notEqual(firstExecution.contextId, secondExecution.contextId);
    assert.equal(memory.trace(firstExecution.taskId).taskState, "running");
    assert.equal(memory.trace(secondExecution.taskId).taskState, "running");

    writeMemoryCandidate(firstExecution);
    writeMemoryCandidate(secondExecution);
    assert.equal(memory.complete(firstExecution).version, 3);
    assert.equal(memory.complete(secondExecution).version, 3);
    assert.equal(memory.index(first.memoryId).currentVersion, 3);
    assert.equal(memory.index(second.memoryId).currentVersion, 3);
    assert.deepEqual(memory.recall({ ownerId: "ou_test", contextId: null }).map((entry) => entry.preference).sort(), [
      "PARALLEL-ONE-NEW", "PARALLEL-TWO-NEW",
    ]);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("memory confirmation consumed before ingest recovers on the same message, while request replay and a second confirmer stay inert", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const proposal = proposeMemory(runtime, "om_crash2_p", "owner", "CRASH-BASE");
    activateMemory(runtime, "om_crash2_a", proposal.decisionId);
    const request = runtime.handle({ ...message("om_crash2_req"), text: `纠正记忆 ${proposal.memoryId}：v2：CRASH-NEW` });
    const decisionId = request.result.decisionId;

    const consumed = runtime.decisions.consume({
      ownerId: "ou_test", appId: "cli_test", messageId: "om_crash2_confirm", decisionId,
    });
    assert.equal(consumed.status, "consumed");
    const replayRequest = runtime.handle({ ...message("om_crash2_req"), text: `纠正记忆 ${proposal.memoryId}：v2：CRASH-NEW` });
    assert.equal(replayRequest.result.decisionId, decisionId);
    assert.equal(memory.index(proposal.memoryId).currentVersion, 2);

    const recovered = memory.begin({ ...message("om_crash2_confirm"), decisionId, action: "correct" });
    assert.equal(recovered.taskId, "task-om_crash2_confirm");
    writeMemoryCandidate(recovered);
    assert.equal(memory.complete(recovered).version, 3);

    const second = memory.begin({ ...message("om_crash2_other"), decisionId, action: "correct" });
    assert.equal(second.status, "already_consumed");
    assert.throws(() => memory.trace("task-om_crash2_other"), /缺少 Task/);
    assert.equal(memory.index(proposal.memoryId).currentVersion, 3);

    const afterApply = runtime.handle({ ...message("om_crash2_req"), text: `纠正记忆 ${proposal.memoryId}：v2：CRASH-NEW` });
    assert.equal(afterApply.result.decisionId, decisionId);
    assert.equal(afterApply.result.status, "consumed");
    assert.equal(memory.index(proposal.memoryId).currentVersion, 3);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("Root Router rejects malformed Decision and Memory commands without writing facts or guessing an object", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const before = runtime.factCount();
    for (const text of [
      "选择", "选择 不是ID：candidate-1", "确认", "确认 不是ID",
      "记忆候选", "记忆候选 owner", "纠正记忆 没有版本", "遗忘记忆 memory-0000000000000000",
    ]) {
      const routed = runtime.route(text);
      assert.equal(routed.status, "ambiguous", `${text} -> ${JSON.stringify(routed)}`);
    }
    assert.equal(runtime.route("选择 decision-0000000000000000：candidate-1").status, "routed");
    assert.equal(runtime.route("确认 decision-0000000000000000").status, "routed");
    assert.equal(runtime.factCount(), before);
    assert.equal(runtime.specialist("memory").memories().length, 0);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("forged scope, memory IDs, candidates and value hashes cannot inject memory or change delivery state", () => {  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    assert.throws(
      () => memory.propose({ ...message("om_forge_scope"), scope: "idea:not-an-id", preference: "x" }),
      /非法记忆作用域/,
    );
    assert.throws(
      () => memory.correct({ ...message("om_forge_mid"), memoryId: "memory-0000000000000000", expectedVersion: 1, preference: "x" }),
      /未知记忆/,
    );

    const proposal = proposeMemory(runtime, "om_forge_p", "owner", "DELIVERY-BASE");
    activateMemory(runtime, "om_forge_a", proposal.decisionId);
    const trace = memory.trace(`task-om_forge_a`);
    const deliveryKey = trace.deliveryKey;
    assert.ok(deliveryKey);
    assert.equal(trace.deliveryState, "queued");
    assert.equal(memory.claim(deliveryKey).claimed, true);
    assert.equal(memory.claim(deliveryKey).claimed, false);
    assert.equal(memory.trace(`task-om_forge_a`).deliveryState, "unknown");
    memory.unknown(deliveryKey);
    assert.equal(memory.claim(deliveryKey).claimed, false);
    assert.equal(memory.trace(`task-om_forge_a`).deliveryState, "unknown");
    memory.accept(deliveryKey);
    assert.equal(memory.trace(`task-om_forge_a`).deliveryState, "accepted");
    assert.equal(memory.recall({ ownerId: "ou_other", contextId: null }).length, 0);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a live queued confirmation is drained into exactly one Task while a stale queued confirmation terminates", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const items = [];
    for (let index = 1; index <= 4; index += 1) {
      const proposal = proposeMemory(runtime, `om_qd_p${index}`, "owner", `QD-BASE-${index}`);
      activateMemory(runtime, `om_qd_a${index}`, proposal.decisionId);
      const request = runtime.handle({
        ...message(`om_qd_req${index}`), text: `纠正记忆 ${proposal.memoryId}：v2：QD-NEW-${index}`,
      });
      items.push({ proposal, request });
    }

    const holders = items.slice(0, 3).map((item, index) => (
      memoryExecution(runtime, `om_qd_c${index + 1}`, item.request.result.decisionId)
    ));
    const queued = memoryExecution(runtime, "om_qd_c4", items[3].request.result.decisionId);
    assert.equal(queued.status, "queued", JSON.stringify(queued));
    assert.ok(memory.queued().some((entry) => entry.messageId === "om_qd_c4"));

    writeMemoryCandidate(holders[0]);
    assert.equal(memory.complete(holders[0]).version, 3);

    const drained = memory.drainQueued();
    assert.equal(drained.length, 1, JSON.stringify(drained));
    assert.equal(drained[0].status, "claimed");
    assert.equal(drained[0].messageId, "om_qd_c4");
    const resumed = drained[0].execution;
    assert.equal(resumed.messageId, "om_qd_c4");
    assert.equal(resumed.taskId, "task-om_qd_c4");
    assert.equal(memory.trace(resumed.taskId).taskState, "running");
    assert.equal(memory.index(items[3].proposal.memoryId).currentVersion, 2);

    writeMemoryCandidate(resumed);
    assert.equal(memory.complete(resumed).version, 3);
    assert.equal(memory.index(items[3].proposal.memoryId).currentVersion, 3);
    assert.equal(memory.queued().length, 0);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("request replay repairs a missing pending pointer but never rewrites a consumed or applied result", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const proposal = proposeMemory(runtime, "om_cw_p", "owner", "CW-BASE");
    activateMemory(runtime, "om_cw_a", proposal.decisionId);
    const index = memory.index(proposal.memoryId);
    const current = index.versions.find((version) => version.version === index.currentVersion);
    assert.equal(index.currentVersion, 2);

    // Crash window: the Decision is committed, but memory_pending_set never ran.
    const decision = runtime.decisions.createMemoryDecision({
      ownerId: "ou_test", appId: "cli_test", originMessageId: "om_cw_req",
      originContext: index.contextId,
      binding: {
        memoryId: proposal.memoryId, expectedMemoryVersion: 2, operation: "correct",
        expectedValueSha256: current.valueSha256, pendingValue: "CW-NEW",
      },
    });
    assert.equal(memory.index(proposal.memoryId).pendingDecisionId ?? null, null);

    // Before the pointer is repaired, a different request must already see the stranded pending Decision.
    assert.throws(
      () => runtime.handle({ ...message("om_cw_early"), text: `纠正记忆 ${proposal.memoryId}：v2：CW-EARLY` }),
      /同一 Memory 已有待确认 Decision/,
    );

    const repaired = runtime.handle({ ...message("om_cw_req"), text: `纠正记忆 ${proposal.memoryId}：v2：CW-NEW` });
    assert.equal(repaired.result.decisionId, decision.decisionId);
    assert.equal(repaired.result.status, "pending");
    assert.equal(memory.index(proposal.memoryId).pendingDecisionId, decision.decisionId);
    assert.throws(
      () => runtime.handle({ ...message("om_cw_other"), text: `纠正记忆 ${proposal.memoryId}：v2：CW-OTHER` }),
      /同一 Memory 已有待确认 Decision/,
    );
    assert.equal(runtime.decisions.decisions().filter((entry) => (
      entry.decisionKind === "memory.confirm" && entry.binding.memoryId === proposal.memoryId && entry.status === "pending"
    )).length, 1);

    const settled = settleMemory(runtime, "om_cw_c", decision.decisionId);
    assert.equal(settled.trace.version, 3);
    assert.equal(memory.index(proposal.memoryId).pendingDecisionId ?? null, null);
    const afterApply = runtime.handle({ ...message("om_cw_req"), text: `纠正记忆 ${proposal.memoryId}：v2：CW-NEW` });
    assert.equal(afterApply.result.status, "consumed");
    assert.equal(memory.index(proposal.memoryId).pendingDecisionId ?? null, null);
    assert.equal(memory.index(proposal.memoryId).currentVersion, 3);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("Decision consumption is isolated by appId for route selection and memory confirmation, including same-message replay", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const ideaA = newIdea(runtime, "om_app_idea_a", "App 隔离想法甲");
    const ideaB = newIdea(runtime, "om_app_idea_b", "App 隔离想法乙");
    const route = routeDecision(runtime, "om_app_q", "继续想法：App 隔离冻结正文");
    const candidate = route.candidates.find((entry) => entry.objectId === ideaA.ideaId);

    const wrongApp = runtime.selectRoute(
      message("om_app_sel", { appId: "cli_other" }),
      { decisionId: route.decisionId, candidateId: candidate.candidateId },
    );
    assert.equal(wrongApp.status, "app_mismatch");
    assert.equal(runtime.decisions.get(route.decisionId).status, "pending");
    assert.throws(() => runtime.specialist("idea").trace("task-om_app_sel"), /缺少 Task/);
    assert.equal(runtime.specialist("idea").index(ideaA.ideaId).latestVersion, 1);

    const selected = runtime.selectRoute(
      message("om_app_sel"), { decisionId: route.decisionId, candidateId: candidate.candidateId },
    );
    assert.equal(selected.status, "routed");
    const bypass = runtime.selectRoute(
      message("om_app_sel", { appId: "cli_other" }),
      { decisionId: route.decisionId, candidateId: candidate.candidateId },
    );
    assert.equal(bypass.status, "app_mismatch");
    assert.equal(runtime.specialist("idea").index(ideaB.ideaId).latestVersion, 1);

    const memory = runtime.specialist("memory");
    const proposal = proposeMemory(runtime, "om_app_p", "owner", "APP-BASE");
    activateMemory(runtime, "om_app_a", proposal.decisionId);
    const request = runtime.handle({
      ...message("om_app_req"), text: `纠正记忆 ${proposal.memoryId}：v2：APP-NEW`,
    });
    const wrongMemoryApp = memory.begin({
      ...message("om_app_mem_c", { appId: "cli_other" }),
      decisionId: request.result.decisionId, action: "correct", worker: "OpenCode",
    });
    assert.equal(wrongMemoryApp.status, "app_mismatch");
    assert.equal(runtime.decisions.get(request.result.decisionId).status, "pending");
    assert.throws(() => memory.trace("task-om_app_mem_c"), /缺少 Task/);
    assert.equal(memory.index(proposal.memoryId).currentVersion, 2);

    const settled = settleMemory(runtime, "om_app_mem_c", request.result.decisionId);
    assert.equal(settled.trace.version, 3);
    const memoryBypass = memory.begin({
      ...message("om_app_mem_c", { appId: "cli_other" }),
      decisionId: request.result.decisionId, action: "correct", worker: "OpenCode",
    });
    assert.equal(memoryBypass.status, "app_mismatch");
    assert.equal(memory.index(proposal.memoryId).currentVersion, 3);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("unknown idea or project scopes are rejected before any fact, index or Decision is written", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const before = runtime.factCount();
    for (const [index, scope] of ["idea:idea-ffffffffffffffff", "project:project-ffffffffffffffff"].entries()) {
      assert.throws(
        () => runtime.handle({ ...message(`om_scope_unknown${index}`), text: `记忆候选 ${scope}：CANARY` }),
        /未知记忆作用域对象/,
      );
    }
    assert.equal(runtime.factCount(), before);
    assert.equal(runtime.specialist("memory").memories().length, 0);
    assert.equal(runtime.decisions.decisions().length, 0);

    const idea = newIdea(runtime, "om_scope_real", "真实作用域对象").ideaId;
    const proposal = proposeMemory(runtime, "om_scope_real_m", `idea:${idea}`, "REAL-CANARY");
    assert.equal(proposal.status, "pending");
    assert.equal(runtime.specialist("memory").index(proposal.memoryId).scope, `idea:${idea}`);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a real node subprocess creates the confirmation Task and snapshot; the parent settles it once with no duplicate delivery", () => {
  const { root, options } = fixture();
  let decisionId;
  let memoryId;
  const runtime = openNativeButlerRuntime(options);
  try {
    const proposal = proposeMemory(runtime, "om_sub_p", "owner", "SUB-BASE");
    memoryId = proposal.memoryId;
    activateMemory(runtime, "om_sub_a", proposal.decisionId);
    const request = runtime.handle({ ...message("om_sub_req"), text: `纠正记忆 ${memoryId}：v2：SUB-NEW` });
    decisionId = request.result.decisionId;
  } finally {
    runtime.close();
  }

  const runtimeUrl = new URL("../experiments/superagent-p0/native-butler-runtime.mjs", import.meta.url).href;
  const objectUrl = new URL("../experiments/superagent-p0/memory-object.mjs", import.meta.url).href;
  const script = `
    import { writeFileSync } from "node:fs";
    const { openNativeButlerRuntime } = await import(process.env.SYNO_P3_RUNTIME_URL);
    const { canonicalMemorySnapshot, memorySnapshot } = await import(process.env.SYNO_P3_OBJECT_URL);
    const runtime = openNativeButlerRuntime(JSON.parse(process.env.SYNO_P3_OPTIONS));
    try {
      const memory = runtime.specialist("memory");
      const execution = memory.begin({
        appId: "cli_test", messageId: "om_sub_c", chatId: "oc_test", ownerId: "ou_test",
        decisionId: process.env.SYNO_P3_DECISION, action: "correct", worker: "OpenCode",
      });
      if (!execution.taskId) throw new Error("subprocess did not create a Task: " + JSON.stringify(execution));
      const snapshot = memorySnapshot({
        memoryId: execution.memoryId, ownerId: execution.ownerId, scope: execution.scope,
        operation: execution.operation, decisionId: execution.decisionId,
        expectedVersion: execution.expectedVersion, version: execution.targetVersion,
        preference: execution.preference, expectedValueSha256: execution.expectedValueSha256,
        valueSha256: execution.valueSha256, sourceMessageId: execution.messageId,
        taskId: execution.taskId, attemptId: execution.attemptId, inputSha256: execution.inputSha256,
      });
      writeFileSync(execution.artifactPath, canonicalMemorySnapshot(snapshot), { flag: "wx" });
      process.stdout.write(JSON.stringify({
        taskId: execution.taskId, attemptId: execution.attemptId,
        artifactPath: execution.artifactPath, memoryId: execution.memoryId,
      }));
    } finally {
      runtime.close();
    }
  `;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    env: {
      ...process.env,
      SYNO_P3_RUNTIME_URL: runtimeUrl,
      SYNO_P3_OBJECT_URL: objectUrl,
      SYNO_P3_OPTIONS: JSON.stringify(options),
      SYNO_P3_DECISION: decisionId,
    },
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
  const created = JSON.parse(child.stdout.trim());

  const recovered = openNativeButlerRuntime(options);
  try {
    const memory = recovered.specialist("memory");
    const replay = memory.begin({ ...message("om_sub_c"), decisionId, action: "correct" });
    assert.equal(replay.taskId, created.taskId);
    assert.equal(replay.attemptId, created.attemptId);
    assert.equal(memory.trace(replay.taskId).taskState, "running");
    assert.equal(memory.trace(replay.taskId).nativeRunState, "claimed");

    const settled = memory.complete(replay);
    assert.equal(settled.version, 3);
    assert.equal(settled.deliveryState, "queued");
    assert.equal(memory.index(memoryId).currentVersion, 3);
    const deliveryKey = settled.deliveryKey;
    const factCount = recovered.factCount();
    const again = memory.complete(replay);
    assert.equal(again.version, 3);
    assert.equal(again.deliveryKey, deliveryKey);
    assert.equal(recovered.factCount(), factCount);
    assert.equal(memory.trace(created.taskId).deliveryState, "queued");
  } finally {
    recovered.close();
    rmSync(root, { recursive: true, force: true });
  }
});

function beginMemoryProposal(runtime, id, scope, sourceText, extra = {}) {
  const { worker = "OpenCode", ...rest } = extra;
  return runtime.specialist("memory").beginProposal({
    ...message(id, rest), scope, sourceText, worker,
  });
}

function memoryProposalRequest(execution) {
  return {
    messageId: execution.messageId,
    taskId: execution.taskId,
    attemptId: execution.attemptId,
    memoryId: execution.memoryId,
    ownerId: execution.ownerId,
    scope: execution.scope,
    sourceText: execution.sourceText,
    inputSha256: execution.inputSha256,
    worker: execution.worker,
    model: "opencode-go/deepseek-v4.1-flash",
    artifactPath: execution.artifactPath,
    recalled: execution.recalled,
  };
}

test("beginProposal freezes only the authorized owner and exact-object recall, excluding every canary from request and prompt", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const ideaA = newIdea(runtime, "om_mp_idea_a", "记忆授权想法甲").ideaId;
    const projectB = newProject(runtime, "om_mp_project_b", "记忆授权项目乙").projectId;
    const allowed = {
      owner: "OWNER-AUTHORIZED-VALUE",
      idea: "IDEA-A-AUTHORIZED-VALUE",
      correctionBase: "IDEA-A-CORRECTION-BASE",
    };
    const canaries = {
      pending: "CANARY-PENDING-CANDIDATE",
      correction: "CANARY-PENDING-CORRECTION",
      revoked: "CANARY-REVOKED-VALUE",
      project: "CANARY-PROJECT-B-VALUE",
      otherOwner: "CANARY-OTHER-OWNER-VALUE",
    };

    activateMemory(runtime, "om_mp_owner_a", proposeMemory(runtime, "om_mp_owner_p", "owner", allowed.owner).decisionId);
    activateMemory(runtime, "om_mp_idea_a1", proposeMemory(runtime, "om_mp_idea_p", `idea:${ideaA}`, allowed.idea).decisionId);
    proposeMemory(runtime, "om_mp_pending_p", `idea:${ideaA}`, canaries.pending);
    const correctionBase = proposeMemory(runtime, "om_mp_corrbase_p", `idea:${ideaA}`, allowed.correctionBase);
    activateMemory(runtime, "om_mp_corrbase_a", correctionBase.decisionId);
    runtime.handle({ ...message("om_mp_correction_req"), text: `纠正记忆 ${correctionBase.memoryId}：v2：${canaries.correction}` });
    const revoked = proposeMemory(runtime, "om_mp_revoked_p", `idea:${ideaA}`, canaries.revoked);
    activateMemory(runtime, "om_mp_revoked_a", revoked.decisionId);
    const forget = runtime.handle({ ...message("om_mp_forget_req"), text: `遗忘记忆 ${revoked.memoryId}：v2` });
    settleMemory(runtime, "om_mp_forget_c", forget.result.decisionId);
    assert.equal(memory.index(revoked.memoryId).status, "revoked");
    activateMemory(runtime, "om_mp_project_a", proposeMemory(runtime, "om_mp_project_p", `project:${projectB}`, canaries.project).decisionId);
    const other = proposeMemory(runtime, "om_mp_other_p", "owner", canaries.otherOwner, { ownerId: "ou_other" });
    settleMemory(runtime, "om_mp_other_a", other.decisionId, { ownerId: "ou_other" });

    const execution = beginMemoryProposal(
      runtime, "om_mp_freeze", `idea:${ideaA}`,
      "SOURCE-ONLY-AUTHORIZED：我喜欢先写失败测试，再实现最小修复。",
      { worker: "Pi" },
    );
    const values = execution.recalled.map((entry) => entry.preference).sort();
    assert.deepEqual(values, [allowed.correctionBase, allowed.idea, allowed.owner].sort());
    for (const value of Object.values(canaries)) assert.ok(!values.includes(value), `冻结召回泄露 ${value}`);
    for (const entry of execution.recalled) {
      assert.equal(entry.valueSha256, sha256(entry.preference));
      assert.ok(entry.scope === "owner" || entry.scope === `idea:${ideaA}`);
    }

    const request = memoryProposalRequest(execution);
    assertMemoryRequest(request, "Pi");
    assert.throws(() => assertMemoryRequest({ ...request, model: "opencode-go/other" }, "Pi"), /模型未获批准/);
    assert.throws(() => assertMemoryRequest({ ...request, worker: "OpenCode" }, "Pi"), /Worker 不匹配/);
    assert.throws(() => assertMemoryRequest({ ...request, recalled: [{ ...request.recalled[0], extra: true }] }, "Pi"), /未批准字段/);
    const prompt = buildMemoryPrompt({ sourceText: execution.sourceText, recalled: execution.recalled, scope: execution.scope });
    for (const value of [allowed.owner, allowed.idea, allowed.correctionBase]) assert.ok(prompt.includes(value), `prompt 缺少授权值 ${value}`);
    for (const value of Object.values(canaries)) assert.ok(!prompt.includes(value), `prompt 泄露 ${value}`);
    assert.ok(prompt.includes("<untrusted-source>") && prompt.includes("<untrusted-memory>"), "缺少不可信素材边界");
    assert.ok(prompt.includes("没有工具、没有网络、没有文件读写"), "缺少工具边界");
    assert.equal(prompt.includes("OWNER-AUTHORIZED-VALUE"), true);

    assert.equal(memory.index(execution.memoryId), null, "Result Lane 前不得创建 memory index");
    const expectedDecision = decisionIdForMessage({ appId: "cli_test", messageId: "om_mp_freeze" });
    assert.equal(runtime.decisions.get(expectedDecision), null, "Result Lane 前不得创建 Decision");
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a proposal settles only after the Result Lane and stays pending v1 until a later Owner confirms it", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const execution = beginMemoryProposal(
      runtime, "om_prop_lane", "owner", "PREFER-SMALL-DIFF：偏好最小可行改动。",
    );
    const decisionId = decisionIdForMessage({ appId: "cli_test", messageId: "om_prop_lane" });
    assert.equal(memory.index(execution.memoryId), null);
    assert.equal(runtime.decisions.get(decisionId), null);

    const trace = memory.completeProposal(execution, { preference: "偏好最小可行改动" });
    assert.equal(trace.taskState, "completed");
    assert.equal(trace.nativeRunState, "done");
    assert.equal(trace.pending, true);
    assert.equal(trace.decisionId, decisionId);
    assert.ok(trace.fileVersion && trace.deliveryKey);
    const index = memory.index(execution.memoryId);
    assert.equal(index.status, "pending");
    assert.equal(index.currentVersion, 1);
    assert.equal(index.versions[0].status, "pending");
    assert.equal(index.versions[0].operation, "propose");
    assert.equal(index.versions[0].valueSha256, sha256("偏好最小可行改动"));
    assert.equal(index.versions[0].taskId, execution.taskId);
    const persisted = readFileSync(trace.artifactPath, "utf8");
    const candidate = JSON.parse(persisted);
    assert.equal(candidate.schema, MEMORY_PROPOSAL_SCHEMA);
    assert.equal(persisted, canonicalMemoryProposal(candidate));
    assert.deepEqual(candidate.recalled, execution.recalled);
    assert.equal(candidate.attemptId, execution.attemptId);
    assert.equal(candidate.inputSha256, execution.inputSha256);
    const decision = runtime.decisions.get(decisionId);
    assert.equal(decision.decisionKind, "memory.confirm");
    assert.equal(decision.status, "pending");
    assert.equal(decision.binding.operation, "activate");
    assert.equal(decision.binding.expectedMemoryVersion, 1);
    assert.equal(decision.binding.expectedValueSha256, sha256("偏好最小可行改动"));
    assert.equal(decision.binding.pendingValue, "偏好最小可行改动");
    assert.deepEqual(memory.recall({ ownerId: "ou_test", contextId: "owner" }), []);

    // The same proposing message cannot confirm itself; a later Owner message activates v2.
    assert.throws(
      () => memory.begin({ ...message("om_prop_lane"), decisionId, action: "activate" }),
      /同一条提出消息不能确认自己/,
    );
    const settled = settleMemory(runtime, "om_prop_lane_c", decisionId);
    assert.equal(settled.trace.version, 2);
    assert.equal(memory.index(execution.memoryId).status, "active");
    assert.deepEqual(memory.recall({ ownerId: "ou_test", contextId: "owner" }), [{
      memoryId: execution.memoryId, version: 2, scope: "owner", preference: "偏好最小可行改动",
    }]);
    const replayAfterActivation = memory.completeProposal(execution, { preference: "偏好最小可行改动" });
    assert.equal(replayAfterActivation.decisionId, decisionId);
    assert.equal(replayAfterActivation.version, 2);
    assert.equal(memory.index(execution.memoryId).currentVersion, 2);
    assert.equal(memory.index(execution.memoryId).pendingDecisionId ?? null, null);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("strict preference JSON, length, extra fields, forged scope, recall, IDs and hashes are rejected before any pending write", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    assert.throws(() => parseMemoryModelResponse('{"preference":"ok","scope":"owner"}'), /未批准字段/);
    assert.throws(() => parseMemoryModelResponse('{"preference":""}'), /不能为空/);
    assert.throws(() => parseMemoryModelResponse('{"preference":"   "}'), /不能为空/);
    assert.throws(() => parseMemoryModelResponse("not json"), /不是合法 JSON/);
    assert.throws(() => parseMemoryModelResponse('{"preference":"x","memoryId":"memory-0000000000000000"}'), /未批准字段/);
    assert.deepEqual(parseMemoryModelResponse('{"preference":"  需要保留  "}'), { preference: "需要保留" });
    assert.deepEqual(parseMemoryWorkerResult('{"preference":"raw"}'), { preference: "raw" });
    assert.equal(memoryResponseSchema().additionalProperties, false);
    assert.equal(memoryResponseSchema().properties.preference.maxLength, PREFERENCE_LIMIT);

    const execution = beginMemoryProposal(runtime, "om_prop_forge", "owner", "FORGE-SCOPE-SOURCE");
    const decisionId = decisionIdForMessage({ appId: "cli_test", messageId: "om_prop_forge" });
    assert.throws(() => memory.completeProposal(execution, { preference: "" }), /不能为空/);
    assert.throws(() => memory.completeProposal(execution, { preference: "x", scope: "owner" }), /未批准字段/);
    assert.throws(() => memory.completeProposal(execution, { preference: "a".repeat(PREFERENCE_LIMIT + 1) }), /超过 500 字符/);
    assert.throws(() => memory.completeProposal({ ...execution, scope: "idea:idea-ffffffffffffffff" }, { preference: "x" }), /作用域不一致/);
    assert.throws(
      () => memory.completeProposal({
        ...execution,
        recalled: [{
          memoryId: "memory-0000000000000000", version: 1, scope: execution.scope,
          preference: "CANARY-FORGED-RECALL", valueSha256: sha256("CANARY-FORGED-RECALL"),
        }],
      }, { preference: "x" }),
      /召回与冻结输入不一致/,
    );
    assert.throws(
      () => memory.completeProposal({ ...execution, memoryId: "memory-0000000000000000" }, { preference: "x" }),
      /记忆对象不一致/,
    );
    assert.throws(
      () => memory.completeProposal({ ...execution, inputSha256: "0".repeat(64) }, { preference: "x" }),
      /输入哈希不一致/,
    );
    assert.equal(memory.index(execution.memoryId), null);
    assert.equal(runtime.decisions.get(decisionId), null);
    assert.equal(memory.trace(execution.taskId).deliveryState, null);

    const trace = memory.completeProposal(execution, { preference: "宿主保留作用域" });
    assert.equal(trace.pending, true);
    assert.equal(memory.index(execution.memoryId).scope, "owner");
    assert.equal(memory.index(execution.memoryId).versions[0].preference, "宿主保留作用域");
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("proposal replay and a real subprocess that only writes the candidate never duplicate Task, Decision or delivery", () => {
  const { root, options } = fixture();
  let execution;
  const runtime = openNativeButlerRuntime(options);
  try {
    execution = beginMemoryProposal(runtime, "om_prop_sub", "owner", "SUB-PROPOSAL-SOURCE");
    assert.equal(runtime.specialist("memory").index(execution.memoryId), null);
  } finally {
    runtime.close();
  }

  const runtimeUrl = new URL("../experiments/superagent-p0/native-butler-runtime.mjs", import.meta.url).href;
  const contractUrl = new URL("../experiments/superagent-p0/memory-worker-contract.mjs", import.meta.url).href;
  const objectUrl = new URL("../experiments/superagent-p0/memory-object.mjs", import.meta.url).href;
  const preference = "子进程只写候选文件";
  const script = `
    import { writeFileSync } from "node:fs";
    const { openNativeButlerRuntime } = await import(process.env.SYNO_P3_RUNTIME_URL);
    const { canonicalMemoryProposal, memoryProposalCandidate } = await import(process.env.SYNO_P3_CONTRACT_URL);
    const { memoryValueSha256 } = await import(process.env.SYNO_P3_OBJECT_URL);
    const runtime = openNativeButlerRuntime(JSON.parse(process.env.SYNO_P3_OPTIONS));
    try {
      const memory = runtime.specialist("memory");
      const execution = memory.beginProposal({
        appId: "cli_test", messageId: "om_prop_sub", chatId: "oc_test", ownerId: "ou_test",
        worker: "OpenCode", scope: "owner", sourceText: "SUB-PROPOSAL-SOURCE",
      });
      const preference = process.env.SYNO_P3_PREFERENCE;
      writeFileSync(execution.artifactPath, canonicalMemoryProposal(memoryProposalCandidate({
        memoryId: execution.memoryId, ownerId: execution.ownerId, scope: execution.scope,
        preference, valueSha256: memoryValueSha256(preference), sourceText: execution.sourceText,
        recalled: execution.recalled, messageId: execution.messageId, taskId: execution.taskId,
        attemptId: execution.attemptId, inputSha256: execution.inputSha256,
      })), { flag: "wx" });
      process.stdout.write(JSON.stringify({
        taskId: execution.taskId, attemptId: execution.attemptId, artifactPath: execution.artifactPath,
      }));
    } finally {
      runtime.close();
    }
  `;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    env: {
      ...process.env,
      SYNO_P3_RUNTIME_URL: runtimeUrl,
      SYNO_P3_CONTRACT_URL: contractUrl,
      SYNO_P3_OBJECT_URL: objectUrl,
      SYNO_P3_OPTIONS: JSON.stringify(options),
      SYNO_P3_PREFERENCE: preference,
    },
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
  const created = JSON.parse(child.stdout.trim());
  assert.equal(created.taskId, execution.taskId);
  assert.equal(created.attemptId, execution.attemptId);

  const recovered = openNativeButlerRuntime(options);
  try {
    const memory = recovered.specialist("memory");
    const replay = memory.beginProposal({
      ...message("om_prop_sub"), scope: "owner", sourceText: "SUB-PROPOSAL-SOURCE", worker: "OpenCode",
    });
    assert.equal(replay.taskId, execution.taskId);
    assert.equal(replay.attemptId, execution.attemptId);
    assert.equal(memory.trace(replay.taskId).taskState, "running");
    const trace = memory.completeProposal(replay, { preference });
    assert.equal(trace.taskState, "completed");
    assert.equal(trace.pending, true);
    const decisionId = trace.decisionId;
    const deliveryKey = trace.deliveryKey;
    const factCount = recovered.factCount();
    const again = memory.completeProposal(replay, { preference });
    assert.equal(again.decisionId, decisionId);
    assert.equal(again.deliveryKey, deliveryKey);
    assert.equal(recovered.factCount(), factCount);
    assert.equal(memory.index(replay.memoryId).currentVersion, 1);
    assert.equal(recovered.decisions.decisions().filter((entry) => (
      entry.decisionKind === "memory.confirm" && entry.binding.memoryId === replay.memoryId
    )).length, 1);
  } finally {
    recovered.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("cancel, stale Attempt, Worker done and a failed Result Lane never produce pending index, activate Decision or delivery", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const cancelled = beginMemoryProposal(runtime, "om_prop_cancel", "owner", "CANCEL-SOURCE");
    memory.cancel(cancelled.taskId);
    assert.throws(() => memory.completeProposal(cancelled, { preference: "迟到候选" }), /取消已请求/);
    assert.equal(memory.trace(cancelled.taskId).taskState, "cancel_requested");
    assert.equal(memory.trace(cancelled.taskId).deliveryState, null);
    assert.equal(memory.index(cancelled.memoryId), null);
    assert.equal(runtime.decisions.get(decisionIdForMessage({ appId: "cli_test", messageId: "om_prop_cancel" })), null);

    const stale = beginMemoryProposal(runtime, "om_prop_stale", "owner", "STALE-SOURCE");
    assert.throws(
      () => memory.completeProposal({ ...stale, attemptId: cancelled.attemptId }, { preference: "旧 Attempt" }),
      /完成时必须仍是当前 Attempt/,
    );
    assert.equal(memory.index(stale.memoryId), null);

    const workerDone = beginMemoryProposal(runtime, "om_prop_done", "owner", "WORKER-DONE-SOURCE");
    const db = new DatabaseSync(options.databasePath);
    try {
      db.exec("PRAGMA busy_timeout=5000;");
      openBusinessView(db);
      reportWorkerDone(db, { taskId: workerDone.taskId, attemptId: workerDone.attemptId, now: Date.now() });
    } finally {
      db.close();
    }
    const doneTrace = memory.trace(workerDone.taskId);
    assert.equal(doneTrace.taskState, "running");
    assert.equal(doneTrace.attemptState, "done");
    assert.equal(doneTrace.deliveryState, null);
    assert.equal(memory.index(workerDone.memoryId), null);
    assert.equal(runtime.decisions.get(decisionIdForMessage({ appId: "cli_test", messageId: "om_prop_done" })), null);
    assert.equal(memory.completeProposal(workerDone, { preference: "Worker done 后宿主结算" }).pending, true);

    const failed = beginMemoryProposal(runtime, "om_prop_failed", "owner", "RESULT-LANE-FAIL-SOURCE");
    mkdirSync(path.dirname(failed.artifactPath), { recursive: true });
    writeFileSync(failed.artifactPath, "not-a-memory-candidate", { flag: "wx" });
    assert.throws(() => memory.completeProposal(failed, { preference: "失败候选" }), /不一致/);
    const failedTrace = memory.trace(failed.taskId);
    assert.equal(failedTrace.taskState, "running");
    assert.equal(failedTrace.deliveryState, null);
    assert.equal(memory.index(failed.memoryId), null);
    assert.equal(runtime.decisions.get(decisionIdForMessage({ appId: "cli_test", messageId: "om_prop_failed" })), null);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("different proposals settle independently, while a same-message replay stays inert and adds no second delivery", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const first = beginMemoryProposal(runtime, "om_prop_ind_1", "owner", "INDEPENDENT-ONE");
    const second = beginMemoryProposal(runtime, "om_prop_ind_2", "owner", "INDEPENDENT-TWO");
    assert.notEqual(first.taskId, second.taskId);
    assert.notEqual(first.memoryId, second.memoryId);
    const firstTrace = memory.completeProposal(first, { preference: "独立偏好一" });
    const secondTrace = memory.completeProposal(second, { preference: "独立偏好二" });
    assert.notEqual(firstTrace.decisionId, secondTrace.decisionId);
    assert.notEqual(firstTrace.deliveryKey, secondTrace.deliveryKey);
    assert.equal(memory.index(first.memoryId).status, "pending");
    assert.equal(memory.index(second.memoryId).status, "pending");
    assert.deepEqual(memory.recall({ ownerId: "ou_test", contextId: "owner" }), []);
    assert.equal(memory.queued().length, 0);

    const facts = runtime.factCount();
    const replay = memory.beginProposal({
      ...message("om_prop_ind_1"), scope: "owner", sourceText: "INDEPENDENT-ONE", worker: "OpenCode",
    });
    assert.equal(replay.taskId, first.taskId);
    assert.equal(replay.attemptId, first.attemptId);
    const again = memory.completeProposal(replay, { preference: "独立偏好一" });
    assert.equal(again.decisionId, firstTrace.decisionId);
    assert.equal(again.deliveryKey, firstTrace.deliveryKey);
    assert.equal(runtime.factCount(), facts);
    assert.equal(memory.index(first.memoryId).currentVersion, 1);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a completed confirmation reconciles applyTransition exactly once before any delivery", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const proposal = proposeMemory(runtime, "om_recon_p", "owner", "RECON-BASE");
    activateMemory(runtime, "om_recon_a", proposal.decisionId);
    const correction = runtime.handle({
      ...message("om_recon_req"), text: `纠正记忆 ${proposal.memoryId}：v2：RECON-NEW`,
    });
    const execution = memoryExecution(runtime, "om_recon_c", correction.result.decisionId);
    const snapshot = writeMemoryCandidate(execution);

    // Simulate a crash between finalizeTask and applyTransition: the Task and delivery are completed, but the
    // memory index still points at the old active version and no memory_apply record exists.
    const db = new DatabaseSync(options.databasePath);
    try {
      db.exec("PRAGMA busy_timeout=5000;");
      openBusinessView(db);
      const contextVersion = memory.trace(execution.taskId).contextVersion;
      const persisted = readFileSync(execution.artifactPath, "utf8");
      recordVerification(db, {
        verificationId: `verification-${execution.taskId}`,
        taskId: execution.taskId,
        attemptId: execution.attemptId,
        actualPath: execution.artifactPath,
        actualHash: execution.inputSha256,
        actualRemoteVersion: "memory-version-v1",
        actualFileHash: sha256(persisted),
        qualityScore: 100,
        now: Date.now(),
      });
      finalizeTask(db, {
        commandId: `finalize-${execution.taskId}`,
        taskId: execution.taskId,
        attemptId: execution.attemptId,
        contextVersion,
        verificationId: `verification-${execution.taskId}`,
        now: Date.now(),
      });
    } finally {
      db.close();
    }
    const crashed = memory.trace(execution.taskId);
    assert.equal(crashed.taskState, "completed");
    assert.equal(crashed.deliveryState, "queued");
    assert.equal(crashed.appliedDecisionId, null);
    assert.equal(crashed.appliedVersion, null);
    assert.equal(memory.index(proposal.memoryId).currentVersion, 2);

    const reconciled = memory.complete(execution);
    assert.equal(reconciled.version, 3);
    assert.equal(reconciled.memoryStatus, "active");
    assert.equal(reconciled.appliedDecisionId, execution.decisionId);
    assert.equal(reconciled.appliedVersion, 3);
    assert.equal(reconciled.appliedStatus, "active");
    assert.equal(memory.index(proposal.memoryId).currentVersion, 3);
    assert.equal(memory.index(proposal.memoryId).versions.find((version) => version.version === 2).status, "superseded");
    assert.equal(memory.version(proposal.memoryId).valueSha256, sha256("RECON-NEW"));
    assert.equal(snapshot.version, 3);

    const settledFacts = runtime.factCount();
    const again = memory.complete(execution);
    assert.equal(again.appliedVersion, 3);
    assert.equal(runtime.factCount(), settledFacts, "completed 再 complete 不得重复业务事实");
    assert.equal(memory.trace(execution.taskId).deliveryState, "queued");
    assert.equal(memory.trace(execution.taskId).providerMessageId, null);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("recalled memories corrected or forgotten mid-flight cannot settle, while an unchanged current value still passes", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const memory = runtime.specialist("memory");
    const base = proposeMemory(runtime, "om_mid_base_p", "owner", "MID-BASE");
    activateMemory(runtime, "om_mid_base_a", base.decisionId);

    const unchanged = beginMemoryProposal(runtime, "om_mid_ok_p", "owner", "MID-OK-SOURCE");
    assert.deepEqual(unchanged.recalled.map((entry) => [entry.memoryId, entry.version]), [[base.memoryId, 2]]);
    const settled = memory.completeProposal(unchanged, { preference: "MID-OK-PREFERENCE" });
    assert.equal(settled.pending, true);
    assert.equal(memory.index(unchanged.memoryId).status, "pending");

    const corrected = beginMemoryProposal(runtime, "om_mid_correct_p", "owner", "MID-CORRECT-SOURCE");
    assert.deepEqual(corrected.recalled.map((entry) => [entry.memoryId, entry.version]), [[base.memoryId, 2]]);
    const correction = runtime.handle({
      ...message("om_mid_correct_req"), text: `纠正记忆 ${base.memoryId}：v2：MID-CORRECTED`,
    });
    settleMemory(runtime, "om_mid_correct_c", correction.result.decisionId);
    assert.equal(memory.index(base.memoryId).currentVersion, 3);
    assert.throws(
      () => memory.completeProposal(corrected, { preference: "MID-CORRECT-CANDIDATE" }),
      /冻结召回已不是当前版本/,
    );
    const correctedTrace = memory.trace(corrected.taskId);
    assert.equal(correctedTrace.taskState, "running", "mid-flight correction 不得把 Task 结算为成功");
    assert.equal(correctedTrace.deliveryState, null);
    assert.equal(existsSync(corrected.artifactPath), false, "拒绝后不得写候选产物");
    assert.equal(memory.index(corrected.memoryId), null);
    assert.equal(runtime.decisions.get(decisionIdForMessage({ appId: "cli_test", messageId: "om_mid_correct_p" })), null);

    const forgotten = beginMemoryProposal(runtime, "om_mid_forget_p", "owner", "MID-FORGET-SOURCE");
    assert.deepEqual(forgotten.recalled.map((entry) => [entry.memoryId, entry.version]), [[base.memoryId, 3]]);
    const forget = runtime.handle({
      ...message("om_mid_forget_req"), text: `遗忘记忆 ${base.memoryId}：v3`,
    });
    settleMemory(runtime, "om_mid_forget_c", forget.result.decisionId);
    assert.equal(memory.index(base.memoryId).status, "revoked");
    assert.throws(
      () => memory.completeProposal(forgotten, { preference: "MID-FORGET-CANDIDATE" }),
      /冻结召回记忆已不在 active 状态/,
    );
    const forgottenTrace = memory.trace(forgotten.taskId);
    assert.equal(forgottenTrace.taskState, "running", "mid-flight forget 不得把 Task 结算为成功");
    assert.equal(forgottenTrace.deliveryState, null);
    assert.equal(existsSync(forgotten.artifactPath), false);
    assert.equal(memory.index(forgotten.memoryId), null);
    assert.equal(runtime.decisions.get(decisionIdForMessage({ appId: "cli_test", messageId: "om_mid_forget_p" })), null);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("the Feishu client reconciles completed memory Tasks before delivery instead of bypassing business apply", () => {
  const source = readFileSync(
    new URL("../experiments/superagent-p0/real-feishu-client.mjs", import.meta.url),
    "utf8",
  );
  const confirmation = source.slice(
    source.indexOf("const finishMemoryConfirmation"),
    source.indexOf("const memoryConfirmFromFeishu"),
  );
  assert.ok(confirmation, "缺少记忆确认处理函数");
  const confirmationCompleted = confirmation.slice(confirmation.indexOf('if (trace.taskState === "completed")'));
  assert.match(confirmationCompleted, /memory\.complete\(execution\)/);
  assert.match(confirmationCompleted, /assertMemoryConfirmationReconciled\(execution, trace\)/);
  assert.match(confirmationCompleted, /未发送成功通知/);
  assert.ok(
    confirmationCompleted.indexOf("memory.complete(execution)") < confirmationCompleted.indexOf("return deliver()"),
    "确认 completed 分支必须先对账再投递",
  );

  const proposal = source.slice(
    source.indexOf("const finishMemoryProposal"),
    source.indexOf("const memoryProposalFromFeishu"),
  );
  assert.ok(proposal, "缺少记忆候选处理函数");
  const proposalCompleted = proposal.slice(proposal.indexOf('if (trace.taskState === "completed")'));
  assert.match(proposalCompleted, /memory\.completeProposal\(execution, COMPLETED_PROPOSAL_PLACEHOLDER\)/);
  assert.match(proposalCompleted, /assertMemoryProposalReconciled\(execution, trace\)/);
  assert.match(proposalCompleted, /未发送成功通知/);
  assert.ok(
    proposalCompleted.indexOf("memory.completeProposal") < proposalCompleted.indexOf("return deliver()"),
    "候选 completed 分支必须先对账再投递",
  );
});
