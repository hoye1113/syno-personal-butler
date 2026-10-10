import process from "node:process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PATHS } from "../packages/syno-core/paths.mjs";

const GITHUB_SEARCH_ENDPOINTS = [
  "https://api.github.com/search/repositories?q=topic:agent-skills+sort:stars-desc&per_page=15",
  "https://api.github.com/search/repositories?q=topic:claude-skills+sort:stars-desc&per_page=10"
];

const OVER_CONSTRAINED_KEYWORDS = [
  "82 items",
  "heavy framework",
  "checklist only",
  "286 skills",
  "rigid workflow",
  "form filling"
];

const HIGH_LEVERAGE_KEYWORDS = [
  "minimalist",
  "lazy dev",
  "architecture",
  "design",
  "native",
  "harness",
  "taste",
  "diagram",
  "fable",
  "real browser",
  "voice"
];

function evaluateSkillStyle(desc = "", stars = 0, pushedAt = "") {
  const lower = desc.toLowerCase();
  const pushDate = new Date(pushedAt);
  const now = new Date();
  const diffDays = Math.floor((now - pushDate) / (1000 * 60 * 60 * 24));

  let freshness = "🟢 极度活跃";
  if (diffDays > 120) freshness = "🔴 维护停滞";
  else if (diffDays > 30) freshness = "🟡 偶发维护";

  let styleTag = "⚡ 现代轻量实战";
  for (const kw of OVER_CONSTRAINED_KEYWORDS) {
    if (lower.includes(kw)) {
      styleTag = "⚠️ 警惕流程臃肿/过度规训";
      break;
    }
  }

  for (const kw of HIGH_LEVERAGE_KEYWORDS) {
    if (lower.includes(kw)) {
      styleTag = "🌟 强模型高杠杆心智";
      break;
    }
  }

  return { freshness, diffDays, styleTag };
}

export async function runSkillsRadar(options = {}) {
  const isVerbose = options.verbose || process.argv.includes("--verbose");
  console.log("=== 正在启动 Agent Skills 全网爆款与前沿雷达巡检 ===");

  const repoMap = new Map();

  for (const endpoint of GITHUB_SEARCH_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          "User-Agent": "Syno-Butler-Skills-Radar/1.0",
          Accept: "application/vnd.github.v3+json"
        }
      });
      if (res.status === 200) {
        const data = await res.json();
        for (const item of data.items || []) {
          if (!repoMap.has(item.full_name)) {
            repoMap.set(item.full_name, item);
          }
        }
      } else {
        console.warn(`[warn] 检索端点返回状态 ${res.status}: ${endpoint}`);
      }
    } catch (err) {
      console.warn(`[warn] 探测异常: ${err.message}`);
    }
  }

  const items = Array.from(repoMap.values()).sort((a, b) => b.stargazers_count - a.stargazers_count);
  console.log(`\n全网去重发现 ${items.length} 个核心 Agent Skills 候选仓库：\n`);

  const results = [];

  for (const item of items) {
    const evalResult = evaluateSkillStyle(item.description, item.stargazers_count, item.pushed_at);
    results.push({
      fullName: item.full_name,
      htmlUrl: item.html_url,
      stars: item.stargazers_count,
      pushedAt: item.pushed_at ? item.pushed_at.slice(0, 10) : "未知",
      description: item.description || "暂无描述",
      ...evalResult
    });

    console.log(`- [${evalResult.styleTag}] ${item.full_name} (${item.stargazers_count} ★) [${evalResult.freshness} · ${evalResult.diffDays}天前]`);
    console.log(`  链接: ${item.html_url}`);
    console.log(`  简介: ${item.description || "无"}\n`);
  }

  // 写入 ops/artifacts/ 作为最新巡检快照
  const snapshotPath = path.join(PATHS.repoRoot, "ops", "artifacts", "candidates", "skills-radar-latest.json");
  await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
  await fs.writeFile(snapshotPath, JSON.stringify({ scannedAt: new Date().toISOString(), total: results.length, items: results }, null, 2), "utf8");
  console.log(`✅ 最新巡检快照已沉淀至: ops/artifacts/candidates/skills-radar-latest.json`);

  return results;
}

if (process.argv[1] && process.argv[1].endsWith("radar-trending-skills.mjs")) {
  runSkillsRadar().catch((err) => {
    console.error("雷达巡检失败:", err);
    process.exitCode = 1;
  });
}
