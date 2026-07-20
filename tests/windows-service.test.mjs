import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { WindowsServiceManager } from "../apps/syno/syno/windows-service-manager.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");

test("WindowsServiceManager pins the repository, Node and management script", async () => {
  const calls = [];
  const manager = new WindowsServiceManager({
    platform: "win32",
    repoRoot: "C:\\Syno Workspace",
    nodePath: "C:\\Node Runtime\\node.exe",
    async run(args) {
      calls.push(args);
      return { stdout: JSON.stringify({ supported: true, installed: false, running: false, startup: "at_logon", webUrl: "http://127.0.0.1:4317/", legacyTaskDetected: false, lastTaskResult: null }) };
    },
  });
  await manager.status();
  assert.ok(calls[0].includes(path.resolve("C:\\Syno Workspace", "scripts", "manage-windows-task.ps1")));
  assert.ok(calls[0].includes(path.resolve("C:\\Node Runtime\\node.exe")));
  assert.equal(calls[0].at(-1), "-OutputJson");
});

test("Windows task DryRun describes a hidden, at-logon, restartable full Host without mutating Task Scheduler", { skip: process.platform !== "win32" }, async () => {
  const script = path.join(root, "scripts", "manage-windows-task.ps1");
  const spacedRoot = path.join(root, ".runtime", "Dry Run Workspace");
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
    "-Action", "Install", "-RepoRoot", spacedRoot, "-NodePath", process.execPath, "-DryRun", "-OutputJson",
  ], { windowsHide: true });
  const result = JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(result.dryRun, true);
  assert.equal(result.taskDefinition.name, "Syno");
  assert.equal(result.taskDefinition.trigger, "at_logon");
  assert.equal(result.taskDefinition.multipleInstances, "ignore_new");
  assert.equal(result.taskDefinition.restartIntervalMinutes, 1);
  assert.equal(result.taskDefinition.opensBrowser, false);
  assert.equal(result.taskDefinition.adoptsHealthyHost, true);
  assert.equal(result.taskDefinition.readiness, "task_running_and_health");
  assert.match(result.taskDefinition.arguments, /start-syno\.ps1/);
  assert.match(result.taskDefinition.arguments, /Dry Run Workspace/);
});

test("Windows task commands resolve the repository from the script path by default", { skip: process.platform !== "win32" }, async () => {
  const script = path.join(root, "scripts", "manage-windows-task.ps1");
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
    "-Action", "Install", "-NodePath", process.execPath, "-DryRun", "-OutputJson",
  ], { windowsHide: true });
  const result = JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(result.taskDefinition.workingDirectory, root);
  assert.match(result.taskDefinition.arguments, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("Windows task restart and uninstall own the exact Node child through a PID file", async () => {
  const launcher = await fs.readFile(path.join(root, "scripts", "start-syno.ps1"), "utf8");
  const manager = await fs.readFile(path.join(root, "scripts", "manage-windows-task.ps1"), "utf8");
  assert.match(launcher, /syno-host\.pid/);
  assert.match(launcher, /Start-Process[\s\S]*-PassThru/);
  assert.match(manager, /function Stop-SynoHost/);
  assert.match(manager, /Stop-ScheduledTask[\s\S]*Stop-SynoHost[\s\S]*Start-ScheduledTask/);
  assert.match(manager, /"Uninstall"[\s\S]*Stop-SynoHost[\s\S]*Unregister-ScheduledTask/);
  assert.match(manager, /"Open"[\s\S]*State -ne "Running"[\s\S]*Start-ScheduledTask/);
  for (const policy of ["MSFT_TaskLogonTrigger", "RestartInterval", "ExecutionTimeLimit", "MultipleInstances", "StartWhenAvailable"]) assert.match(manager, new RegExp(policy));
  assert.match(manager, /Export-ScheduledTask[\s\S]*Restore-SynoTask/);
  const installStart = manager.indexOf('"Install"');
  const rollbackTry = manager.indexOf("    try {", installStart);
  const stopExisting = manager.indexOf("Stop-ScheduledTask -TaskName $taskName", installStart);
  assert.ok(rollbackTry >= 0 && stopExisting > rollbackTry, "stopping an existing task must be inside the rollback boundary");
});

test("Windows task resolves a command shim to the real Node executable", { skip: process.platform !== "win32" }, async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(tmpdir(), "syno-node-shim-"));
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }));
  const shim = path.join(tempRoot, "node.cmd");
  await fs.writeFile(shim, `@echo off\r\n"${process.execPath}" %*\r\n`, "utf8");
  const script = path.join(root, "scripts", "manage-windows-task.ps1");
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
    "-Action", "Install", "-NodePath", shim, "-DryRun", "-OutputJson",
  ], { windowsHide: true });
  const result = JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
  assert.match(result.taskDefinition.arguments, new RegExp(process.execPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(result.taskDefinition.arguments, /node\.cmd/);
});

test("Windows service common policy rejects unknown health and stale PID ownership", { skip: process.platform !== "win32" }, async () => {
  const common = path.join(root, "scripts", "windows-service-common.ps1").replaceAll("'", "''");
  const command = `. '${common}'; $repo='C:\\Syno'; $node='C:\\Node\\node.exe'; $server='C:\\Syno\\apps\\syno\\server.mjs'; $fp=Get-SynoRepoFingerprint $repo; $good=[pscustomobject]@{ok=$true;product='syno-personal-butler';protocolVersion=1;repoFingerprint=$fp}; $unknown=[pscustomobject]@{ok=$true}; $started=[datetime]'2026-07-20T00:00:00Z'; $process=[pscustomobject]@{Path=$node;StartTime=$started}; $details=[pscustomobject]@{CommandLine='node C:\\Syno\\apps\\syno\\server.mjs'}; $owned=[pscustomobject]@{version=1;nodePath=$node;serverPath=$server;repoRoot=$repo;startedAt=$started.ToUniversalTime().ToString('o')}; $stale=[pscustomobject]@{version=1;nodePath=$node;serverPath=$server;repoRoot=$repo;startedAt='2026-07-19T00:00:00.0000000Z'}; [ordered]@{goodHealth=(Test-SynoHealthResponse $good $fp);unknownHealth=(Test-SynoHealthResponse $unknown $fp);owned=(Test-SynoOwnershipRecord $owned $process $details $node $server $repo);stale=(Test-SynoOwnershipRecord $stale $process $details $node $server $repo)} | ConvertTo-Json -Compress`;
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", command], { windowsHide: true });
  assert.deepEqual(JSON.parse(stdout.trim()), { goodHealth: true, unknownHealth: false, owned: true, stale: false });
});

test("Windows install fails before touching Task Scheduler when Node is missing", { skip: process.platform !== "win32" }, async () => {
  const script = path.join(root, "scripts", "manage-windows-task.ps1");
  await assert.rejects(execFileAsync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
    "-Action", "Install", "-NodePath", path.join(root, ".runtime", "missing-node.exe"), "-OutputJson",
  ], { windowsHide: true }), /Node executable not found/);
});
