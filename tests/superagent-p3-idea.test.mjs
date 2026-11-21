import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { applyRoute, openBusinessView, reportWorkerDone } from "../../syno-autoloop-p0/examples/syno-p0/commands.ts";
import { candidateMarkdown, parseCandidateMarkdown } from "../experiments/superagent-p0/idea-object.mjs";
import { drainQueue } from "../experiments/superagent-p0/idea-worker-drain.mjs";
import {
  MODEL_LABEL,
  assertIdeaRequest,
  buildIdeaPrompt,
  parseIdeaModelResponse,
} from "../experiments/superagent-p0/idea-worker-contract.mjs";
import { openNativeButlerRuntime } from "../experiments/superagent-p0/native-butler-runtime.mjs";
import { answerKnowledgeQuery, knowledgeDocumentId } from "../experiments/superagent-p0/knowledge-query.mjs";

const MODEL = "opencode-go/deepseek-v4.1-flash";
const SOURCE_URL = "https://code.claude.com/docs/en/best-practices";
const SOURCE = "Public unified Runtime fixture\n\nKeep idea objects isolated.\n";
const message = (id, extra = {}) => ({ appId: "cli_test", messageId: id, chatId: "oc_test", ownerId: "ou_test", ...extra });
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-idea-"));
  const vaultRoot = path.join(root, "vault");
  mkdirSync(path.join(vaultRoot, "02-Resources"), { recursive: true });
  const sourcePath = path.join(root, "source.txt");
  writeFileSync(sourcePath, SOURCE);
  writeFileSync(path.join(vaultRoot, "02-Resources", "a.md"), "对象 A：阿尔法事实。\n");
  writeFileSync(path.join(vaultRoot, "02-Resources", "b.md"), "对象 B：贝塔事实。\n");
  const options = {
    databasePath: path.join(root, "runtime", "native.db"),
    vaultRoot,
    sourcePath,
    sourceUrl: SOURCE_URL,
    indexFile: path.join(root, "runtime", "knowledge-index.json"),
    resultRoot: path.join(root, "results"),
    ideaRoot: path.join(root, "ideas"),
  };
  return {
    root, options,
    documentA: knowledgeDocumentId("vault/02-Resources/a.md"),
    documentB: knowledgeDocumentId("vault/02-Resources/b.md"),
  };
}

function routeIdea(runtime, text) {
  const routed = runtime.route(text);
  assert.equal(routed.status, "routed", JSON.stringify(routed));
  assert.equal(routed.domain, "idea");
  return routed;
}

function beginIdea(runtime, id, text, extra = {}) {
  const routed = routeIdea(runtime, text);
  const execution = runtime.specialist("idea").begin({
    ...message(id, extra),
    action: routed.action,
    ideaId: routed.ideaId,
    ideaIds: routed.ideaIds,
    prompt: routed.prompt,
  });
  return { routed, execution };
}

function cite(runtime, ideaId, { length = 40, needle = null, mutate = null } = {}) {
  const index = runtime.specialist("idea").index(ideaId);
  const entry = index.versions.find((version) => version.version === index.latestVersion);
  assert.ok(entry, `idea ${ideaId} has no completed version`);
  const content = readFileSync(entry.path, "utf8");
  const start = needle === null ? 0 : content.indexOf(needle);
  assert.ok(start >= 0, `idea ${ideaId} input does not contain ${needle}`);
  const excerpt = content.slice(start, Math.min(start + length, content.length));
  const citation = {
    ideaId, version: entry.version, path: entry.path, sha256: entry.sha256,
    offset: start, end: start + excerpt.length, excerpt,
  };
  return mutate ? mutate(citation) : citation;
}

function writeCandidate(execution, {
  prompt, generatedText = "合成想法正文。", citations = [], metadata: overrides = {}, overwrite = false,
} = {}) {
  const metadata = {
    messageId: execution.messageId, taskId: execution.taskId, attemptId: execution.attemptId,
    ideaId: execution.ideaId, contextVersion: execution.contextVersion,
    inputSha256: execution.inputSha256, worker: execution.worker, model: MODEL,
    action: execution.action, promptSha256: sha256(prompt), generatedTextSha256: sha256(generatedText),
    citations, ...overrides,
  };
  const markdown = candidateMarkdown({
    ideaId: execution.ideaId, version: execution.contextVersion, action: execution.action,
    metadata, prompt, generatedText, citations,
  });
  writeFileSync(execution.artifactPath, markdown, overwrite ? undefined : { flag: "wx" });
  return { metadata, prompt, generatedText, citations };
}

function completeIdea(runtime, execution, options = {}) {
  writeCandidate(execution, options);
  return runtime.specialist("idea").complete(execution);
}

function markdownFiles(root) {
  return readdirSync(root, { recursive: true })
    .filter((file) => String(file).endsWith(".md"))
    .map((file) => path.join(root, String(file)))
    .sort();
}

async function writeKnowledge(runtime, options, documentId, query) {
  const execution = await runtime.specialist("knowledge").begin({ ...message(`om_k_${documentId.slice(-6)}`), documentId, query });
  const answer = await answerKnowledgeQuery(options, execution);
  writeFileSync(execution.artifactPath, JSON.stringify({
    ...answer, messageId: execution.messageId, taskId: execution.taskId, attemptId: execution.attemptId,
  }), { flag: "wx" });
  return { execution, trace: await runtime.specialist("knowledge").complete(execution) };
}

