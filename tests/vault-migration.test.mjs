import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { buildOperationRequest } from "../apps/syno/syno/operation-registry.mjs";
import { evaluate } from "../apps/syno/syno/policy.mjs";
import { routeSynoApi } from "../apps/syno/syno/runtime.mjs";
import { VaultMigrationService } from "../apps/syno/syno/vault-migration-service.mjs";

const execFileAsync = promisify(execFile);

async function write(file, text) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, text, "utf8");
}

async function directoryDigest(root) {
  const entries = [];
  async function walk(directory, relative = "") {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const next = relative ? `${relative}/${entry.name}` : entry.name; const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute, next);
      else if (entry.isFile()) entries.push(`${next}\0${crypto.createHash("sha256").update(await fs.readFile(absolute)).digest("hex")}`);
    }
  }
  await walk(root); return crypto.createHash("sha256").update(entries.sort().join("\n")).digest("hex");
}

test("inventory stages a normalized read-only snapshot and keeps Syno conflicts", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-migration-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source");
  const repoRoot = path.join(root, "repo");
  const runtimeRoot = path.join(repoRoot, ".runtime", "migrations");
  await write(path.join(sourceRoot, "01-Areas", "Agent.md"), "# Agent\n\nAgent Loop 是可复习的工程知识。\n");
  await write(path.join(sourceRoot, "02-Resources", "Conflict.md"), "---\ntitle: Source\ntags: [ai_agent]\ncreated: 2026-01-01\nsource: source\ndescription: source\n---\n\n# Source\n");
  await write(path.join(sourceRoot, "99-System", "Skills", "legacy.md"), "legacy");
  await write(path.join(repoRoot, "vault", "02-Resources", "Conflict.md"), "---\ntitle: Syno\ntags: [ai_agent]\ncreated: 2026-01-01\nsource: syno\ndescription: syno\n---\n\n# Syno\n");
  await execFileAsync("git", ["init"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.name", "Syno Test"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["add", "."], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRoot, windowsHide: true });
  await fs.appendFile(path.join(sourceRoot, "01-Areas", "Agent.md"), "当前工作区修改。\n", "utf8");

  const service = new VaultMigrationService({ repoRoot, runtimeRoot, clock: () => new Date("2026-07-20T10:00:00.000Z") });
  const gitBefore = await directoryDigest(path.join(sourceRoot, ".git"));
  const manifest = await service.inventory({ sourceRoot });
  assert.equal(await directoryDigest(path.join(sourceRoot, ".git")), gitBefore, "inventory Git probes must be physically read-only");

  assert.equal(manifest.source.gitDirty, true);
  assert.match(manifest.source.gitHead, /^[a-f0-9]{40}$/);
  assert.match(manifest.digest, /^[a-f0-9]{64}$/);
  assert.equal(manifest.summary.import, 1);
  assert.equal(manifest.summary.conflict, 1);
  assert.equal(manifest.summary.excluded, 0);
  const imported = manifest.files.find((item) => item.sourcePath === "01-Areas/Agent.md");
  assert.equal(imported.action, "import");
  assert.equal(imported.phase, "content");
  const staged = await fs.readFile(path.join(runtimeRoot, manifest.id, "staged", imported.targetPath), "utf8");
  assert.match(staged, /^---\n/);
  assert.match(staged, /knowledge_state: captured/);
  assert.match(staged, /link_status: orphan/);
  assert.match(staged, /source_sha256: "[a-f0-9]{64}"/);
  assert.match(staged, /# Agent\n\nAgent Loop 是可复习的工程知识。\n当前工作区修改。/);
  const conflict = manifest.files.find((item) => item.sourcePath === "02-Resources/Conflict.md");
  assert.equal(conflict.action, "conflict");
  assert.equal(conflict.decision, "keep-syno");
  assert.notEqual(conflict.sourceSha256, conflict.targetSha256);
  await assert.rejects(fs.access(path.join(runtimeRoot, manifest.id, "staged", "vault", "99-System", "Skills", "legacy.md")));
});

test("preview rejects a tampered manifest and apply rejects a changed source snapshot", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-migration-integrity-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source");
  const repoRoot = path.join(root, "repo");
  const runtimeRoot = path.join(repoRoot, ".runtime", "migrations");
  const sourceFile = path.join(sourceRoot, "01-Areas", "Agent.md");
  await write(sourceFile, "# Agent\n\n原始正文。\n");
  await execFileAsync("git", ["init"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.name", "Syno Test"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["add", "."], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRoot, windowsHide: true });
  const service = new VaultMigrationService({ repoRoot, runtimeRoot });
  const manifest = await service.inventory({ sourceRoot });
  const preview = await service.preview(manifest.id);
  assert.deepEqual(preview.summary, manifest.summary);
  assert.equal(Object.hasOwn(preview.source, "root"), false, "preview must not expose the personal absolute path");

  await fs.appendFile(sourceFile, "快照之后发生变化。\n", "utf8");
  await assert.rejects(service.apply(manifest.id, { phase: "content", expectedDigest: manifest.digest, workspace: repoRoot }), (error) => error.code === "MIGRATION_SOURCE_CHANGED");

  const manifestFile = path.join(runtimeRoot, manifest.id, "manifest.json");
  const tampered = JSON.parse(await fs.readFile(manifestFile, "utf8"));
  tampered.summary.import = 999;
  await fs.writeFile(manifestFile, JSON.stringify(tampered), "utf8");
  await assert.rejects(service.preview(manifest.id), (error) => error.code === "MIGRATION_MANIFEST_TAMPERED");
});

test("apply rejects an old manifest when an allowed source file is added", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-migration-added-source-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source"); const repoRoot = path.join(root, "repo");
  await write(path.join(sourceRoot, "01-Areas", "First.md"), "# First\n");
  await execFileAsync("git", ["init"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.name", "Syno Test"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["add", "."], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRoot, windowsHide: true });
  const service = new VaultMigrationService({ repoRoot, runtimeRoot: path.join(repoRoot, ".runtime", "migrations") });
  const manifest = await service.inventory({ sourceRoot });
  await write(path.join(sourceRoot, "01-Areas", "Added.md"), "# Added\n");
  await assert.rejects(service.apply(manifest.id, { phase: "content", expectedDigest: manifest.digest, workspace: repoRoot }), (error) => error.code === "MIGRATION_SOURCE_CHANGED");
});

test("manifest load rejects recomputed traversal and inventory rejects source symlinks", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-migration-paths-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source");
  const repoRoot = path.join(root, "repo");
  const runtimeRoot = path.join(repoRoot, ".runtime", "migrations");
  await write(path.join(sourceRoot, "01-Areas", "Agent.md"), "# Agent\n\n正文。\n");
  await execFileAsync("git", ["init"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.name", "Syno Test"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["add", "."], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRoot, windowsHide: true });
  const service = new VaultMigrationService({ repoRoot, runtimeRoot });
  const manifest = await service.inventory({ sourceRoot });
  const manifestFile = path.join(runtimeRoot, manifest.id, "manifest.json");
  const traversal = JSON.parse(await fs.readFile(manifestFile, "utf8"));
  traversal.files[0].targetPath = "vault/../outside.md";
  delete traversal.digest;
  traversal.digest = crypto.createHash("sha256").update(JSON.stringify(traversal)).digest("hex");
  await fs.writeFile(manifestFile, JSON.stringify(traversal), "utf8");
  await assert.rejects(service.preview(manifest.id), (error) => error.code === "MIGRATION_TARGET_PATH_INVALID");

  const outside = path.join(root, "outside.md");
  await write(outside, "secret");
  try {
    await fs.symlink(outside, path.join(sourceRoot, "01-Areas", "Linked.md"), "file");
  } catch (error) {
    if (["EPERM", "EACCES"].includes(error.code)) { t.diagnostic("Windows 当前账户不允许创建测试符号链接"); return; }
    throw error;
  }
  await assert.rejects(new VaultMigrationService({ repoRoot, runtimeRoot }).inventory({ sourceRoot }), (error) => error.code === "MIGRATION_SYMLINK_DENIED");
});

test("apply imports only the approved phase and is idempotent", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-migration-apply-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source");
  const repoRoot = path.join(root, "repo");
  const runtimeRoot = path.join(repoRoot, ".runtime", "migrations");
  await write(path.join(sourceRoot, "01-Areas", "Agent.md"), "# Agent\n\n正文。\n");
  await write(path.join(sourceRoot, "MOC - 知识库导航.md"), "# 导航\n\n- [[Agent]]\n");
  await execFileAsync("git", ["init"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.name", "Syno Test"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["add", "."], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRoot, windowsHide: true });
  const service = new VaultMigrationService({ repoRoot, runtimeRoot, clock: () => new Date("2026-07-20T10:00:00.000Z") });
  const manifest = await service.inventory({ sourceRoot });

  await assert.rejects(service.apply(manifest.id, { phase: "content", expectedDigest: "0".repeat(64), workspace: repoRoot }), (error) => error.code === "MIGRATION_DIGEST_MISMATCH");
  const first = await service.apply(manifest.id, { phase: "content", expectedDigest: manifest.digest, workspace: repoRoot });
  assert.equal(first.imported, 1);
  assert.equal(first.skipped, 0);
  assert.deepEqual(first.changedPaths, ["vault/01-Areas/Agent.md", `ops/artifacts/migrations/${manifest.id}-content.md`]);
  await assert.rejects(fs.access(path.join(repoRoot, "vault", "MOC - 知识库导航.md")));
  const second = await service.apply(manifest.id, { phase: "content", expectedDigest: manifest.digest, workspace: repoRoot });
  assert.equal(second.imported, 0);
  assert.equal(second.skipped, 1);
  assert.equal(await service.nextPhase(manifest.id, { workspace: repoRoot }), "integration");
  const contentAudit = path.join(repoRoot, "ops", "artifacts", "migrations", `${manifest.id}-content.md`);
  const validAudit = await fs.readFile(contentAudit, "utf8");
  await fs.writeFile(contentAudit, validAudit.replaceAll(manifest.digest, "0".repeat(64)), "utf8");
  await assert.rejects(service.nextPhase(manifest.id, { workspace: repoRoot }), (error) => error.code === "MIGRATION_REPLAY_INCONSISTENT");
  await fs.writeFile(contentAudit, validAudit, "utf8");
  const integration = await service.apply(manifest.id, { phase: "integration", expectedDigest: manifest.digest, workspace: repoRoot });
  assert.equal(integration.imported, 1);
  assert.match(await fs.readFile(path.join(repoRoot, "vault", "MOC - 知识库导航.md"), "utf8"), /# 导航/);
  assert.equal(await service.nextPhase(manifest.id, { workspace: repoRoot }), "complete");
});

test("idempotent replay preserves the original conflict-bearing migration audit", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-migration-replay-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source"); const repoRoot = path.join(root, "repo"); const runtimeRoot = path.join(repoRoot, ".runtime", "migrations");
  await write(path.join(sourceRoot, "01-Areas", "New.md"), "# New\n"); await write(path.join(sourceRoot, "01-Areas", "Conflict.md"), "# Source\n");
  await write(path.join(repoRoot, "vault", "01-Areas", "Conflict.md"), "# Syno\n");
  await execFileAsync("git", ["init"], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.name", "Syno Test"], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["add", "."], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRoot, windowsHide: true });
  const service = new VaultMigrationService({ repoRoot, runtimeRoot }); const manifest = await service.inventory({ sourceRoot });
  await service.apply(manifest.id, { phase: "content", expectedDigest: manifest.digest, workspace: repoRoot });
  const audit = path.join(repoRoot, "ops", "artifacts", "migrations", `${manifest.id}-content.md`); const first = await fs.readFile(audit, "utf8");
  const replay = await service.apply(manifest.id, { phase: "content", expectedDigest: manifest.digest, workspace: repoRoot });
  assert.equal(replay.imported, 0); assert.deepEqual(replay.changedPaths, []); assert.equal(await fs.readFile(audit, "utf8"), first);
});

test("apply refuses an ops audit parent redirected through a junction", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-migration-ops-link-")); t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source"); const repoRoot = path.join(root, "repo"); const runtimeRoot = path.join(repoRoot, ".runtime", "migrations");
  await write(path.join(sourceRoot, "01-Areas", "New.md"), "# New\n"); await fs.mkdir(repoRoot, { recursive: true });
  await execFileAsync("git", ["init"], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.name", "Syno Test"], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["add", "."], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRoot, windowsHide: true });
  const service = new VaultMigrationService({ repoRoot, runtimeRoot }); const manifest = await service.inventory({ sourceRoot });
  const outside = path.join(root, "outside"); await fs.mkdir(outside);
  try { await fs.symlink(outside, path.join(repoRoot, "ops"), "junction"); } catch (error) { if (["EPERM", "EACCES"].includes(error.code)) { t.diagnostic("Windows 当前账户不允许创建测试 junction"); return; } throw error; }
  await assert.rejects(service.apply(manifest.id, { phase: "content", expectedDigest: manifest.digest, workspace: repoRoot }), (error) => error.code === "MIGRATION_SYMLINK_DENIED");
  assert.deepEqual(await fs.readdir(outside), []);
});

test("migration submit API exposes only pinned content and integration Jobs", async () => {
  const content = buildOperationRequest("vault.migration.content", { id: "migration-20260720-deadbeef", phase: "content" });
  const integration = buildOperationRequest("vault.migration.integration", { id: "migration-20260720-deadbeef", phase: "integration" });
  assert.equal(evaluate(content).approval, "single");
  assert.equal(evaluate(content).intent, "migrate_note");
  assert.equal(evaluate(content).profile, "syno-curate");
  assert.equal(evaluate(integration).approval, "double");
  assert.equal(evaluate(integration).intent, "migrate_integrate");
  const calls = [];
  const runtime = {
    developmentMode: false,
    migration: {
      phases: ["content", "integration"],
      async preview(id) { return { id, digest: "a".repeat(64), summary: { import: 2 } }; },
      async nextPhase() { return this.phases.shift(); },
    },
    core: { async execute(request) { calls.push(request); return { job: { id: "job-migration", status: "awaiting_approval" } }; } },
  };
  const id = "migration-20260720-deadbeef";
  assert.equal((await routeSynoApi(runtime, { method: "GET" }, new URL(`http://localhost/api/syno/migrations/${id}`), async () => ({}))).id, id);
  await routeSynoApi(runtime, { method: "POST" }, new URL(`http://localhost/api/syno/migrations/${id}/submit`), async () => ({}));
  await routeSynoApi(runtime, { method: "POST" }, new URL(`http://localhost/api/syno/migrations/${id}/submit`), async () => ({}));
  assert.deepEqual(calls.map((item) => item.operation), ["vault.migration.content", "vault.migration.integration"]);
  assert.ok(calls.every((item) => item.payload.digest === "a".repeat(64)));
  await assert.rejects(
    routeSynoApi(runtime, { method: "POST" }, new URL(`http://localhost/api/syno/migrations/${id}/submit`), async () => ({ source: "C:/secret" })),
    /不接受参数/,
  );
});

test("inventory preserves original tags, resolves real topology and disambiguates target names", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-migration-fidelity-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source");
  const repoRoot = path.join(root, "repo");
  const runtimeRoot = path.join(repoRoot, ".runtime", "migrations");
  await write(path.join(sourceRoot, "01-Areas", "A：B.md"), "---\ntitle: One\ntags: [ai_agent, product_perspective]\nsource: personal\ndescription: one\ncreated: 2025-01-01\ncreated: 2026-01-01\n---\n\n# One\n\n[[Missing note]]\n");
  await write(path.join(sourceRoot, "01-Areas", "A-B.md"), "---\ntitle: Two\ntags: [ai_agent]\nsource: personal\ndescription: two\n---\n\n# Two\n\n[[A：B]]\n");
  await write(path.join(sourceRoot, "01-Areas", "Lonely.md"), "# Lonely\n\n[[Still missing]]\n");
  await write(path.join(sourceRoot, "01-Areas", "Path Link.md"), "# Path Link\n\n[[01-Areas/A：B|One]]\n");
  await execFileAsync("git", ["init"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.name", "Syno Test"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["add", "."], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRoot, windowsHide: true, env: { ...process.env, GIT_AUTHOR_DATE: "2024-03-04T00:00:00Z", GIT_COMMITTER_DATE: "2024-03-04T00:00:00Z" } });
  const service = new VaultMigrationService({ repoRoot, runtimeRoot, clock: () => new Date("2026-07-20T10:00:00.000Z") });
  const manifest = await service.inventory({ sourceRoot });
  const entries = manifest.files.filter((item) => item.action === "import");
  assert.equal(new Set(entries.filter((item) => /A-B|A：B/.test(item.sourcePath)).map((item) => item.targetPath.toLocaleLowerCase("en-US"))).size, 2);
  const one = entries.find((item) => item.sourcePath.endsWith("A：B.md"));
  const two = entries.find((item) => item.sourcePath.endsWith("A-B.md"));
  assert.deepEqual(one.normalizations.legacyTags, ["ai_agent", "product_perspective"]);
  assert.deepEqual(one.normalizations.duplicateFields.created, ["2025-01-01", "2026-01-01"]);
  assert.equal(one.normalizations.linkStatus, "connected", "incoming links make a note connected even when its own link is dead");
  assert.equal(two.normalizations.linkStatus, "connected");
  assert.equal(entries.find((item) => item.sourcePath.endsWith("Lonely.md")).normalizations.linkStatus, "orphan");
  const stagedTwo = await fs.readFile(path.join(runtimeRoot, manifest.id, "staged", two.targetPath), "utf8");
  assert.match(stagedTwo, /created: "2024-03-04"/);
  const pathLink = entries.find((item) => item.sourcePath.endsWith("Path Link.md"));
  const stagedPathLink = await fs.readFile(path.join(runtimeRoot, manifest.id, "staged", pathLink.targetPath), "utf8");
  assert.doesNotMatch(stagedPathLink, /\[\[01-Areas\/A：B/);
  assert.match(stagedPathLink, /\[\[01-Areas\/A-B-[a-f0-9]{8}\|One\]\]/);
});

test("inventory admits only referenced, sniffed and bounded attachments", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-migration-attachment-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source");
  const repoRoot = path.join(root, "repo");
  const runtimeRoot = path.join(repoRoot, ".runtime", "migrations");
  await write(path.join(sourceRoot, "02-Resources", "Paper.md"), "# Paper\n\n[[safe.pdf]]\n");
  await write(path.join(sourceRoot, "99-System", "Attachments", "safe.pdf"), "%PDF-1.7\nfixture");
  await write(path.join(sourceRoot, "99-System", "Attachments", "not-referenced.pdf"), "%PDF-1.7\nignored");
  await write(path.join(sourceRoot, "secrets", ".env"), "TOKEN=must-not-enter-manifest");
  await execFileAsync("git", ["init"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.name", "Syno Test"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["add", "."], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRoot, windowsHide: true });
  const manifest = await new VaultMigrationService({ repoRoot, runtimeRoot }).inventory({ sourceRoot });
  const serialized = JSON.stringify(manifest);
  assert.equal(serialized.includes(".env"), false);
  assert.equal(serialized.includes("must-not-enter-manifest"), false);
  const attachment = manifest.files.find((item) => item.sourcePath?.endsWith("safe.pdf"));
  assert.equal(attachment.sniffedMime, "application/pdf");
  assert.equal(manifest.files.some((item) => item.sourcePath?.endsWith("not-referenced.pdf")), false);
});

test("inventory reports missing attachment references instead of silently dropping them", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-migration-missing-attachment-")); t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source"); const repoRoot = path.join(root, "repo");
  await write(path.join(sourceRoot, "02-Resources", "Paper.md"), "# Paper\n\n[[missing.pdf]]\n");
  await execFileAsync("git", ["init"], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.name", "Syno Test"], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["add", "."], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRoot, windowsHide: true });
  const manifest = await new VaultMigrationService({ repoRoot, runtimeRoot: path.join(repoRoot, ".runtime", "migrations") }).inventory({ sourceRoot });
  const issue = manifest.files.find((item) => item.reason === "missing-attachment-reference");
  assert.equal(issue.sourcePath, "99-System/Attachments/missing.pdf"); assert.equal(issue.action, "excluded"); assert.equal(manifest.summary.excluded, 1);
});

test("inventory rejects a referenced attachment whose extension and bytes disagree", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-migration-bad-attachment-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source");
  const repoRoot = path.join(root, "repo");
  await write(path.join(sourceRoot, "02-Resources", "Paper.md"), "# Paper\n\n[[unsafe.pdf]]\n");
  await fs.mkdir(path.join(sourceRoot, "99-System", "Attachments"), { recursive: true });
  await fs.writeFile(path.join(sourceRoot, "99-System", "Attachments", "unsafe.pdf"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  await execFileAsync("git", ["init"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.name", "Syno Test"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["add", "."], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRoot, windowsHide: true });
  await assert.rejects(
    new VaultMigrationService({ repoRoot, runtimeRoot: path.join(repoRoot, ".runtime", "migrations") }).inventory({ sourceRoot }),
    (error) => error.code === "MIGRATION_ATTACHMENT_TYPE_INVALID",
  );
});

test("inventory excludes secret-bearing notes and preserves every duplicate tag value in audit metadata", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-migration-secrets-")); t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source"); const repoRoot = path.join(root, "repo"); const runtimeRoot = path.join(repoRoot, ".runtime", "migrations");
  const fakeToken = ["sk", "abcdefghijklmnopqrstuvwxyz123456"].join("-");
  await write(path.join(sourceRoot, "00-Inbox", "keys.md"), `# keys\n\napi_key = ${fakeToken}\n`);
  const bearer = ["Bearer", "abcdefghijklmnopqrstuvwxyz.ABCDEFGHIJKLMNOP"].join(" ");
  await write(path.join(sourceRoot, "00-Inbox", "authorization.md"), `# auth\n\nAuthorization: ${bearer}\n`);
  const cookie = ["session", "abcdefghijklmnopqrstuvwx"].join("=");
  await write(path.join(sourceRoot, "00-Inbox", "cookie.md"), `# cookie\n\nCookie: ${cookie}\n`);
  const quotedSecret = ["abcdefghijkl", "mnopqrstuvwx"].join("");
  await write(path.join(sourceRoot, "00-Inbox", "quoted.md"), `# quoted\n\n{\"bot_token\": \"${quotedSecret}\"}\n`);
  await write(path.join(sourceRoot, "01-Areas", ".credentials", "hidden.md"), "# hidden\n\nshould never be scanned\n");
  await write(path.join(sourceRoot, "01-Areas", "Tags.md"), "---\ntags:\n  - ai_agent\ntags:\n  - product_perspective\n---\n# Tags\n");
  await execFileAsync("git", ["init"], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.name", "Syno Test"], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["add", "."], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRoot, windowsHide: true });
  const manifest = await new VaultMigrationService({ repoRoot, runtimeRoot }).inventory({ sourceRoot });
  const secret = manifest.files.find((item) => item.sourcePath.endsWith("keys.md")); assert.equal(secret.action, "excluded"); assert.match(secret.reason, /^sensitive-content-candidate:/);
  assert.equal(manifest.files.find((item) => item.sourcePath.endsWith("authorization.md")).action, "excluded");
  assert.equal(manifest.files.find((item) => item.sourcePath.endsWith("cookie.md")).action, "excluded");
  assert.equal(manifest.files.find((item) => item.sourcePath.endsWith("quoted.md")).action, "excluded");
  assert.equal(manifest.files.some((item) => item.sourcePath.includes(".credentials")), false);
  await assert.rejects(fs.access(path.join(runtimeRoot, manifest.id, "staged", "vault", "00-Inbox", "keys.md")));
  assert.equal(JSON.stringify(manifest).includes("abcdefghijklmnopqrstuvwxyz123456"), false);
  const tags = manifest.files.find((item) => item.sourcePath.endsWith("Tags.md"));
  assert.deepEqual(tags.normalizations.legacyTags, ["ai_agent", "product_perspective"]); assert.deepEqual(tags.normalizations.duplicateFields.tags, [["ai_agent"], ["product_perspective"]]);
});

test("inventory audits invalid UTF-8 without staging replacement characters", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-migration-encoding-")); t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source"); const repoRoot = path.join(root, "repo"); const runtimeRoot = path.join(repoRoot, ".runtime", "migrations");
  await fs.mkdir(path.join(sourceRoot, "01-Areas"), { recursive: true }); await fs.writeFile(path.join(sourceRoot, "01-Areas", "Broken.md"), Buffer.from([0x23, 0x20, 0xc3, 0x28]));
  await execFileAsync("git", ["init"], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.name", "Syno Test"], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["add", "."], { cwd: sourceRoot, windowsHide: true }); await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRoot, windowsHide: true });
  const manifest = await new VaultMigrationService({ repoRoot, runtimeRoot }).inventory({ sourceRoot }); const broken = manifest.files.find((item) => item.sourcePath.endsWith("Broken.md"));
  assert.equal(broken.action, "excluded"); assert.equal(broken.reason, "invalid-utf8"); await assert.rejects(fs.access(path.join(runtimeRoot, manifest.id, "staged", broken.targetPath)));
});

test("vault migration CLI inventories and previews without exposing source paths", async (t) => {
  const root = await fs.mkdtemp(path.join(tmpdir(), "syno-migration-cli-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, "source");
  const repoRoot = path.join(root, "repo");
  await write(path.join(sourceRoot, "01-Areas", "Agent.md"), "# Agent\n\n正文。\n");
  await execFileAsync("git", ["init"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.email", "test@example.invalid"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["config", "user.name", "Syno Test"], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["add", "."], { cwd: sourceRoot, windowsHide: true });
  await execFileAsync("git", ["commit", "-m", "fixture"], { cwd: sourceRoot, windowsHide: true });
  const script = path.resolve("scripts/vault-migrate.mjs");
  const { stdout } = await execFileAsync(process.execPath, [script, "inventory", "--source", sourceRoot, "--repo", repoRoot], { cwd: process.cwd(), windowsHide: true });
  const inventory = JSON.parse(stdout);
  assert.match(inventory.id, /^migration-/);
  const previewRun = await execFileAsync(process.execPath, [script, "preview", "--id", inventory.id, "--repo", repoRoot], { cwd: process.cwd(), windowsHide: true });
  const preview = JSON.parse(previewRun.stdout);
  assert.equal(preview.source.gitDirty, false);
  assert.equal(JSON.stringify(preview).includes(sourceRoot), false);
});
