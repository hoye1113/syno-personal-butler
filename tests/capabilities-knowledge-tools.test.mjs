import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { KnowledgeStore } from "../packages/syno-core/knowledge-store.mjs";
import { createSynoRuntime } from "../apps/syno/syno/runtime.mjs";
import { validateValue } from "../packages/syno-core/schema-registry.mjs";
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

test("knowledge snippets resume through a long Chinese note without cutting emoji", async (t) => {
  const { knowledge, vaultRoot } = await fixture(t);
  const markdown = `${"前".repeat(199)}😀${"正文".repeat(6100)}最后建议采用分段读取。`;
  await fs.writeFile(path.join(vaultRoot, "01-Areas", "Resume.md"), markdown, "utf8");
  const parts = [];
  let offset = 0;
  do {
    const result = JSON.parse(await readKnowledgeSnippetJson({ path: "vault/01-Areas/Resume.md", maxChars: 200, offset }, { knowledge }));
    assert.equal(result.offset, offset);
    assert.doesNotMatch(result.snippet, /[\uD800-\uDBFF]$|^[\uDC00-\uDFFF]/u);
    parts.push(result.snippet);
    assert.ok(parts.length < 100, "续读必须终止");
    if (result.nextOffset === null) break;
    assert.ok(result.nextOffset > offset);
    offset = result.nextOffset;
  } while (true);
  assert.equal(parts.join(""), markdown);
});

test("knowledge search locates a tail fact and the reader uses its original markdown offset", async (t) => {
  const { knowledge, vaultRoot, indexFile } = await fixture(t);
  const markdown = `---\ntitle: Long Decision\n---\n${"背景".repeat(6200)}\n最后建议采用分段读取，而不是整篇加载。`;
  await fs.writeFile(path.join(vaultRoot, "01-Areas", "Decision.md"), markdown, "utf8");
  const [hit] = JSON.parse(await searchKnowledgeNotes({ query: "最后建议采用分段读取", limit: 1, vaultRoot, indexFile }));
  assert.match(hit.excerpt, /最后建议采用分段读取/);
  assert.ok(hit.excerptOffset > 12000);
  const result = JSON.parse(await readKnowledgeSnippetJson({ path: hit.path, offset: hit.excerptOffset, maxChars: 200 }, { knowledge }));
  assert.match(result.snippet, /最后建议采用分段读取/);
  assert.equal(result.nextOffset, null);
  assert.equal(result.truncated, true);
  assert.doesNotMatch(await fs.readFile(indexFile, "utf8"), /而不是整篇加载/);
});

