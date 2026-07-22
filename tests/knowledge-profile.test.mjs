import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";

import { KnowledgeStore } from "../apps/syno/syno/knowledge-store.mjs";
import { KnowledgeMaintenanceSource } from "../apps/syno/syno/knowledge-maintenance-source.mjs";
import { ClaimEvidenceService } from "../apps/syno/syno/claim-evidence-service.mjs";
import { LearningService } from "../apps/syno/syno/learning-service.mjs";
import { KnowledgeProfileService } from "../apps/syno/syno/knowledge-profile-service.mjs";
import { parseRecord } from "../apps/syno/syno/markdown-record.mjs";
import { validateContractRecord } from "../apps/syno/syno/schema-registry.mjs";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const FIXED_NOW = new Date("2026-07-21T00:00:00.000Z");

async function setup(t, notes) {
  const testRoot = path.join(REPO_ROOT, ".runtime", "tests");
  await fs.mkdir(testRoot, { recursive: true });
  const vaultRoot = await fs.mkdtemp(path.join(testRoot, "syno-profile-vault-"));
  const opsRoot = await fs.mkdtemp(path.join(testRoot, "syno-profile-ops-"));
  t.after(() => Promise.all([
    fs.rm(vaultRoot, { recursive: true, force: true }),
    fs.rm(opsRoot, { recursive: true, force: true }),
  ]));
  for (const [name, content] of Object.entries(notes)) {
    await fs.mkdir(path.dirname(path.join(vaultRoot, name)), { recursive: true });
    await fs.writeFile(path.join(vaultRoot, name), content, "utf8");
  }
  const knowledge = new KnowledgeStore({ vaultRoot, indexFile: path.join(vaultRoot, ".index.json") });
  const maintenance = new KnowledgeMaintenanceSource({ vaultRoot, clock: () => FIXED_NOW });
  const claims = new ClaimEvidenceService({ opsRoot, clock: () => FIXED_NOW });
  const learning = new LearningService({ opsRoot, clock: () => FIXED_NOW });
  const profileService = new KnowledgeProfileService({ knowledge, maintenance, claims, learning, opsRoot, clock: () => FIXED_NOW });
  return { vaultRoot, opsRoot, knowledge, maintenance, claims, learning, profileService };
}

test("generate emits a schema-conformant profile covering all nine dimensions", async (t) => {
  const { profileService } = await setup(t, {
    "agent.md": "---\ntitle: Agent\ntags: [AI, Agent]\nsource: GitHub\nstability: practice\nupdated: 2025-01-01\n---\n# Agent\n\n[[missing-target]] 反馈闭环。",
    "principle.md": "---\ntitle: 长期主义\ntags: [人生]\nstability: principle\nupdated: 2026-07-01\n---\n# 长期主义\n\n稳固。",
  });
  const { profile, changedPaths } = await profileService.generate();
  await validateContractRecord("knowledge-profile", profile);
  assert.equal(profile.summary.notes, 2);
  assert.equal(profile.summary.searchable, 2);
  for (const key of ["topics", "sources", "stabilityBreakdown", "reliabilityBreakdown", "orphanNoteRefs", "deadLinkRefs", "outdatedNoteRefs", "evidenceGaps", "learningCoverage"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(profile, key), `profile missing ${key}`);
  }
  assert.match(profile.id, /^profile-\d{8}-[0-9a-f]{8}$/);
  assert.ok(changedPaths[0].includes("knowledge/profiles/"));
  assert.ok(changedPaths[0].endsWith(`${profile.id}.md`));
  assert.equal(profile.stabilityBreakdown.practice, 1);
  assert.equal(profile.stabilityBreakdown.principle, 1);
  assert.deepEqual(profile.reliabilityBreakdown, { traceable: 1, needsSource: 1 });
});

test("dead wikilinks are reported as deadLinkRefs", async (t) => {
  const { profileService } = await setup(t, {
    "agent.md": "---\ntitle: Agent\nstability: practice\nupdated: 2026-07-01\n---\n# Agent\n\n[[missing-target]]",
  });
  const { profile } = await profileService.generate();
  assert.ok(profile.deadLinkRefs.some((link) => link.target === "missing-target" && link.from.endsWith("agent.md")));
});

test("wikilinks inside frontmatter are not treated as dead links", async (t) => {
  const { profileService } = await setup(t, {
    "agent.md": "---\ntitle: Agent\nauthor:\n  - \"[[Sitor AI]]\"\nsource: \"[[Hermes]]\"\nstability: practice\nupdated: 2026-07-01\n---\n# Agent\n\n正文里没有死链。",
  });
  const { profile } = await profileService.generate();
  assert.ok(!profile.deadLinkRefs.some((link) => link.target === "Sitor AI"));
  assert.ok(!profile.deadLinkRefs.some((link) => link.target === "Hermes"));
  assert.equal(profile.deadLinkRefs.length, 0);
});

test("long-unchanged searchable notes are flagged as potentially outdated", async (t) => {
  const { profileService } = await setup(t, {
    "old.md": "---\ntitle: Old\nstability: fact\nupdated: 2025-01-01\n---\n# Old\n\n过时候选。",
    "fresh.md": "---\ntitle: Fresh\nstability: fact\nupdated: 2026-07-01\n---\n# Fresh\n\n新鲜。",
  });
  const { profile } = await profileService.generate();
  assert.ok(profile.outdatedNoteRefs.some((p) => p.endsWith("old.md")));
  assert.ok(!profile.outdatedNoteRefs.some((p) => p.endsWith("fresh.md")));
});

