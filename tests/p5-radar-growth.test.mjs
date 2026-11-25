import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { GROWTH_SOURCES, parseCsv, refreshGrowthRankings, selectGithubProjects, selectSkillProjects } from "../experiments/superagent-p0/p5-radar/growth.mjs";
import { createRadarSiteStore } from "../experiments/superagent-p0/p5-radar/site-store.mjs";

async function temporaryHome(t) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "p5-growth-"));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  return home;
}

function githubDocument(count = 12, sourceDate = "2026-11-25") {
  return {
    today_utc: sourceDate,
    generated_at: `${sourceDate}T01:00:00Z`,
    projects: Array.from({ length: count }, (_, index) => ({
      name: `owner/repo-${index}`,
      ok: true,
      history_complete: true,
      category: "ai",
      stars: 10_000 - index,
      created_at: "2026-01-02T00:00:00Z",
      github_description: `真实项目描述 ${index}`,
      growth: { week: { window_days: 7, effective_days: 7, gained: 100 + index * 7, per_day: (100 + index * 7) / 7 } },
    })),
  };
}

function skillCsv(count = 12) {
  return `rank,repo,stars,stars_1d,pushed_at,skills_tracked,topics\n${Array.from({ length: count }, (_, index) => `${index + 1},owner/skill-${index},${5000 - index},${20 + index * 3},2026-11-24T00:00:00Z,${index + 1},"agents|tools"`).join("\n")}\n`;
}

function fakeFetch({ github = githubDocument(), skill = skillCsv(), fail = new Set() } = {}) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (fail.has(url)) return new Response("upstream unavailable", { status: 503 });
    if (url === GROWTH_SOURCES.github) return new Response(JSON.stringify(github), { headers: { "Content-Type": "application/json" } });
    if (url === GROWTH_SOURCES.skill) return new Response(skill, { headers: { "Last-Modified": "Tue, 24 Nov 2026 01:00:00 GMT" } });
    if (url.endsWith("/README.md")) return new Response(`# Public project\n\n${"只用于分析的公开 README。".repeat(12)}`);
    throw new Error(`unexpected URL ${url}`);
  };
  return { calls, fetchImpl };
}

const fixedNow = () => new Date("2026-11-25T02:00:00Z");

test("GitHub 按 7 日增量而非总 Star 排序，并过滤无效候选", () => {
  const document = githubDocument();
  document.projects[0].growth.week.gained = 5000;
  document.projects.push(
    { ...document.projects[1], name: "owner/incomplete", history_complete: false },
    { ...document.projects[1], name: "owner/non-ai", category: "web" },
    { ...document.projects[1], name: "owner/bad-window", growth: { week: { window_days: 6, effective_days: 6, gained: 9999 } } },
    { ...document.projects[1], name: "owner/bad-number", growth: { week: { window_days: 7, effective_days: 7, gained: "oops" } } },
    { ...document.projects[1], name: "owner/array-number", growth: { week: { window_days: 7, effective_days: 7, gained: [] } } },
    { ...document.projects[1], name: "owner/fraction", growth: { week: { window_days: 7, effective_days: 7, gained: 1.5 } } },
    { ...document.projects[1], name: "OWNER/REPO-2", growth: { week: { window_days: 7, effective_days: 7, gained: 4000 } } },
  );
  const items = selectGithubProjects(document);
  assert.equal(items.length, 10);
  assert.equal(items[0].repo, "owner/repo-0");
  assert.equal(items[0].gained, 5000);
  assert.equal(items[1].repo, "OWNER/REPO-2");
  assert.equal(items[1].gained, 4000);
  assert.equal(new Set(items.map((item) => item.repo.toLowerCase())).size, items.length);
  assert.ok(items.every((item) => item.analysis.status === "metadata"));
  assert.equal(selectGithubProjects(githubDocument(3)).length, 3);
});

test("Skill 使用 stars_1d，缺失值不以总 Star 替代，也不补足旧数据", () => {
  const rows = parseCsv(`﻿${skillCsv()}owner/missing,80000,,2026-11-24,2,agents\nowner/negative,90000,-4,2026-11-24,2,agents\nowner/invalid,Infinity,10,2026-11-24,2,agents\n`);
  rows[0].stars_1d = "900";
  const items = selectSkillProjects(rows);
  assert.equal(items.length, 10);
  assert.equal(items[0].repo, "owner/skill-0");
  assert.equal(items[0].gained, 900);
  assert.ok(items.every((item) => item.stars > item.gained || item.repo === "owner/skill-0"));
  assert.equal(selectSkillProjects(skillCsv(2)).length, 2);
});

test("CSV 支持 BOM、双引号、逗号、CRLF 与引号内换行", () => {
  const rows = parseCsv('﻿repo,topics,stars,stars_1d\r\n"owner/a","agents, ""quoted""\nnext",12,3\r\n');
  assert.deepEqual(rows[0], { repo: "owner/a", topics: 'agents, "quoted"\nnext', stars: "12", stars_1d: "3" });
  assert.throws(() => parseCsv('repo,stars,stars_1d\n"owner/a,1,2'), /未闭合/u);
});

