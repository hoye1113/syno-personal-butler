import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { WorkflowContextCompiler } from "../apps/syno/syno/workflow-context-compiler.mjs";
import { validateContractRecord } from "../apps/syno/syno/schema-registry.mjs";

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-workflow-context-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const files = {
    "vault/99-System/Agent/INGEST-CONTRACT.md": "ingest canonical rules",
    "vault/99-System/Agent/DENSITY-PROFILE.md": "density rules",
    "vault/99-System/Skills/vskill-vault-curate/SKILL.md": "curate rules",
    "vault/99-System/Skills/vskill-vault-curate/SUBDOC - B站图文专栏精华收录.md": "bilibili rules",
  };
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(root, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, "utf8");
  }
  return { root, files };
}

test("compile returns a bounded canonical bundle without accepting model-selected paths", async (t) => {
  const { root } = await fixture(t);
  const compiler = new WorkflowContextCompiler({ repoRoot: root });
  const bundle = await compiler.compile({
    workflow: "capture",
    sourceType: "url",
    stage: "classifying",
    sourceDigest: "source-1",
    knowledgeIndexVersion: "index-1",
  });

  await validateContractRecord("workflow-context-bundle", bundle);
  assert.deepEqual(bundle.budget, { rules: 0.15, knowledge: 0.1, source: 0.55, output: 0.2 });
  assert.equal(bundle.canonicalSources.length, 3);
  assert.doesNotMatch(bundle.instructions, /B站图文/);
  await assert.rejects(
    () => compiler.compile({ workflow: "capture", sourceType: "../../secret", stage: "classifying" }),
    { code: "WORKFLOW_CONTEXT_SOURCE_DENIED" },
  );
});

test("Bilibili context includes only the fixed specialized canonical source", async (t) => {
  const { root } = await fixture(t);
  const compiler = new WorkflowContextCompiler({ repoRoot: root });
  const bundle = await compiler.compile({ workflow: "capture", sourceType: "bilibili-opus", stage: "classifying" });

  assert.equal(bundle.canonicalSources.length, 4);
  assert.match(bundle.instructions, /bilibili rules/);
  assert.ok(bundle.constraints.includes("不扫描UP主空间，不读取图片，不自动进入ASR"));
});

test("rulesDigest changes when a canonical rule changes", async (t) => {
  const { root } = await fixture(t);
  const compiler = new WorkflowContextCompiler({ repoRoot: root });
  const before = await compiler.compile({ workflow: "capture", sourceType: "url", stage: "classifying" });
  await fs.appendFile(path.join(root, "vault/99-System/Agent/INGEST-CONTRACT.md"), "\nchanged", "utf8");
  const after = await compiler.compile({ workflow: "capture", sourceType: "url", stage: "classifying" });
  assert.notEqual(after.rulesDigest, before.rulesDigest);
});
