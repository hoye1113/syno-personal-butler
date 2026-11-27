import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { auditModuleReferences } from "../scripts/audit-module-references.mjs";

const root = path.resolve(import.meta.dirname, "..");

test("保留模块有证据，且当前没有未分类或失效的不可达声明", async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(root, "config/module-entrypoints.json"), "utf8"));
  assert.equal(manifest.retainedModules.length, 15);
  for (const entry of manifest.retainedModules) {
    assert.ok(entry.reason, `${entry.file} 缺少保留理由`);
    assert.ok(entry.evidence?.length, `${entry.file} 缺少证据`);
    for (const evidence of entry.evidence) {
      const text = await fs.readFile(path.join(root, evidence), "utf8");
      assert.ok(text.includes(path.basename(entry.file)), `${evidence} 未引用 ${entry.file}`);
    }
  }
  const report = await auditModuleReferences({ root });
  assert.deepEqual(report.unclassifiedUnreachable, []);
  assert.deepEqual(report.staleRetainedModules, []);
});

test("模块审计能发现未分类不可达和已接线后的失效保留声明", async (t) => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), "module-entrypoints-"));
  t.after(() => fs.rm(fixture, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q"], { cwd: fixture });
  await fs.mkdir(path.join(fixture, "apps"), { recursive: true });
  await fs.mkdir(path.join(fixture, "config"), { recursive: true });
  await fs.writeFile(path.join(fixture, "package.json"), JSON.stringify({ scripts: {} }));
  await fs.writeFile(path.join(fixture, "apps/unreferenced.mjs"), "export const fixture = true;\n");
  const manifestFile = path.join(fixture, "config/module-entrypoints.json");
  const manifest = { schema: "syno-module-entrypoints-v1", productionRoots: [], retainedModules: [] };
  await fs.writeFile(manifestFile, JSON.stringify(manifest));

  const unclassified = await auditModuleReferences({ root: fixture });
  assert.deepEqual(unclassified.unclassifiedUnreachable, ["apps/unreferenced.mjs"]);

  manifest.retainedModules.push({ file: "apps/unreferenced.mjs", category: "manual-entry", reason: "fixture", evidence: ["package.json"] });
  await fs.writeFile(manifestFile, JSON.stringify(manifest));
  const retained = await auditModuleReferences({ root: fixture });
  assert.deepEqual(retained.unclassifiedUnreachable, []);
  assert.deepEqual(retained.staleRetainedModules, []);

  manifest.productionRoots.push("apps/unreferenced.mjs");
  await fs.writeFile(manifestFile, JSON.stringify(manifest));
  const stale = await auditModuleReferences({ root: fixture });
  assert.deepEqual(stale.staleRetainedModules, ["apps/unreferenced.mjs"]);

  manifest.productionRoots = [];
  manifest.retainedModules.push(manifest.retainedModules[0]);
  await fs.writeFile(manifestFile, JSON.stringify(manifest));
  await assert.rejects(() => auditModuleReferences({ root: fixture }), /重复/u);

  manifest.retainedModules = [{ ...manifest.retainedModules[0], file: "apps/missing.mjs" }];
  await fs.writeFile(manifestFile, JSON.stringify(manifest));
  await assert.rejects(() => auditModuleReferences({ root: fixture }), /不存在/u);
});
