#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_NODE = "v24.21.0";
const ENTRY = "experiments/superagent-p0/real-feishu-client.mjs";
const SCHEMA = "syno-production-release-v1";

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

function output(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: "utf8" }).trim();
}

function assertSupportedNode() {
  assert.equal(process.version, EXPECTED_NODE, `生产部署必须使用 Node ${EXPECTED_NODE}`);
}

function verifyRelease(release) {
  run(process.execPath, ["--check", path.join(release, ENTRY)], release);
  run(process.execPath, [path.join(release, ENTRY), "--verify-import"], release);
}

export function prepareRelease({
  sourceRoot,
  releasesRoot,
  gate = true,
  install = true,
  now = () => new Date(),
} = {}) {
  assertSupportedNode();
  assert.ok(path.isAbsolute(sourceRoot) && path.isAbsolute(releasesRoot), "sourceRoot 与 releasesRoot 必须是绝对路径");
  assert.equal(output("git", ["status", "--porcelain"], sourceRoot), "", "只能部署干净工作树");
  if (gate) run("corepack", ["pnpm", "run", "gate"], sourceRoot);
  const commit = output("git", ["rev-parse", "HEAD"], sourceRoot);
  const createdAt = now().toISOString();
  const id = `${createdAt.replace(/[-:.]/g, "").replace("Z", "Z-")}${commit.slice(0, 12)}`;
  mkdirSync(releasesRoot, { recursive: true });
  const release = path.join(releasesRoot, id);
  mkdirSync(release);
  const archive = `${release}.tar`;
  try {
    run("git", ["archive", "--format=tar", `--output=${archive}`, "HEAD"], sourceRoot);
    run("tar", ["-xf", archive, "-C", release], sourceRoot);
    if (install) run("corepack", ["pnpm", "install", "--frozen-lockfile", "--prod"], release);
    verifyRelease(release);
    writeFileSync(path.join(release, "release.json"), `${JSON.stringify({
      schema: SCHEMA,
      commit,
      createdAt,
      node: EXPECTED_NODE,
      packageManager: "pnpm@12.11.2",
      dependenciesInstalled: install,
    }, null, 2)}\n`, { flag: "wx" });
    return { schema: SCHEMA, release, commit, activated: false };
  } finally {
    rmSync(archive, { force: true });
  }
}

export function activateRelease({ release } = {}) {
  assertSupportedNode();
  assert.ok(path.isAbsolute(release), "release 必须是绝对路径");
  const manifest = JSON.parse(readFileSync(path.join(release, "release.json"), "utf8"));
  assert.equal(manifest.schema, SCHEMA);
  assert.match(manifest.commit, /^[0-9a-f]{40}$/);
  assert.equal(manifest.dependenciesInstalled, true, "依赖未安装的 release 不得激活");
  assert.ok(existsSync(path.join(release, "node_modules")), "release 缺少独立 node_modules");
  verifyRelease(release);

  const parent = path.dirname(release);
  const current = path.join(parent, "current");
  if (existsSync(current)) assert.ok(lstatSync(current).isSymbolicLink(), "current 已存在且不是软链，拒绝覆盖");
  const temporary = path.join(parent, `.current-${process.pid}-${randomUUID()}`);
  symlinkSync(release, temporary, "dir");
  try {
    renameSync(temporary, current);
  } finally {
    rmSync(temporary, { force: true });
  }
  return { schema: SCHEMA, release, commit: manifest.commit, current, activated: true };
}

function main(argv) {
  const [command, flag, value, ...extra] = argv;
  assert.ok(!extra.length && value, "参数不完整");
  if (command === "prepare" && flag === "--releases-root") {
    return prepareRelease({ sourceRoot: path.resolve(import.meta.dirname, ".."), releasesRoot: value });
  }
  if (command === "activate" && flag === "--release") return activateRelease({ release: value });
  throw new Error("用法：prepare --releases-root <绝对目录>；或 activate --release <绝对 release 目录>");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(main(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
