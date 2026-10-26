import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { MacServiceManager, buildLaunchAgentPlist } from "../apps/syno/syno/mac-service-manager.mjs";

function recordingRun({ printOutput = "", printFails = false, calls = [] } = {}) {
  const run = async (args) => {
    calls.push([...args]);
    if (args[0] === "print") {
      if (printFails) throw Object.assign(new Error("Could not find service"), { code: 113 });
      return { stdout: printOutput, stderr: "" };
    }
    return { stdout: "", stderr: "" };
  };
  return { run, calls };
}

async function fixture(t, { run = recordingRun().run, healthOk = true, plist = null } = {}) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "syno-launchd-agent-"));
  const home = path.join(base, "home");
  const repoRoot = path.join(base, "repo");
  const scriptsDir = path.join(repoRoot, "scripts");
  await fs.mkdir(scriptsDir, { recursive: true });
  await fs.writeFile(path.join(scriptsDir, "syno-launchd.mjs"), "// fixture\n");
  const localDataRoot = path.join(base, "local-data");
  const manager = new MacServiceManager({
    platform: "darwin",
    repoRoot,
    nodePath: process.execPath,
    home,
    uid: 501,
    localDataRoot,
    run,
    healthProbe: async () => healthOk,
  });
  if (plist !== null) {
    await fs.mkdir(path.dirname(manager.plistPath), { recursive: true });
    await fs.writeFile(manager.plistPath, plist);
  }
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  return { base, home, repoRoot, localDataRoot, manager };
}

test("plist 内容固定：绝对路径、登录自启、失败重拉、日志与 PATH", () => {
  const plist = buildLaunchAgentPlist({
    label: "com.syno.butler.host",
    nodePath: "/usr/local/bin/node",
    launcherPath: "/repo/scripts/syno-launchd.mjs",
    repoRoot: "/repo",
    logRoot: "/data/logs",
  });
  assert.match(plist, /<key>Label<\/key>\n  <string>com\.syno\.butler\.host<\/string>/);
  assert.match(plist, /<string>\/usr\/local\/bin\/node<\/string>\n    <string>\/repo\/scripts\/syno-launchd\.mjs<\/string>/);
  assert.match(plist, /<key>WorkingDirectory<\/key>\n  <string>\/repo<\/string>/);
  assert.match(plist, /<key>RunAtLoad<\/key>\n  <true\/>/);
  assert.match(plist, /<key>SuccessfulExit<\/key>\n    <false\/>/);
  assert.match(plist, /<key>ThrottleInterval<\/key>\n  <integer>10<\/integer>/);
  assert.match(plist, /<string>[^<]*launchd-agent\.out\.log<\/string>/);
  assert.match(plist, /<string>[^<]*launchd-agent\.err\.log<\/string>/);
  assert.match(plist, /<key>PATH<\/key>\n    <string>\/usr\/bin:\/bin:\/usr\/sbin:\/sbin:\/usr\/local\/bin:\/opt\/homebrew\/bin<\/string>/);
  // 2026-10-26：launchd 默认 maxfiles=256 曾导致同步风暴中 spawn EBADF 假死
  assert.match(plist, /<key>SoftResourceLimits<\/key>\n  <dict>\n    <key>NumberOfFiles<\/key>\n    <integer>8192<\/integer>/);
  const escaped = buildLaunchAgentPlist({ label: "x", nodePath: "/n&x", launcherPath: "/l<m", repoRoot: "/r>", logRoot: "/g" });
  assert.match(escaped, /\/n&amp;x/);
  assert.match(escaped, /\/l&lt;m/);
  assert.match(escaped, /\/r&gt;/);
});

test("install：先卸旧实例再引导，重复安装幂等且 plist 字节一致", async (t) => {
  const { calls, run } = recordingRun({ printOutput: "state = running\n\tpid = 4242\n\tlast exit code = 0\n" });
  const { manager } = await fixture(t, { run });
  const first = await manager.install();
  assert.equal(first.supported, true);
  assert.equal(first.installed, true);
  assert.equal(first.running, true);
  assert.equal(first.pid, 4242);
  assert.deepEqual(calls.map((args) => args[0]), ["bootout", "bootstrap", "print"]);
  assert.deepEqual(calls[1], ["bootstrap", "gui/501", manager.plistPath]);
  const before = await fs.readFile(manager.plistPath, "utf8");
  await manager.install();
  const after = await fs.readFile(manager.plistPath, "utf8");
  assert.equal(before, after, "重复安装必须写出同一 plist");
  assert.deepEqual(calls.slice(3).map((args) => args[0]), ["bootout", "bootstrap", "print"]);
});

