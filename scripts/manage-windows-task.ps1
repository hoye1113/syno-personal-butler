param(
  [Parameter(Mandatory = $true)][ValidateSet("Install", "Status", "Restart", "Open", "Uninstall")][string]$Action,
  [string]$RepoRoot = "",
  [string]$NodePath = "",
  [switch]$DryRun,
  [switch]$OutputJson,
  [switch]$KeepHostRunning
)

$ErrorActionPreference = "Stop"
if (-not $RepoRoot) { $RepoRoot = Split-Path -Parent $PSScriptRoot }
$taskName = "Syno"
$legacyTaskName = "Syno Worker"
$webUrl = "http://127.0.0.1:4317/"
$healthUrl = "http://127.0.0.1:4317/api/syno/health"
$resolvedRoot = [IO.Path]::GetFullPath($RepoRoot)
if (-not $NodePath) { $NodePath = (Get-Command node -ErrorAction Stop).Source }
$nodeExtension = [IO.Path]::GetExtension($NodePath)
if ($nodeExtension -in @(".cmd", ".bat")) {
  $reportedNodePath = (& $NodePath -p "process.execPath" | Select-Object -Last 1)
  if (-not $reportedNodePath) { throw "Node shim did not report process.execPath" }
  $NodePath = $reportedNodePath.Trim()
}
$resolvedNode = [IO.Path]::GetFullPath($NodePath)
$commonScript = Join-Path $PSScriptRoot "windows-service-common.ps1"
. $commonScript
$startScript = Join-Path $resolvedRoot "scripts\start-syno.ps1"
$serverPath = Join-Path $resolvedRoot "apps\syno\server.mjs"
$pidFile = Join-Path $resolvedRoot ".runtime\syno-host.pid"
$powerShellPath = Join-Path $PSHOME "powershell.exe"
$taskArguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$startScript`" -RepoRoot `"$resolvedRoot`" -NodePath `"$resolvedNode`""
$repoFingerprint = Get-SynoRepoFingerprint $resolvedRoot

function Get-TaskOrNull([string]$Name) {
  return Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
}

function Get-SynoStatus {
  $task = Get-TaskOrNull $taskName
  $legacy = Get-TaskOrNull $legacyTaskName
  $lastResult = $null
  if ($task) {
    $info = Get-ScheduledTaskInfo -TaskName $taskName -ErrorAction SilentlyContinue
    if ($info) { $lastResult = $info.LastTaskResult }
  }
  $healthy = $false
  if ($task -and $task.State -eq "Running") {
    try {
      $health = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 2
      $healthy = Test-SynoHealthResponse $health $repoFingerprint
    } catch { }
  }
  return [ordered]@{
    supported = $true
    installed = [bool]$task
    running = [bool]($task -and $task.State -eq "Running" -and $healthy)
    startup = "at_logon"
    webUrl = $webUrl
    legacyTaskDetected = [bool]$legacy
    lastTaskResult = $lastResult
  }
}

