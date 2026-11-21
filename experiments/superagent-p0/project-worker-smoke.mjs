// Local-only Project Worker smoke: isolated ledger/vault -> real sandbox Worker -> host steps -> existing Result Lane.
// This script is implemented but deliberately not run in the wiring round; it never sends Feishu messages.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { openNativeProjectRuntime } from "./native-project-runtime.mjs";
import { MODEL_LABEL } from "./project-worker-contract.mjs";

const option = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const worker = option("--worker") || "OpenCode";
assert.ok(["OpenCode", "Pi"].includes(worker), "未知真实 Worker");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = option("--out") || `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-project-worker-smoke/${worker.toLowerCase()}-${stamp}`;
const runtimeRoot = path.join(out, "runtime");
const vaultRoot = path.join(out, "vault");
const projectRoot = path.join(out, "projects");
const requestsRoot = path.join(out, "requests");
const evidenceRoot = path.join(out, "evidence");
for (const directory of [runtimeRoot, vaultRoot, projectRoot, requestsRoot, evidenceRoot]) mkdirSync(directory, { recursive: true });
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const writeJson = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600, flag: "wx" });

const runtime = openNativeProjectRuntime({
  databasePath: path.join(runtimeRoot, "project.db"),
  vaultRoot,
  projectRoot,
});
const project = runtime;
const messageId = (suffix) => `om_project_smoke_${worker.toLowerCase()}_${suffix}_${Date.now().toString(36)}`;
const baseMessage = (id, extra = {}) => ({
  appId: "cli_test", messageId: id, chatId: "oc_test", ownerId: "ou_test", ...extra,
});

function applyBodies(execution, { outline, deliverable }) {
  project.writeStep(execution, "outline", outline);
  project.completeStep(execution, "outline");
  project.writeStep(execution, "deliverable", deliverable);
  project.completeStep(execution, "deliverable");
  project.writeManifest(execution);
  project.completeStep(execution, "manifest");
  return project.complete(execution);
}

const resultPath = path.join(out, "result.json");
let resultWritten = false;
const finish = (payload) => {
  writeJson(resultPath, payload);
  resultWritten = true;
};

