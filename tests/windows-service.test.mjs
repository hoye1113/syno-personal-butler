import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { WindowsServiceManager } from "../apps/syno/syno/windows-service-manager.mjs";
import { WindowsServiceControl } from "../apps/syno/syno/windows-service-control.mjs";
import { JobStore } from "../apps/syno/syno/job-store.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");

function runPowerShell(script, input = "") {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-Command", script], {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", (code) => code === 0
      ? resolve(stdout.trim())
      : reject(new Error(stderr.trim() || `PowerShell exited ${code}`)));
    child.stdin.end(input);
  });
}

const taskXmlFixture = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>Syno personal knowledge butler</Description></RegistrationInfo>
  <Triggers><LogonTrigger><Enabled>true</Enabled><UserId>TEST\\Owner</UserId></LogonTrigger></Triggers>
  <Principals><Principal id="Author"><UserId>TEST\\Owner</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RestartOnFailure><Interval>PT1M</Interval><Count>999</Count></RestartOnFailure>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Hidden>true</Hidden>
  </Settings>
  <Actions Context="Author"><Exec>
    <Command>C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe</Command>
    <Arguments>-NoProfile -File "D:\\Syno Workspace\\scripts\\start-syno.ps1"</Arguments>
    <WorkingDirectory>D:\\Syno Workspace</WorkingDirectory>
  </Exec></Actions>
</Task>`;

function taskXmlCommand(action) {
  const modulePath = path.join(root, "scripts", "Syno.WindowsTaskXml.psm1").replaceAll("'", "''");
  const common = `-ExpectedUser 'TEST\\Owner' -ExpectedCommand 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' -ExpectedArguments '-NoProfile -File "D:\\Syno Workspace\\scripts\\start-syno.ps1"' -ExpectedWorkingDirectory 'D:\\Syno Workspace'`;
  return `Import-Module '${modulePath}' -Force; $xml=[Console]::In.ReadToEnd(); ${action} -XmlText $xml ${common}`;
}

test("Windows task XML contract adds one logon delay without changing execution authority", { skip: process.platform !== "win32" }, async () => {
  const output = await runPowerShell(taskXmlCommand("Protect-SynoTaskXml"), taskXmlFixture);

  assert.equal((output.match(/<Delay>PT30S<\/Delay>/g) || []).length, 1);
  assert.match(output, /<UserId>TEST\\Owner<\/UserId><Delay>PT30S<\/Delay>/);
  assert.match(output, /<Command>C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell\.exe<\/Command>/);
  assert.match(output, /<Arguments>-NoProfile -File "D:\\Syno Workspace\\scripts\\start-syno\.ps1"<\/Arguments>/);
  assert.match(output, /<WorkingDirectory>D:\\Syno Workspace<\/WorkingDirectory>/);
  assert.match(output, /<UserId>TEST\\Owner<\/UserId>/);
});

test("Windows task XML contract verifies the persisted protected form without mutating it", { skip: process.platform !== "win32" }, async () => {
  const modulePath = path.join(root, "scripts", "Syno.WindowsTaskXml.psm1").replaceAll("'", "''");
  const script = `Import-Module '${modulePath}' -Force; $xml=[Console]::In.ReadToEnd(); $protected=Protect-SynoTaskXml -XmlText $xml -ExpectedUser 'TEST\\Owner' -ExpectedCommand 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' -ExpectedArguments '-NoProfile -File "D:\\Syno Workspace\\scripts\\start-syno.ps1"' -ExpectedWorkingDirectory 'D:\\Syno Workspace'; Test-SynoTaskXml -XmlText $protected -ExpectedUser 'TEST\\Owner' -ExpectedCommand 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' -ExpectedArguments '-NoProfile -File "D:\\Syno Workspace\\scripts\\start-syno.ps1"' -ExpectedWorkingDirectory 'D:\\Syno Workspace'`;
  const output = await runPowerShell(script, taskXmlFixture);

  assert.equal(output, "True");
});

