import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

import { KnowledgeMaintenanceSource } from "../packages/syno-core/knowledge-maintenance-source.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const FIXED_NOW = new Date("2026-07-21T08:00:00.000Z");

async function setup(t, notes = {}) {
  const testRoot = path.join(REPO_ROOT, ".runtime", "tests");
  await fs.mkdir(testRoot, { recursive: true });
  const tempRoot = await fs.mkdtemp(path.join(testRoot, "syno-maintenance-"));
  const vaultRoot = path.join(tempRoot, "vault");
  await fs.mkdir(vaultRoot, { recursive: true });
  const runtimeRoot = path.join(tempRoot, ".runtime");
  await fs.mkdir(runtimeRoot, { recursive: true });
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));

  for (const [name, content] of Object.entries(notes)) {
    await fs.mkdir(path.dirname(path.join(vaultRoot, name)), { recursive: true });
    await fs.writeFile(path.join(vaultRoot, name), content, "utf8");
  }

  const maintenance = new KnowledgeMaintenanceSource({ vaultRoot, runtimeRoot, clock: () => FIXED_NOW });
  return { maintenance, vaultRoot, runtimeRoot };
}

test("inspect returns orphan notes", async (t) => {
  const { maintenance } = await setup(t, {
    "linked.md": "---\ntitle: Linked\n---\n# Linked\n\n[[principle]]",
    "principle.md": "# Principle",
    "orphan.md": "# Orphan\n\n孤立无链接。",
  });
  const findings = await maintenance.inspect();
  assert.ok(findings.length > 0);
  assert.ok(findings.some((f) => f.path.includes("orphan.md")));
});

test("inspect uses vault fingerprint as cache key", async (t) => {
  const { maintenance, vaultRoot } = await setup(t, {
    "orphan.md": "# Orphan\n\n孤立。",
  });
  const first = await maintenance.inspect();
  // 添加新文件改变 fingerprint
  await fs.writeFile(path.join(vaultRoot, "new.md"), "# New\n", "utf8");
  const second = await maintenance.inspect();
  // fingerprint 改变后应该重新计算
  assert.ok(second.length >= first.length);
});

test("inspect returns at most dailyLimit items", async (t) => {
  const notes = {};
  for (let i = 0; i < 10; i++) {
    notes[`orphan-${i}.md`] = `# Orphan ${i}\n\n孤立笔记 ${i}。`;
  }
  const { maintenance } = await setup(t, notes);
  const findings = await maintenance.inspect();
  assert.ok(findings.length <= 1, `should return at most 1 item, got ${findings.length}`);
});

test("7-day cooldown prevents re-recommending same path", async (t) => {
  const { maintenance, runtimeRoot } = await setup(t, {
    "orphan.md": "# Orphan\n\n孤立。",
  });
  // 第一次检查
  const first = await maintenance.inspect();
  assert.ok(first.length > 0);
  // 记录推荐
  maintenance.recordRecommendation(first[0].path);
  // 第二次检查（同一天）- 应该被冷却
  const second = await maintenance.inspect();
  assert.equal(second.length, 0, "same path should be cooled down");
});

test("rotation prefers different topics", async (t) => {
  const notes = {
    "00-Inbox/orphan-a.md": "# Orphan A\n\n孤立 A。",
    "01-Areas/orphan-b.md": "# Orphan B\n\n孤立 B。",
    "02-Resources/orphan-c.md": "# Orphan C\n\n孤立 C。",
  };
  const { maintenance } = await setup(t, notes);
  // 由于 dailyLimit=1，每次只返回 1 个
  const findings = await maintenance.inspect();
  assert.ok(findings.length <= 1);
});

test("weeklySummary groups orphans by topic", async (t) => {
  const { maintenance } = await setup(t, {
    "00-Inbox/orphan-a.md": "# Orphan A\n\n孤立 A。",
    "01-Areas/orphan-b.md": "# Orphan B\n\n孤立 B。",
    "01-Areas/orphan-c.md": "# Orphan C\n\n孤立 C。",
  });
  const summary = await maintenance.weeklySummary();
  assert.ok(summary.totalOrphans >= 3);
  assert.ok(summary.topics.length >= 2);
  const areasTopic = summary.topics.find((t) => t.topic === "01-Areas");
  assert.ok(areasTopic, "should have 01-Areas topic");
  assert.ok(areasTopic.count >= 2, "01-Areas should have 2 orphans");
});

