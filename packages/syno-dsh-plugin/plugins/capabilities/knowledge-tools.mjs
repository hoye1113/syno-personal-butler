import { KnowledgeStore } from "../../../../packages/syno-core/knowledge-store.mjs";
import { readKnowledgeSnippet } from "../../../../packages/syno-core/knowledge-read.mjs";

const KNOWLEDGE_SEARCH_TOOL_NAME = "syno_core_knowledge_search";
const KNOWLEDGE_READ_SNIPPET_TOOL_NAME = "syno_core_knowledge_read_snippet";

let sharedStore = null;

function storeFor({ vaultRoot, indexFile } = {}) {
  if (vaultRoot || indexFile) {
    return new KnowledgeStore({
      ...(vaultRoot ? { vaultRoot } : {}),
      ...(indexFile ? { indexFile } : {}),
    });
  }
  if (!sharedStore) sharedStore = new KnowledgeStore({});
  return sharedStore;
}

async function searchKnowledgeNotes({ query, limit, vaultRoot, indexFile } = {}) {
  const bounded = Math.min(20, Math.max(1, Number(limit) || 8));
  const results = (await storeFor({ vaultRoot, indexFile }).search(String(query || ""), { limit: bounded }))
    .filter((item) => item.sensitive !== true)
    .map(({ sensitive, ...item }) => item);
  return JSON.stringify(results);
}

async function readKnowledgeSnippetJson({ path: notePath, maxChars } = {}, { knowledge = null } = {}) {
  const store = knowledge || storeFor({});
  return JSON.stringify(await readKnowledgeSnippet(store, notePath, maxChars));
}

export {
  KNOWLEDGE_READ_SNIPPET_TOOL_NAME,
  KNOWLEDGE_SEARCH_TOOL_NAME,
  readKnowledgeSnippetJson,
  searchKnowledgeNotes,
};
