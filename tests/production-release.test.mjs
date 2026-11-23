import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { activateRelease, prepareRelease } from "../scripts/deploy-production.mjs";

const git = (cwd, ...args) => execFileSync("git", args, { cwd, stdio: "ignore" });

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "syno-production-release-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, "source");
  mkdirSync(path.join(source, "experiments/superagent-p0"), { recursive: true });
  writeFileSync(path.join(source, "experiments/superagent-p0/real-feishu-client.mjs"), "// fixture\n");
  git(source, "init", "-q");
  git(source, "config", "user.name", "Release Test");
  git(source, "config", "user.email", "release-test@example.invalid");
  git(source, "add", "--", "experiments/superagent-p0/real-feishu-client.mjs");
  git(source, "commit", "-q", "-m", "fixture");
  return { root, source };
}

test("prepare 从干净提交生成不可变 release，不自动激活", (t) => {
  const { root, source } = fixture(t);
  const releasesRoot = path.join(root, "releases");
  const result = prepareRelease({ sourceRoot: source, releasesRoot, gate: false, install: false, now: () => new Date("2026-11-23T04:00:00.000Z") });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: source, encoding: "utf8" }).trim();
  assert.equal(result.commit, commit);
  assert.equal(result.activated, false);
  assert.equal(readFileSync(path.join(result.release, "experiments/superagent-p0/real-feishu-client.mjs"), "utf8"), "// fixture\n");
  assert.equal(existsSync(path.join(releasesRoot, "current")), false);
  assert.throws(() => prepareRelease({ sourceRoot: source, releasesRoot, gate: false, install: false, now: () => new Date("2026-11-23T04:00:00.000Z") }));
});

test("activate 原子切换 current，保留旧 release 并拒绝覆盖真实目录", (t) => {
  const { root, source } = fixture(t);
  const releasesRoot = path.join(root, "releases");
  const { release } = prepareRelease({ sourceRoot: source, releasesRoot, gate: false, install: false, now: () => new Date("2026-11-23T04:00:00.000Z") });
  assert.throws(() => activateRelease({ release }), /依赖未安装/);

  const manifestPath = path.join(release, "release.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  writeFileSync(manifestPath, JSON.stringify({ ...manifest, dependenciesInstalled: true }));
  mkdirSync(path.join(release, "node_modules"));
  activateRelease({ release });
  const current = path.join(releasesRoot, "current");
  assert.equal(realpathSync(current), realpathSync(release));

  const second = `${release}-next`;
  cpSync(release, second, { recursive: true });
  activateRelease({ release: second });
  assert.equal(realpathSync(current), realpathSync(second));
  assert.ok(existsSync(release));

  unlinkSync(current);
  mkdirSync(current);
  assert.throws(() => activateRelease({ release }), /拒绝覆盖/);
});
