#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const codeRoots = ["apps/", "packages/", "experiments/", "plugins/", "scripts/", "tests/", "config/"];

export async function auditModuleReferences({ root = repositoryRoot } = {}) {
  const manifest = JSON.parse(readFileSync(path.join(root, "config/module-entrypoints.json"), "utf8"));
  if (manifest.schema !== "syno-module-entrypoints-v1" || !Array.isArray(manifest.productionRoots) || !Array.isArray(manifest.retainedModules)) {
    throw new Error("模块入口清单格式无效");
  }
  const listed = execFileSync("git", ["-c", "core.quotepath=false", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
  const tracked = [...new Set(listed.split("\0").filter(Boolean))].filter((file) => existsSync(path.join(root, file)));
  const files = tracked.filter((file) => file.endsWith(".mjs") && codeRoots.some((prefix) => file.startsWith(prefix)));
  const fileSet = new Set(files);
  const sources = new Map(files.map((file) => [file, readFileSync(path.join(root, file), "utf8")]));
  const dependencies = new Map();

  function resolveSpecifier(from, specifier) {
    if (!specifier.startsWith(".")) return null;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
    return fileSet.has(resolved) ? resolved : null;
  }

  for (const [file, source] of sources) {
    const specifiers = new Set();
    for (const pattern of [
      /(?:import|export)\s+(?:[^"'`;]*?\s+from\s*)?["']([^"']+)["']/g,
      /import\(\s*["']([^"']+)["']\s*\)/g,
    ]) {
      for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
    }
    dependencies.set(file, [...specifiers].map((specifier) => resolveSpecifier(file, specifier)).filter(Boolean));
  }

  const productionRoots = manifest.productionRoots.filter((file) => fileSet.has(file));
  const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const packageScriptRoots = Object.values(packageJson.scripts || {}).flatMap((script) => {
    const match = String(script).match(/node\s+([^\s]+\.mjs)/);
    return match && fileSet.has(match[1]) ? [match[1]] : [];
  });
  const cliRoots = files.filter((file) => sources.get(file).startsWith("#!/usr/bin/env node"));
  const scriptRoots = files.filter((file) => file.startsWith("scripts/"));
  const testRoots = files.filter((file) => file.startsWith("tests/") && file.endsWith(".test.mjs"));

  function reachable(roots) {
    const seen = new Set();
    const queue = [...roots];
    for (let index = 0; index < queue.length; index += 1) {
      const file = queue[index];
      if (seen.has(file)) continue;
      seen.add(file);
      queue.push(...(dependencies.get(file) || []));
    }
    return seen;
  }

  const production = reachable(productionRoots);
  const operational = reachable([...productionRoots, ...packageScriptRoots, ...cliRoots, ...scriptRoots]);
  const withTests = reachable([...operational, ...testRoots]);
  const retained = new Set();
  for (const entry of manifest.retainedModules) {
    if (!entry?.file || !entry.category || !entry.reason || !Array.isArray(entry.evidence) || entry.evidence.length === 0) {
      throw new Error(`保留模块声明字段不完整：${entry?.file || "未知文件"}`);
    }
    if (retained.has(entry.file)) throw new Error(`保留模块声明重复：${entry.file}`);
    if (!fileSet.has(entry.file)) throw new Error(`保留模块声明的文件不存在：${entry.file}`);
    retained.add(entry.file);
  }
  const sourceFiles = files.filter((file) => !file.startsWith("tests/"));
  return {
    totals: {
      codeFiles: files.length,
      productionReachable: production.size,
      operationalReachable: operational.size,
      testReachable: withTests.size,
      explicitlyRetained: retained.size,
    },
    retainedModules: manifest.retainedModules,
    unclassifiedUnreachable: sourceFiles.filter((file) => !withTests.has(file) && !retained.has(file)).sort(),
    staleRetainedModules: [...retained].filter((file) => withTests.has(file)).sort(),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await auditModuleReferences();
    console.log(JSON.stringify({ totals: report.totals, unclassifiedUnreachable: report.unclassifiedUnreachable, staleRetainedModules: report.staleRetainedModules }, null, 2));
    if (report.unclassifiedUnreachable.length || report.staleRetainedModules.length) process.exitCode = 1;
  } catch (error) {
    console.error(`模块入口审计失败：${error.message}`);
    process.exitCode = 1;
  }
}
