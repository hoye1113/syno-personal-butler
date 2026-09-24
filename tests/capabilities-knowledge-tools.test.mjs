import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { KnowledgeStore } from "../packages/syno-core/knowledge-store.mjs";
import { readKnowledgeSnippetJson, searchKnowledgeNotes } from "../packages/syno-dsh-plugin/plugins/capabilities/knowledge-tools.mjs";

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-capabilities-tools-"));
  const vaultRoot = path.join(root, "vault");
  const indexFile = path.join(root, "index.json");
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(vaultRoot, "01-Areas"), { recursive: true });
  await fs.writeFile(path.join(vaultRoot, "01-Areas", "Agent Loop.md"),
    "---\ntitle: Agent Loop\ntags: [ai_agent]\n---\n循环机制\n", "utf8");
  await fs.writeFile(path.join(vaultRoot, "01-Areas", "Agent Memory.md"),
    "---\ntitle: Agent Memory\ntags: [ai_agent]\n---\n记忆机制\n", "utf8");
  await fs.writeFile(path.join(vaultRoot, "01-Areas", "Agent Secret.md"),
    "---\ntitle: Agent Secret\nsensitive: true\n---\nAgent secret\n", "utf8");
  await fs.writeFile(path.join(vaultRoot, "01-Areas", "Long Note.md"),
    `---\ntitle: Long Note\n---\n${"长".repeat(400)}\n`, "utf8");
  return { vaultRoot, indexFile, knowledge: new KnowledgeStore({ vaultRoot, indexFile }) };
}

test("capabilities knowledge search bounds limit and drops sensitive notes", async (t) => {
  const { vaultRoot, indexFile } = await fixture(t);

  const one = JSON.parse(await searchKnowledgeNotes({ query: "Agent", limit: 1, vaultRoot, indexFile }));
  assert.equal(one.length, 1);
  assert.equal(one[0].title, "Agent Loop");
  assert.equal(Object.hasOwn(one[0], "sensitive"), false);

  const all = JSON.parse(await searchKnowledgeNotes({ query: "Agent", limit: 50, vaultRoot, indexFile }));
  assert.deepEqual(all.map((note) => note.title).sort(), ["Agent Loop", "Agent Memory"]);

  const capped = JSON.parse(await searchKnowledgeNotes({ query: "Agent", limit: 0, vaultRoot, indexFile }));
  assert.equal(capped.length, 2);
});

test("capabilities knowledge read snippet clamps and refuses sensitive notes", async (t) => {
  const { knowledge } = await fixture(t);

  const snippet = JSON.parse(await readKnowledgeSnippetJson(
    { path: "vault/01-Areas/Agent Loop.md", maxChars: 200 },
    { knowledge },
  ));
  assert.equal(snippet.title, "Agent Loop");
  assert.equal(snippet.truncated, false);

  const clamped = JSON.parse(await readKnowledgeSnippetJson(
    { path: "vault/01-Areas/Agent Loop.md", maxChars: 5 },
    { knowledge },
  ));
  assert.equal(clamped.snippet, snippet.snippet);
  assert.equal(clamped.truncated, false);

  const long = JSON.parse(await readKnowledgeSnippetJson(
    { path: "vault/01-Areas/Long Note.md", maxChars: 200 },
    { knowledge },
  ));
  assert.equal(long.snippet.length, 200);
  assert.equal(long.truncated, true);

  await assert.rejects(
    readKnowledgeSnippetJson({ path: "vault/01-Areas/Agent Secret.md" }, { knowledge }),
    { code: "KNOWLEDGE_SENSITIVE_DENIED" },
  );
});
