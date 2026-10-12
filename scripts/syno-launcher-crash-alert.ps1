function New-SynoCrashAlertState {
  return @{ fastCrashStreak = 0; alertsSent = 0; lastAlertAt = $null }
}

function Test-SynoCrashAlertDue {
  param(
    [Parameter(Mandatory = $true)][hashtable]$State,
    [Parameter(Mandatory = $true)][double]$UptimeSeconds,
    [Parameter(Mandatory = $true)][DateTime]$Now,
    [double]$FastCrashSeconds = 60,
    [int]$StreakThreshold = 3,
    [int]$RearmMinutes = 60
  )

  if ($UptimeSeconds -ge $FastCrashSeconds) {
    # A host that survived its startup window clears the incident so the next
    # crash loop alerts immediately instead of reusing an old rearm window.
    $State.fastCrashStreak = 0
    $State.lastAlertAt = $null
    return $false
  }

  $State.fastCrashStreak = [int]$State.fastCrashStreak + 1
  if ($State.fastCrashStreak -lt $StreakThreshold) { return $false }

  $last = $State.lastAlertAt
  if ($last -and ($Now.ToUniversalTime() - ([DateTime]$last).ToUniversalTime()).TotalMinutes -lt $RearmMinutes) {
    return $false
  }

  $State.lastAlertAt = $Now.ToUniversalTime()
  $State.alertsSent = [int]$State.alertsSent + 1
  return $true
}

function Format-SynoCrashLoopAlertBody {
  param(
    [Parameter(Mandatory = $true)][int]$FastCrashStreak,
    [Parameter(Mandatory = $true)][int]$ExitCode,
    [Parameter(Mandatory = $true)][string]$LogRoot
  )
  return "The Syno Host crashed $FastCrashStreak times in a row within seconds of starting (last exit code $ExitCode). The launcher keeps retrying every 60 seconds. Check $LogRoot\windows-task-*.jsonl and the repository/vault state."
}

function Send-SynoCrashLoopPopup {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Body,
    [int]$TimeoutSeconds = 120
  )
  try {
    $shell = New-Object -ComObject WScript.Shell
    $shell.Popup($Body, $TimeoutSeconds, $Title, 16) | Out-Null
    return $true
  } catch {
    return $false
  }
}
