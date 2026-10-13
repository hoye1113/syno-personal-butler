# Windows 与 Apple Silicon 安装

本轮逐项适配，真实 Mac 登录、渠道和浏览器验收完成前不声明正式可用。

使用 Node 24；Mac 使用原生 arm64 Node 和 Xcode Command Line Tools。两端运行 `pnpm install --frozen-lockfile`、`pnpm run harness:setup`、`pnpm run harness:doctor`。Harness 使用已锁定的子模块与工具链，安装构建不启动第二个生产渠道连接。

新机器在仓库 .env 配置 `SYNO_LOCAL_DATA=./.local-data`，不复制旧机器的凭据、会话或依赖目录。不设置 SYNO_KNOWLEDGE_ROOT。Knowledge 的事实源仍是当前仓库 vault/ 与 ops/。
