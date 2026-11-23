# 固化的 Autoloop 内核

本目录保存 Host 实际使用的 `agent-autoloop` 最小导入闭包，使干净 checkout 与不可变 release 不再依赖相邻仓库。

- 来源项目：`agent-autoloop`
- 来源提交：`aa946b85392efb84e8565742ddff43b1a0f06169`
- 固化日期：2026-11-23
- 许可证：MIT，原文见 `LICENSE`
- 入口：`examples/syno-p0/commands.ts`、`kernel/evolve.ts`、`kernel/store.ts`、`protocol/rules.ts`

固化文件保持来源提交原样。后续升级必须整体替换同一导入闭包、更新来源提交并运行完整 gate，禁止让 Host 重新引用仓外路径。