function Test-SynoTaskDefinition($Task) {
  if (-not $Task) { return $false }
  $action = @($Task.Actions)[0]
  if (-not $action) { return $false }
  $trigger = @($Task.Triggers)[0]
  $principal = $Task.Principal
  $settings = $Task.Settings
  $expectedUser = $definition.user.Split("\")[-1]
  return @($Task.Actions).Count -eq 1 -and @($Task.Triggers).Count -eq 1 -and
    $action.Execute -eq $powerShellPath -and
    $action.Arguments -eq $taskArguments -and
    $action.WorkingDirectory -eq $resolvedRoot -and
    $trigger.CimClass.CimClassName -eq "MSFT_TaskLogonTrigger" -and $trigger.Enabled -eq $true -and
    ($trigger.UserId -eq $definition.user -or $trigger.UserId -eq $expectedUser) -and
    ($principal.UserId -eq $definition.user -or $principal.UserId -eq $expectedUser) -and
    [int]$principal.LogonType -eq 3 -and [int]$principal.RunLevel -eq 0 -and
    $settings.Hidden -eq $true -and [int]$settings.MultipleInstances -eq 2 -and
    $settings.StartWhenAvailable -eq $true -and $settings.RestartCount -eq 999 -and
    $settings.DisallowStartIfOnBatteries -eq $false -and $settings.StopIfGoingOnBatteries -eq $false -and
    [string]$settings.RestartInterval -eq "PT1M" -and [string]$settings.ExecutionTimeLimit -eq "PT0S"
}

function Wait-SynoHealth([int]$Seconds = 30) {
  $deadline = [DateTime]::UtcNow.AddSeconds($Seconds)
  do {
    try {
      $health = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 2
      if (Test-SynoHealthResponse $health $repoFingerprint) { return $true }
    } catch { }
    Start-Sleep -Milliseconds 500
  } while ([DateTime]::UtcNow -lt $deadline)
  return $false
}

function Wait-SynoTaskReady([int]$Seconds = 30) {
  $deadline = [DateTime]::UtcNow.AddSeconds($Seconds)
  do {
    $task = Get-TaskOrNull $taskName
    if ($task -and $task.State -eq "Running") {
      try {
        $health = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 2
        if (Test-SynoHealthResponse $health $repoFingerprint) { return $true }
      } catch { }
    }
    Start-Sleep -Milliseconds 500
  } while ([DateTime]::UtcNow -lt $deadline)
  return $false
}

function Stop-SynoHost {
  if (-not (Test-Path -LiteralPath $pidFile -PathType Leaf)) { return }
  try { $ownership = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json }
  catch { throw "Refusing to stop Syno because its ownership record is unreadable: $($_.Exception.Message)" }
  $hostPid = 0
  if ($ownership.version -ne 1 -or -not [int]::TryParse([string]$ownership.pid, [ref]$hostPid)) {
    throw "Refusing to stop Syno because its ownership record is invalid"
  }
  $process = Get-Process -Id $hostPid -ErrorAction SilentlyContinue
  if ($process) {
    $owned = $false
    for ($attempt = 0; $attempt -lt 3 -and -not $owned; $attempt += 1) {
      $details = Get-CimInstance Win32_Process -Filter "ProcessId = $hostPid" -ErrorAction SilentlyContinue
      $owned = Test-SynoOwnershipRecord $ownership $process $details $resolvedNode $serverPath $resolvedRoot
      if (-not $owned -and $attempt -lt 2) { Start-Sleep -Milliseconds 100 }
    }
    if (-not $owned) {
      throw "Refusing to stop PID $hostPid because its Syno ownership record is stale or invalid"
    }
    Stop-Process -Id $hostPid -Force
    try { Wait-Process -Id $hostPid -Timeout 10 -ErrorAction SilentlyContinue } catch { }
  }
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

function Stop-SynoWrappers {
  $wrappers = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    Test-SynoWrapperProcess $_ $startScript $resolvedRoot
  }
  foreach ($wrapper in $wrappers) {
    Stop-Process -Id $wrapper.ProcessId -Force -ErrorAction Stop
  }
}

function Restore-SynoTask([string]$Xml, [bool]$WasRunning) {
  if (-not $Xml) { return }
  Register-ScheduledTask -TaskName $taskName -Xml $Xml -Force | Out-Null
  if ($WasRunning) { Start-ScheduledTask -TaskName $taskName }
}

function Write-Result($Value) {
  if ($OutputJson) { $Value | ConvertTo-Json -Compress -Depth 8 }
  else { $Value | Format-List | Out-String | Write-Output }
}

$definition = [ordered]@{
  name = $taskName
  trigger = "at_logon"
  user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  executable = $powerShellPath
  arguments = $taskArguments
  workingDirectory = $resolvedRoot
  hidden = $true
  multipleInstances = "ignore_new"
  restartIntervalMinutes = 1
  restartCount = 999
  allowStartOnBattery = $true
  dontStopOnBattery = $true
  opensBrowser = $false
  adoptsHealthyHost = $true
  readiness = "task_running_and_health"
}

if ($DryRun) {
  Write-Result ([ordered]@{ supported = $true; dryRun = $true; action = $Action; taskDefinition = $definition })
  exit 0
}

switch ($Action) {
  "Status" { Write-Result (Get-SynoStatus); exit 0 }
  "Install" {
    if (-not (Test-Path -LiteralPath $resolvedNode -PathType Leaf)) { throw "Node executable not found: $resolvedNode" }
    if (-not (Test-Path -LiteralPath $startScript -PathType Leaf)) { throw "Syno launcher not found: $startScript" }
    $existing = Get-TaskOrNull $taskName
    if ($existing -and (Test-SynoTaskDefinition $existing) -and $existing.State -eq "Running" -and (Wait-SynoHealth 2)) {
      Write-Result (Get-SynoStatus)
      exit 0
    }
    $existingXml = if ($existing) { Export-ScheduledTask -TaskName $taskName } else { $null }
    $existingWasRunning = [bool]($existing -and $existing.State -eq "Running")
    $taskAction = New-ScheduledTaskAction -Execute $powerShellPath -Argument $taskArguments -WorkingDirectory $resolvedRoot
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $definition.user
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -Hidden -MultipleInstances IgnoreNew -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    $principal = New-ScheduledTaskPrincipal -UserId $definition.user -LogonType Interactive -RunLevel Limited
    $task = New-ScheduledTask -Action $taskAction -Trigger $trigger -Settings $settings -Principal $principal -Description "Syno personal knowledge butler"
    $replacementAttempted = $false
    try {
      if ($KeepHostRunning) { Stop-SynoWrappers }
      if ($existing) {
        Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if (-not $KeepHostRunning) { Stop-SynoHost }
      }
      $replacementAttempted = $true
      Register-ScheduledTask -TaskName $taskName -InputObject $task -Force | Out-Null
      Start-ScheduledTask -TaskName $taskName
      if (-not (Wait-SynoTaskReady 30)) { throw "Syno task was registered but the Host did not become healthy" }
    } catch {
      $installFailure = $_
      $cleanupFailure = $null
      if ($replacementAttempted) {
        Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if (-not $KeepHostRunning) {
          try { Stop-SynoHost } catch { $cleanupFailure = $_ }
        }
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
      }
      $restoreFailure = $null
      try {
        Restore-SynoTask $existingXml $existingWasRunning
        if ($existingWasRunning -and -not (Wait-SynoTaskReady 30)) { throw "Restored Syno task did not become healthy" }
      } catch { $restoreFailure = $_ }
      if ($cleanupFailure -or $restoreFailure) {
        $details = @($cleanupFailure, $restoreFailure) | Where-Object { $_ } | ForEach-Object { $_.Exception.Message }
        throw "Syno install failed ($($installFailure.Exception.Message)); rollback was incomplete: $($details -join '; ')"
      }
      throw $installFailure
    }
    if (Get-TaskOrNull $legacyTaskName) { Stop-ScheduledTask -TaskName $legacyTaskName -ErrorAction SilentlyContinue; Unregister-ScheduledTask -TaskName $legacyTaskName -Confirm:$false }
    Write-Result (Get-SynoStatus)
  }
  "Restart" {
    if (-not (Get-TaskOrNull $taskName)) { throw "Syno task is not installed" }
    Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Stop-SynoHost
    Start-ScheduledTask -TaskName $taskName
    if (-not (Wait-SynoTaskReady 30)) { throw "Syno did not become healthy after restart" }
    Write-Result (Get-SynoStatus)
  }
  "Open" {
    $task = Get-TaskOrNull $taskName
    if ($task -and $task.State -ne "Running") { Start-ScheduledTask -TaskName $taskName }
    if (-not (Wait-SynoHealth 30)) { throw "Syno Web is not healthy" }
    Start-Process $webUrl
    $status = Get-SynoStatus; $status["opened"] = $true
    Write-Result $status
  }
  "Uninstall" {
    if (Get-TaskOrNull $taskName) {
      if (-not $KeepHostRunning) {
        Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        Stop-SynoHost
      }
      Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }
    if ($KeepHostRunning) { Stop-SynoWrappers }
    Write-Result (Get-SynoStatus)
  }
}
