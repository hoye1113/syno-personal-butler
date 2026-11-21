import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openNativeButlerRuntime } from "../experiments/superagent-p0/native-butler-runtime.mjs";
import { answerKnowledgeQuery, knowledgeDocumentId } from "../experiments/superagent-p0/knowledge-query.mjs";

const SOURCE_URL = "https://code.claude.com/docs/en/best-practices";
const source = "Public unified Runtime fixture\n\nKeep objects isolated.\n";
const sourceSha256 = createHash("sha256").update(source).digest("hex");
const message = (id) => ({ appId: "cli_test", messageId: id, chatId: "oc_test", ownerId: "ou_test" });

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "syno-p3-runtime-"));
  const vaultRoot = path.join(root, "vault");
  mkdirSync(path.join(vaultRoot, "02-Resources"), { recursive: true });
  const sourcePath = path.join(root, "source.txt");
  writeFileSync(sourcePath, source);
  writeFileSync(path.join(vaultRoot, "02-Resources", "a.md"), "对象 A：阿尔法事实。\n");
  writeFileSync(path.join(vaultRoot, "02-Resources", "b.md"), "对象 B：贝塔事实。\n");
  return {
    root,
    options: {
      databasePath: path.join(root, "runtime", "native.db"), vaultRoot, sourcePath, sourceUrl: SOURCE_URL,
      indexFile: path.join(root, "runtime", "knowledge-index.json"), resultRoot: path.join(root, "results"),
    },
    documentA: knowledgeDocumentId("vault/02-Resources/a.md"),
    documentB: knowledgeDocumentId("vault/02-Resources/b.md"),
  };
}

function writeCapture(execution) {
  const markdown = `---\nsource_url: "${SOURCE_URL}"\nsource_content_sha256: ${sourceSha256}\nworker: OpenCode\nmodel: opencode-go/deepseek-v4.1-flash\n---\n# Unified Runtime\n\n${source.trim()}\n`;
  writeFileSync(execution.artifactPath, markdown, { flag: "wx" });
}

test("one Root Router and Specialist Registry share one fact log without cross-domain rule loss", async () => {
  const { root, options, documentA, documentB } = fixture();
  const runtime = openNativeButlerRuntime(options);
  try {
    assert.deepEqual([...runtime.specialists.keys()], ["capture", "knowledge", "idea", "project", "memory"]);
    assert.ok(runtime.decisions);
    assert.equal(runtime.route(SOURCE_URL, []).domain, "capture");
    assert.equal(runtime.route(`查询 ${documentA}：阿尔法`, [documentA, documentB]).documentId, documentA);
    const beforeAmbiguity = runtime.factCount();
    assert.equal(runtime.route("继续查询", [documentA, documentB]).status, "ambiguous");
    assert.equal(runtime.factCount(), beforeAmbiguity);

    const capture = runtime.specialist("capture");
    const knowledge = runtime.specialist("knowledge");
    const first = capture.begin(message("om_first"));
    assert.throws(() => capture.begin(message("om_second")), /当前事件保持 queued/);
    const queued = runtime.queued("capture");
    assert.equal(queued.length, 1);
    assert.equal(queued[0].messageId, "om_second");
    assert.equal(queued[0].chatId, "oc_test");
    assert.equal(queued[0].ownerId, "ou_test");

    const a = await knowledge.begin({ ...message("om_knowledge_a"), documentId: documentA, query: "阿尔法" });
    const b = await knowledge.begin({ ...message("om_knowledge_b"), documentId: documentB, query: "贝塔" });
    const answerB = await answerKnowledgeQuery(options, b);
    writeFileSync(b.artifactPath, JSON.stringify({ ...answerB, messageId: b.messageId, taskId: b.taskId, attemptId: b.attemptId }), { flag: "wx" });
    assert.equal((await knowledge.complete(b)).taskState, "completed");
    assert.equal(capture.trace(first.taskId).taskState, "running");

    writeCapture(first);
    assert.equal(capture.complete(first).contextVersion, 1);
    const resumed = capture.begin(runtime.queued("capture")[0]);
    assert.equal(resumed.contextVersion, 2);
    writeCapture(resumed);
    assert.equal(capture.complete(resumed).taskState, "completed");
    assert.equal(runtime.queued("capture").length, 0);

    const answerA = await answerKnowledgeQuery(options, a);
    writeFileSync(a.artifactPath, JSON.stringify({ ...answerA, messageId: a.messageId, taskId: a.taskId, attemptId: a.attemptId }), { flag: "wx" });
    assert.equal((await knowledge.complete(a)).taskState, "completed");
    assert.equal(readdirSync(path.join(options.vaultRoot, "02-Resources")).filter((name) => name.startsWith("capture-")).length, 2);
    assert.equal(readdirSync(options.resultRoot).length, 2);
    assert.equal(runtime.specialist("capture"), capture);
    assert.equal(runtime.specialist("knowledge"), knowledge);
  } finally {
    runtime.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("unified Runtime restart does not rewrite identical rules", () => {
  const { root, options } = fixture();
  const runtime = openNativeButlerRuntime(options);
  const before = runtime.factCount();
  runtime.close();
  const recovered = openNativeButlerRuntime(options);
  try {
    assert.equal(recovered.factCount(), before);
  } finally {
    recovered.close();
    rmSync(root, { recursive: true, force: true });
  }
});
