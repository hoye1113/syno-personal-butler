import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  answerKnowledgeQuery,
  knowledgeDocumentId,
  resolveKnowledgeRequest,
} from "../experiments/superagent-p0/knowledge-query.mjs";
import { openNativeKnowledgeRuntime } from "../experiments/superagent-p0/native-knowledge-runtime.mjs";

const A_TEXT = "对象 A：慢任务仍只引用阿尔法事实。\n";
const B_TEXT = "对象 B：快速完成只引用贝塔事实。\n";

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p2-knowledge-"));
  const vaultRoot = path.join(root, "vault");
  mkdirSync(path.join(vaultRoot, "02-Resources"), { recursive: true });
  writeFileSync(path.join(vaultRoot, "02-Resources", "a.md"), A_TEXT);
  writeFileSync(path.join(vaultRoot, "02-Resources", "b.md"), B_TEXT);
  const options = { vaultRoot, indexFile: path.join(root, "runtime", "knowledge-index.json") };
  const documentA = knowledgeDocumentId("vault/02-Resources/a.md");
  const documentB = knowledgeDocumentId("vault/02-Resources/b.md");
  return {
    root, options, documentA, documentB,
    runtimeOptions: {
      ...options,
      databasePath: path.join(root, "runtime", "native.db"),
      resultRoot: path.join(root, "results"),
    },
  };
}

const message = (id, documentId, query) => ({
  appId: "cli_test", messageId: id, chatId: "oc_test", ownerId: "ou_test", documentId, query,
});

async function writeAnswer(execution, options) {
  const answer = await answerKnowledgeQuery(options, execution);
  const candidate = {
    ...answer,
    messageId: execution.messageId,
    taskId: execution.taskId,
    attemptId: execution.attemptId,
  };
  writeFileSync(execution.artifactPath, JSON.stringify(candidate), { flag: "wx" });
  return candidate;
}

