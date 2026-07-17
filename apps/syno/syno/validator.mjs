import { promises as fs } from "node:fs";
import path from "node:path";

import { PATHS } from "./paths.mjs";

function normalizeRelative(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function validateChangedPaths(paths, decision) {
  const normalized = [...new Set((paths || []).map(normalizeRelative).filter(Boolean))];
  const forbidden = normalized.filter((item) => item === ".git" || item.startsWith(".git/") || item.startsWith(".runtime/") || item.includes("../"));
  if (forbidden.length) throw new Error(`检测到禁止变更路径：${forbidden.join(", ")}`);
  const allowed = decision.allowedRoots || [];
  if (!allowed.length && normalized.length) throw new Error("只读 Profile 产生了文件变更");
  const outside = normalized.filter((item) => !allowed.some((root) => item === root || item.startsWith(`${root}/`)));
  if (outside.length) throw new Error(`变更超出 ${decision.profile} 允许范围：${outside.join(", ")}`);
  return normalized;
}

async function validateMarkdown(repoRoot, changedPaths) {
  const errors = [];
  for (const relative of changedPaths.filter((item) => item.endsWith(".md") && item.startsWith("vault/"))) {
    const file = path.join(repoRoot, relative);
    let text;
    try { text = await fs.readFile(file, "utf8"); } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) errors.push(`${relative}: 缺少 frontmatter`);
    if (!/^title:\s*.+$/m.test(text)) errors.push(`${relative}: 缺少 title`);
    if (/^tags:\s*\[?[^\n]*#[^\n]*/m.test(text)) errors.push(`${relative}: tag 不应包含 #`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
}

async function validateRepositoryChange({ repoRoot = PATHS.repoRoot, changedPaths, decision }) {
  const normalized = validateChangedPaths(changedPaths, decision);
  if (decision.validators?.includes("markdown")) await validateMarkdown(repoRoot, normalized);
  return { ok: true, changedPaths: normalized };
}

export { validateChangedPaths, validateMarkdown, validateRepositoryChange };