test("install：缺 Node 或缺启动器时快速失败且不触碰 launchctl", async (t) => {
  const { calls, run } = recordingRun();
  const { manager, repoRoot } = await fixture(t, { run });
  const missingNode = new MacServiceManager({ platform: "darwin", repoRoot, nodePath: path.join(repoRoot, "no-node"), home: manager.plistPath, uid: 501, run });
  await assert.rejects(missingNode.install(), /Node executable not found/);
  await fs.rm(path.join(repoRoot, "scripts", "syno-launchd.mjs"));
  await assert.rejects(manager.install(), /Syno launcher not found/);
  assert.equal(calls.length, 0);
});

test("status：解析 launchctl 输出，running 需同时满足作业状态与健康探测", async (t) => {
  const printOutput = "gui/501/com.syno.butler.host = {\n\tstate = running\n\tpid = 777\n\tlast exit code = 0\n}\n";
  const withHealth = await fixture(t, { run: recordingRun({ printOutput }).run, healthOk: true, plist: "<plist/>" });
  const status = await withHealth.manager.status();
  assert.equal(status.installed, true);
  assert.equal(status.loaded, true);
  assert.equal(status.jobState, "running");
  assert.equal(status.pid, 777);
  assert.equal(status.lastExitCode, 0);
  assert.equal(status.healthOk, true);
  assert.equal(status.running, true);
  const noHealth = await fixture(t, { run: recordingRun({ printOutput }).run, healthOk: false, plist: "<plist/>" });
  const degraded = await noHealth.manager.status();
  assert.equal(degraded.running, false);
  const notLoaded = await fixture(t, { run: recordingRun({ printFails: true }).run, healthOk: true, plist: "<plist/>" });
  const missing = await notLoaded.manager.status();
  assert.equal(missing.installed, true);
  assert.equal(missing.loaded, false);
  assert.equal(missing.running, false);
  assert.equal(missing.pid, null);
});

test("restart：kickstart -k 目标为本服务的 gui 域", async (t) => {
  const { calls, run } = recordingRun({ printOutput: "state = running\n" });
  const { manager } = await fixture(t, { run });
  await manager.restart();
  assert.deepEqual(calls[0], ["kickstart", "-k", "gui/501/com.syno.butler.host"]);
});

test("uninstall：bootout 并移除 plist，之后状态为未安装", async (t) => {
  const { calls, run } = recordingRun({ printFails: true });
  const { manager } = await fixture(t, { run });
  await manager.install();
  const result = await manager.uninstall();
  assert.equal(result.installed, false);
  assert.equal(result.loaded, false);
  assert.ok(calls.some((args) => args[0] === "bootout"));
  await assert.rejects(fs.access(manager.plistPath));
});

test("非 macOS 平台返回 unsupported 且不执行任何命令", async () => {
  const calls = [];
  const manager = new MacServiceManager({
    platform: "win32",
    run: async (args) => { calls.push(args); return { stdout: "" }; },
  });
  for (const action of ["status", "install", "restart", "uninstall"]) {
    const result = await manager[action]();
    assert.equal(result.supported, false);
  }
  assert.equal(calls.length, 0);
});

test("manage-macos-agent CLI 入口与 package.json 脚本接线", async () => {
  const root = path.resolve(import.meta.dirname, "..");
  const cli = await fs.readFile(path.join(root, "scripts", "manage-macos-agent.mjs"), "utf8");
  assert.match(cli, /MacServiceManager/);
  const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  for (const name of ["macos:install", "macos:status", "macos:restart", "macos:uninstall"]) {
    assert.match(pkg.scripts[name] || "", /manage-macos-agent\.mjs/);
  }
});