test("Windows task XML contract is idempotent and fails closed on trigger or authority drift", { skip: process.platform !== "win32" }, async () => {
  const once = await runPowerShell(taskXmlCommand("Protect-SynoTaskXml"), taskXmlFixture);
  const twice = await runPowerShell(taskXmlCommand("Protect-SynoTaskXml"), once);
  assert.equal((twice.match(/<Delay>PT30S<\/Delay>/g) || []).length, 1);

  const duplicateTrigger = taskXmlFixture.replace("</Triggers>", "<LogonTrigger><Enabled>true</Enabled><UserId>TEST\\Owner</UserId></LogonTrigger></Triggers>");
  await assert.rejects(runPowerShell(taskXmlCommand("Protect-SynoTaskXml"), duplicateTrigger), /exactly one logon trigger/);

  const alteredCommand = taskXmlFixture.replace("powershell.exe</Command>", "cmd.exe</Command>");
  await assert.rejects(runPowerShell(taskXmlCommand("Protect-SynoTaskXml"), alteredCommand), /unexpected command/);

  const wrongNamespace = taskXmlFixture.replace("http://schemas.microsoft.com/windows/2004/02/mit/task", "urn:not-task-scheduler");
  await assert.rejects(runPowerShell(taskXmlCommand("Protect-SynoTaskXml"), wrongNamespace), /unsupported namespace/);
});

test("Windows installer protects and verifies exported task XML before starting", async () => {
  const manager = await fs.readFile(path.join(root, "scripts", "manage-windows-task.ps1"), "utf8");
  const installStart = manager.indexOf('"Install"');
  const baseRegister = manager.indexOf("Register-ScheduledTask -TaskName $taskName -InputObject $task", installStart);
  const firstExport = manager.indexOf("Export-ScheduledTask -TaskName $taskName", baseRegister);
  const protect = manager.indexOf("Protect-SynoTaskXml", firstExport);
  const xmlRegister = manager.indexOf("Register-ScheduledTask -TaskName $taskName -Xml", protect);
  const secondExport = manager.indexOf("Export-ScheduledTask -TaskName $taskName", xmlRegister);
  const verify = manager.indexOf("Test-SynoTaskXml", secondExport);
  const start = manager.indexOf("Start-ScheduledTask -TaskName $taskName", verify);

  assert.match(manager, /taskXmlModule[\s\S]*Syno\.WindowsTaskXml\.psm1[\s\S]*Import-Module \$taskXmlModule/);
  assert.ok(baseRegister >= 0 && firstExport > baseRegister && protect > firstExport);
  assert.ok(xmlRegister > protect && secondExport > xmlRegister && verify > secondExport && start > verify);
  assert.doesNotMatch(manager, /\.Triggers\[0\]\.Delay|schtasks(?:\.exe)?\s+\/Change/i);
});

test("Windows installer reuses an existing healthy task only after its XML contract passes", async () => {
  const manager = await fs.readFile(path.join(root, "scripts", "manage-windows-task.ps1"), "utf8");
  const installStart = manager.indexOf('"Install"');
  const existingLookup = manager.indexOf("$existing = Get-TaskOrNull $taskName", installStart);
  const existingExport = manager.indexOf("Export-ScheduledTask -TaskName $taskName", existingLookup);
  const existingVerify = manager.indexOf("Test-SynoTaskXml", existingExport);
  const healthyFastPath = manager.indexOf("Wait-SynoHealth 2", existingVerify);

  assert.ok(existingLookup >= 0 && existingExport > existingLookup);
  assert.ok(existingVerify > existingExport && healthyFastPath > existingVerify);
});

