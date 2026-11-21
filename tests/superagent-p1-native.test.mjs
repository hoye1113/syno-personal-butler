import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openNativeCaptureRuntime } from "../experiments/superagent-p0/native-capture-runtime.mjs";

const SOURCE_URL = "https://code.claude.com/docs/en/best-practices";
const source = "Public Claude Code fixture\n\nUse explicit context and verify results.\n";
const probes = {
  outside_file: { outcome: "denied" },
  sentinel_credential: { outcome: "denied" },
  unapproved_network: { outcome: "denied" },
  object_input: { outcome: "allowed" },
  attempt_output: { outcome: "allowed" },
};
const message = (id) => ({ appId: "cli_test", messageId: id, chatId: "oc_test", ownerId: "ou_test" });

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p1-native-"));
  const sourcePath = path.join(root, "source.txt");
  writeFileSync(sourcePath, source);
  return {
    root,
    options: { databasePath: path.join(root, "runtime", "native.db"), vaultRoot: path.join(root, "vault"), sourcePath, sourceUrl: SOURCE_URL },
  };
}

function writeCapture(execution, withEvidence = true) {
  const worker = execution.worker || "OpenCode";
  const markdown = `---\nnote_id: test\nsource_url: "${SOURCE_URL}"\nsource_content_sha256: ${execution.contextId ? readSourceHash(execution) : ""}\ncaptured_at: 2026-11-19T00:00:00.000Z\nworker: ${worker}\nmodel: opencode-go/deepseek-v4.1-flash\n---\n# Claude Code fixture\n\n## 摘要\n\n公开测试摘要。\n\n## 公开原文\n\n${source.trim()}\n`;
  mkdirSync(path.dirname(execution.artifactPath), { recursive: true });
  writeFileSync(execution.artifactPath, markdown, { flag: "wx" });
  if (!withEvidence) return null;
  return {
    complete: true,
    worker,
    probes,
    workerModelPath: { model: "opencode-go/deepseek-v4.1-flash", runtime: "opencode v2.0.29", elapsedMs: 1 },
    pi: worker === "Pi" ? { version: "1.5.2", providerRequests: 1, toolEvents: 0 } : null,
    usage: "not_returned",
    costUsd: "not_returned",
    capture: {
      messageId: execution.messageId,
      taskId: execution.taskId,
      attemptId: execution.attemptId,
      sourceUrl: SOURCE_URL,
      sourceMaterial: "verified-public-browser-snapshot",
      sourceSha256: readSourceHash(execution),
      path: execution.artifactPath,
      fileVersion: (awaitHash(markdown)),
      resultLane: "passed",
    },
  };
}

import { createHash } from "node:crypto";
const awaitHash = (text) => createHash("sha256").update(text).digest("hex");
const readSourceHash = () => createHash("sha256").update(source).digest("hex");