test("orphan refs match KnowledgeMaintenanceSource findings", async (t) => {
  const { profileService, maintenance } = await setup(t, {
    "linked.md": "---\ntitle: Linked\nstability: practice\n---\n# Linked\n\n[[principle]]",
    "principle.md": "# Principle",
    "orphan.md": "# Orphan\n\n孤立无链接。",
  });
  const { profile } = await profileService.generate();
  const expected = (await maintenance.inspect({ limit: 100 })).map((finding) => finding.path).sort();
  assert.deepEqual(profile.orphanNoteRefs, expected);
});

test("candidate claims without evidence surface as evidence gaps", async (t) => {
  const { profileService, claims } = await setup(t, {
    "note.md": "---\ntitle: Note\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  });
  await claims.createClaim({ statement: "未证主张", stability: "practice" });
  const { profile } = await profileService.generate();
  assert.ok(profile.evidenceGaps.some((gap) => gap.statement === "未证主张"));
});

test("profile records round-trip through markdown", async (t) => {
  const { profileService, opsRoot } = await setup(t, {
    "note.md": "---\ntitle: Note\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  });
  const { profile } = await profileService.generate();
  const file = path.join(opsRoot, "knowledge", "profiles", `${profile.id}.md`);
  const roundtrip = parseRecord(await fs.readFile(file, "utf8"));
  assert.equal(roundtrip.id, profile.id);
  assert.deepEqual(roundtrip.stabilityBreakdown, profile.stabilityBreakdown);
});

test("latest returns the most recently generated profile", async (t) => {
  const { profileService } = await setup(t, {
    "note.md": "---\ntitle: Note\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  });
  const first = await profileService.generate();
  const latest = await profileService.latest();
  assert.equal(latest.profile.id, first.profile.id);
});

test("v2 profile includes scope and excludedSystemNotes", async (t) => {
  const { profileService } = await setup(t, {
    "agent.md": "---\ntitle: Agent\ntags: [AI]\nstability: practice\nupdated: 2026-07-01\n---\n# Agent",
  });
  const { profile } = await profileService.inspect();
  assert.equal(profile.scope, "personal-knowledge");
  assert.ok(typeof profile.excludedSystemNotes === "number");
  assert.ok(profile.excludedSystemNotes >= 0);
});

test("inspect does not write any files", async (t) => {
  const { profileService, opsRoot } = await setup(t, {
    "note.md": "---\ntitle: Note\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  });
  const profilesDir = path.join(opsRoot, "knowledge", "profiles");
  await assert.rejects(() => fs.readdir(profilesDir), { code: "ENOENT" });
  const { profile } = await profileService.inspect();
  assert.ok(profile.id);
  // Still no files written
  await assert.rejects(() => fs.readdir(profilesDir), { code: "ENOENT" });
});

test("persist writes profile to ops/", async (t) => {
  const { profileService, opsRoot } = await setup(t, {
    "note.md": "---\ntitle: Note\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  });
  const { profile, changedPaths } = await profileService.persist();
  assert.ok(changedPaths[0].includes("knowledge/profiles/"));
  const file = path.join(opsRoot, "knowledge", "profiles", `${profile.id}.md`);
  const content = await fs.readFile(file, "utf8");
  assert.ok(content.includes("personal-knowledge"));
});

test("latest returns freshness based on vaultFingerprint", async (t) => {
  const { profileService, knowledge } = await setup(t, {
    "note.md": "---\ntitle: Note\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  });
  // Before any persist, latest is null
  assert.equal(await profileService.latest(), null);
  // Persist a profile
  await profileService.persist();
  const result = await profileService.latest();
  assert.ok(result.profile);
  assert.equal(result.fresh, true);
  assert.ok(result.currentVaultFingerprint.length > 0);
});

test("latest reports stale when vault changes after persist", async (t) => {
  const { profileService, knowledge, vaultRoot } = await setup(t, {
    "note.md": "---\ntitle: Note\nstability: practice\nupdated: 2026-07-01\n---\n# Note",
  });
  await profileService.persist();
  // Add a new note to change the vault fingerprint
  await fs.writeFile(path.join(vaultRoot, "new.md"), "---\ntitle: New\nstability: fact\n---\n# New\n", "utf8");
  knowledge.invalidate();
  const result = await profileService.latest();
  assert.equal(result.fresh, false);
  assert.notEqual(result.currentVaultFingerprint, result.profile.vaultFingerprint);
});

test("system notes do not pollute topics, sources or stability breakdown", async (t) => {
  const { profileService } = await setup(t, {
    "01-Areas/personal.md": "---\ntitle: Personal\ntags: [AI]\nsource: GitHub\nstability: practice\nupdated: 2026-07-01\n---\n# Personal",
    "99-System/protocol.md": "---\ntitle: Protocol\ntags: [System, Meta]\nsource: Internal\nstability: principle\nupdated: 2026-07-01\n---\n# Protocol",
  });
  const { profile } = await profileService.inspect();
  assert.equal(profile.excludedSystemNotes, 1, "system note should be excluded");
  assert.equal(profile.summary.searchable, 1);
  const topicNames = profile.topics.map((topic) => topic.name);
  assert.ok(topicNames.includes("AI"), `topics should include AI, got ${JSON.stringify(topicNames)}`);
  assert.ok(!topicNames.includes("System"), "system tag must not pollute topics");
  assert.ok(!topicNames.includes("Meta"), "system tag must not pollute topics");
  const sourceRefs = profile.sources.map((source) => source.ref);
  assert.ok(sourceRefs.includes("GitHub"));
  assert.ok(!sourceRefs.includes("Internal"), "system source must not pollute sources");
  assert.equal(profile.stabilityBreakdown.principle, 0, "system stability must not pollute breakdown");
  assert.equal(profile.stabilityBreakdown.practice, 1);
});
