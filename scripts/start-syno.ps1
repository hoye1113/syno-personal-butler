param(
  [Parameter(Mandatory = $true)][string]$RepoRoot,
  [Parameter(Mandatory = $true)][string]$NodePath
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$resolvedNode = (Resolve-Path -LiteralPath $NodePath).Path
$commonScript = Join-Path $PSScriptRoot "windows-service-common.ps1"
. $commonScript
$logPolicyScript = Join-Path $PSScriptRoot "syno-launcher-log-policy.ps1"
. $logPolicyScript
# Canonical web port: mirror apps/syno/syno/paths.mjs DEFAULT_WEB_PORT (PORT env overrides).
$synoPort = if ($env:PORT) { [int]$env:PORT } else { 8888 }
$server = Join-Path $resolvedRoot "apps\syno\server.mjs"
if (-not (Test-Path -LiteralPath $server -PathType Leaf)) { throw "Syno Host entrypoint not found: $server" }
$runtimeRoot = Join-Path $resolvedRoot ".runtime"
$pidFile = Join-Path $runtimeRoot "syno-host.pid"
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$logBase = if ([string]::IsNullOrWhiteSpace([string]$env:LOCALAPPDATA)) { $runtimeRoot } else { $env:LOCALAPPDATA }
$logRoot = Join-Path $logBase "Syno\logs"
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$logPath = Join-Path $logRoot ("windows-task-{0}.jsonl" -f (Get-Date -Format "yyyy-MM-dd"))
$script:synoLogPath = $logPath
$script:launcherLogPolicyState = New-SynoLauncherLogPolicyState
Get-ChildItem -LiteralPath $logRoot -Filter "windows-task-*.jsonl" -File -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) } |
  Remove-Item -Force -ErrorAction SilentlyContinue

function Write-SynoLauncherLog([string]$Event, $Fields = @{}) {
  try {
    if (-not (Test-SynoLauncherLogDue -State $script:launcherLogPolicyState -Event $Event -Now ([DateTime]::UtcNow))) { return }
    $currentLogPath = Join-Path $logRoot ("windows-task-{0}.jsonl" -f (Get-Date -Format "yyyy-MM-dd"))
    if ($script:synoLogPath -ne $currentLogPath) { $script:synoLogPath = $currentLogPath }
    $record = [ordered]@{ ts = [DateTime]::UtcNow.ToString("o"); event = $Event; repoFingerprint = $repoFingerprint }
    foreach ($entry in $Fields.GetEnumerator()) { $record[$entry.Key] = $entry.Value }
    ($record | ConvertTo-Json -Compress -Depth 5) | Add-Content -LiteralPath $script:synoLogPath -Encoding UTF8
  } catch { }
}

trap {
  if (Get-Command Write-SynoLauncherLog -ErrorAction SilentlyContinue) {
    Write-SynoLauncherLog "launcher.failed" @{ message = $_.Exception.Message }
  }
  throw
}

