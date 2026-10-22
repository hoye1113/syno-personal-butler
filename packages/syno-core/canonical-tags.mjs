import { promises as fs } from "node:fs";
import path from "node:path";

const APPROVED_TAGS = new Set([
  "ai_agent", "ai_coding", "ai_evaluation", "ai_safety", "ai_career", "ai_philosophy",
  "article", "video_transcript", "podcast", "course", "moc", "notes", "zhihu", "wechat",
  "bilibili", "youtube", "podcast_rss", "claude_code", "codex", "cursor", "devin", "chatgpt",
  "claude", "openai", "anthropic", "harness_engineering", "loop_engineering", "memory", "multi_agent",
  "context_engineering", "skills", "hooks", "mcp", "prompting", "fde", "web_clipping",
  "content_creation", "text_refinement", "author", "loock_ai", "coding_agent", "chatbot", "column",
  "interview", "nextjs", "frontend_agent_interview", "dialogue", "langgraphjs_tutorial",
  "langgraphjs_quickstart", "ai_native", "lecture", "agent_architecture", "s_tier", "taste",
]);

const TAG_ALIASES = new Map([
  ["langgraphjs-tutorial", "langgraphjs_tutorial"], ["langgraphjs-quickstart", "langgraphjs_quickstart"],
  ["frontend-agent-interview", "frontend_agent_interview"], ["coding-agent", "coding_agent"],
  ["哲学", "ai_philosophy"], ["自我认知", "ai_philosophy"], ["心理学", "ai_philosophy"],
  ["职业规划", "ai_career"], ["招聘面试", "ai_career"],
]);

// 主人批准的新标签注册表（2026-10-22，action-20261022-af48e32f）：候选标签原先只写进
// 提案提示、无处落库。现在落在 ops/knowledge/approved-tags.json，与内置 APPROVED_TAGS 并列生效。
const TAG_FORMAT = /^[a-z][a-z0-9_]{1,39}$/u;
const REGISTRY_RELATIVE = "knowledge/approved-tags.json";

async function readRegistry(opsRoot) {
  try {
    const data = JSON.parse(await fs.readFile(path.join(opsRoot, REGISTRY_RELATIVE), "utf8"));
    return Array.isArray(data?.approved) ? data.approved.filter((tag) => typeof tag === "string") : [];
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function loadExtraApprovedTags(opsRoot) {
  return new Set((await readRegistry(opsRoot)).filter((tag) => TAG_FORMAT.test(tag)));
}

async function registerApprovedTags(opsRoot, values = []) {
  const tags = [...new Set(values.map((item) => String(item).trim()).filter(Boolean))];
  if (!tags.length || tags.length > 20) throw Object.assign(new Error("一次登记 1~20 个标签"), { code: "TAGS_INVALID" });
  const malformed = tags.filter((tag) => !TAG_FORMAT.test(tag));
  if (malformed.length) throw Object.assign(new Error(`标签须为小写 snake_case：${malformed.join("、")}`, { cause: malformed }), { code: "TAGS_INVALID" });
  const known = new Set([...APPROVED_TAGS, ...await readRegistry(opsRoot)]);
  const added = tags.filter((tag) => !known.has(tag));
  if (added.length) {
    const next = [...new Set([...await readRegistry(opsRoot), ...added])].sort();
    const file = path.join(opsRoot, REGISTRY_RELATIVE);
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify({ schema: "approved-tags", version: 1, approved: next }, null, 2)}\n`, "utf8");
    await fs.rename(temporary, file);
  }
  return { added, alreadyKnown: tags.filter((tag) => known.has(tag)) };
}

function classifyTags(values = [], extraApproved) {
  const approvedSet = extraApproved ? new Set([...APPROVED_TAGS, ...extraApproved]) : APPROVED_TAGS;
  const approved = [];
  const candidates = [];
  for (const value of values.map((item) => String(item).trim()).filter(Boolean)) {
    const canonical = TAG_ALIASES.get(value) || value;
    if (approvedSet.has(canonical)) approved.push(canonical);
    else candidates.push(value);
  }
  return {
    approved: [...new Set(approved)],
    candidates: [...new Set(candidates)],
  };
}

export { APPROVED_TAGS, TAG_ALIASES, TAG_FORMAT, classifyTags, loadExtraApprovedTags, registerApprovedTags };
