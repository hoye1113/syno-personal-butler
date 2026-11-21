// Object-scoped read-only knowledge candidates and independent citation verification.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { KnowledgeStore } from "../../packages/syno-core/knowledge-store.mjs";
import { assertKnowledgeNotSensitive, sliceKnowledgeText } from "../../packages/syno-core/knowledge-read.mjs";

export const knowledgeDocumentId = (logicalPath) => `doc-${createHash("sha256").update(logicalPath).digest("hex").slice(0, 24)}`;
const store = (options) => new KnowledgeStore({ vaultRoot: options.vaultRoot, indexFile: options.indexFile });

export async function readKnowledgeDocument(options, documentId) {
  const notes = await store(options).list();
  const matches = notes.filter((note) => knowledgeDocumentId(note.path) === documentId);
  assert.ok(matches.length <= 1, "document_id 冲突");
  assert.ok(matches[0], "文档不存在或不可检索");
  const document = await store(options).read(matches[0].path);
  assertKnowledgeNotSensitive(document.markdown);
  return { ...document, documentId, sha256: createHash("sha256").update(document.markdown).digest("hex") };
}

export async function answerKnowledgeQuery(options, { documentId, query }) {
  const document = await readKnowledgeDocument(options, documentId);
  const at = document.markdown.toLocaleLowerCase("zh-CN").indexOf(query.toLocaleLowerCase("zh-CN"));
  if (at < 0) return {
    contextId: `knowledge:${documentId}`, documentId, read_status: "not_found",
    text: "该文档中没有找到匹配内容。", citations: [],
  };
  const slice = sliceKnowledgeText(document.markdown, Math.max(0, at - 60), 240);
  const citation = {
    document_id: documentId,
    path: document.path,
    sha256: document.sha256,
    offset: slice.offset,
    end: slice.offset + slice.snippet.length,
    excerpt: slice.snippet,
  };
  return {
    contextId: `knowledge:${documentId}`, documentId, read_status: "ok",
    text: `根据本地文档：${slice.snippet}\n\n[1] ${document.path}`, citations: [citation],
  };
}

export async function verifyKnowledgeAnswer(options, answer, expectedDocumentId) {
  assert.equal(answer.documentId, expectedDocumentId, "答案对象不匹配");
  assert.equal(answer.contextId, `knowledge:${expectedDocumentId}`, "答案 Context 不匹配");
  assert.ok(Array.isArray(answer.citations), "引用必须是数组");
  if (answer.read_status === "not_found") {
    assert.equal(answer.text, "该文档中没有找到匹配内容。", "未命中答案被篡改");
    assert.equal(answer.citations.length, 0, "未命中结果不能带引用");
    return;
  }
  assert.equal(answer.read_status, "ok", "未知只读结果状态");
  const markers = [...String(answer.text).matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
  assert.deepEqual(markers, answer.citations.map((_, index) => index + 1), "答案引用编号不一致");
  for (const citation of answer.citations) {
    assert.equal(citation.document_id, expectedDocumentId, "引用来自其他对象");
    const document = await readKnowledgeDocument(options, expectedDocumentId);
    assert.equal(document.path, citation.path, "引用路径与 document_id 不一致");
    assert.equal(document.sha256, citation.sha256, "引用文档哈希不一致");
    assert.ok(Number.isSafeInteger(citation.offset) && citation.offset >= 0 && Number.isSafeInteger(citation.end), "引用 offset 非法");
    assert.equal(citation.end, citation.offset + citation.excerpt.length, "引用长度不一致");
    assert.equal(document.markdown.slice(citation.offset, citation.end), citation.excerpt, "引用片段或 offset 不一致");
  }
  const expected = `根据本地文档：${answer.citations.map((citation) => citation.excerpt).join("\n")}\n\n${answer.citations.map((citation, index) => `[${index + 1}] ${citation.path}`).join("\n")}`;
  assert.equal(answer.text, expected, "答案包含未由引用证明的额外内容");
}

export function resolveKnowledgeRequest(text, documentIds) {
  const match = /^查询\s+(doc-[a-f0-9]{24})\s*[：:]\s*(.+)$/u.exec(text.trim());
  if (match) return { status: "resolved", documentId: match[1], query: match[2] };
  return { status: "ambiguous", candidates: [...documentIds] };
}
