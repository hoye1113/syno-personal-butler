function New-SynoLauncherLogPolicyState {
  return @{}
}

function Test-SynoLauncherLogDue {
  param(
    [Parameter(Mandatory = $true)][hashtable]$State,
    [Parameter(Mandatory = $true)][string]$Event,
    [Parameter(Mandatory = $true)][DateTime]$Now
  )

  if ($Event -notin @("launcher.health_ok", "launcher.adopted")) {
    return $true
  }

  $last = $State[$Event]
  if ($last -and ($Now.ToUniversalTime() - ([DateTime]$last).ToUniversalTime()).TotalHours -lt 1) {
    return $false
  }

  $State[$Event] = $Now.ToUniversalTime()
  return $true
}