test("Bridge and plugin snippets agree on offsets, EOF, invalid input and sensitive denial", async (t) => {
  const { knowledge, vaultRoot } = await fixture(t);
  await fs.writeFile(path.join(vaultRoot, "01-Areas", "Empty.md"), "", "utf8");
  const runtime = createSynoRuntime({ knowledge });
  for (const offset of [0, 200, 500, Number.MAX_SAFE_INTEGER]) {
    const args = { path: "vault/01-Areas/Long Note.md", maxChars: 200, offset };
    const plugin = JSON.parse(await readKnowledgeSnippetJson(args, { knowledge }));
    const bridge = await runtime.tools.execute("knowledge.read_snippet", args);
    assert.deepEqual(bridge, plugin);
  }
  const empty = JSON.parse(await readKnowledgeSnippetJson({ path: "vault/01-Areas/Empty.md" }, { knowledge }));
  assert.deepEqual({ snippet: empty.snippet, offset: empty.offset, nextOffset: empty.nextOffset, truncated: empty.truncated }, { snippet: "", offset: 0, nextOffset: null, truncated: false });
  for (const offset of [-1, 1.5, null, "2", Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(readKnowledgeSnippetJson({ path: "vault/01-Areas/Long Note.md", offset }, { knowledge }), { code: "TOOL_INPUT_INVALID" });
    await assert.rejects(runtime.tools.execute("knowledge.read_snippet", { path: "vault/01-Areas/Long Note.md", offset }));
  }
  for (const offset of [0, 100, 10000]) {
    const args = { path: "vault/01-Areas/Agent Secret.md", offset };
    await assert.rejects(readKnowledgeSnippetJson(args, { knowledge }), { code: "KNOWLEDGE_SENSITIVE_DENIED" });
    await assert.rejects(runtime.tools.execute("knowledge.read_snippet", args), { code: "KNOWLEDGE_SENSITIVE_DENIED" });
  }
});

test("snippet cursor schema accepts an integer or null and rejects other output types", () => {
  for (const value of [200, null]) {
    const errors = [];
    validateValue(value, { type: ["integer", "null"] }, "$", errors);
    assert.deepEqual(errors, []);
  }
  for (const value of ["200", {}, 1.5, false]) {
    const errors = [];
    validateValue(value, { type: ["integer", "null"] }, "$", errors);
    assert.equal(errors.length, 1);
  }
});

test("quoted privacy flags are denied consistently by search, plugin and Bridge at every offset", async (t) => {
  const { knowledge, vaultRoot, indexFile } = await fixture(t);
  const runtime = createSynoRuntime({ knowledge });
  for (const flag of ['sensitive: "true"', "private: 'yes'", 'privacy: "private"', "privacy: 'sensitive'", 'sensitive: false\nprivate: "true"']) {
    await fs.writeFile(path.join(vaultRoot, "01-Areas", "Quoted Private.md"), `---\ntitle: Quoted Private\n${flag}\n---\n${"文".repeat(500)}\nPRIVATE_FIXTURE`, "utf8");
    knowledge.invalidate();
    assert.deepEqual(await knowledge.search("Quoted", { includeSensitive: false }), []);
    assert.deepEqual(JSON.parse(await searchKnowledgeNotes({ query: "Quoted", vaultRoot, indexFile })), []);
    for (const offset of [0, 300, 10000]) {
      const args = { path: "vault/01-Areas/Quoted Private.md", offset };
      await assert.rejects(readKnowledgeSnippetJson(args, { knowledge }), { code: "KNOWLEDGE_SENSITIVE_DENIED" });
      await assert.rejects(runtime.tools.execute("knowledge.read_snippet", args), { code: "KNOWLEDGE_SENSITIVE_DENIED" });
    }
  }
});

test("knowledge reads reject directory links outside vault and allow links contained in vault", async (t) => {
  const { knowledge, vaultRoot } = await fixture(t);
  const runtime = createSynoRuntime({ knowledge });
  const outside = path.join(path.dirname(vaultRoot), "外部 资料 😀");
  await fs.mkdir(outside);
  await fs.writeFile(path.join(outside, "outside.md"), "OUTSIDE_VAULT_FIXTURE", "utf8");
  const type = process.platform === "win32" ? "junction" : "dir";
  await fs.symlink(outside, path.join(vaultRoot, "外部链接"), type);
  const args = { path: "vault/外部链接/outside.md" };
  await assert.rejects(knowledge.read(args.path), { code: "PATH_OUTSIDE_ROOT" });
  await assert.rejects(readKnowledgeSnippetJson(args, { knowledge }), { code: "PATH_OUTSIDE_ROOT" });
  await assert.rejects(runtime.tools.execute("knowledge.read_snippet", args), { code: "PATH_OUTSIDE_ROOT" });
  await fs.symlink(path.join(vaultRoot, "01-Areas"), path.join(vaultRoot, "内部链接"), type);
  const read = await knowledge.read("vault/内部链接/Agent Loop.md");
  assert.match(read.markdown, /循环机制/);
  assert.equal(read.path, "vault/内部链接/Agent Loop.md");
  const linkedRoot = path.join(path.dirname(vaultRoot), "vault-alias");
  await fs.symlink(vaultRoot, linkedRoot, type);
  assert.match((await new KnowledgeStore({ vaultRoot: linkedRoot }).read("vault/01-Areas/Agent Loop.md")).markdown, /循环机制/);
});

test("snippet offsets inside a surrogate pair round back and reads remain bounded", async (t) => {
  const { knowledge, vaultRoot } = await fixture(t);
  await fs.writeFile(path.join(vaultRoot, "01-Areas", "Emoji.md"), `甲😀${"乙".repeat(9000)}`, "utf8");
  const result = JSON.parse(await readKnowledgeSnippetJson({ path: "vault/01-Areas/Emoji.md", offset: 2, maxChars: 99999 }, { knowledge }));
  assert.equal(result.offset, 1);
  assert.ok(result.snippet.startsWith("😀"));
  assert.equal(result.snippet.length, 8000);
  assert.equal(result.nextOffset, 8001);
});

test("search excerpts fall back to token matches or the opening without changing offsets", async (t) => {
  const { knowledge, vaultRoot, indexFile } = await fixture(t);
  await fs.writeFile(path.join(vaultRoot, "01-Areas", "Fallback.md"), `---\ntitle: Metadata Match\ntags: [tag_only]\n---\n${"文".repeat(500)}\n关键词分段读取。`, "utf8");
  const [tokens] = await knowledge.search("missing 分段读取");
  assert.match(tokens.excerpt, /分段读取/);
  assert.ok(tokens.excerptOffset > 400);
  const [metadata] = JSON.parse(await searchKnowledgeNotes({ query: "tag_only", vaultRoot, indexFile }));
  assert.equal(metadata.excerptOffset, 0);
});

test("public search fills its limit after removing higher-ranked sensitive notes in both tool surfaces", async (t) => {
  const { knowledge, vaultRoot, indexFile } = await fixture(t);
  for (let index = 0; index < 4; index += 1) {
    await fs.writeFile(path.join(vaultRoot, "01-Areas", `Private-${index}.md`), `---\ntitle: Private Target ${index}\nsensitive: true\n---\n私密夹具\n`, "utf8");
  }
  await fs.writeFile(path.join(vaultRoot, "01-Areas", "Public.md"), "---\ntitle: Public Guide\n---\nTarget 正文\n", "utf8");
  await fs.writeFile(path.join(vaultRoot, "01-Areas", "Manual.md"), "---\ntitle: Public Manual\n---\nTarget 用法\n", "utf8");
  const runtime = createSynoRuntime({ knowledge });
  for (const limit of [1, 2, 20]) {
    const plugin = JSON.parse(await searchKnowledgeNotes({ query: "Target", limit, vaultRoot, indexFile }));
    const bridge = await runtime.tools.execute("knowledge.search", { query: "Target", limit });
    assert.deepEqual(JSON.parse(JSON.stringify(bridge)), plugin);
    assert.deepEqual(plugin.map((item) => item.title), limit === 1 ? ["Public Guide"] : ["Public Guide", "Public Manual"]);
    assert.equal(Object.hasOwn(plugin[0], "sensitive"), false);
  }
  assert.equal((await knowledge.search("Target", { limit: 1 }))[0].sensitive, true);
  assert.deepEqual(await knowledge.search("Private", { includeSensitive: false }), []);
  assert.equal((await knowledge.search("Private")).length, 4);
  assert.deepEqual(JSON.parse(await searchKnowledgeNotes({ query: "Private", vaultRoot, indexFile })), []);
});