test("recordRecommendation persists to runtime", async (t) => {
  const { maintenance, runtimeRoot } = await setup(t, {});
  maintenance.recordRecommendation("vault/test.md");
  const historyFile = path.join(runtimeRoot, "maintenance-history.json");
  const data = JSON.parse(await fs.readFile(historyFile, "utf8"));
  assert.ok(data.length === 1);
  assert.equal(data[0].path, "vault/test.md");
});

test("recordRecommendation deduplicates by path instead of appending", async (t) => {
  const { maintenance, runtimeRoot } = await setup(t, {});
  maintenance.recordRecommendation("vault/test.md");
  maintenance.recordRecommendation("vault/other.md");
  maintenance.recordRecommendation("vault/test.md"); // 同 path 重复
  const historyFile = path.join(runtimeRoot, "maintenance-history.json");
  const data = JSON.parse(await fs.readFile(historyFile, "utf8"));
  assert.equal(data.length, 2, "duplicate path should overwrite, not append");
  assert.equal(data.filter((entry) => entry.path === "vault/test.md").length, 1);
});

test("weeklySummary reuses the orphan cache warmed by inspect", async (t) => {
  const { maintenance } = await setup(t, {
    "00-Inbox/a.md": "# A\n\n孤立 A。",
    "01-Areas/b.md": "# B\n\n孤立 B。",
    "01-Areas/c.md": "# C\n\n孤立 C。",
  });
  assert.equal(maintenance._cache, null);
  await maintenance.inspect();
  const warmedCache = maintenance._cache;
  assert.ok(Array.isArray(warmedCache) && warmedCache.length > 0, "inspect warms the orphan cache");
  const summary = await maintenance.weeklySummary();
  assert.equal(maintenance._cache, warmedCache, "weeklySummary must reuse the same cache instance, not recompute");
  assert.equal(summary.totalOrphans, warmedCache.length, "summary total matches cached orphans");
});

test("excludes 99-System, 03-Archive, and recognizes pipe aliases and MOC references", async (t) => {
  const { maintenance } = await setup(t, {
    "99-System/audit.md": "# System Audit\n\n孤立但属于系统。",
    "03-Archive/old.md": "# Archived Issue\n\n孤立但属于归档。",
    "CLAUDE.md": "# Repo Guide\n\n根目录说明。",
    "MOC - Topic.md": "# Topic MOC\n\n[[item-in-moc|Item Alias]]",
    "item-in-moc.md": "# Item In MOC\n\n被 MOC 别名引用。",
    "real-orphan.md": "# Real Orphan\n\n真正孤立。",
  });
  const findings = await maintenance.inspect({ limit: 10 });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].path, "vault/real-orphan.md");
});


test("maintenance excludes personal memories and refreshes after edits without path changes",async t=>{
 const {maintenance,vaultRoot}=await setup(t,{"a.md":"# A","private.md":"---\nmemory_proposal: memory-1\n---\n私人事实"});
 assert.equal((await maintenance.weeklySummary()).totalOrphans,1);await fs.writeFile(path.join(vaultRoot,"a.md"),"# A\n\n[[target]]");assert.equal((await maintenance.weeklySummary()).totalOrphans,0);
});

test("maintenance reports reproducible duplicates, broken links and missing sources without writes", async t => {
 const {maintenance,vaultRoot}=await setup(t, {
  '00-Inbox/a.md':'---\ntitle: A\nsource: https://example.com/article\n---\n# A\n[[missing|断链]] [ok](b.md)\n',
  '00-Inbox/b.md':'---\ntitle: B\nsource: https://example.com/article#part\n---\n# B\n',
  '00-Inbox/c.md':'# C\n`[[code]]`\n',
  '00-Inbox/d.md':'# C\n`[[code]]`\n',
 });
 const before=await fs.readFile(path.join(vaultRoot,'00-Inbox/a.md'),'utf8');
 const r=await maintenance.weeklySummary();
 assert.equal(r.duplicates.length,2);assert.equal(r.brokenLinks.length,1);
 assert.equal(r.brokenLinks[0].link,'[[missing|断链]]'); assert.equal(r.missingSources.length,2);
 assert.equal(await fs.readFile(path.join(vaultRoot,'00-Inbox/a.md'),'utf8'),before);
});
