param([string]$RepoRoot = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = 'Stop'
$node = (Get-Command node -ErrorAction Stop).Source
Set-Location -LiteralPath $RepoRoot
& $node (Join-Path $RepoRoot 'apps\syno\worker.mjs')