test("Windows lifecycle mutations are canonical audited operations", async (t) => {
  await fs.mkdir(path.join(root, ".runtime"), { recursive: true });
  const tempRoot = await fs.mkdtemp(path.join(root, ".runtime", "syno-windows-control-"));
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));
  const jobs = new JobStore({ opsRoot: path.join(tempRoot, "ops"), payloadRoot: path.join(tempRoot, "payloads") });
  const control = new WindowsServiceControl({
    manager: {
      async install() { return { supported: true, installed: true, running: true }; },
      async uninstall() { return { supported: true, installed: false, running: false }; },
    },
    jobs,
  });

  // trust-but-clarify：system_control 受 allowSystemControl 开关控制（默认关）；开启后显式允许、自动执行。
  const result = await control.mutate("install", { channel: "web", senderId: "local-user", allowSystemControl: true });
  assert.equal(result.installed, true);
  assert.match(result.jobId, /^job-/);
  const job = await jobs.get(result.jobId);
  assert.equal(job.intent, "system_control");
  assert.equal(job.status, "completed");
  assert.equal(job.request.operation, "windows.service.install");
  assert.deepEqual(job.approvalActors, ["web:local-user"]);
});

test("failed Windows lifecycle mutations leave a terminal audited Job", async (t) => {
  await fs.mkdir(path.join(root, ".runtime"), { recursive: true });
  const tempRoot = await fs.mkdtemp(path.join(root, ".runtime", "syno-windows-failure-"));
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));
  const jobs = new JobStore({ opsRoot: path.join(tempRoot, "ops"), payloadRoot: path.join(tempRoot, "payloads") });
  const control = new WindowsServiceControl({ manager: { async install() { throw new Error("Task Scheduler unavailable"); } }, jobs });

  await assert.rejects(control.mutate("install", { channel: "web", senderId: "local-user", allowSystemControl: true }), /Task Scheduler unavailable/);
  const [job] = await jobs.list();
  assert.equal(job.status, "failed");
  assert.equal(job.error.code, "WINDOWS_SERVICE_FAILED");
  assert.match(job.error.message, /Task Scheduler unavailable/);
});

test("Windows lifecycle mutations refuse with an actionable hint when the system-control switch is off", async (t) => {
  await fs.mkdir(path.join(root, ".runtime"), { recursive: true });
  const tempRoot = await fs.mkdtemp(path.join(root, ".runtime", "syno-windows-denied-"));
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));
  const jobs = new JobStore({ opsRoot: path.join(tempRoot, "ops"), payloadRoot: path.join(tempRoot, "payloads") });
  const control = new WindowsServiceControl({
    manager: { async install() { throw new Error("manager must not run while denied"); }, async uninstall() { throw new Error("manager must not run while denied"); } },
    jobs,
  });
  // 开关默认关（不传 allowSystemControl）→ 拒绝并给出 D4 可操作提示；manager 绝不被调用。
  await assert.rejects(control.mutate("install", { channel: "web", senderId: "local-user" }), /系统控制开关默认关闭/);
  const [denied] = await jobs.list();
  assert.equal(denied.status, "rejected");
  assert.equal(denied.error.code, "POLICY_DENIED");
});

