import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  P5_PLUGIN_CONTRACT,
  activatePluginVersion,
  readActivePlugin,
  rollbackPluginVersion,
  validatePluginManifest,
} from "../packages/syno-core/plugin-version.mjs";

async function fixture(version = "1.0.0") {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "p5-plugin-version-"));
  const pluginDir = path.join(root, "plugin");
  await fs.mkdir(pluginDir);
  await fs.writeFile(path.join(pluginDir, "entry.mjs"), "export const ok = true;\n");
  const manifest = {
    name: "p5-radar",
    contract: P5_PLUGIN_CONTRACT,
    version,
    entry: "entry.mjs",
    capabilities: ["health", "collect", "renderDailyDoc", "feedback", "status"],
  };
  await fs.writeFile(path.join(pluginDir, "plugin.json"), JSON.stringify(manifest));
  return { root, pluginDir, manifest, registryFile: path.join(root, "active.json") };
}

test("activates a validated P5 plugin version and exposes its entry", async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  const active = await activatePluginVersion({
    pluginDir: f.pluginDir,
    manifest: f.manifest,
    registryFile: f.registryFile,
    now: () => new Date("2026-11-22T00:00:00Z"),
  });
  assert.equal(active.version, "1.0.0");
  assert.equal(active.contract, P5_PLUGIN_CONTRACT);
  assert.equal(active.entry, "entry.mjs");
  assert.equal(active.sha256.length, 64);
  const read = await readActivePlugin({ registryFile: f.registryFile });
  assert.equal(read.version, "1.0.0");
  assert.equal(read.entryPath, path.join(f.pluginDir, "entry.mjs"));
  await fs.writeFile(path.join(f.pluginDir, "entry.mjs"), "export const ok = false;\n");
  await assert.rejects(() => readActivePlugin({ registryFile: f.registryFile }), /哈希/u);
});

test("rolls back to the previous active version", async (t) => {
  const v1 = await fixture("1.0.0");
  t.after(() => fs.rm(v1.root, { recursive: true, force: true }));
  await activatePluginVersion({ pluginDir: v1.pluginDir, manifest: v1.manifest, registryFile: v1.registryFile });
  const v2Dir = path.join(v1.root, "plugin-v2");
  await fs.mkdir(v2Dir);
  await fs.writeFile(path.join(v2Dir, "entry.mjs"), "export const ok = 2;\n");
  const v2 = { ...v1.manifest, version: "1.1.0" };
  await fs.writeFile(path.join(v2Dir, "plugin.json"), JSON.stringify(v2));
  await activatePluginVersion({ pluginDir: v2Dir, manifest: v2, registryFile: v1.registryFile });
  assert.equal((await readActivePlugin({ registryFile: v1.registryFile })).version, "1.1.0");
  const rolled = await rollbackPluginVersion({ registryFile: v1.registryFile });
  assert.equal(rolled.version, "1.0.0");
  assert.equal((await readActivePlugin({ registryFile: v1.registryFile })).version, "1.0.0");
});

test("rejects wrong contract, capability and an entry outside the plugin directory", async (t) => {
  const f = await fixture();
  t.after(() => fs.rm(f.root, { recursive: true, force: true }));
  assert.throws(() => validatePluginManifest({ ...f.manifest, contract: "syno.other/1" }, { pluginDir: f.pluginDir }), /contract/u);
  assert.throws(() => validatePluginManifest({ ...f.manifest, capabilities: ["unknown"] }, { pluginDir: f.pluginDir }), /能力/u);
  assert.throws(() => validatePluginManifest({ ...f.manifest, entry: "../outside.mjs" }, { pluginDir: f.pluginDir }), /超出/u);
});
