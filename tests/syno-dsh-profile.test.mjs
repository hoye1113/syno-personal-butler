import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ensureSynoDshProfiles,
  LAB_BUNDLES,
  PRODUCTION_BUNDLES,
  SYNO_LAB_PROFILE_NAME,
  SYNO_PROFILE_NAME,
  resolveProfilePackage,
} from "../apps/syno/syno/syno-dsh-profile.mjs";
import { resolveChatSurface } from "../apps/syno/syno/deepseek-harness-supervisor.mjs";

test("resolveChatSurface uses jsonrpc for fake agents and web otherwise", () => {
  assert.equal(resolveChatSurface({ fake: true }), "jsonrpc");
  assert.equal(resolveChatSurface({ fake: false, env: { SYNO_DSH_CHAT_SURFACE: "jsonrpc" } }), "jsonrpc");
  assert.equal(resolveChatSurface({ fake: false, env: {} }), "web");
});

test("Host-generated syno profile pins bundles and forbids marketplace add", async (t) => {
  const homeRoot = await mkdtemp(path.join(os.tmpdir(), "syno-dsh-home-"));
  t.after(() => rm(homeRoot, { recursive: true, force: true }));
  const repoRoot = path.resolve(".");
  const { synoDir, labDir, agentPreset } = await ensureSynoDshProfiles({ homeRoot, repoRoot });
  const syno = JSON.parse(await readFile(path.join(synoDir, "package.json"), "utf8"));
  const lab = JSON.parse(await readFile(path.join(labDir, "package.json"), "utf8"));
  const synoPatch = await readFile(path.join(synoDir, "cordis.patch.yml"), "utf8");
  const agentPresetText = await readFile(agentPreset.presetPath, "utf8");
  const pluginPatch = await readFile(path.join(repoRoot, "packages", "syno-dsh-plugin", "cordis.patch.yml"), "utf8");
  assert.equal(path.basename(synoDir), SYNO_PROFILE_NAME);
  assert.equal(path.basename(labDir), SYNO_LAB_PROFILE_NAME);
  assert.deepEqual(syno.dsh.profile.bundles, [
    "@deepseek-ai/dsh-base",
    "@deepseek-ai/dsh-web-app",
    "@syno/dsh-plugin",
  ]);
  assert.deepEqual(syno.dsh.profile.bundles, [...PRODUCTION_BUNDLES]);
  assert.doesNotMatch(JSON.stringify(syno), /dsh-mnemon/);
  assert.equal(syno.dsh.profile.allowMarketplaceAdd, false);
  assert.match(synoPatch, /Do not run/);
  assert.match(synoPatch, /id: agent-presets[\s\S]*default: syno/);
  assert.match(synoPatch, /includeUserRoot: true/);
  assert.match(agentPresetText, /name: '@deepseek-ai\/dsh-persona'/);
  assert.match(agentPresetText, /process\.env\.DSH_SYSTEM_PROMPT/);
  assert.match(agentPresetText, /process\.env\.SYNO_SKILL_ROOT \?\? process\.cwd\(\)/);
  assert.match(agentPresetText, /name: '@deepseek-ai\/dsh-compaction-basic'/);
  assert.match(agentPresetText, /name: '@deepseek-ai\/dsh-tool-web'/);
  assert.doesNotMatch(synoPatch, /sk-[A-Za-z0-9]/);
  assert.match(pluginPatch, /searchProvider: deepseek-official/);
  assert.match(pluginPatch, /name: '@deepseek-ai\/dsh-schedule'/);
  assert.match(pluginPatch, /defaultPreset: workspace-write/);
  assert.match(pluginPatch, /policy: never/);
  assert.doesNotMatch(pluginPatch, /sandbox: danger-full-access/);
  assert.doesNotMatch(pluginPatch, /sandbox: read-only/);
  assert.doesNotMatch(pluginPatch, /approval: ask/);
  assert.doesNotMatch(pluginPatch, /dsh plugin add/);
  assert.match(pluginPatch, /toolSet: core/);
  assert.equal(lab.dsh.profile.allowMarketplaceAdd, true);
  assert.ok(!lab.dependencies?.["@syno/dsh-plugin"]);
  const resolved = resolveProfilePackage(synoDir, "@syno/dsh-plugin");
  assert.equal(path.normalize(resolved), path.normalize(path.join(repoRoot, "packages", "syno-dsh-plugin", "plugin.mjs")));
});

test("JSON-RPC chat keeps the official compaction stack", async () => {
  const chat = await readFile(path.resolve("config/deepseek-harness/syno-chat.cordis.yml"), "utf8");
  assert.match(chat, /name: '@deepseek-ai\/dsh-token-meter'/);
  assert.match(chat, /name: '@deepseek-ai\/dsh-compaction-tool-result-pruner'/);
  assert.match(chat, /name: '@deepseek-ai\/dsh-compaction-basic'/);
  assert.match(chat, /thresholdRatio: 0\.8/);
  assert.match(chat, /retainRatio: 0\.16/);
  assert.match(chat, /name: '@deepseek-ai\/dsh-command-compact'/);
});

test("syno-lab profile rebuild preserves dsh CLI plugin dependencies without inheriting Syno", async (t) => {
  const homeRoot = await mkdtemp(path.join(os.tmpdir(), "syno-dsh-lab-preserve-"));
  t.after(() => rm(homeRoot, { recursive: true, force: true }));
  const repoRoot = path.resolve(".");
  const labDir = path.join(homeRoot, "profiles", SYNO_LAB_PROFILE_NAME);
  await mkdir(labDir, { recursive: true });
  const stalePluginDir = path.join(labDir, "node_modules", "@syno", "dsh-plugin");
  await mkdir(stalePluginDir, { recursive: true });
  await writeFile(path.join(stalePluginDir, "stale.txt"), "stale", "utf8");
  await writeFile(path.join(labDir, "package.json"), `${JSON.stringify({
    name: "dsh-profile",
    private: true,
    dsh: { profile: { bundles: ["dsh-mnemon", "@syno/dsh-plugin"], allowMarketplaceAdd: true } },
    dependencies: { "dsh-mnemon": "0.2.13", "@syno/dsh-plugin": "file:../../syno" },
  }, null, 2)}\n`, "utf8");

  await ensureSynoDshProfiles({ homeRoot, repoRoot });
  const lab = JSON.parse(await readFile(path.join(labDir, "package.json"), "utf8"));
  assert.deepEqual(lab.dsh.profile.bundles, [...LAB_BUNDLES, "dsh-mnemon"]);
  assert.equal(lab.dependencies["dsh-mnemon"], "0.2.13");
  assert.equal(lab.dependencies["@syno/dsh-plugin"], undefined);
  assert.equal(lab.dsh.profile.allowMarketplaceAdd, true);
  await assert.rejects(() => access(stalePluginDir), { code: "ENOENT" });
});