test("slow A cannot block B and no body, citation, Context or delivery crosses objects", async () => {
  const { root, runtimeOptions, options, documentA, documentB } = fixture();
  const runtime = openNativeKnowledgeRuntime(runtimeOptions);
  try {
    const slowA = await runtime.begin(message("om_a", documentA, "阿尔法"));
    const fastB = await runtime.begin(message("om_b", documentB, "贝塔"));
    assert.notEqual(slowA.contextId, fastB.contextId);
    await writeAnswer(fastB, options);
    const bTrace = await runtime.complete(fastB);
    assert.equal(bTrace.taskState, "completed");
    assert.equal(runtime.trace(slowA.taskId).taskState, "running");
    assert.match(runtime.answer(fastB.taskId).text, /贝塔/);
    assert.doesNotMatch(runtime.answer(fastB.taskId).text, /阿尔法/);
    assert.equal(runtime.answer(fastB.taskId).citations[0].document_id, documentB);
    assert.equal(runtime.claim(fastB.deliveryKey).claimed, true);
    runtime.accept(fastB.deliveryKey);

    await writeAnswer(slowA, options);
    const aTrace = await runtime.complete(slowA);
    assert.equal(aTrace.taskState, "completed");
    assert.match(runtime.answer(slowA.taskId).text, /阿尔法/);
    assert.doesNotMatch(runtime.answer(slowA.taskId).text, /贝塔/);
    assert.equal(aTrace.deliveryKey, "delivery:task-om_a:result");
    assert.notEqual(aTrace.deliveryKey, bTrace.deliveryKey);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("same-object continuation and replay preserve history; ambiguity and changed replay have no side effects", async () => {
  const { root, runtimeOptions, options, documentA, documentB } = fixture();
  const runtime = openNativeKnowledgeRuntime(runtimeOptions);
  try {
    const first = await runtime.begin(message("om_a1", documentA, "阿尔法"));
    await writeAnswer(first, options);
    await runtime.complete(first);
    const second = await runtime.begin(message("om_a2", documentA, "慢任务"));
    assert.equal(second.contextId, first.contextId);
    assert.equal(second.contextVersion, 2);
    assert.notEqual(second.runId, first.runId);
    await writeAnswer(second, options);
    await runtime.complete(second);

    const before = runtime.factCount();
    const replay = await runtime.begin(message("om_a1", documentA, "阿尔法"));
    assert.equal(replay.state, "completed");
    assert.equal(replay.runId, first.runId);
    assert.equal(runtime.factCount(), before);
    await assert.rejects(runtime.begin(message("om_a1", documentA, "不同查询")), /同一消息不能更换/);
    assert.equal(runtime.factCount(), before);

    const ambiguity = resolveKnowledgeRequest("继续查询", [documentA, documentB]);
    assert.equal(ambiguity.status, "ambiguous");
    assert.deepEqual(ambiguity.candidates, [documentA, documentB]);
    assert.equal(runtime.factCount(), before);
    assert.equal(readdirSync(runtimeOptions.resultRoot).length, 2);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a high-quality answer with another object's citation cannot finalize or notify", async () => {
  const { root, runtimeOptions, options, documentA, documentB } = fixture();
  const runtime = openNativeKnowledgeRuntime(runtimeOptions);
  try {
    const execution = await runtime.begin(message("om_forged", documentA, "阿尔法"));
    const candidate = await writeAnswer(execution, options);
    const other = await answerKnowledgeQuery(options, { documentId: documentB, query: "贝塔" });
    candidate.citations = other.citations;
    candidate.text = other.text;
    writeFileSync(execution.artifactPath, JSON.stringify(candidate));
    await assert.rejects(runtime.complete(execution), /引用来自其他对象/);
    const trace = runtime.trace(execution.taskId);
    assert.equal(trace.taskState, "running");
    assert.equal(trace.deliveryState, null);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("cancellation wins over a valid late candidate and creates no delivery", async () => {
  const { root, runtimeOptions, options, documentA } = fixture();
  const runtime = openNativeKnowledgeRuntime(runtimeOptions);
  try {
    const execution = await runtime.begin(message("om_cancel", documentA, "阿尔法"));
    await writeAnswer(execution, options);
    runtime.cancel(execution.taskId);
    await assert.rejects(runtime.complete(execution), /取消已请求/);
    const trace = runtime.trace(execution.taskId);
    assert.equal(trace.taskState, "cancel_requested");
    assert.equal(trace.deliveryState, null);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("process exit after a knowledge candidate recovers the same run without regeneration", async () => {
  const { root, runtimeOptions, documentA } = fixture();
  const runtimeUrl = new URL("../experiments/superagent-p0/native-knowledge-runtime.mjs", import.meta.url).href;
  const queryUrl = new URL("../experiments/superagent-p0/knowledge-query.mjs", import.meta.url).href;
  const script = `
    import { writeFileSync } from "node:fs";
    import { openNativeKnowledgeRuntime } from ${JSON.stringify(runtimeUrl)};
    import { answerKnowledgeQuery } from ${JSON.stringify(queryUrl)};
    const runtime = openNativeKnowledgeRuntime(${JSON.stringify(runtimeOptions)});
    const execution = await runtime.begin(${JSON.stringify(message("om_knowledge_crash", documentA, "阿尔法"))});
    const answer = await answerKnowledgeQuery(${JSON.stringify(runtimeOptions)}, execution);
    writeFileSync(execution.artifactPath, JSON.stringify({ ...answer, messageId: execution.messageId, taskId: execution.taskId, attemptId: execution.attemptId }), { flag: "wx" });
    console.log(JSON.stringify(execution));
    process.exit(92);
  `;
  try {
    const crashed = spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", "--input-type=module", "-e", script], { encoding: "utf8" });
    assert.equal(crashed.status, 92, crashed.stderr);
    const before = JSON.parse(crashed.stdout);
    const recoveredRuntime = openNativeKnowledgeRuntime(runtimeOptions);
    try {
      const recovered = await recoveredRuntime.begin(message("om_knowledge_crash", documentA, "阿尔法"));
      assert.equal(recovered.runId, before.runId);
      assert.equal(recovered.attemptId, before.attemptId);
      assert.equal(recovered.contextVersion, before.contextVersion);
      const trace = await recoveredRuntime.complete(recovered);
      assert.equal(trace.taskState, "completed");
      assert.equal(trace.nativeRunState, "done");
      assert.equal(readdirSync(runtimeOptions.resultRoot).length, 1);
    } finally {
      recoveredRuntime.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("source edits after candidate generation require a new Attempt instead of stale completion", async () => {
  const { root, runtimeOptions, options, documentA } = fixture();
  const runtime = openNativeKnowledgeRuntime(runtimeOptions);
  try {
    const execution = await runtime.begin(message("om_stale", documentA, "阿尔法"));
    await writeAnswer(execution, options);
    writeFileSync(path.join(runtimeOptions.vaultRoot, "02-Resources", "a.md"), `${A_TEXT}用户新编辑。\n`);
    await assert.rejects(runtime.complete(execution), /文档版本已变化/);
    assert.equal(runtime.trace(execution.taskId).taskState, "running");
    assert.equal(runtime.trace(execution.taskId).deliveryState, null);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});
