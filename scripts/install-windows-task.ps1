param([string]$RepoRoot = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = 'Stop'
$resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
$workerScript = Join-Path $resolvedRoot 'scripts\start-worker.ps1'
if (-not (Test-Path -LiteralPath $workerScript)) { throw "Worker script not found: $workerScript" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$workerScript`" -RepoRoot `"$resolvedRoot`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName 'Syno Worker' -Action $action -Trigger $trigger -Settings $settings -Description 'Syno 赛诺个人管家后台 Worker' -Force | Out-Null

Write-Host 'Syno Worker 已注册，将在当前用户登录时后台启动。'
