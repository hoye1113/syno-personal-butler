# 生产部署约定

## 固定工具链

- Node：`24.21.0`，由 `/Users/hoye/Documents/workspace/syno-personal-butler-prod/.nvmrc` 与 `package.json` 固定。
- pnpm：`12.11.2`，由 `packageManager` 固定，经 Corepack 调用。
- 依赖只能由 `pnpm-lock.yaml` 安装；CI 与部署均使用 `--frozen-lockfile`。
- `@google/genai` 是 Pi 的未使用 Google Provider 传递依赖；其安装期脚本不参与当前 OpenCode bridge 运行，因此通过 `allowBuilds` 显式拒绝。只有已核对的 `protobufjs` postinstall 被允许，不开放通配构建。

## CI

`.github/workflows/gate.yml` 在项目支持的 macOS runner 上，于 main 推送与 Pull Request 时执行冻结安装和完整 `gate`。不读取生产凭据，不部署生产。

## 不可变 release 与 current

部署只在 Owner 批准的窗口由主 Agent 执行。以下命令不包含飞书重启，也不会复制 `.env`、运行数据或 vault 外部状态。

```bash
node scripts/deploy-production.mjs prepare --releases-root <绝对 releases 目录>
node scripts/deploy-production.mjs activate --release <上一步生成的绝对 release 目录>
```

`prepare` 要求源工作树干净，先跑完整 gate，再从 `HEAD` 归档代码、冻结安装生产依赖并写 `release.json`。Host 使用的 autoloop 内核快照随仓库归档；prepare 与 activate 都会检查真实入口语法并实际加载 Host 模块图，缺失依赖会直接失败。同一 release 已存在时失败，不覆盖。`activate` 只接受依赖已安装的 release，并通过临时软链加原子 rename 切换同级的 `current`；若 `current` 是真实目录则拒绝。

回滚时将 `activate --release` 指向上一份完整 release。代码指针切换与 Host 重启是两个动作；重启仍须按生产 Runbook 单独授权和验收，不能由部署脚本隐式执行。
