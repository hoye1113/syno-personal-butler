// Local-only Memory Worker smoke: deterministic authorized recall -> real sandbox Worker -> host Result Lane.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { candidateMarkdown, sha256 } from "./idea-object.mjs";
import {
  MODEL_LABEL as IDEA_MODEL_LABEL,
} from "./idea-worker-contract.mjs";
import {
  MODEL_LABEL as MEMORY_MODEL_LABEL,
  assertMemoryRequest,
  buildMemoryPrompt,
  memorySourceSha256,
  parseMemoryProposalCandidate,
} from "./memory-worker-contract.mjs";
import {
  canonicalMemorySnapshot,
  memorySnapshot,
} from "./memory-object.mjs";
import { openNativeButlerRuntime } from "./native-butler-runtime.mjs";

// 消息 ID 上限由 memory-worker-contract 与原生消息边界固定为 48 字符。
// 只按可用预算截断 label 片段，保留 worker、时间戳与序号：同进程唯一且可审计。
const MESSAGE_ID_LIMIT = 48;
const MESSAGE_ID_PATTERN = /^[A-Za-z0-9_-]{1,48}$/u;

function buildMessageId(workerName, label, sequenceNumber, now) {
  const prefix = `om_smoke_${workerName.toLowerCase()}`;
  const suffix = `${now.toString(36)}_${sequenceNumber}`;
  const budget = MESSAGE_ID_LIMIT - prefix.length - suffix.length - 2;
  assert.ok(budget >= 8, `烟测消息 ID 前缀过长，label 无可用空间：${prefix}`);
  const id = `${prefix}_${label.slice(0, budget).replace(/_+$/u, "")}_${suffix}`;
  assert.match(id, MESSAGE_ID_PATTERN, `烟测消息 ID 非法或超过 ${MESSAGE_ID_LIMIT} 字符：${id}`);
  return id;
}

// 确定性自检：不建目录、不调用模型，只从本文件提取全部 label，核对 Pi／OpenCode 的最终 ID。
if (process.argv.includes("--check-message-ids")) {
  const source = readFileSync(new URL(import.meta.url), "utf8");
  const literalLabels = [...source.matchAll(/nextId\("([A-Za-z0-9_]+)"\)/gu)].map((match) => match[1]);
  const prefixes = [...new Set(
    [...source.matchAll(/nextId\(`([A-Za-z0-9_]+)_\$\{label\}`\)/gu)].map((match) => match[1]),
  )];
  const labels = [...new Set([...source.matchAll(/label: "([A-Za-z0-9_]+)"/gu)].map((match) => match[1]))];
  assert.ok(literalLabels.length > 0 && prefixes.length > 0 && labels.length > 0, "未能从烟测源码提取 label");
  const candidates = [...new Set([
    ...literalLabels,
    ...prefixes.flatMap((prefix) => labels.map((label) => `${prefix}_${label}`)),
  ])];
  const rows = (workerName) => [1, 99].flatMap((sequenceNumber) => candidates.map((label) => {
    const id = buildMessageId(workerName, label, sequenceNumber, Date.now());
    return { worker: workerName, label, sequenceNumber, id, length: id.length };
  }));
  const longestByWorker = ["Pi", "OpenCode"].map((workerName) => (
    rows(workerName).reduce((worst, row) => (row.length > worst.length ? row : worst))
  ));
  writeFileSync(1, `${JSON.stringify({
    ok: true, limit: MESSAGE_ID_LIMIT, candidateCount: candidates.length, sequences: [1, 99], longestByWorker,
  }, null, 2)}\n`);
  process.exit(0);
}

const option = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const worker = option("--worker") || "Pi";
assert.ok(["OpenCode", "Pi"].includes(worker), "未知真实 Worker");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = option("--out")
  || `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-memory-worker-smoke/${worker.toLowerCase()}-${stamp}`;
const runtimeRoot = path.join(out, "runtime");
const vaultRoot = path.join(out, "vault");
const ideaRoot = path.join(out, "ideas");
const projectRoot = path.join(out, "projects");
const memoryRoot = path.join(out, "memory");
const requestsRoot = path.join(out, "requests");
const evidenceRoot = path.join(out, "evidence");
for (const directory of [runtimeRoot, vaultRoot, ideaRoot, projectRoot, memoryRoot, requestsRoot, evidenceRoot]) {
  mkdirSync(directory, { recursive: true });
}
const writeJson = (file, value, flag = "wx") => writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600, flag });
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const resultPath = path.join(out, "result.json");