test("WindowsServiceManager pins the repository, Node and management script", async () => {
  const calls = [];
  const manager = new WindowsServiceManager({
    platform: "win32",
    repoRoot: "C:\\Syno Workspace",
    nodePath: "C:\\Node Runtime\\node.exe",
    async run(args) {
      calls.push(args);
      return { stdout: JSON.stringify({ supported: true, installed: false, running: false, startup: "at_logon", webUrl: "http://127.0.0.1:8888/", legacyTaskDetected: false, lastTaskResult: null }) };
    },
  });
  await manager.status();
  await manager.install();
  await manager.uninstall();
  assert.ok(calls[0].includes(path.resolve("C:\\Syno Workspace", "scripts", "manage-windows-task.ps1")));
  assert.ok(calls[0].includes(path.resolve("C:\\Node Runtime\\node.exe")));
  assert.equal(calls[0].at(-1), "-OutputJson");
  assert.doesNotMatch(calls[0].join(" "), /KeepHostRunning/);
  assert.match(calls[1].join(" "), /-KeepHostRunning/);
  assert.match(calls[2].join(" "), /-KeepHostRunning/);
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
  assert.equal(result.taskDefinition.allowStartOnBattery, true);
  assert.equal(result.taskDefinition.dontStopOnBattery, true);
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
  assert.match(manager, /Restore-SynoTask[\s\S]*Wait-SynoTaskReady/, "a running task restored after failure must pass health readiness again");
  assert.doesNotMatch(manager, /try \{ Stop-SynoHost \} catch \{ \}/, "replacement cleanup failures must not be swallowed");
  assert.match(manager, /function Stop-SynoWrappers[\s\S]*Get-CimInstance Win32_Process[\s\S]*Test-SynoWrapperProcess/);
  assert.match(launcher, /same-session node\.exe[\s\S]*Win32_Process details are inaccessible/);
  assert.match(launcher, /syno-launcher-log-policy\.ps1/);
  assert.match(launcher, /Test-SynoLauncherLogDue/);
  assert.match(launcher, /AddDays\(-14\)/);
  assert.match(manager, /"Uninstall"[\s\S]*KeepHostRunning[\s\S]*Stop-SynoWrappers/, "Web uninstall must retire task wrappers without killing the Host");
  const installStart = manager.indexOf('"Install"');
  const rollbackTry = manager.indexOf("    try {", installStart);
  const stopExisting = manager.indexOf("Stop-ScheduledTask -TaskName $taskName", installStart);
  assert.ok(rollbackTry >= 0 && stopExisting > rollbackTry, "stopping an existing task must be inside the rollback boundary");
});