let execution;
try {
  if (worker === "Pi") {
    // Deterministic synthetic v1; no model call. The real Pi Worker then produces v2 for the same object.
    const seed = project.begin({
      ...baseMessage(messageId("seed"), { worker: "OpenCode" }),
      action: "new", goal: "合成项目目标：先建立第一版", worker: "OpenCode",
    });
    assert.notEqual(seed.state, "queued", "烟测种子不得排在同对象队尾");
    const seeded = applyBodies(seed, {
      outline: "SYNTH-V1-OUTLINE\n\n第一版大纲：范围与边界。",
      deliverable: "SYNTH-V1-BODY\n\n第一版正文：合成基线。",
    });
    assert.equal(seeded.taskState, "completed");
    execution = project.begin({
      ...baseMessage(messageId("revise"), { worker: "Pi" }),
      action: "revise", projectId: seed.projectId, revision: "补充风险与验收步骤", worker: "Pi",
    });
    assert.notEqual(execution.state, "queued", "烟测修订不得排在队尾");
    assert.equal(execution.frozen.planVersion, 1);
  } else {
    execution = project.begin({
      ...baseMessage(messageId("new"), { worker: "OpenCode" }),
      action: "new", goal: "真实 OpenCode 生成一份版本化项目简报", worker: "OpenCode",
    });
    assert.notEqual(execution.state, "queued", "烟测目标不得排在队尾");
    assert.equal(execution.frozen ?? null, null);
  }

  const previousFiles = execution.frozen
    ? execution.frozen.artifacts.map((artifact) => ({
      stepId: artifact.stepId,
      path: path.join(projectRoot, artifact.path),
      sha256: sha256(readFileSync(path.join(projectRoot, artifact.path))),
    }))
    : [];
  for (const [index, artifact] of previousFiles.entries()) {
    assert.equal(artifact.sha256, execution.frozen.artifacts[index].sha256, `烟测前旧版 ${artifact.stepId} 哈希不一致`);
  }

  const request = {
    messageId: execution.messageId,
    taskId: execution.taskId,
    attemptId: execution.attemptId,
    projectId: execution.projectId,
    action: execution.action,
    goal: execution.goal,
    revision: execution.revision,
    planVersion: execution.planVersion,
    inputSha256: execution.inputSha256,
    worker: execution.worker,
    model: MODEL_LABEL,
    previous: execution.frozen ?? null,
  };
  const requestPath = path.join(requestsRoot, `${worker}.json`);
  const evidencePath = path.join(evidenceRoot, `${worker}-worker-evidence.json`);
  writeJson(requestPath, request);

  const probe = path.join(import.meta.dirname, "real-worker-probe.mjs");
  const started = Date.now();
  const modelCall = spawnSync(process.execPath, [
    probe,
    "--project-request", requestPath,
    "--project-root", projectRoot,
    "--evidence", evidencePath,
    "--worker", worker,
    "--receipt", "local synthetic project smoke; no Feishu delivery attempted",
  ], { encoding: "utf8", timeout: 240_000, maxBuffer: 4 * 1024 * 1024 });
  const elapsedMs = Date.now() - started;
  writeFileSync(path.join(out, "probe-stdout.txt"), modelCall.stdout ?? "", { mode: 0o600 });
  writeFileSync(path.join(out, "probe-stderr.txt"), modelCall.stderr ?? "", { mode: 0o600 });
  if (modelCall.status !== 0) {
    finish({
      ok: false, mode: "project", worker, model: MODEL_LABEL, modelCalls: 1, feishuCalls: 0, elapsedMs,
      status: modelCall.status, signal: modelCall.signal,
      error: String(modelCall.stderr || modelCall.stdout || "").slice(-2000),
      requestPath, evidencePath,
    });
    console.error(JSON.stringify({ ok: false, worker, modelCalls: 1, resultPath }, null, 2));
    process.exitCode = 1;
  } else {
    const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
    assert.equal(evidence.mode, "project", "真实 Worker 未返回项目证据");
    assert.equal(evidence.project?.messageId, execution.messageId, "证据消息不匹配");
    assert.equal(evidence.project?.taskId, execution.taskId, "证据 Task 不匹配");
    assert.equal(evidence.project?.attemptId, execution.attemptId, "证据 Attempt 不匹配");
    assert.equal(evidence.project?.projectId, execution.projectId, "证据项目不匹配");
    assert.equal(evidence.project?.planVersion, execution.planVersion, "证据计划版本不匹配");
    assert.equal(evidence.project?.inputSha256, execution.inputSha256, "证据输入哈希不匹配");
    assert.equal(evidence.project?.resultLane, "delegated_to_host", "探针不得冒充 Result Lane");
    assert.equal(existsSync(execution.paths.outline), false, "探针不得预先写 outline");
    assert.equal(existsSync(execution.paths.deliverable), false, "探针不得预先写 deliverable");
    assert.equal(existsSync(execution.manifestPath), false, "探针不得预先写 manifest");

    const trace = applyBodies(execution, evidence.project);
    assert.equal(trace.taskState, "completed");
    assert.equal(trace.nativeRunState, "done");
    assert.equal(trace.taskId, execution.taskId, "结算 Task 不匹配");
    assert.equal(trace.attemptId, execution.attemptId, "结算 Attempt 不匹配");
    assert.equal(trace.nativeRunId, execution.runId, "结算原生 run 不匹配");
    assert.equal(trace.planVersion, execution.planVersion, "结算计划版本不匹配");

    const outlineText = readFileSync(execution.paths.outline, "utf8");
    const deliverableText = readFileSync(execution.paths.deliverable, "utf8");
    const manifestText = readFileSync(execution.manifestPath, "utf8");
    assert.equal(outlineText, evidence.project.outline, "重读 outline 与证据不一致");
    assert.equal(deliverableText, evidence.project.deliverable, "重读 deliverable 与证据不一致");
    assert.equal(sha256(manifestText), trace.fileVersion, "重读 manifest 哈希不一致");
    const manifest = JSON.parse(manifestText);
    assert.equal(manifest.projectId, execution.projectId, "manifest 项目不匹配");
    assert.equal(manifest.planVersion, execution.planVersion, "manifest 计划版本不匹配");
    assert.equal(manifest.action, execution.action, "manifest 动作不匹配");
    assert.equal(manifest.goal, execution.goal, "manifest 目标不匹配");
    assert.equal(manifest.revision, execution.revision ?? null, "manifest 修订不匹配");
    assert.equal(manifest.inputSha256, execution.inputSha256, "manifest 输入哈希不匹配");
    assert.deepEqual(manifest.previous, execution.frozen
      ? {
        planVersion: execution.frozen.planVersion,
        manifestPath: execution.frozen.manifestPath,
        manifestSha256: execution.frozen.manifestSha256,
      }
      : null, "manifest previous 不匹配");
    const byId = new Map(trace.steps.map((step) => [step.stepId, step]));
    for (const expected of ["outline", "deliverable", "manifest"]) {
      const step = manifest.steps.find((entry) => entry.id === expected);
      assert.ok(step, `manifest 缺少步骤：${expected}`);
      assert.equal(step.path, byId.get(expected).path, `步骤 ${expected} 路径不一致`);
      if (expected === "manifest") {
        assert.equal(step.sha256, null, "manifest 步骤不得自哈希");
        assert.equal(step.bytes, null, "manifest 步骤不得自记字节数");
      } else {
        assert.equal(step.sha256, byId.get(expected).sha256, `步骤 ${expected} 哈希不一致`);
        assert.equal(step.sha256, sha256(expected === "outline" ? outlineText : deliverableText), `步骤 ${expected} 文件哈希不一致`);
      }
      assert.equal(step.taskId, execution.taskId, `步骤 ${expected} Task 不一致`);
      assert.equal(step.attemptId, execution.attemptId, `步骤 ${expected} Attempt 不一致`);
    }
    assert.deepEqual(manifest.steps.find((step) => step.id === "manifest").dependsOn, ["outline", "deliverable"]);

    for (const artifact of previousFiles) {
      assert.equal(sha256(readFileSync(artifact.path)), artifact.sha256, `旧版 ${artifact.stepId} 被改写`);
    }

    assert.equal(project.claim(trace.deliveryKey).claimed, true);
    project.accept(trace.deliveryKey);
    const accepted = project.trace(trace.taskId);
    assert.equal(accepted.deliveryState, "accepted");
    assert.equal(accepted.providerMessageId, null);
    assert.equal(accepted.maySend, false);

    finish({
      ok: true,
      mode: "project",
      worker,
      model: MODEL_LABEL,
      modelCalls: 1,
      feishuCalls: 0,
      elapsedMs,
      action: execution.action,
      goal: execution.goal,
      revision: execution.revision ?? null,
      planVersion: execution.planVersion,
      projectId: execution.projectId,
      messageId: execution.messageId,
      eventId: trace.eventId,
      nativeRunId: trace.nativeRunId,
      nativeRunAttempt: trace.nativeRunAttempt,
      taskId: trace.taskId,
      attemptId: trace.attemptId,
      outline: outlineText,
      deliverable: deliverableText,
      manifest,
      manifestPath: execution.manifestPath,
      manifestSha256: trace.fileVersion,
      steps: trace.steps,
      previous: execution.frozen ?? null,
      resultLane: "passed",
      deliveryState: accepted.deliveryState,
      providerMessageId: accepted.providerMessageId,
      maySend: accepted.maySend,
      usage: evidence.usage ?? "not_returned",
      costUsd: evidence.costUsd ?? "not_returned",
      requestPath,
      evidencePath,
    });
    console.log(JSON.stringify({
      ok: true, worker, modelCalls: 1, feishuCalls: 0, action: execution.action,
      projectId: execution.projectId, planVersion: execution.planVersion,
      deliverable: deliverableText, manifestSha256: trace.fileVersion, resultPath,
    }, null, 2));
  }
} catch (error) {
  if (!resultWritten) {
    finish({
      ok: false, mode: "project", worker, model: MODEL_LABEL, modelCalls: 1, feishuCalls: 0,
      error: String(error.stack || error.message || error).slice(-4000),
    });
  }
  throw error;
} finally {
  runtime.close();
}