const OWNER = "ou_test";
const OTHER_OWNER = "ou_other";
const sourceUrl = "https://code.claude.com/docs/en/best-practices";
const sourcePath = path.join(out, "source.txt");
writeFileSync(sourcePath, "P3.3 memory worker smoke fixture\n");

const runtime = openNativeButlerRuntime({
  databasePath: path.join(runtimeRoot, "p3-decision-memory.db"),
  vaultRoot,
  sourcePath,
  sourceUrl,
  indexFile: path.join(runtimeRoot, "knowledge-index.json"),
  resultRoot: path.join(runtimeRoot, "knowledge-results"),
  ideaRoot,
  projectRoot,
  memoryRoot,
});
const memory = runtime.specialist("memory");
const idea = runtime.specialist("idea");
const project = runtime.specialist("project");

let sequence = 0;
const nextId = (label) => buildMessageId(worker, label, sequence += 1, Date.now());
const baseMessage = (id, extra = {}) => ({
  appId: "cli_test", messageId: id, chatId: "oc_test", ownerId: OWNER, ...extra,
});

function writeMemorySnapshot(execution) {
  mkdirSync(path.dirname(execution.artifactPath), { recursive: true });
  const snapshot = memorySnapshot({
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
  });
  writeFileSync(execution.artifactPath, canonicalMemorySnapshot(snapshot), { mode: 0o600, flag: "wx" });
}

function propose({ scope, value, ownerId = OWNER, label }) {
  return memory.propose({
    ...baseMessage(nextId(`proposal_${label}`), { ownerId }),
    scope,
    preference: value,
    sourceText: value,
  });
}

function activate({ scope, value, ownerId = OWNER, label }) {
  const proposal = propose({ scope, value, ownerId, label });
  const execution = memory.begin({
    ...baseMessage(nextId(`activate_${label}`), { ownerId }),
    decisionId: proposal.decisionId,
    action: "activate",
    worker: "OpenCode",
  });
  writeMemorySnapshot(execution);
  const trace = memory.complete(execution);
  assert.equal(trace.taskState, "completed", `seed activate failed: ${label}`);
  assert.equal(memory.index(proposal.memoryId).status, "active", `seed not active: ${label}`);
  return { proposal, trace };
}

function newIdea(prompt) {
  const execution = idea.begin({
    ...baseMessage(nextId("idea")),
    action: "new",
    prompt,
    worker: "OpenCode",
  });
  const generatedText = `${prompt}（合成正文）`;
  const citations = [];
  const metadata = {
    messageId: execution.messageId,
    taskId: execution.taskId,
    attemptId: execution.attemptId,
    ideaId: execution.ideaId,
    contextVersion: execution.contextVersion,
    inputSha256: execution.inputSha256,
    worker: execution.worker,
    model: IDEA_MODEL_LABEL,
    action: "new",
    promptSha256: sha256(prompt),
    generatedTextSha256: sha256(generatedText),
    citations,
  };
  writeFileSync(execution.artifactPath, candidateMarkdown({
    ideaId: execution.ideaId,
    version: execution.contextVersion,
    action: "new",
    metadata,
    prompt,
    generatedText,
    citations,
  }), { mode: 0o600, flag: "wx" });
  assert.equal(idea.complete(execution).taskState, "completed");
  return execution.ideaId;
}

function newProject(goal) {
  const execution = project.begin({
    ...baseMessage(nextId("project")),
    action: "new",
    goal,
    worker: "OpenCode",
  });
  project.writeStep(execution, "outline", `# ${goal} 大纲\n\n- 范围`);
  project.completeStep(execution, "outline");
  project.writeStep(execution, "deliverable", `# ${goal} 简报\n\n正文`);
  project.completeStep(execution, "deliverable");
  project.writeManifest(execution);
  project.completeStep(execution, "manifest");
  assert.equal(project.complete(execution).taskState, "completed");
  return execution.projectId;
}

