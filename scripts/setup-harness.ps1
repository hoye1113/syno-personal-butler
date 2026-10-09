[CmdletBinding()]
param(
  [switch]$BuildOnly
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$submodulePath = Join-Path $repoRoot "vendor\deepseek-harness"

Write-Host "=== DeepSeek Harness Runtime Setup ===" -ForegroundColor Cyan

# 1. 检查并拉取 submodule
if (-not (Test-Path -LiteralPath (Join-Path $submodulePath "package.json") -PathType Leaf)) {
  if ($BuildOnly) {
    throw "Submodule 目录未初始化，请先执行完整 setup（不带 -BuildOnly）"
  }
  Write-Host "[1/3] 初始化 Git Submodule..." -ForegroundColor Yellow
  git -C $repoRoot submodule update --init --recursive vendor/deepseek-harness
  if ($LASTEXITCODE -ne 0) {
    throw "git submodule update 失败"
  }
} else {
  Write-Host "[1/3] Submodule 源码已存在" -ForegroundColor Green
}

# 2. 安装依赖并构建
Write-Host "[2/3] 安装依赖与编译 DSH (pnpm install --ignore-scripts && pnpm run build)..." -ForegroundColor Yellow
Push-Location $submodulePath
try {
  pnpm install --ignore-scripts
  if ($LASTEXITCODE -ne 0) { throw "pnpm install 失败" }
  pnpm run build
  if ($LASTEXITCODE -ne 0) { throw "pnpm run build 失败" }
} finally {
  Pop-Location
}
Write-Host "DSH 依赖安装与编译完成！" -ForegroundColor Green

# 3. 运行 doctor 验证
Write-Host "[3/3] 执行 Harness Doctor 验证..." -ForegroundColor Yellow
node (Join-Path $repoRoot "scripts\deepseek-harness-runtime.mjs") doctor
if ($LASTEXITCODE -ne 0) {
  throw "Harness Doctor 验证未通过"
}

Write-Host "=== DeepSeek Harness 运行时就绪 ===" -ForegroundColor Green
