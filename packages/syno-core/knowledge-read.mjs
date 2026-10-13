import { inspectRemoteContent } from "./sensitive-content.mjs";

function isSensitiveKnowledgeNote(markdown) {
  return /^(?:sensitive|private):\s*(?:true|yes)$/imu.test(markdown)
    || /^privacy:\s*(?:private|sensitive)$/imu.test(markdown)
    || !inspectRemoteContent(markdown, { maxChars: Number.MAX_SAFE_INTEGER }).safe;
}

function assertKnowledgeNotSensitive(markdown) {
  if (isSensitiveKnowledgeNote(markdown)) {
    const error = new Error("该笔记标记为敏感内容，禁止发送给远程模型");
    error.code = "KNOWLEDGE_SENSITIVE_DENIED";
    throw error;
  }
}

function sliceKnowledgeText(markdown, offset, maxChars) {
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw Object.assign(new Error("offset 必须是非负安全整数"), { code: "TOOL_INPUT_INVALID" });
  }
  let start = Math.min(offset, markdown.length);
  const splitsPair = (position) => position > 0 && position < markdown.length
    && /[\uD800-\uDBFF]/u.test(markdown[position - 1]) && /[\uDC00-\uDFFF]/u.test(markdown[position]);
  if (splitsPair(start)) start -= 1;
  let end = Math.min(markdown.length, start + maxChars);
  if (splitsPair(end)) end -= 1;
  return { snippet: markdown.slice(start, end), offset: start, nextOffset: end < markdown.length ? end : null, truncated: start > 0 || end < markdown.length };
}

async function readKnowledgeSnippet(knowledge, notePath, maxChars = 6_000, offset = 0) {
  const note = await knowledge.read(notePath);
  assertKnowledgeNotSensitive(note.markdown);
  const limit = Math.trunc(Math.min(8_000, Math.max(200, Number(maxChars) || 6_000)));
  return { path: note.path, title: note.title, ...sliceKnowledgeText(note.markdown, offset, limit) };
}

export { assertKnowledgeNotSensitive, isSensitiveKnowledgeNote, readKnowledgeSnippet, sliceKnowledgeText };