test("legacy Windows installer delegates to the full Host manager instead of creating Syno Worker", async () => {
  const legacy = await fs.readFile(path.join(root, "scripts", "install-windows-task.ps1"), "utf8");
  assert.match(legacy, /manage-windows-task\.ps1/);
  assert.match(legacy, /-Action Install/);
  assert.doesNotMatch(legacy, /Register-ScheduledTask|start-worker\.ps1/);
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

test("Windows task never persists a mise Node shim as the launcher target", async () => {
  const manager = await fs.readFile(path.join(root, "scripts", "manage-windows-task.ps1"), "utf8");
  assert.match(manager, /function Resolve-SynoNodePath/);
  assert.match(manager, /mise shim/);
  assert.match(manager, /which node/);
  assert.match(manager, /must resolve to a real node\.exe/);
});

test("Windows service common policy rejects unknown health and stale PID ownership", { skip: process.platform !== "win32" }, async () => {
  const common = path.join(root, "scripts", "windows-service-common.ps1").replaceAll("'", "''");
  const command = `. '${common}'; $repo='C:\\Syno'; $node='C:\\Node\\node.exe'; $server='C:\\Syno\\apps\\syno\\server.mjs'; $fp=Get-SynoRepoFingerprint $repo; $good=[pscustomobject]@{ok=$true;product='syno-personal-butler';protocolVersion=2;repoFingerprint=$fp}; $legacy=[pscustomobject]@{ok=$true;product='syno-personal-butler';protocolVersion=1;repoFingerprint=$fp}; $unknown=[pscustomobject]@{ok=$true}; $started=[datetime]'2026-07-20T00:00:00Z'; $process=[pscustomobject]@{Path=$node;StartTime=$started}; $details=[pscustomobject]@{CommandLine='node C:\\Syno\\apps\\syno\\server.mjs'}; $owned=[pscustomobject]@{version=1;nodePath=$node;serverPath=$server;repoRoot=$repo;startedAt=$started.ToUniversalTime().ToString('o')}; $stale=[pscustomobject]@{version=1;nodePath=$node;serverPath=$server;repoRoot=$repo;startedAt='2026-07-19T00:00:00.0000000Z'}; [ordered]@{goodHealth=(Test-SynoHealthResponse $good $fp);legacyHealth=(Test-SynoHealthResponse $legacy $fp);unknownHealth=(Test-SynoHealthResponse $unknown $fp);owned=(Test-SynoOwnershipRecord $owned $process $details $node $server $repo);stale=(Test-SynoOwnershipRecord $stale $process $details $node $server $repo)} | ConvertTo-Json -Compress`;
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", command], { windowsHide: true });
  assert.deepEqual(JSON.parse(stdout.trim()), { goodHealth: true, legacyHealth: false, unknownHealth: false, owned: true, stale: false });
});

test("launcher log policy caps healthy five-second polling to hourly heartbeats without hiding failures", { skip: process.platform !== "win32" }, async () => {
  const policyPath = path.join(root, "scripts", "syno-launcher-log-policy.ps1").replaceAll("'", "''");
  const script = [
    `. '${policyPath}'`,
    "$state = New-SynoLauncherLogPolicyState",
    "$start = [DateTime]'2026-07-30T00:00:00Z'",
    "$health = 0",
    "$adopted = 0",
    "$failed = 0",
    "for ($seconds = 0; $seconds -lt 86400; $seconds += 5) {",
    "  $now = $start.AddSeconds($seconds)",
    "  if (Test-SynoLauncherLogDue -State $state -Event 'launcher.health_ok' -Now $now) { $health++ }",
    "  if (Test-SynoLauncherLogDue -State $state -Event 'launcher.adopted' -Now $now) { $adopted++ }",
    "  if (Test-SynoLauncherLogDue -State $state -Event 'launcher.failed' -Now $now) { $failed++ }",
    "}",
    "[ordered]@{ health = $health; adopted = $adopted; failed = $failed } | ConvertTo-Json -Compress",
  ].join("; ");
  const result = JSON.parse(await runPowerShell(script));

  assert.equal(result.health, 24);
  assert.equal(result.adopted, 24);
  assert.equal(result.failed, 17_280);
});

test("Windows service common policy recognizes only this repository's launcher wrapper", { skip: process.platform !== "win32" }, async () => {
  const common = path.join(root, "scripts", "windows-service-common.ps1").replaceAll("'", "''");
  const command = `. '${common}'; $good=[pscustomobject]@{Name='powershell.exe';CommandLine='powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\\Syno\\scripts\\start-syno.ps1" -RepoRoot "C:\\Syno" -NodePath "C:\\Node\\node.exe"'}; $mention=[pscustomobject]@{Name='powershell.exe';CommandLine='powershell.exe -Command "Write-Host C:\\Syno\\scripts\\start-syno.ps1 C:\\Syno C:\\Node\\node.exe"'}; $extra=[pscustomobject]@{Name='powershell.exe';CommandLine='powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\\Syno\\scripts\\start-syno.ps1" -RepoRoot "C:\\Syno" -NodePath "C:\\Node\\node.exe" -Danger yes'}; [ordered]@{good=(Test-SynoWrapperProcess $good 'C:\\Syno\\scripts\\start-syno.ps1' 'C:\\Syno' 'C:\\Node\\node.exe');mention=(Test-SynoWrapperProcess $mention 'C:\\Syno\\scripts\\start-syno.ps1' 'C:\\Syno' 'C:\\Node\\node.exe');extra=(Test-SynoWrapperProcess $extra 'C:\\Syno\\scripts\\start-syno.ps1' 'C:\\Syno' 'C:\\Node\\node.exe')} | ConvertTo-Json -Compress`;
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", command], { windowsHide: true });
  assert.deepEqual(JSON.parse(stdout.trim()), { good: true, mention: false, extra: false });
});

test("Windows install fails before touching Task Scheduler when Node is missing", { skip: process.platform !== "win32" }, async () => {
  const script = path.join(root, "scripts", "manage-windows-task.ps1");
  await assert.rejects(execFileAsync("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
    "-Action", "Install", "-NodePath", path.join(root, ".runtime", "missing-node.exe"), "-OutputJson",
  ], { windowsHide: true }), /Node executable not found/);
});
