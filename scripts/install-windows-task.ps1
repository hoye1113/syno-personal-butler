param([string]$RepoRoot = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = "Stop"
$manager = Join-Path $PSScriptRoot "manage-windows-task.ps1"
Write-Warning "install-windows-task.ps1 已弃用；正在使用统一的 Syno Host 安装器。"
& $manager -Action Install -RepoRoot $RepoRoot
