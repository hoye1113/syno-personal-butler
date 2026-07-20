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

function Test-SynoWrapperProcess($Details, [string]$StartScript, [string]$RepoRoot) {
  if (-not $Details -or [string]::IsNullOrWhiteSpace([string]$Details.CommandLine)) { return $false }
  if ([string]$Details.Name -notmatch "(?i)^powershell(?:_ise)?\.exe$") { return $false }
  $commandLine = [string]$Details.CommandLine
  return $commandLine.IndexOf([IO.Path]::GetFullPath($StartScript), [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
    $commandLine.IndexOf([IO.Path]::GetFullPath($RepoRoot), [StringComparison]::OrdinalIgnoreCase) -ge 0
}
