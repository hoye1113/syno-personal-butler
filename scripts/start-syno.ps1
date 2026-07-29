param(
  [Parameter(Mandatory = $true)][string]$RepoRoot,
  [Parameter(Mandatory = $true)][string]$NodePath
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$resolvedNode = (Resolve-Path -LiteralPath $NodePath).Path
$commonScript = Join-Path $PSScriptRoot "windows-service-common.ps1"
. $commonScript
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

function Write-SynoLauncherLog([string]$Event, $Fields = @{}) {
  try {
    $record = [ordered]@{ ts = [DateTime]::UtcNow.ToString("o"); event = $Event; repoFingerprint = $repoFingerprint }
    foreach ($entry in $Fields.GetEnumerator()) { $record[$entry.Key] = $entry.Value }
    ($record | ConvertTo-Json -Compress -Depth 5) | Add-Content -LiteralPath $logPath -Encoding UTF8
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

# A Web-triggered installation may occur while the current interactive Host still
# owns the loopback port. Keep the scheduled task alive, then take over as soon as
# that Host exits, instead of creating a crashing duplicate process.
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

$child = Start-Process -FilePath $resolvedNode -ArgumentList @("`"$server`"") -WorkingDirectory $resolvedRoot -WindowStyle Hidden -PassThru
Write-HostOwnership $child "owned"
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
exit $exitCode
