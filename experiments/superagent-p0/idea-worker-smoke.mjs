// Local-only Idea Worker smoke: synthetic frozen inputs -> real sandbox Worker -> existing Result Lane.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { candidateMarkdown, parseCandidateMarkdown } from "./idea-object.mjs";
import { MODEL_LABEL } from "./idea-worker-contract.mjs";
import { openNativeIdeaRuntime } from "./native-idea-runtime.mjs";

const option = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const worker = option("--worker") || "OpenCode";
assert.ok(["OpenCode", "Pi"].includes(worker), "未知真实 Worker");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = option("--out") || `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-idea-worker-smoke/${worker.toLowerCase()}-${stamp}`;
const runtimeRoot = path.join(out, "runtime");
const vaultRoot = path.join(out, "vault");
const ideaRoot = path.join(out, "ideas");
const requestsRoot = path.join(out, "requests");
const evidenceRoot = path.join(out, "evidence");
for (const directory of [runtimeRoot, vaultRoot, ideaRoot, requestsRoot, evidenceRoot]) mkdirSync(directory, { recursive: true });
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const writeJson = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600, flag: "wx" });

const runtime = openNativeIdeaRuntime({
  databasePath: path.join(runtimeRoot, "idea.db"),
  vaultRoot,
  ideaRoot,
});
const idea = runtime;
const messageId = (suffix) => `om_smoke_${worker.toLowerCase()}_${suffix}_${Date.now().toString(36)}`;
const baseMessage = (id, extra = {}) => ({
  appId: "cli_test", messageId: id, chatId: "oc_test", ownerId: "ou_test", ...extra,
});

function seed(prompt, generatedText) {
  const execution = idea.begin({
    ...baseMessage(messageId("seed"), { worker: "OpenCode" }),
    action: "new", prompt, worker: "OpenCode",
  });
  const citations = [];
  const metadata = {
    messageId: execution.messageId, taskId: execution.taskId, attemptId: execution.attemptId,
    ideaId: execution.ideaId, contextVersion: execution.contextVersion,
    inputSha256: execution.inputSha256, worker: execution.worker, model: MODEL_LABEL,
    action: "new", promptSha256: sha256(prompt), generatedTextSha256: sha256(generatedText), citations,
  };
  writeFileSync(execution.artifactPath, candidateMarkdown({
    ideaId: execution.ideaId, version: execution.contextVersion, action: "new",
    metadata, prompt, generatedText, citations,
  }), { mode: 0o600, flag: "wx" });
  const trace = idea.complete(execution);
  assert.equal(trace.taskState, "completed");
  return { execution, trace };
}

