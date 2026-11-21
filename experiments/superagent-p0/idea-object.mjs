// P3.1 idea objects: stable IDs, object index rows, versioned Markdown paths and a body-free router.
import { createHash } from "node:crypto";
import path from "node:path";

export const IDEA_ID = /^idea-[a-f0-9]{16}$/u;
export const IDEA_CONTEXT_PREFIX = "idea:";
export const IDEA_INDEX_PREFIX = "idea-index:";
export const IDEA_INPUT_PREFIX = "idea-input:";

export const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/** A new idea's ID is bound to the inbound message, so replay and crash recovery resolve the same object. */
export const ideaIdForMessage = ({ appId, messageId }) =>
  `idea-${sha256(`${appId}:${messageId}`).slice(0, 16)}`;

export const ideaContextId = (ideaId) => `${IDEA_CONTEXT_PREFIX}${ideaId}`;
export const ideaIndexKey = (ideaId) => `${IDEA_INDEX_PREFIX}${ideaId}`;
export const ideaInputKey = (taskId) => `${IDEA_INPUT_PREFIX}${taskId}`;

export const ideaVersionPath = (root, ideaId, version, messageId) =>
  path.join(root, ideaId, `v${version}-${messageId}.md`);

export const ideaComparePath = (root, ideaId, versions, messageId) =>
  path.join(root, ideaId, `compare-v${versions.join("-v")}-${messageId}.md`);

export const ideaTitle = (text) => {
  const line = String(text).replace(/\s+/g, " ").trim();
  return [...line].slice(0, 60).join("");
};

export function resolveIdeaRequest(text, knownIds = []) {
  const normalized = String(text).trim();
  const candidates = [...knownIds];
  if (/^新建想法/u.test(normalized)) {
    const match = /^新建想法\s*[：:]\s*(\S[\s\S]*)$/u.exec(normalized);
    if (!match) return { status: "ambiguous", reason: "missing-idea-text", candidates };
    return { status: "resolved", action: "new", prompt: match[1].trim() };
  }
  if (/^继续想法/u.test(normalized)) {
    const match = /^继续想法\s+(\S+)\s*[：:]\s*(\S[\s\S]*)$/u.exec(normalized);
    if (!match) return { status: "ambiguous", reason: "missing-idea-id", candidates };
    const ideaId = match[1];
    if (!IDEA_ID.test(ideaId) || !knownIds.includes(ideaId)) return { status: "unknown", ideaId, candidates };
    return { status: "resolved", action: "continue", ideaId, prompt: match[2].trim() };
  }
  if (/^比较想法/u.test(normalized)) {
    const match = /^比较想法\s+(\S+)\s+(\S+)\s*[：:]\s*(\S[\s\S]*)$/u.exec(normalized);
    if (!match) return { status: "ambiguous", reason: "missing-idea-ids", candidates };
    const pair = [match[1], match[2]];
    const invalid = pair.find((ideaId) => !IDEA_ID.test(ideaId));
    if (invalid) return { status: "unknown", ideaId: invalid, candidates };
    const unknown = pair.find((ideaId) => !knownIds.includes(ideaId));
    if (unknown) return { status: "unknown", ideaId: unknown, candidates };
    if (pair[0] === pair[1]) return { status: "ambiguous", reason: "same-idea", candidates };
    return { status: "resolved", action: "compare", ideaIds: pair, prompt: match[3].trim() };
  }
  return { status: "unsupported" };
}

/** The citation block is rendered from verified citations; it is the only place historical excerpts may appear. */
export function renderCitationBlock(citations) {
  if (!citations.length) return "（无历史引用）";
  return citations
    .map((citation, index) =>
      `[${index + 1}] ${citation.ideaId} v${citation.version}\npath: ${citation.path}\nsha256: ${citation.sha256}\n${citation.excerpt}`)
    .join("\n\n");
}

/**
 * A candidate keeps three independently checkable parts: this round's prompt, the Worker's new body,
 * and the frozen historical citations. The body is free text; it is not reconstructed from excerpts.
 */
export function candidateMarkdown({ ideaId, version, action, metadata, prompt, generatedText, citations }) {
  return `<!--syno-idea-candidate:${JSON.stringify(metadata)}-->\n# ${ideaId} v${version} ${action}\n\n## 本轮输入\n\n${prompt}\n\n## 生成正文\n\n${generatedText}\n\n## 引用\n\n${renderCitationBlock(citations)}\n`;
}

const CANDIDATE_HEADER = /^<!--syno-idea-candidate:(\{.*\})-->\n# [^\n]+\n\n/u;
const CANDIDATE_BODY = /^## 本轮输入\n\n([\s\S]*?)\n\n## 生成正文\n\n([\s\S]*?)\n\n## 引用\n\n([\s\S]*)\n$/u;

export function parseCandidateMarkdown(markdown) {
  const marker = CANDIDATE_HEADER.exec(markdown);
  if (!marker) throw new Error("候选 Markdown 缺少确定性元数据块");
  let metadata;
  try {
    metadata = JSON.parse(marker[1]);
  } catch {
    throw new Error("候选 Markdown 元数据不是合法 JSON");
  }
  const sections = CANDIDATE_BODY.exec(markdown.slice(marker[0].length));
  if (!sections) throw new Error("候选 Markdown 缺少本轮输入、生成正文或引用分区");
  return { metadata, prompt: sections[1], generatedText: sections[2], citationsText: sections[3] };
}
