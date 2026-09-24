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

async function readKnowledgeSnippet(knowledge, notePath, maxChars = 6_000) {
  const note = await knowledge.read(notePath);
  assertKnowledgeNotSensitive(note.markdown);
  const limit = Math.min(8_000, Math.max(200, Number(maxChars) || 6_000));
  return { path: note.path, title: note.title, snippet: note.markdown.slice(0, limit), truncated: note.markdown.length > limit };
}

export { assertKnowledgeNotSensitive, isSensitiveKnowledgeNote, readKnowledgeSnippet };