test("two independent inputs and one replay keep native event → Task → Attempt → file → delivery trace", () => {
  const { root, options } = fixture();
  const runtime = openNativeCaptureRuntime(options);
  try {
    const first = runtime.begin(message("om_one"));
    const firstEvidence = writeCapture(first);
    const firstTrace = runtime.complete(first, firstEvidence);
    assert.equal(runtime.claim(first.deliveryKey).claimed, true);
    assert.equal(runtime.trace(first.taskId).maySend, false);
    assert.equal(runtime.claim(first.deliveryKey).claimed, false, "并发恢复不能重复认领同一投递");
    runtime.accept(first.deliveryKey);
    const accepted = runtime.trace(first.taskId);
    assert.equal(accepted.deliveryState, "accepted");
    assert.equal(accepted.maySend, false);
    assert.equal(accepted.nativeRunState, "done");
    assert.equal(accepted.taskState, "completed");
    assert.equal(accepted.attemptState, "done");
    assert.equal(accepted.eventId, "om_one");
    assert.equal(accepted.fileVersion, firstEvidence.capture.fileVersion);

    const second = runtime.begin(message("om_two"));
    assert.notEqual(second.runId, first.runId);
    assert.notEqual(second.artifactPath, first.artifactPath);
    assert.equal(second.contextId, first.contextId);
    assert.equal(second.contextVersion, 2);
    const secondTrace = runtime.complete(second, writeCapture(second));
    assert.equal(secondTrace.contextVersion, 2);
    assert.equal(secondTrace.deliveryState, "queued");

    const beforeReplay = runtime.factCount();
    const replay = runtime.begin(message("om_one"));
    assert.equal(replay.state, "completed");
    assert.equal(replay.runId, first.runId);
    assert.equal(runtime.factCount(), beforeReplay);
    assert.equal(readdirSync(path.dirname(first.artifactPath)).filter((name) => name.endsWith(".md")).length, 2);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("OpenCode then Pi preserves one Context while Attempts, runs and artifacts stay independent", () => {
  const { root, options } = fixture();
  const runtime = openNativeCaptureRuntime(options);
  try {
    const first = runtime.begin({ ...message("om_opencode"), worker: "OpenCode" });
    runtime.complete(first, writeCapture(first));
    const second = runtime.begin({ ...message("om_pi"), worker: "Pi" });
    assert.equal(second.contextId, first.contextId);
    assert.equal(second.contextVersion, 2);
    assert.notEqual(second.runId, first.runId);
    assert.notEqual(second.attemptId, first.attemptId);
    assert.notEqual(second.artifactPath, first.artifactPath);
    const trace = runtime.complete(second, writeCapture(second));
    assert.equal(trace.taskState, "completed");
    assert.equal(trace.nativeRunState, "done");
    assert.ok(readFileSync(second.artifactPath, "utf8").includes("worker: Pi"));
    const before = runtime.factCount();
    assert.throws(() => runtime.begin({ ...message("om_pi"), worker: "OpenCode" }), /同一消息不能更换来源或 Worker/);
    assert.equal(runtime.factCount(), before);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a Worker timeout leaves the current Attempt recoverable without artifact or delivery", () => {
  const { root, options } = fixture();
  const runtime = openNativeCaptureRuntime(options);
  try {
    const execution = runtime.begin(message("om_timeout"));
    const worker = spawnSync(process.execPath, ["-e", "setTimeout(() => {}, 10000)"], { timeout: 30 });
    assert.equal(worker.signal, "SIGTERM");
    const trace = runtime.trace(execution.taskId);
    assert.equal(trace.taskState, "running");
    assert.equal(trace.attemptId, execution.attemptId);
    assert.equal(trace.nativeRunState, "claimed");
    assert.equal(trace.deliveryState, null);
    assert.equal(readdirSync(path.dirname(execution.artifactPath)).length, 0);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("two hosts capturing one source serialize its lane without overwriting artifacts", () => {
  const { root, options } = fixture();
  const firstHost = openNativeCaptureRuntime(options);
  const secondHost = openNativeCaptureRuntime(options);
  try {
    const first = firstHost.begin(message("om_concurrent_a"));
    assert.throws(() => secondHost.begin(message("om_concurrent_b")), /当前事件保持 queued/);
    assert.throws(() => secondHost.trace("task-om_concurrent_b"), /缺少 Task/);
    assert.equal(firstHost.trace(first.taskId).contextVersion, 1);
    assert.equal(firstHost.trace(first.taskId).taskState, "running");
    firstHost.complete(first, writeCapture(first));

    const second = secondHost.begin(message("om_concurrent_b"));
    assert.equal(first.contextId, second.contextId);
    assert.equal(first.contextVersion, 1);
    assert.equal(second.contextVersion, 2);
    assert.notEqual(first.runId, second.runId);
    assert.notEqual(first.artifactPath, second.artifactPath);
    secondHost.complete(second, writeCapture(second));
    assert.equal(firstHost.trace(first.taskId).taskState, "completed");
    assert.equal(secondHost.trace(second.taskId).taskState, "completed");
    assert.equal(readdirSync(path.dirname(first.artifactPath)).filter((name) => name.endsWith(".md")).length, 2);
    assert.ok(readFileSync(first.artifactPath, "utf8").includes(source.trim()));
    assert.ok(readFileSync(second.artifactPath, "utf8").includes(source.trim()));
  } finally {
    secondHost.close();
    firstHost.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("high-quality evidence with a forged path cannot finalize or notify", () => {
  const { root, options } = fixture();
  const runtime = openNativeCaptureRuntime(options);
  try {
    const execution = runtime.begin(message("om_fake"));
    const evidence = writeCapture(execution);
    evidence.capture.path = path.join(root, "other.md");
    assert.throws(() => runtime.complete(execution, evidence), /证据路径不匹配/);
    const trace = runtime.trace(execution.taskId);
    assert.equal(trace.taskState, "running");
    assert.equal(trace.deliveryState, null);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a process killed after writing recovers the same claimed run without a second artifact", () => {
  const { root, options } = fixture();
  const moduleUrl = new URL("../experiments/superagent-p0/native-capture-runtime.mjs", import.meta.url).href;
  const script = `
    import { writeFileSync } from "node:fs";
    import { openNativeCaptureRuntime } from ${JSON.stringify(moduleUrl)};
    const runtime = openNativeCaptureRuntime(${JSON.stringify(options)});
    const execution = runtime.begin(${JSON.stringify(message("om_crash"))});
    const source = ${JSON.stringify(source)};
    const hash = (await import("node:crypto")).createHash("sha256").update(source).digest("hex");
    const markdown = \`---\\nsource_url: "${SOURCE_URL}"\\nsource_content_sha256: \${hash}\\nworker: OpenCode\\nmodel: opencode-go/deepseek-v4.1-flash\\n---\\n# Claude Code fixture\\n\\n\${source.trim()}\\n\`;
    writeFileSync(execution.artifactPath, markdown, { flag: "wx" });
    console.log(JSON.stringify(execution));
    process.exit(92);
  `;
  try {
    const crashed = spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", "--input-type=module", "-e", script], { encoding: "utf8" });
    assert.equal(crashed.status, 92, crashed.stderr);
    const before = JSON.parse(crashed.stdout);
    const recoveredRuntime = openNativeCaptureRuntime(options);
    try {
      const recovered = recoveredRuntime.begin(message("om_crash"));
      assert.equal(recovered.runId, before.runId);
      assert.equal(recovered.attemptId, before.attemptId);
      assert.ok(recovered.job?.token);
      const trace = recoveredRuntime.complete(recovered);
      assert.equal(trace.taskState, "completed");
      assert.equal(trace.nativeRunState, "done");
      assert.equal(trace.deliveryState, "queued");
      assert.equal(readdirSync(path.dirname(before.artifactPath)).filter((name) => name.endsWith(".md")).length, 1);
      assert.ok(readFileSync(before.artifactPath, "utf8").includes(source.trim()));
    } finally {
      recoveredRuntime.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
