import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildTopicDraftFromInbox } from "../apps/syno/inbox-import.mjs";
import { validateContractRecord } from "../apps/syno/syno/schema-registry.mjs";

test("all public contracts are JSON Schema objects with stable identifiers", async () => {
  const root = path.resolve("contracts");
  const files = (await fs.readdir(root)).filter((file) => file.endsWith(".json"));
  assert.ok(files.length >= 7);
  for (const file of files) {
    const schema = JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.match(schema.$id, /^https:\/\/syno\.local\/contracts\//);
    assert.equal(schema.type, "object");
    assert.ok(Array.isArray(schema.required));
  }
});

test("Afu topic drafts satisfy the executable ContentIdea contract", async () => {
  const candidate = {
    title: "知识库如何成为创作系统", dedupeKey: "abcdef1234", suggestedStage: "去重中",
    sourcePath: "vault/00-Inbox/source.md", sourceUrl: "https://example.com/source",
    author: "", source: "", tags: [], excerpt: "把知识检索、主张与排期连成可验证的创作闭环。",
  };
  const draft = buildTopicDraftFromInbox(candidate, "2026-07-17");
  const field = (name) => new RegExp(`^${name}:\\s*["']?(.+?)["']?\\s*$`, "m").exec(draft.content)?.[1];
  await validateContractRecord("content-idea", {
    type: field("type"), topic_id: field("topic_id"), title: candidate.title,
    status: field("status"), stage: field("stage"), source_inbox_path: candidate.sourcePath,
  });
});
