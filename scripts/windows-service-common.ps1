function Get-SynoRepoFingerprint([string]$RepoRoot) {
  $resolvedRoot = [IO.Path]::GetFullPath($RepoRoot).ToLowerInvariant()
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    $bytes = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($resolvedRoot))
    return (-join ($bytes | ForEach-Object { $_.ToString("x2") })).Substring(0, 16)
  } finally { $sha.Dispose() }
}

function Test-SynoHealthResponse($Health, [string]$RepoFingerprint) {
  return $Health -and $Health.ok -eq $true -and $Health.product -eq "syno-personal-butler" -and
    $Health.protocolVersion -eq 1 -and $Health.repoFingerprint -eq $RepoFingerprint
}

function Test-SynoOwnershipRecord($Ownership, $Process, $Details, [string]$ResolvedNode, [string]$ServerPath, [string]$ResolvedRoot) {
  if (-not $Ownership -or -not $Process -or -not $Details -or $Ownership.version -ne 1) { return $false }
  $actualPath = [IO.Path]::GetFullPath($Process.Path)
  $actualStartedAt = $Process.StartTime.ToUniversalTime().ToString("o")
  $recordedStartedAt = if ($Ownership.startedAt -is [DateTime]) { $Ownership.startedAt.ToUniversalTime().ToString("o") } else { [string]$Ownership.startedAt }
  return $actualPath.Equals($ResolvedNode, [StringComparison]::OrdinalIgnoreCase) -and
    $Ownership.nodePath -eq $ResolvedNode -and $Ownership.serverPath -eq $ServerPath -and
    $Ownership.repoRoot -eq $ResolvedRoot -and $recordedStartedAt -eq $actualStartedAt -and
    $Details.CommandLine.IndexOf($ServerPath, [StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Test-SynoWrapperProcess($Details, [string]$StartScript, [string]$RepoRoot, [string]$NodePath) {
  if (-not $Details -or [string]::IsNullOrWhiteSpace([string]$Details.CommandLine)) { return $false }
  if ([string]$Details.Name -notmatch "(?i)^powershell(?:_ise)?\.exe$") { return $false }
  $start = [Regex]::Escape([IO.Path]::GetFullPath($StartScript))
  $repo = [Regex]::Escape([IO.Path]::GetFullPath($RepoRoot))
  $node = [Regex]::Escape([IO.Path]::GetFullPath($NodePath))
  $pattern = "(?i)^(?:`"[^`"]*powershell(?:_ise)?\.exe`"|\S*powershell(?:_ise)?\.exe)\s+-NoProfile\s+-WindowStyle\s+Hidden\s+-ExecutionPolicy\s+Bypass\s+-File\s+`"?$start`"?\s+-RepoRoot\s+`"?$repo`"?\s+-NodePath\s+`"?$node`"?\s*$"
  return [Regex]::IsMatch([string]$Details.CommandLine, $pattern)
}
