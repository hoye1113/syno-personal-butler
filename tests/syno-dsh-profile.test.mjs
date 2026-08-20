import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ensureSynoDshProfiles,
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
  const { synoDir, labDir } = await ensureSynoDshProfiles({ homeRoot, repoRoot });
  const syno = JSON.parse(await readFile(path.join(synoDir, "package.json"), "utf8"));
  const lab = JSON.parse(await readFile(path.join(labDir, "package.json"), "utf8"));
  const synoPatch = await readFile(path.join(synoDir, "cordis.patch.yml"), "utf8");
  const pluginPatch = await readFile(path.join(repoRoot, "packages", "syno-dsh-plugin", "cordis.patch.yml"), "utf8");
  assert.equal(path.basename(synoDir), SYNO_PROFILE_NAME);
  assert.equal(path.basename(labDir), SYNO_LAB_PROFILE_NAME);
  assert.deepEqual(syno.dsh.profile.bundles, [...PRODUCTION_BUNDLES]);
  assert.equal(syno.dsh.profile.allowMarketplaceAdd, false);
  assert.match(synoPatch, /Do not run/);
  assert.doesNotMatch(synoPatch, /sk-[A-Za-z0-9]/);
  assert.match(pluginPatch, /searchProvider: deepseek-official/);
  assert.doesNotMatch(pluginPatch, /dsh plugin add/);
  assert.equal(lab.dsh.profile.allowMarketplaceAdd, true);
  assert.ok(!lab.dependencies?.["@syno/dsh-plugin"]);
  const resolved = resolveProfilePackage(synoDir, "@syno/dsh-plugin");
  assert.equal(path.normalize(resolved), path.normalize(path.join(repoRoot, "packages", "syno-dsh-plugin", "plugin.mjs")));
});
