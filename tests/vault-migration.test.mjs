import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
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
  const manifest = await service.inventory({ sourceRoot });

  assert.equal(manifest.source.gitDirty, true);
  assert.match(manifest.source.gitHead, /^[a-f0-9]{40}$/);
  assert.match(manifest.digest, /^[a-f0-9]{64}$/);
  assert.equal(manifest.summary.import, 1);
  assert.equal(manifest.summary.conflict, 1);
  assert.equal(manifest.summary.excluded, 1);
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
  await assert.rejects(service.apply(manifest.id, { phase: "content", workspace: repoRoot }), (error) => error.code === "MIGRATION_SOURCE_CHANGED");

  const manifestFile = path.join(runtimeRoot, manifest.id, "manifest.json");
  const tampered = JSON.parse(await fs.readFile(manifestFile, "utf8"));
  tampered.summary.import = 999;
  await fs.writeFile(manifestFile, JSON.stringify(tampered), "utf8");
  await assert.rejects(service.preview(manifest.id), (error) => error.code === "MIGRATION_MANIFEST_TAMPERED");
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

  const first = await service.apply(manifest.id, { phase: "content", workspace: repoRoot });
  assert.equal(first.imported, 1);
  assert.equal(first.skipped, 0);
  assert.deepEqual(first.changedPaths, ["vault/01-Areas/Agent.md", `ops/artifacts/migrations/${manifest.id}-content.md`]);
  await assert.rejects(fs.access(path.join(repoRoot, "vault", "MOC - 知识库导航.md")));
  const second = await service.apply(manifest.id, { phase: "content", workspace: repoRoot });
  assert.equal(second.imported, 0);
  assert.equal(second.skipped, 1);
  const integration = await service.apply(manifest.id, { phase: "integration", workspace: repoRoot });
  assert.equal(integration.imported, 1);
  assert.match(await fs.readFile(path.join(repoRoot, "vault", "MOC - 知识库导航.md"), "utf8"), /# 导航/);
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
    migration: { async preview(id) { return { id, summary: { import: 2 } }; } },
    core: { async execute(request) { calls.push(request); return { job: { id: "job-migration", status: "awaiting_approval" } }; } },
  };
  const id = "migration-20260720-deadbeef";
  assert.equal((await routeSynoApi(runtime, { method: "GET" }, new URL(`http://localhost/api/syno/migrations/${id}`), async () => ({}))).id, id);
  await routeSynoApi(runtime, { method: "POST" }, new URL(`http://localhost/api/syno/migrations/${id}/submit`), async () => ({ phase: "content" }));
  await routeSynoApi(runtime, { method: "POST" }, new URL(`http://localhost/api/syno/migrations/${id}/submit`), async () => ({ phase: "integration" }));
  assert.deepEqual(calls.map((item) => item.operation), ["vault.migration.content", "vault.migration.integration"]);
  await assert.rejects(
    routeSynoApi(runtime, { method: "POST" }, new URL(`http://localhost/api/syno/migrations/${id}/submit`), async () => ({ phase: "content", source: "C:/secret" })),
    /只接受 phase/,
  );
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