test("真实响应落盘、哈希归因、同日幂等且各板独立快照", async (t) => {
  const home = await temporaryHome(t);
  const { calls, fetchImpl } = fakeFetch();
  const first = await refreshGrowthRankings({ home, fetchImpl, now: fixedNow });
  assert.equal(first.boards.github.status, "ok");
  assert.equal(first.boards.skill.status, "ok");
  assert.equal(calls.length, 2);
  const second = await refreshGrowthRankings({ home, fetchImpl, now: fixedNow });
  assert.equal(second.boards.github.cached, true);
  assert.equal(second.boards.skill.cached, true);
  assert.equal(calls.length, 2);
  const github = JSON.parse(await fs.readFile(path.join(home, "radar-growth-github-2026-11-25.json"), "utf8"));
  const skill = JSON.parse(await fs.readFile(path.join(home, "radar-growth-skill-2026-11-25.json"), "utf8"));
  const raw = await fs.readFile(path.join(home, github.source.rawPath), "utf8");
  assert.equal(github.source.sha256, createHash("sha256").update(raw).digest("hex"));
  assert.equal(github.attribution.license, "MIT");
  assert.equal(skill.attribution.license, "CC BY 4.0");
  assert.match(skill.coverage, /Top 100/u);
  assert.equal(skill.source.sourceDate, "Tue, 24 Nov 2026 01:00:00 GMT");
  const files = await fs.readdir(home);
  assert.equal(files.some((name) => name.endsWith(".tmp")), false);
});

test("单源失败保留旧快照并标 stale，另一源独立更新", async (t) => {
  const home = await temporaryHome(t);
  await refreshGrowthRankings({ home, fetchImpl: fakeFetch().fetchImpl, now: fixedNow });
  const previousSkill = await fs.readFile(path.join(home, "radar-growth-skill-2026-11-25.json"), "utf8");
  const laterDocument = githubDocument(12, "2026-11-26");
  laterDocument.projects[0].growth.week.gained = 7000;
  const { fetchImpl } = fakeFetch({ github: laterDocument, fail: new Set([GROWTH_SOURCES.skill]) });
  const result = await refreshGrowthRankings({ home, fetchImpl, now: () => new Date("2026-11-26T02:00:00Z") });
  assert.equal(result.boards.github.status, "ok");
  assert.equal(result.boards.skill.status, "error");
  assert.equal(await fs.readFile(path.join(home, "radar-growth-skill-2026-11-25.json"), "utf8"), previousSkill);
  const store = createRadarSiteStore({ home });
  const skill = await store.growth({ board: "skill" });
  const github = await store.growth({ board: "github" });
  assert.equal(skill.date, "2026-11-25");
  assert.equal(skill.stale, true);
  assert.equal((await store.growth({ board: "skill", date: "2026-11-25" })).stale, false, "显式读取历史快照不应被后续失败改写状态");
  assert.equal(github.date, "2026-11-26");
  assert.equal(github.stale, false);
  assert.equal(github.items[0].repo, "owner/repo-0");
});

test("force 采集失败不覆盖同日好快照，下一次普通运行可清除 stale", async (t) => {
  const home = await temporaryHome(t);
  await refreshGrowthRankings({ home, fetchImpl: fakeFetch().fetchImpl, now: fixedNow });
  const file = path.join(home, "radar-growth-github-2026-11-25.json");
  const original = await fs.readFile(file, "utf8");
  await refreshGrowthRankings({ home, fetchImpl: fakeFetch({ fail: new Set([GROWTH_SOURCES.github]) }).fetchImpl, now: fixedNow, force: true });
  assert.equal(await fs.readFile(file, "utf8"), original);
  const store = createRadarSiteStore({ home });
  assert.equal((await store.growth({ board: "github" })).stale, true);
  await refreshGrowthRankings({ home, fetchImpl: fakeFetch().fetchImpl, now: fixedNow });
  assert.equal((await store.growth({ board: "github" })).stale, false);
});

test("README 分析成功可追溯，client 失败降级且不丢失榜单", async (t) => {
  const home = await temporaryHome(t);
  const { fetchImpl } = fakeFetch({ github: githubDocument(1), skill: skillCsv(1) });
  const client = {
    model: { providerID: "test", id: "fixture" },
    generate: async () => ({ text: JSON.stringify({ summaryZh: "这是基于公开 README 的真实用途摘要。", points: ["核心能力一", "核心能力二"], whyZh: "与开发者工作流相关。", limitations: "未执行代码。" }) }),
  };
  await refreshGrowthRankings({ home, fetchImpl, now: fixedNow, analyze: true, client });
  const github = JSON.parse(await fs.readFile(path.join(home, "radar-growth-github-2026-11-25.json"), "utf8"));
  const analysis = github.items[0].analysis;
  assert.equal(analysis.status, "generated");
  assert.equal(analysis.model, "test/fixture");
  const readme = await fs.readFile(path.join(home, analysis.readmePath), "utf8");
  assert.equal(analysis.readmeSha256, createHash("sha256").update(readme).digest("hex"));
  const failedHome = await temporaryHome(t);
  await refreshGrowthRankings({ home: failedHome, fetchImpl, now: fixedNow, analyze: true, client: { generate: async () => { throw new Error("model unavailable"); } } });
  const degraded = JSON.parse(await fs.readFile(path.join(failedHome, "radar-growth-github-2026-11-25.json"), "utf8"));
  assert.equal(degraded.items.length, 1);
  assert.equal(degraded.items[0].analysis.status, "metadata");
  assert.match(degraded.items[0].analysis.analysisNote, /不可用/u);
});

test("网站只读校验 board/date，空历史不伪造快照", async (t) => {
  const home = await temporaryHome(t);
  const store = createRadarSiteStore({ home });
  assert.equal(await store.growth({ board: "github" }), null);
  await assert.rejects(() => store.growth({ board: "../secret" }), /榜单类型/u);
  await assert.rejects(() => store.growth({ board: "github", date: "2026-1-1" }), /日期/u);
  await assert.rejects(() => store.growth({ board: "github", date: "2026-02-30" }), /日期/u);
});
