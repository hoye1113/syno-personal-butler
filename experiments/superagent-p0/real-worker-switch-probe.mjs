// Two real Workers share one native fact log and one article Context; no Feishu or production vault.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { openNativeCaptureRuntime } from "./native-capture-runtime.mjs";

const root = mkdtempSync("/Users/hoye/Documents/workspace/syno-p0-real-test/p2-worker-switch-");
const sourcePath = "/Users/hoye/Documents/workspace/syno-p0-real-test/public-source.txt";
const workerPath = new URL("./real-worker-probe.mjs", import.meta.url).pathname;
const runtime = openNativeCaptureRuntime({
  databasePath: path.join(root, "native.db"),
  vaultRoot: path.join(root, "vault"),
  sourcePath,
  sourceUrl: "https://code.claude.com/docs/en/best-practices",
});

function runWorker(worker, execution, evidencePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      workerPath, "--worker", worker, "--capture", sourcePath,
      "--message-id", execution.messageId, "--task-id", execution.taskId,
      "--attempt-id", execution.attemptId, "--run-key", execution.messageId,
      "--vault-root", path.join(root, "vault"),
      "--evidence", evidencePath, "--receipt", "local-only; no Feishu delivery attempted",
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (status) => {
      if (status === 0) resolve();
      else reject(new Error(`${worker} 真实收录失败：status=${status} ${stderr || stdout}`.slice(0, 800)));
    });
  });
}

try {
  const traces = [];
  for (const [worker, messageId] of [["OpenCode", "p2_opencode"], ["Pi", "p2_pi"]]) {
    const execution = runtime.begin({ appId: "cli_test", messageId, chatId: "oc_test", ownerId: "ou_test", worker });
    const evidencePath = path.join(root, `${worker.toLowerCase()}-evidence.json`);
    await runWorker(worker, execution, evidencePath);
    const trace = runtime.complete(execution, JSON.parse(readFileSync(evidencePath, "utf8")));
    assert.equal(trace.taskState, "completed");
    assert.equal(trace.nativeRunState, "done");
    assert.equal(runtime.claim(trace.deliveryKey).claimed, true);
    runtime.accept(trace.deliveryKey);
    traces.push({ worker, ...runtime.trace(execution.taskId), evidencePath });
  }
  assert.equal(traces[0].contextId, traces[1].contextId);
  assert.equal(traces[0].contextVersion, 1);
  assert.equal(traces[1].contextVersion, 2);
  assert.notEqual(traces[0].path, traces[1].path);
  assert.notEqual(traces[0].nativeRunId, traces[1].nativeRunId);
  const report = { complete: true, realModelCalls: 2, externalNotifications: 0, root, traces };
  const reportPath = path.join(root, "worker-switch-evidence.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2), { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
} finally {
  runtime.close();
}