$serverPath = [IO.Path]::GetFullPath($server)
$relativeServerPath = $serverPath.Substring($resolvedRoot.Length).TrimStart('\', '/').Replace('\', '/')
$repoFingerprint = Get-SynoRepoFingerprint $resolvedRoot

Write-SynoLauncherLog "launcher.started" @{ nodePath = $resolvedNode; serverPath = $serverPath; sessionId = ([Diagnostics.Process]::GetCurrentProcess().SessionId) }

function Write-HostOwnership($Process, [string]$Mode) {
  $record = [ordered]@{
    version = 1
    pid = $Process.Id
    startedAt = $Process.StartTime.ToUniversalTime().ToString("o")
    nodePath = $resolvedNode
    serverPath = $serverPath
    repoRoot = $resolvedRoot
    mode = $Mode
  }
  $temporary = "$pidFile.$PID.tmp"
  $record | ConvertTo-Json -Compress | Set-Content -LiteralPath $temporary -Encoding UTF8
  Move-Item -LiteralPath $temporary -Destination $pidFile -Force
}

function Adopt-HealthyHost {
  $listener = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort $synoPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $listener) { throw "Syno health responded but no loopback listener was found" }
  $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
  $details = try { Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction Stop } catch { $null }
  $processPath = if ($process -and $process.Path) { [IO.Path]::GetFullPath($process.Path) } else { "" }
  $processName = if ($processPath) { [IO.Path]::GetFileName($processPath) } else { "" }
  $sameSession = $process -and $process.SessionId -eq ([Diagnostics.Process]::GetCurrentProcess().SessionId)
  $commandLine = [string]$details.CommandLine
  $commandMatches = -not $details -or [string]::IsNullOrWhiteSpace($commandLine) -or
    $commandLine.IndexOf($serverPath, [StringComparison]::OrdinalIgnoreCase) -ge 0 -or
    $commandLine.Replace('\', '/').IndexOf($relativeServerPath, [StringComparison]::OrdinalIgnoreCase) -ge 0
  # A manually started Syno Host may use a different absolute Node installation
  # than the one pinned into the task.  Health already proves the repository
  # fingerprint; accept any same-session node.exe and retain the command-line
  # check when WMI is available.  This also works for restricted Task Scheduler
  # contexts where Win32_Process details are inaccessible.
  if (-not $process -or -not $sameSession -or $processName -notmatch "(?i)^node(?:\.exe)?$" -or -not $commandMatches) {
    Write-SynoLauncherLog "launcher.adopt_rejected" @{ listenerPid = $listener.OwningProcess; processName = $processName; processSession = if ($process) { $process.SessionId } else { $null }; sameSession = $sameSession; commandMatches = $commandMatches; detailsAvailable = [bool]$details }
    throw "Healthy loopback service is not the configured Syno Host"
  }
  Write-SynoLauncherLog "launcher.adopted" @{ listenerPid = $listener.OwningProcess; processName = $processName; processSession = $process.SessionId; sameSession = $sameSession; detailsAvailable = [bool]$details }
  Write-HostOwnership $process "adopted"
}

Set-Location -LiteralPath $resolvedRoot
Remove-Item Env:SYNO_WEB_ONLY -ErrorAction SilentlyContinue

# Supervise the host for the lifetime of this task. Task Scheduler's
# RestartOnFailure is inert in this Windows build (verified empirically: neither
# exit 1 nor STATUS_CONTROL_C_EXIT 0xC000013A triggers a restart), so a crashed
# host never returns and proactive push silently dies. The launcher must
# self-supervise: respawn any abnormally exited child after a backoff, and exit
# only on a graceful shutdown (code 0). A persistent failure (e.g. a bad config
# that keeps crashing node) respawns once per backoff indefinitely by design --
# giving up would mean permanent downtime, and RestartOnFailure can no longer be
# relied on to recover -- but every attempt is logged (launcher.host_crashed) so
# the loop is observable, not silent. Because this wrapper owns the host's
# lifetime, a durable stop must terminate the scheduled task: Stop-ScheduledTask
# kills this wrapper and skips the finally/respawn path, whereas killing only the
# host pid (Stop-SynoHost) just triggers a respawn after the backoff. All managed
# stop paths already pair the two.
$restartBackoffSeconds = 60
while ($true) {
  # If a healthy Syno Host already owns the loopback port -- at startup (a
  # Web-triggered interactive install still running) or after a crash+backoff
  # (a manual start during the window) -- adopt and watch it instead of spawning
  # a competing process that would lose the bind. Watch until that host goes
  # away, then fall through to spawn our own.
  while ($true) {
    $health = $null
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:$synoPort/api/syno/health" -Method Get -TimeoutSec 2
    } catch { break }
    if (-not (Test-SynoHealthResponse $health $repoFingerprint)) { throw "Port $synoPort is occupied by an unknown service" }
    Write-SynoLauncherLog "launcher.health_ok" @{ listenerPid = (Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort $synoPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess }
    Adopt-HealthyHost
    Start-Sleep -Seconds 5
  }

  # Port is free (or its owner just exited): spawn our own host and wait on it.
  $child = Start-Process -FilePath $resolvedNode -ArgumentList @("`"$server`"") -WorkingDirectory $resolvedRoot -WindowStyle Hidden -PassThru
  Write-HostOwnership $child "owned"
  Write-SynoLauncherLog "launcher.host_started" @{ pid = $child.Id }
  try {
    $child.WaitForExit()
    $exitCode = $child.ExitCode
  } finally {
    if (Test-Path -LiteralPath $pidFile) {
      $ownership = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
      $recordedStartedAt = if ($ownership.startedAt -is [DateTime]) { $ownership.startedAt.ToUniversalTime().ToString("o") } else { [string]$ownership.startedAt }
      if ($ownership.pid -eq $child.Id -and $recordedStartedAt -eq $child.StartTime.ToUniversalTime().ToString("o")) { Remove-Item -LiteralPath $pidFile -Force }
    }
  }
  if ($exitCode -eq 0) { exit 0 }
  Write-SynoLauncherLog "launcher.host_crashed" @{ pid = $child.Id; exitCode = $exitCode; backoffSeconds = $restartBackoffSeconds }
  Start-Sleep -Seconds $restartBackoffSeconds
}