try {
  const seedA = seed("合成阿尔法基础想法：慢思考。", "合成阿尔法第一版正文：先确认对象隔离。");
  const seedB = seed("合成贝塔基础想法：快验证。", "合成贝塔第一版正文：再确认引用固定。");
  const action = worker === "OpenCode" ? "continue" : "compare";
  const prompt = worker === "OpenCode"
    ? `NEW-INPUT-真实OpenCode续接-${stamp}`
    : `NEW-INPUT-真实Pi比较-${stamp}`;
  const requestId = messageId("request");
  const execution = idea.begin({
    ...baseMessage(requestId, { worker }),
    action,
    prompt,
    ideaId: seedA.execution.ideaId,
    ...(action === "compare" ? { ideaIds: [seedA.execution.ideaId, seedB.execution.ideaId] } : {}),
    worker,
  });
  assert.notEqual(execution.state, "queued", "烟测目标不得排在同对象队尾");
  const request = {
    messageId: execution.messageId,
    taskId: execution.taskId,
    attemptId: execution.attemptId,
    ideaId: execution.ideaId,
    ...(action === "compare" ? { ideaIds: execution.ideaIds } : {}),
    action: execution.action,
    prompt: execution.prompt,
    contextVersion: execution.contextVersion,
    inputSha256: execution.inputSha256,
    worker: execution.worker,
    model: MODEL_LABEL,
    artifactPath: execution.artifactPath,
    inputs: execution.inputs,
  };
  const requestPath = path.join(requestsRoot, `${worker}.json`);
  const evidencePath = path.join(evidenceRoot, `${worker}-worker-evidence.json`);
  const resultPath = path.join(out, "result.json");
  writeJson(requestPath, request);

  const probe = path.join(import.meta.dirname, "real-worker-probe.mjs");
  const started = Date.now();
  const modelCall = spawnSync(process.execPath, [
    probe,
    "--idea-request", requestPath,
    "--evidence", evidencePath,
    "--worker", worker,
    "--receipt", "local synthetic smoke; no Feishu delivery attempted",
  ], { encoding: "utf8", timeout: 240_000, maxBuffer: 4 * 1024 * 1024 });
  const elapsedMs = Date.now() - started;
  writeFileSync(path.join(out, "probe-stdout.txt"), modelCall.stdout ?? "", { mode: 0o600 });
  writeFileSync(path.join(out, "probe-stderr.txt"), modelCall.stderr ?? "", { mode: 0o600 });
  if (modelCall.status !== 0) {
    writeJson(resultPath, {
      ok: false, worker, modelCalls: 1, feishuCalls: 0, elapsedMs,
      status: modelCall.status, signal: modelCall.signal,
      error: String(modelCall.stderr || modelCall.stdout || "").slice(-2000),
    });
    console.error(JSON.stringify({ ok: false, worker, modelCalls: 1, resultPath }, null, 2));
    process.exitCode = 1;
  } else {
    const evidence = JSON.parse(modelCall.stdout);
    const trace = idea.complete(execution);
    assert.equal(trace.taskState, "completed");
    assert.equal(trace.nativeRunState, "done");
    assert.equal(trace.deliveryState, "queued");
    const persisted = readFileSync(trace.path, "utf8");
    const hostRecomputedSha256 = sha256(persisted);
    assert.equal(hostRecomputedSha256, trace.fileVersion);
    const reread = parseCandidateMarkdown(persisted);
    assert.ok(reread.generatedText.trim(), "生成正文为空");
    assert.equal(reread.metadata.messageId, trace.taskId.replace(/^task-/, ""));
    assert.equal(reread.metadata.taskId, trace.taskId);
    assert.equal(reread.metadata.attemptId, trace.attemptId);
    assert.equal(reread.metadata.ideaId, trace.ideaId);
    assert.equal(reread.prompt, prompt);
    assert.equal(reread.metadata.inputSha256, execution.inputSha256);
    assert.equal(idea.claim(trace.deliveryKey).claimed, true);
    idea.accept(trace.deliveryKey);
    const accepted = idea.trace(trace.taskId);
    writeJson(resultPath, {
      ok: true,
      mode: "idea",
      worker,
      model: MODEL_LABEL,
      modelCalls: 1,
      feishuCalls: 0,
      elapsedMs,
      action,
      prompt,
      generatedText: reread.generatedText,
      ideaId: trace.ideaId,
      contextVersion: trace.contextVersion,
      messageId: execution.messageId,
      eventId: trace.eventId,
      nativeRunId: trace.nativeRunId,
      taskId: trace.taskId,
      attemptId: trace.attemptId,
      artifactPath: trace.path,
      fileSha256: trace.fileVersion,
      hostRecomputedSha256,
      resultLane: "passed",
      deliveryState: accepted.deliveryState,
      usage: evidence.usage ?? "not_returned",
      costUsd: evidence.costUsd ?? "not_returned",
      citations: reread.metadata.citations,
      requestPath,
      evidencePath,
    });
    console.log(JSON.stringify({
      ok: true, worker, modelCalls: 1, feishuCalls: 0, action,
      ideaId: trace.ideaId, contextVersion: trace.contextVersion,
      generatedText: reread.generatedText, fileSha256: trace.fileVersion,
      resultPath,
    }, null, 2));
  }
} finally {
  runtime.close();
}
