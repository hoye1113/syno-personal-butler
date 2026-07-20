param(
  [Parameter(Mandatory = $true)][string]$RepoRoot,
  [Parameter(Mandatory = $true)][string]$NodePath
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$resolvedNode = (Resolve-Path -LiteralPath $NodePath).Path
$commonScript = Join-Path $PSScriptRoot "windows-service-common.ps1"
. $commonScript
$server = Join-Path $resolvedRoot "apps\syno\server.mjs"
if (-not (Test-Path -LiteralPath $server -PathType Leaf)) { throw "Syno Host entrypoint not found: $server" }
$runtimeRoot = Join-Path $resolvedRoot ".runtime"
$pidFile = Join-Path $runtimeRoot "syno-host.pid"
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$serverPath = [IO.Path]::GetFullPath($server)
$repoFingerprint = Get-SynoRepoFingerprint $resolvedRoot

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
  $listener = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort 4317 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $listener) { throw "Syno health responded but no loopback listener was found" }
  $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
  $details = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
  if (-not $process -or -not $details -or
      -not ([IO.Path]::GetFullPath($process.Path)).Equals($resolvedNode, [StringComparison]::OrdinalIgnoreCase) -or
      $details.CommandLine.IndexOf($serverPath, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
    throw "Healthy loopback service is not the configured Syno Host"
  }
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
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:4317/api/syno/health" -Method Get -TimeoutSec 2
  } catch { break }
  if (-not (Test-SynoHealthResponse $health $repoFingerprint)) { throw "Port 4317 is occupied by an unknown service" }
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
