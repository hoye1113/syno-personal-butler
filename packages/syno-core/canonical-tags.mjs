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

function classifyTags(values = []) {
  const approved = [];
  const candidates = [];
  for (const value of values.map((item) => String(item).trim()).filter(Boolean)) {
    const canonical = TAG_ALIASES.get(value) || value;
    if (APPROVED_TAGS.has(canonical)) approved.push(canonical);
    else candidates.push(value);
  }
  return {
    approved: [...new Set(approved)],
    candidates: [...new Set(candidates)],
  };
}

export { APPROVED_TAGS, TAG_ALIASES, classifyTags };