test("two new ideas and one continuation keep independent Context, Attempt, versioned Markdown and delivery", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const firstA = beginIdea(runtime, "om_idea_a1", "新建想法：阿尔法想法第一版").execution;
    const a1 = completeIdea(runtime, firstA, { prompt: "阿尔法想法第一版" });
    assert.equal(a1.taskState, "completed");
    assert.equal(a1.contextVersion, 1);
    assert.equal(a1.deliveryState, "queued");
    assert.equal(runtime.specialist("idea").claim(firstA.deliveryKey).claimed, true);
    runtime.specialist("idea").accept(firstA.deliveryKey);

    const firstB = beginIdea(runtime, "om_idea_b1", "新建想法：贝塔想法第一版").execution;
    const b1 = completeIdea(runtime, firstB, { prompt: "贝塔想法第一版" });
    assert.equal(b1.taskState, "completed");
    assert.notEqual(b1.contextId, a1.contextId);
    assert.notEqual(b1.ideaId, a1.ideaId);
    assert.notEqual(b1.path, a1.path);
    assert.match(readFileSync(b1.path, "utf8"), /贝塔想法第一版/);
    assert.doesNotMatch(readFileSync(b1.path, "utf8"), /阿尔法想法/);

    const newInputA = "NEW-INPUT-续接-阿尔法-第二轮";
    const generatedA = "GENERATED-BODY-续接-阿尔法-第二轮";
    const secondA = beginIdea(runtime, "om_idea_a2", `继续想法 ${firstA.ideaId}：${newInputA}`).execution;
    assert.equal(secondA.ideaId, firstA.ideaId);
    assert.equal(secondA.contextVersion, 2);
    assert.notEqual(secondA.attemptId, firstA.attemptId);
    assert.notEqual(secondA.runId, firstA.runId);
    assert.notEqual(secondA.artifactPath, firstA.artifactPath);
    assert.equal(secondA.prompt, newInputA);
    assert.equal(secondA.inputs.length, 1);
    assert.equal(secondA.inputs[0].ideaId, firstA.ideaId);
    assert.equal(secondA.inputs[0].version, 1);
    const citation = cite(runtime, firstA.ideaId);
    const a2 = completeIdea(runtime, secondA, { prompt: newInputA, generatedText: generatedA, citations: [citation] });
    assert.equal(a2.contextVersion, 2);
    assert.equal(a2.taskState, "completed");
    const rereadA2 = parseCandidateMarkdown(readFileSync(a2.path, "utf8"));
    assert.equal(rereadA2.prompt, newInputA);
    assert.equal(rereadA2.generatedText, generatedA);
    assert.match(readFileSync(a2.path, "utf8"), /NEW-INPUT-续接-阿尔法-第二轮/);
    assert.match(readFileSync(a2.path, "utf8"), /GENERATED-BODY-续接-阿尔法-第二轮/);
    assert.equal(runtime.specialist("idea").trace(firstB.taskId).contextVersion, 1);
    assert.equal(sha256(readFileSync(b1.path, "utf8")), b1.fileVersion);
    assert.equal(markdownFiles(options.ideaRoot).length, 3);
    const versions = runtime.specialist("idea").index(firstA.ideaId).versions;
    assert.deepEqual(versions.map((version) => version.version), [1, 2]);
    assert.notEqual(versions[0].sha256, versions[1].sha256);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("slow idea A cannot block idea B or a knowledge task; bodies and Contexts stay apart", async () => {
  const { root, options, documentA } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const { execution: slowA } = beginIdea(runtime, "om_slow_a", "新建想法：慢慢展开的阿尔法");
    const { execution: fastB } = beginIdea(runtime, "om_fast_b", "新建想法：很快完成的贝塔");
    const bTrace = completeIdea(runtime, fastB, { prompt: "很快完成的贝塔" });
    const knowledge = await writeKnowledge(runtime, options, documentA, "阿尔法");

    assert.equal(bTrace.taskState, "completed");
    assert.equal(knowledge.trace.taskState, "completed");
    assert.equal(runtime.specialist("idea").trace(slowA.taskId).taskState, "running");
    assert.equal(runtime.specialist("idea").trace(slowA.taskId).deliveryState, null);
    assert.doesNotMatch(readFileSync(bTrace.path, "utf8"), /慢慢展开的阿尔法/);
    assert.match(readFileSync(knowledge.trace.path, "utf8"), /阿尔法事实/);

    const aTrace = completeIdea(runtime, slowA, { prompt: "慢慢展开的阿尔法" });
    assert.equal(aTrace.taskState, "completed");
    assert.match(readFileSync(aTrace.path, "utf8"), /慢慢展开的阿尔法/);
    assert.doesNotMatch(readFileSync(aTrace.path, "utf8"), /很快完成的贝塔/);
    assert.notEqual(aTrace.contextId, bTrace.contextId);
    assert.notEqual(aTrace.deliveryKey, bTrace.deliveryKey);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("comparison freezes both input versions and leaves the second idea untouched", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const a1 = beginIdea(runtime, "om_cmp_a1", "新建想法：比较用阿尔法").execution;
    completeIdea(runtime, a1, { prompt: "比较用阿尔法" });
    const a2 = beginIdea(runtime, "om_cmp_a2", `继续想法 ${a1.ideaId}：阿尔法第二版`).execution;
    completeIdea(runtime, a2, { prompt: "阿尔法第二版", citations: [cite(runtime, a1.ideaId)] });
    const b1 = beginIdea(runtime, "om_cmp_b1", "新建想法：比较用贝塔").execution;
    completeIdea(runtime, b1, { prompt: "比较用贝塔" });

    const beforeB = JSON.stringify(runtime.specialist("idea").index(b1.ideaId));
    const beforeBFile = sha256(readFileSync(runtime.specialist("idea").trace(b1.taskId).path, "utf8"));
    const bFiles = markdownFiles(options.ideaRoot).filter((file) => file.includes(b1.ideaId)).length;

    const { execution: compare } = beginIdea(
      runtime, "om_compare", `比较想法 ${a1.ideaId} ${b1.ideaId}：NEW-INPUT-比较-阿尔法与贝塔`,
    );
    assert.equal(compare.action, "compare");
    assert.equal(compare.contextId, `idea:${a1.ideaId}`);
    assert.equal(compare.contextVersion, 3);
    assert.equal(runtime.specialist("idea").index(a1.ideaId).latestVersion, 2);
    assert.equal(JSON.stringify(runtime.specialist("idea").index(b1.ideaId)), beforeB);

    const citations = [cite(runtime, a1.ideaId, { needle: "阿尔法第二版" }), cite(runtime, b1.ideaId, { needle: "比较用贝塔" })];
    const newInputCompare = "NEW-INPUT-比较-阿尔法与贝塔";
    const generatedCompare = "GENERATED-BODY-比较-阿尔法与贝塔";
    const compared = completeIdea(runtime, compare, {
      prompt: newInputCompare, generatedText: generatedCompare, citations,
    });
    assert.equal(compared.taskState, "completed");
    assert.equal(compared.deliveryState, "queued");
    const rereadCompare = parseCandidateMarkdown(readFileSync(compared.path, "utf8"));
    assert.equal(rereadCompare.prompt, newInputCompare);
    assert.equal(rereadCompare.generatedText, generatedCompare);
    assert.match(readFileSync(compared.path, "utf8"), /NEW-INPUT-比较-阿尔法与贝塔/);
    assert.match(readFileSync(compared.path, "utf8"), /GENERATED-BODY-比较-阿尔法与贝塔/);
    assert.equal(runtime.specialist("idea").index(a1.ideaId).latestVersion, 2);
    assert.equal(runtime.specialist("idea").index(b1.ideaId).latestVersion, 1);
    assert.equal(JSON.stringify(runtime.specialist("idea").index(b1.ideaId)), beforeB);
    assert.equal(sha256(readFileSync(runtime.specialist("idea").trace(b1.taskId).path, "utf8")), beforeBFile);
    assert.equal(markdownFiles(options.ideaRoot).filter((file) => file.includes(b1.ideaId)).length, bFiles);
    assert.match(readFileSync(compared.path, "utf8"), /阿尔法第二版/);
    assert.match(readFileSync(compared.path, "utf8"), /比较用贝塔/);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("ambiguous and unknown idea requests ask only, with zero Task, Worker, Context or business facts", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const first = beginIdea(runtime, "om_scope_a", "新建想法：作用域阿尔法").execution;
    const completed = completeIdea(runtime, first, { prompt: "作用域阿尔法" });
    const other = beginIdea(runtime, "om_scope_b", "新建想法：作用域贝塔").execution;
    completeIdea(runtime, other, { prompt: "作用域贝塔" });
    const beforeFacts = runtime.factCount();
    const beforeIdeas = runtime.specialist("idea").ideas().length;
    const beforeFiles = markdownFiles(options.ideaRoot).length;
    const unknownId = "idea-0000000000000000";

    const missing = runtime.route("继续想法：没有编号");
    const unknown = runtime.route(`继续想法 ${unknownId}：没有这个想法`);
    const missingCompare = runtime.route(`比较想法 ${completed.ideaId}：少一个对象`);
    const sameCompare = runtime.route(`比较想法 ${completed.ideaId} ${completed.ideaId}：同一个对象`);
    assert.equal(missing.status, "ambiguous");
    assert.equal(unknown.status, "unknown");
    assert.equal(unknown.ideaId, unknownId);
    assert.equal(missingCompare.status, "ambiguous");
    assert.equal(sameCompare.status, "ambiguous");
    assert.equal(sameCompare.reason, "same-idea");

    assert.equal(runtime.factCount(), beforeFacts);
    assert.equal(runtime.specialist("idea").ideas().length, beforeIdeas);
    assert.equal(runtime.queued("idea").length, 0);
    assert.equal(markdownFiles(options.ideaRoot).length, beforeFiles);
    assert.throws(() => runtime.specialist("idea").trace(`task-${unknownId}`), /缺少 Task/);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("replaying a completed idea adds nothing and a changed replay is rejected", async () => {
  const { root, options, documentA } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const { execution } = beginIdea(runtime, "om_replay_a", "新建想法：重放阿尔法");
    const completed = completeIdea(runtime, execution, { prompt: "重放阿尔法" });
    const beforeFacts = runtime.factCount();
    const beforeFiles = markdownFiles(options.ideaRoot).length;

    const replay = beginIdea(runtime, "om_replay_a", "新建想法：重放阿尔法").execution;
    assert.equal(replay.state, "completed");
    assert.equal(replay.runId, execution.runId);
    assert.equal(replay.attemptId, execution.attemptId);
    assert.equal(runtime.factCount(), beforeFacts);
    assert.equal(markdownFiles(options.ideaRoot).length, beforeFiles);

    assert.throws(
      () => beginIdea(runtime, "om_replay_a", "新建想法：换了正文"),
      /同一消息不能更换动作、对象或正文/,
    );
    assert.equal(runtime.factCount(), beforeFacts);
    assert.equal(runtime.specialist("idea").trace(completed.taskId).deliveryState, "queued");

    const knowledge = await writeKnowledge(runtime, options, documentA, "阿尔法");
    assert.equal(knowledge.trace.taskState, "completed");
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a second event for a busy idea stays queued without a Task or Context advance while another idea proceeds", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const { execution: a1 } = beginIdea(runtime, "om_queue_a1", "新建想法：排队阿尔法第一版");
    const { execution: a2 } = beginIdea(runtime, "om_queue_a2", `继续想法 ${a1.ideaId}：排队阿尔法第二版`);
    assert.equal(a2.state, "queued");
    assert.equal(a2.taskId, undefined);
    assert.equal(runtime.specialist("idea").trace(a1.taskId).contextVersion, 1);
    assert.throws(() => runtime.specialist("idea").trace("task-om_queue_a2"), /缺少 Task/);
    assert.equal(runtime.queued("idea").length, 1);
    assert.equal(runtime.queued("idea")[0].messageId, "om_queue_a2");

    const { execution: b1 } = beginIdea(runtime, "om_queue_b1", "新建想法：排队贝塔");
    const bTrace = completeIdea(runtime, b1, { prompt: "排队贝塔" });
    assert.equal(bTrace.taskState, "completed");
    assert.equal(bTrace.contextVersion, 1);

    const a1Trace = completeIdea(runtime, a1, { prompt: "排队阿尔法第一版" });
    assert.equal(a1Trace.taskState, "completed");
    const queued = runtime.queued("idea");
    assert.equal(queued.length, 1);
    const resumed = runtime.specialist("idea").begin(queued[0]);
    assert.equal(resumed.contextVersion, 2);
    assert.notEqual(resumed.attemptId, a1.attemptId);
    assert.notEqual(resumed.artifactPath, a1.artifactPath);
    const a2Trace = completeIdea(runtime, resumed, {
      prompt: "排队阿尔法第二版", citations: [cite(runtime, a1.ideaId)],
    });
    assert.equal(a2Trace.taskState, "completed");
    assert.equal(runtime.specialist("idea").index(a1.ideaId).latestVersion, 2);
    assert.equal(runtime.queued("idea").length, 0);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("cancellation beats a late candidate and a stale Attempt cannot complete a newer Task", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const { execution: cancelled } = beginIdea(runtime, "om_cancel_a", "新建想法：会被取消");
    writeCandidate(cancelled, { prompt: "会被取消" });
    const filesBefore = markdownFiles(options.ideaRoot).length;
    runtime.specialist("idea").cancel(cancelled.taskId);
    assert.throws(() => runtime.specialist("idea").complete(cancelled), /取消已请求/);
    const cancelledTrace = runtime.specialist("idea").trace(cancelled.taskId);
    assert.equal(cancelledTrace.taskState, "cancel_requested");
    assert.equal(cancelledTrace.deliveryState, null);
    assert.equal(cancelledTrace.attemptState, "running");
    assert.equal(markdownFiles(options.ideaRoot).length, filesBefore);

    const { execution: first } = beginIdea(runtime, "om_stale_a1", "新建想法：旧 Attempt 阿尔法");
    completeIdea(runtime, first, { prompt: "旧 Attempt 阿尔法" });
    const { execution: second } = beginIdea(runtime, "om_stale_a2", `继续想法 ${first.ideaId}：新 Attempt`);
    writeCandidate(second, { prompt: "新 Attempt", citations: [cite(runtime, first.ideaId)] });
    const secondFiles = markdownFiles(options.ideaRoot).length;
    assert.throws(
      () => runtime.specialist("idea").complete({ ...second, attemptId: first.attemptId }),
      /完成时必须仍是当前 Attempt/,
    );
    assert.equal(markdownFiles(options.ideaRoot).length, secondFiles);
    const secondTrace = runtime.specialist("idea").trace(second.taskId);
    assert.equal(secondTrace.taskState, "running");
    assert.equal(secondTrace.deliveryState, null);
    assert.equal(secondTrace.attemptId, second.attemptId);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("an empty generated body is rejected with no completed Task or delivery", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const { execution } = beginIdea(runtime, "om_empty_body", "新建想法：空正文输入保留");
    writeCandidate(execution, { prompt: "空正文输入保留", generatedText: "" });
    const filesBefore = markdownFiles(options.ideaRoot).length;
    assert.equal(filesBefore, 1);
    assert.throws(() => runtime.specialist("idea").complete(execution), /生成正文不能为空/);
    assert.equal(markdownFiles(options.ideaRoot).length, filesBefore);
    const trace = runtime.specialist("idea").trace(execution.taskId);
    assert.equal(trace.taskState, "running");
    assert.equal(trace.attemptState, "running");
    assert.equal(trace.deliveryState, null);
    assert.equal(trace.nativeRunState, "claimed");
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a Worker timeout leaves the idea Task running with its current Attempt and no artifact or delivery", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const { execution } = beginIdea(runtime, "om_idea_timeout", "新建想法：超时保留当前 Attempt");
    const worker = spawnSync(process.execPath, ["-e", "setTimeout(() => {}, 10000)"], { timeout: 30 });
    assert.equal(worker.signal, "SIGTERM");
    const trace = runtime.specialist("idea").trace(execution.taskId);
    assert.equal(trace.taskState, "running");
    assert.equal(trace.attemptId, execution.attemptId);
    assert.equal(trace.attemptState, "running");
    assert.equal(trace.nativeRunState, "claimed");
    assert.equal(trace.deliveryState, null);
    assert.equal(markdownFiles(options.ideaRoot).length, 0);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("reportWorkerDone marks only the Attempt done and the Result Lane can still settle the same Task and run", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const { execution } = beginIdea(runtime, "om_worker_done", "新建想法：Worker done 不结算业务 Task");
    const db = new DatabaseSync(options.databasePath);
    try {
      db.exec("PRAGMA busy_timeout=5000;");
      openBusinessView(db);
      reportWorkerDone(db, { taskId: execution.taskId, attemptId: execution.attemptId, now: Date.now() });
    } finally {
      db.close();
    }
    const workerOnly = runtime.specialist("idea").trace(execution.taskId);
    assert.equal(workerOnly.attemptState, "done");
    assert.equal(workerOnly.taskState, "running");
    assert.equal(workerOnly.nativeRunState, "claimed");
    assert.equal(workerOnly.deliveryState, null);
    assert.equal(markdownFiles(options.ideaRoot).length, 0);

    writeCandidate(execution, { prompt: "Worker done 不结算业务 Task" });
    const settled = runtime.specialist("idea").complete(execution);
    assert.equal(settled.taskState, "completed");
    assert.equal(settled.attemptState, "done");
    assert.equal(settled.nativeRunState, "done");
    assert.equal(settled.deliveryState, "queued");
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("process exit after writing recovers the same idea run and Attempt without regenerating Markdown", () => {
  const { root, options } = fixture();
  const runtimeUrl = new URL("../experiments/superagent-p0/native-butler-runtime.mjs", import.meta.url).href;
  const objectUrl = new URL("../experiments/superagent-p0/idea-object.mjs", import.meta.url).href;
  const script = `
    import { writeFileSync } from "node:fs";
    import { candidateMarkdown, sha256 } from ${JSON.stringify(objectUrl)};
    import { openNativeButlerRuntime } from ${JSON.stringify(runtimeUrl)};
    const runtime = openNativeButlerRuntime(${JSON.stringify(options)});
    const routed = runtime.route("新建想法：写盘后崩溃恢复");
    if (routed.status !== "routed") throw new Error(JSON.stringify(routed));
    const execution = runtime.specialist("idea").begin({
      appId: "cli_test", messageId: "om_crash_idea", chatId: "oc_test", ownerId: "ou_test",
      action: routed.action, prompt: routed.prompt, worker: "OpenCode",
    });
    const prompt = routed.prompt;
    const generatedText = "GENERATED-BODY-写盘后崩溃恢复";
    const citations = [];
    const metadata = {
      messageId: execution.messageId, taskId: execution.taskId, attemptId: execution.attemptId,
      ideaId: execution.ideaId, contextVersion: execution.contextVersion,
      inputSha256: execution.inputSha256, worker: execution.worker,
      model: ${JSON.stringify(MODEL)}, action: execution.action,
      promptSha256: sha256(prompt), generatedTextSha256: sha256(generatedText), citations,
    };
    writeFileSync(execution.artifactPath, candidateMarkdown({
      ideaId: execution.ideaId, version: execution.contextVersion, action: execution.action,
      metadata, prompt, generatedText, citations,
    }), { flag: "wx" });
    console.log(JSON.stringify(execution));
    process.exit(92);
  `;
  try {
    const crashed = spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", "--input-type=module", "-e", script], { encoding: "utf8" });
    assert.equal(crashed.status, 92, crashed.stderr);
    const before = JSON.parse(crashed.stdout);
    const recoveredRuntime = openNativeButlerRuntime(options);
    try {
      const recovered = beginIdea(recoveredRuntime, "om_crash_idea", "新建想法：写盘后崩溃恢复").execution;
      assert.equal(recovered.runId, before.runId);
      assert.equal(recovered.attemptId, before.attemptId);
      assert.equal(recovered.contextVersion, before.contextVersion);
      assert.ok(recovered.job?.token);
      const trace = recoveredRuntime.specialist("idea").complete(recovered);
      assert.equal(trace.taskState, "completed");
      assert.equal(trace.nativeRunState, "done");
      assert.equal(trace.deliveryState, "queued");
      assert.equal(markdownFiles(options.ideaRoot).length, 1);
      assert.match(readFileSync(before.artifactPath, "utf8"), /写盘后崩溃恢复/);
    } finally {
      recoveredRuntime.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("OpenCode then Pi keeps one idea history while Attempts, runs and artifacts stay independent", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const { execution: first } = beginIdea(runtime, "om_worker_1", "新建想法：Worker 切换历史", { worker: "OpenCode" });
    completeIdea(runtime, first, { prompt: "Worker 切换历史" });
    const { execution: second } = beginIdea(runtime, "om_worker_2", `继续想法 ${first.ideaId}：改由 Pi 续接`, { worker: "Pi" });
    assert.equal(second.ideaId, first.ideaId);
    assert.equal(second.contextVersion, 2);
    assert.notEqual(second.attemptId, first.attemptId);
    assert.notEqual(second.runId, first.runId);
    assert.notEqual(second.artifactPath, first.artifactPath);
    const trace = completeIdea(runtime, second, { prompt: "改由 Pi 续接", citations: [cite(runtime, first.ideaId)] });
    assert.equal(trace.taskState, "completed");
    assert.match(readFileSync(trace.path, "utf8"), /"worker":"Pi"/);

    const beforeFacts = runtime.factCount();
    assert.throws(
      () => beginIdea(runtime, "om_worker_1", "新建想法：Worker 切换历史", { worker: "Pi" }),
      /同一消息不能更换动作、对象或正文/,
    );
    assert.equal(runtime.factCount(), beforeFacts);
    assert.deepEqual(runtime.specialist("idea").index(first.ideaId).versions.map((version) => version.version), [1, 2]);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("cross-object, forged path, tampered excerpt and stale input are rejected without finalize or delivery", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    const a1 = beginIdea(runtime, "om_guard_a1", "新建想法：守卫阿尔法").execution;
    completeIdea(runtime, a1, { prompt: "守卫阿尔法" });
    const b1 = beginIdea(runtime, "om_guard_b1", "新建想法：守卫贝塔").execution;
    completeIdea(runtime, b1, { prompt: "守卫贝塔" });

    const cross = beginIdea(runtime, "om_guard_cross", `继续想法 ${a1.ideaId}：跨对象引用`).execution;
    writeCandidate(cross, { prompt: "跨对象引用", citations: [cite(runtime, b1.ideaId)] });
    const crossFiles = markdownFiles(options.ideaRoot).length;
    assert.throws(() => runtime.specialist("idea").complete(cross), /引用来自其他对象/);
    assert.equal(markdownFiles(options.ideaRoot).length, crossFiles);
    assert.equal(runtime.specialist("idea").trace(cross.taskId).taskState, "running");
    assert.equal(runtime.specialist("idea").trace(cross.taskId).deliveryState, null);

    const forged = beginIdea(runtime, "om_guard_path", `继续想法 ${b1.ideaId}：伪造路径`).execution;
    const forgedCitation = cite(runtime, b1.ideaId, {
      mutate: (citation) => ({ ...citation, path: path.join(root, "elsewhere.md") }),
    });
    writeCandidate(forged, { prompt: "伪造路径", citations: [forgedCitation] });
    const forgedFiles = markdownFiles(options.ideaRoot).length;
    assert.throws(() => runtime.specialist("idea").complete(forged), /引用路径不是固定输入版本/);
    assert.equal(markdownFiles(options.ideaRoot).length, forgedFiles);

    const c1 = beginIdea(runtime, "om_guard_c1", "新建想法：守卫伽马").execution;
    completeIdea(runtime, c1, { prompt: "守卫伽马" });
    const tampered = beginIdea(runtime, "om_guard_tamper", `继续想法 ${c1.ideaId}：篡改片段`).execution;
    const tamperedCitation = cite(runtime, c1.ideaId, {
      mutate: (citation) => ({ ...citation, excerpt: `X${citation.excerpt.slice(1)}` }),
    });
    writeCandidate(tampered, { prompt: "篡改片段", citations: [tamperedCitation] });
    assert.throws(() => runtime.specialist("idea").complete(tampered), /引用片段或 offset 不一致/);

    const d1 = beginIdea(runtime, "om_guard_d1", "新建想法：守卫德尔塔").execution;
    completeIdea(runtime, d1, { prompt: "守卫德尔塔" });
    const stale = beginIdea(runtime, "om_guard_stale", `继续想法 ${d1.ideaId}：旧输入`).execution;
    const staleCitation = cite(runtime, d1.ideaId);
    writeCandidate(stale, { prompt: "旧输入", citations: [staleCitation] });
    const dPath = runtime.specialist("idea").index(d1.ideaId).versions[0].path;
    writeFileSync(dPath, `${readFileSync(dPath, "utf8")}用户改写了输入。\n`);
    assert.throws(() => runtime.specialist("idea").complete(stale), /引用输入版本已变化/);
    assert.equal(runtime.specialist("idea").trace(stale.taskId).taskState, "running");
    assert.equal(runtime.specialist("idea").trace(stale.taskId).deliveryState, null);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("real Idea Worker contract fills path, SHA256, offset and excerpt only from frozen inputs", () => {
  const root = mkdtempSync(path.join(tmpdir(), "syno-idea-contract-"));
  try {
    const ideaA = "idea-aaaaaaaaaaaaaaaa";
    const ideaB = "idea-bbbbbbbbbbbbbbbb";
    const contentA = "# 阿尔法\n\n阿尔法独有片段：慢思考。\n";
    const contentB = "# 贝塔\n\n贝塔独有片段：快验证。\n";
    const writeInput = (ideaId, version, content) => {
      const file = path.join(root, `${ideaId}.md`);
      writeFileSync(file, content);
      return { ideaId, version, path: file, sha256: sha256(content), content };
    };
    const inputA = writeInput(ideaA, 1, contentA);
    const inputB = writeInput(ideaB, 2, contentB);
    const inputs = [inputA, inputB];
    const prompt = buildIdeaPrompt({ action: "compare", prompt: "比较两版", inputs });
    assert.match(prompt, /quote 还必须在对应冻结输入中恰好出现一次/u);
    assert.match(prompt, /更长的唯一连续原文/u);
    const response = JSON.stringify({
      generatedText: "宿主可核验的新正文：先比较两版，再给出下一步。",
      citations: [
        { ideaId: ideaA, quote: "阿尔法独有片段：慢思考。" },
        { ideaId: ideaB, quote: "贝塔独有片段：快验证。" },
      ],
    });
    const parsed = parseIdeaModelResponse(response, { action: "compare", inputs });
    assert.equal(parsed.citations.length, 2);
    for (const citation of parsed.citations) {
      const input = inputs.find((candidate) => candidate.ideaId === citation.ideaId);
      assert.equal(citation.path, input.path);
      assert.equal(citation.sha256, input.sha256);
      assert.equal(citation.offset, input.content.indexOf(citation.excerpt));
      assert.equal(citation.excerpt, input.content.slice(citation.offset, citation.end));
    }
    const metadata = {
      messageId: "om_contract", taskId: "task-contract", attemptId: "attempt-contract",
      ideaId: ideaA, contextVersion: 3, inputSha256: sha256("contract"),
      worker: "OpenCode", model: MODEL_LABEL, action: "compare",
      promptSha256: sha256("比较两版"), generatedTextSha256: sha256(parsed.generatedText),
      citations: parsed.citations,
    };
    const markdown = candidateMarkdown({
      ideaId: ideaA, version: 3, action: "compare", metadata,
      prompt: "比较两版", generatedText: parsed.generatedText, citations: parsed.citations,
    });
    const reread = parseCandidateMarkdown(markdown);
    assert.equal(reread.prompt, "比较两版");
    assert.equal(reread.generatedText, parsed.generatedText);
    assert.deepEqual(reread.metadata.citations, parsed.citations);

    assert.throws(
      () => parseIdeaModelResponse(JSON.stringify({ ...JSON.parse(response), path: "/tmp/forged" }), { action: "compare", inputs }),
      /未批准字段/,
    );
    assert.throws(
      () => parseIdeaModelResponse(JSON.stringify({ generatedText: "正文", citations: [{ ideaId: ideaA, quote: "阿尔法独有片段：慢思考。", sha256: "forged" }] }), { action: "continue", inputs: [inputA] }),
      /未批准字段/,
    );
    assert.throws(
      () => parseIdeaModelResponse(JSON.stringify({ generatedText: "正文", citations: [{ ideaId: ideaA, quote: "不存在的独有片段" }] }), { action: "continue", inputs: [inputA] }),
      /不在冻结输入中/,
    );
    const repeated = writeInput("idea-cccccccccccccccc", 1, "重复引用\n重复引用\n");
    assert.throws(
      () => parseIdeaModelResponse(JSON.stringify({ generatedText: "正文", citations: [{ ideaId: repeated.ideaId, quote: "重复引用" }] }), { action: "continue", inputs: [repeated] }),
      /不唯一/,
    );
    assert.throws(
      () => parseIdeaModelResponse(JSON.stringify({ generatedText: " ", citations: [] }), { action: "new", inputs: [] }),
      /生成正文不能为空/,
    );
    assert.throws(
      () => parseIdeaModelResponse(JSON.stringify({ generatedText: "正文", citations: [{ ideaId: ideaA, quote: "阿尔法独有片段：慢思考。" }] }), { action: "compare", inputs }),
      /比较必须同时引用两个固定版本/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("real Idea Worker request binds fixed model and worker and rejects unsafe drafts", () => {
  const ideaId = "idea-dddddddddddddddd";
  const request = {
    messageId: "om_request", taskId: "task-request", attemptId: "attempt-request",
    ideaId, ideaIds: [ideaId], action: "continue", prompt: "续接输入",
    contextVersion: 2, inputSha256: sha256("input"), worker: "OpenCode",
    model: MODEL_LABEL, artifactPath: "/private/tmp/idea-candidate.md",
    inputs: [{
      ideaId, version: 1, path: "/private/tmp/idea-v1.md",
      sha256: sha256("frozen"),
    }],
  };
  assert.equal(assertIdeaRequest(request, "OpenCode"), request);
  assert.throws(() => assertIdeaRequest({ ...request, model: "other/model" }, "OpenCode"), /模型未获批准/);
  assert.throws(() => assertIdeaRequest({ ...request, worker: "Pi" }, "OpenCode"), /Worker 不匹配/);
  assert.throws(() => assertIdeaRequest({ ...request, artifactPath: "relative.md" }, "OpenCode"), /绝对路径/);
  assert.throws(
    () => assertIdeaRequest({ ...request, action: "new", inputs: request.inputs }, "OpenCode"),
    /新建想法不能携带历史输入/,
  );
});


test("idea drain keeps pulling same-object queued items until empty without a new message or restart", async () => {
  const queue = [
    { messageId: "om_a2", ideaId: "idea-aaaaaaaaaaaaaaaa" },
    { messageId: "om_a3", ideaId: "idea-aaaaaaaaaaaaaaaa" },
  ];
  const version = { A: 1 };
  const tasks = [];
  const completed = [];
  const firstA3 = [];
  let active = null;
  const run = async (item) => {
    if (active?.ideaId === item.ideaId) {
      firstA3.push({ contextVersion: version.A, activeMessageId: active.messageId, tasks: [...tasks] });
      return { queued: true };
    }
    active = item;
    tasks.push(item.messageId);
    await Promise.resolve();
    version.A += 1;
    completed.push(item.messageId);
    queue.splice(queue.indexOf(item), 1);
    active = null;
    return { deferredDelivery: true };
  };
  await drainQueue({ queued: () => [...queue], run });
  assert.deepEqual(completed, ["om_a2", "om_a3"]);
  assert.equal(queue.length, 0);
  assert.equal(firstA3.length, 1);
  assert.equal(firstA3[0].contextVersion, 1);
  assert.equal(firstA3[0].activeMessageId, "om_a2");
  assert.deepEqual(firstA3[0].tasks, ["om_a2"]);
});

test("idea drain does not serialize different objects and stops when no batch progresses", async () => {
  const queue = [
    { messageId: "om_a", ideaId: "idea-aaaaaaaaaaaaaaaa" },
    { messageId: "om_b", ideaId: "idea-bbbbbbbbbbbbbbbb" },
  ];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const started = [];
  const active = new Set();
  let maxActive = 0;
  const run = async (item) => {
    active.add(item.ideaId);
    maxActive = Math.max(maxActive, active.size);
    started.push(item.messageId);
    if (started.length === 2) release();
    await Promise.race([gate, new Promise((resolve) => setTimeout(resolve, 100))]);
    active.delete(item.ideaId);
    queue.splice(queue.indexOf(item), 1);
    return { deferredDelivery: true };
  };
  await drainQueue({ queued: () => [...queue], run });
  assert.deepEqual(started, ["om_a", "om_b"]);
  assert.equal(maxActive, 2);
  assert.equal(queue.length, 0);

  let stalledCalls = 0;
  await drainQueue({
    queued: () => [{ messageId: "om_stalled", ideaId: "idea-cccccccccccccccc" }],
    run: async () => {
      stalledCalls += 1;
      return { queued: true };
    },
  });
  assert.equal(stalledCalls, 1);
});

test("a synthetic foreign project Context is never read, advanced or written by idea work", () => {
  const { root, options } = fixture();
  mkdirSync(path.dirname(options.databasePath), { recursive: true });
  const seeding = new DatabaseSync(options.databasePath);
  seeding.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
  openBusinessView(seeding);
  applyRoute(seeding, {
    commandId: "route-project-d", appId: "cli_test", messageId: "om_project_d",
    contextId: "project:d", expectedVersion: null, ownerId: "ou_test", replyTo: "oc_test", now: Date.now(),
  });
  const seeded = seeding.prepare("SELECT data FROM projections WHERE collection='records' AND key='context:project:d'").get();
  seeding.close();

  const runtime = openNativeButlerRuntime(options);
  try {
    const first = beginIdea(runtime, "om_foreign_a", "新建想法：外来项目旁阿尔法").execution;
    completeIdea(runtime, first, { prompt: "外来项目旁阿尔法" });
    const second = beginIdea(runtime, "om_foreign_b", "新建想法：外来项目旁贝塔").execution;
    completeIdea(runtime, second, { prompt: "外来项目旁贝塔" });
    assert.equal(runtime.specialist("idea").ideas().some((idea) => idea.ideaId === "project:d"), false);
    assert.equal(markdownFiles(options.ideaRoot).some((file) => file.includes("project:d")), false);
  } finally {
    runtime.close();
  }

  const checking = new DatabaseSync(options.databasePath);
  try {
    const after = checking.prepare("SELECT data FROM projections WHERE collection='records' AND key='context:project:d'").get();
    assert.deepEqual(JSON.parse(after.data), JSON.parse(seeded.data));
    const projectTasks = checking.prepare("SELECT COUNT(*) AS count FROM projections WHERE collection='records' AND json_extract(data,'$.context_id')='project:d'").get();
    assert.equal(Number(projectTasks.count), 0);
  } finally {
    checking.close();
    rmSync(root, { recursive: true, force: true });
  }
});