const evidencePath = path.join(evidenceRoot, `${worker}-memory-worker-evidence.json`);
const requestPath = path.join(requestsRoot, `${worker}-memory-request.json`);
let status = { ok: false, mode: "memory", worker, model: MEMORY_MODEL_LABEL, modelCalls: 0, feishuCalls: 0 };

try {
  const ideaA = newIdea("记忆作用域想法甲：先确认授权范围。");
  const projectB = newProject("记忆作用域项目乙：对比方案。");

  const canaries = {
    pendingCandidate: "CANARY-IDEA-A-PENDING",
    correctionPending: "CANARY-IDEA-A-CORRECTION-PENDING",
    revoked: "CANARY-IDEA-A-REVOKED",
    projectB: "CANARY-PROJECT-B-ACTIVE",
    otherOwner: "CANARY-OTHER-OWNER-ACTIVE",
  };
  const allowed = {
    owner: "OWNER-ACTIVE-PREFERENCE",
    ideaActive: "IDEA-A-ACTIVE-PREFERENCE",
    correctionBase: "IDEA-A-CORRECTION-BASE",
  };

  activate({ scope: "owner", value: allowed.owner, label: "owner" });
  activate({ scope: `idea:${ideaA}`, value: allowed.ideaActive, label: "idea_active" });
  // Pending new candidate: never recalled while pending.
  propose({ scope: `idea:${ideaA}`, value: canaries.pendingCandidate, label: "idea_pending" });
  // Pending correction: the old active value survives; the new value must not be recalled.
  const correctionBase = activate({ scope: `idea:${ideaA}`, value: allowed.correctionBase, label: "idea_correction_base" });
  memory.correct({
    ...baseMessage(nextId("correction_request")),
    memoryId: correctionBase.proposal.memoryId,
    expectedVersion: 2,
    preference: canaries.correctionPending,
  });
  // Revoked memory: its old value must not be recalled.
  const revoked = activate({ scope: `idea:${ideaA}`, value: canaries.revoked, label: "idea_revoked" });
  const forgetRequest = memory.forget({
    ...baseMessage(nextId("forget_request")),
    memoryId: revoked.proposal.memoryId,
    expectedVersion: 2,
  });
  const forgetExecution = memory.begin({
    ...baseMessage(nextId("forget_confirm")),
    decisionId: forgetRequest.decisionId,
    action: "forget",
    worker: "OpenCode",
  });
  writeMemorySnapshot(forgetExecution);
  assert.equal(memory.complete(forgetExecution).taskState, "completed");
  assert.equal(memory.index(revoked.proposal.memoryId).status, "revoked");
  // Same scope but another Owner, and another object entirely.
  activate({ scope: "owner", value: canaries.otherOwner, ownerId: OTHER_OWNER, label: "other_owner" });
  activate({ scope: `project:${projectB}`, value: canaries.projectB, label: "project_b" });

  const sourceText = `真实 ${worker} 记忆候选：${stamp} 我喜欢先写失败测试，再实现最小修复。`;
  const proposalMessageId = nextId("memory_proposal");
  const execution = memory.beginProposal({
    ...baseMessage(proposalMessageId, { worker }),
    scope: `idea:${ideaA}`,
    sourceText,
    worker,
  });
  assert.notEqual(execution.status, "queued", "烟测目标不得排在同对象队尾");
  assert.equal(execution.memoryId, `memory-${sha256(`cli_test:${proposalMessageId}`).slice(0, 16)}`);
  assert.equal(memory.index(execution.memoryId), null, "Result Lane 前不得创建 memory index");
  assert.equal(runtime.decisions.get(`decision-${sha256(`cli_test:${proposalMessageId}`).slice(0, 16)}`), null, "Result Lane 前不得创建 Decision");

  const recalledValues = execution.recalled.map((entry) => entry.preference);
  for (const value of Object.values(allowed)) assert.ok(recalledValues.includes(value), `冻结召回缺少授权值：${value}`);
  for (const value of Object.values(canaries)) assert.ok(!recalledValues.includes(value), `冻结召回泄露 canary：${value}`);
  assert.equal(execution.recalled.length, 3, `冻结召回数量异常：${execution.recalled.length}`);

  const request = {
    messageId: execution.messageId,
    taskId: execution.taskId,
    attemptId: execution.attemptId,
    memoryId: execution.memoryId,
    ownerId: execution.ownerId,
    scope: execution.scope,
    sourceText: execution.sourceText,
    inputSha256: execution.inputSha256,
    worker: execution.worker,
    model: MEMORY_MODEL_LABEL,
    artifactPath: execution.artifactPath,
    recalled: execution.recalled,
  };
  assertMemoryRequest(request, worker);
  const prompt = buildMemoryPrompt({ sourceText: execution.sourceText, recalled: execution.recalled, scope: execution.scope });
  for (const value of Object.values(allowed)) assert.ok(prompt.includes(value), `prompt 缺少授权值：${value}`);
  for (const value of Object.values(canaries)) assert.ok(!prompt.includes(value), `prompt 泄露 canary：${value}`);
  assert.ok(prompt.includes("<untrusted-source>") && prompt.includes("<untrusted-memory>"), "prompt 缺少不可信素材边界");
  assert.ok(prompt.includes("没有工具、没有网络、没有文件读写"), "prompt 缺少工具边界");

  const authorization = {
    recalledValues,
    allowedPresent: Object.values(allowed).every((value) => recalledValues.includes(value) && prompt.includes(value)),
    canariesAbsent: Object.values(canaries).every((value) => !recalledValues.includes(value) && !prompt.includes(value)),
    pendingCandidateExcluded: !recalledValues.includes(canaries.pendingCandidate),
    pendingCorrectionExcluded: !recalledValues.includes(canaries.correctionPending),
    revokedExcluded: !recalledValues.includes(canaries.revoked),
    otherOwnerExcluded: !recalledValues.includes(canaries.otherOwner),
    otherObjectExcluded: !recalledValues.includes(canaries.projectB),
    recallCount: execution.recalled.length,
    indexBeforeResultLane: memory.index(execution.memoryId) === null,
    decisionBeforeResultLane: runtime.decisions.get(`decision-${sha256(`cli_test:${proposalMessageId}`).slice(0, 16)}`) === null,
  };
  writeJson(requestPath, request);

  const probe = path.join(import.meta.dirname, "real-worker-probe.mjs");
  const startedAt = Date.now();
  status.modelCalls = 1;
  const modelCall = spawnSync(process.execPath, [
    probe,
    "--memory-request", requestPath,
    "--evidence", evidencePath,
    "--worker", worker,
    "--receipt", "local synthetic memory smoke; no Feishu delivery attempted",
  ], { encoding: "utf8", timeout: 240_000, maxBuffer: 4 * 1024 * 1024 });
  const elapsedMs = Date.now() - startedAt;
  writeFileSync(path.join(out, "probe-stdout.txt"), modelCall.stdout ?? "", { mode: 0o600 });
  writeFileSync(path.join(out, "probe-stderr.txt"), modelCall.stderr ?? "", { mode: 0o600 });
  if (modelCall.status !== 0) {
    status = {
      ...status,
      ok: false,
      elapsedMs,
      exitStatus: modelCall.status,
      signal: modelCall.signal,
      error: String(modelCall.stderr || modelCall.stdout || "").slice(-2000),
      authorization,
      recalled: execution.recalled,
      requestPath,
    };
    writeJson(resultPath, status);
    console.error(JSON.stringify({ ok: false, worker, modelCalls: 1, resultPath }, null, 2));
    process.exitCode = 1;
  } else {
    const evidence = readJson(evidencePath);
    assert.equal(evidence.mode, "memory", "真实 Worker 未返回记忆证据");
    assert.equal(evidence.memory?.messageId, execution.messageId, "真实 Worker 证据消息不匹配");
    assert.equal(evidence.memory?.taskId, execution.taskId, "真实 Worker 证据 Task 不匹配");
    assert.equal(evidence.memory?.attemptId, execution.attemptId, "真实 Worker 证据 Attempt 不匹配");
    assert.equal(evidence.memory?.memoryId, execution.memoryId, "真实 Worker 证据记忆不匹配");
    assert.equal(evidence.memory?.scope, execution.scope, "真实 Worker 证据作用域不匹配");
    assert.equal(evidence.memory?.inputSha256, execution.inputSha256, "真实 Worker 证据输入哈希不匹配");
    assert.equal(evidence.memory?.resultLane, "delegated_to_host", "真实 Worker 探针不得冒充 Result Lane");

    const trace = memory.completeProposal(execution, { preference: evidence.memory.preference });
    assert.equal(trace.taskState, "completed");
    assert.equal(trace.nativeRunState, "done");
    assert.equal(trace.pending, true);
    assert.equal(trace.deliveryState, "queued");
    const index = memory.index(execution.memoryId);
    assert.equal(index.status, "pending");
    assert.equal(index.currentVersion, 1);
    assert.equal(index.versions[0].status, "pending");
    assert.equal(index.versions[0].valueSha256, sha256(evidence.memory.preference));
    const decision = runtime.decisions.get(trace.decisionId);
    assert.equal(decision?.decisionKind, "memory.confirm");
    assert.equal(decision?.status, "pending");
    assert.equal(decision?.binding.operation, "activate");
    assert.equal(decision?.binding.expectedMemoryVersion, 1);
    assert.equal(decision?.binding.pendingValue, evidence.memory.preference);

    assert.ok(!memory.recall({ ownerId: OWNER, contextId: `idea:${ideaA}` })
      .some((entry) => entry.preference === evidence.memory.preference), "确认前不得召回新候选");

    const persisted = readFileSync(trace.artifactPath, "utf8");
    const hostRecomputedSha256 = sha256(persisted);
    assert.equal(hostRecomputedSha256, trace.fileVersion, "宿主独立重读的文件版本不一致");
    const candidate = parseMemoryProposalCandidate(persisted);
    assert.equal(candidate.preference, evidence.memory.preference);
    assert.deepEqual(candidate.recalled, execution.recalled);

    assert.equal(memory.claim(trace.deliveryKey).claimed, true, "delivery 必须先 claim");
    memory.accept(trace.deliveryKey);
    const accepted = memory.trace(trace.taskId);
    assert.equal(accepted.deliveryState, "accepted");
    assert.equal(accepted.providerMessageId, null);

    status = {
      ok: true,
      mode: "memory",
      worker,
      model: MEMORY_MODEL_LABEL,
      modelCalls: 1,
      feishuCalls: 0,
      elapsedMs,
      messageId: execution.messageId,
      memoryId: execution.memoryId,
      scope: execution.scope,
      sourceText,
      sourceTextSha256: memorySourceSha256(sourceText),
      inputSha256: execution.inputSha256,
      recalled: execution.recalled,
      recalledCount: execution.recalled.length,
      decisionId: trace.decisionId,
      pendingStatus: index.status,
      version: index.currentVersion,
      taskId: trace.taskId,
      attemptId: trace.attemptId,
      eventId: trace.eventId,
      nativeRunId: trace.nativeRunId,
      nativeRunState: trace.nativeRunState,
      artifactPath: trace.artifactPath,
      fileSha256: trace.fileVersion,
      hostRecomputedSha256,
      promptSha256: sha256(buildMemoryPrompt({ sourceText, recalled: execution.recalled, scope: execution.scope })),
      preference: evidence.memory.preference,
      preferenceSha256: sha256(evidence.memory.preference),
      resultLane: "passed",
      deliveryState: accepted.deliveryState,
      providerMessageId: accepted.providerMessageId,
      usage: evidence.usage ?? "not_returned",
      costUsd: evidence.costUsd ?? "not_returned",
      authorization,
      requestPath,
      evidencePath,
    };
    writeJson(resultPath, status);
    console.log(JSON.stringify({
      ok: true, worker, modelCalls: 1, feishuCalls: 0,
      memoryId: execution.memoryId, decisionId: trace.decisionId,
      preference: evidence.memory.preference, fileSha256: trace.fileVersion,
      resultPath,
    }, null, 2));
  }
} catch (error) {
  status = {
    ...status,
    ok: false,
    error: String(error?.stack || error?.message || error).slice(-4000),
    evidencePath,
    requestPath,
  };
  try { writeJson(resultPath, status); } catch { /* evidence already exists or path is unavailable */ }
  console.error(JSON.stringify({ ok: false, worker, modelCalls: status.modelCalls, resultPath, error: status.error.slice(-500) }, null, 2));
  process.exitCode = 1;
} finally {
  runtime.close();
}
