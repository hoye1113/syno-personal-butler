# AGENTS.md — Syno 执行契约

## 项目事实源

- `vault/`：长期知识事实源。
- `ops/`：任务、行动、内容、记忆候选、产物和事件事实源。
- `contracts/`：机器可校验的数据契约。
- `.runtime/`：可删除、可重建的缓存和运行状态，禁止提交。

## 权限边界

1. 读取与搜索可以直接执行。
2. 写 `ops/` 或新增普通知识笔记需要一次审批。
3. 覆盖、删除、移动、新 MOC、新 tag、代码修改需要差异预览和两次审批。
4. 长期记忆只能先写为 `MemoryProposal`，批准后才能进入 `vault/`。
5. 自动提交只能暂存 Job 声明的精确路径；禁止 `git add -A`，禁止自动 Push。
6. 开发模式默认关闭。`syno-code` 只能在独立分支和 worktree 中运行。
7. 不读取、输出或提交 Token、Cookie、密钥和 `%LOCALAPPDATA%\Syno` 下的凭据。

## 执行器

- 产品只启用 `OpenCodeCognitiveRuntime`；原生 Agent 在真实验收完成前仅作为非活动迁移回滚实现，禁止自动回退。
- 模型链固定为 `opencode/mimo-v2.5-free`、`opencode/deepseek-v4-flash-free`、`opencode/laguna-s-2.1-free`。
- 仅在不可用、限流、连接失败、超时、5xx、空响应或契约校验失败，且本次尝试尚未产生不可逆副作用时，才由 Syno 按上述顺序确定性回退。
- OpenCode Agent 不得选择模型、Provider 或回退目标；全部失败时进入 `waiting_provider`，不得升级到 Claude Code 或原生 Agent。
- OpenCode 只能使用项目内 `syno-*` Skills 和静态 `syno_*` Tool Bridge；禁止直接读写仓库、执行 Shell/Git、分享会话、启动子 Agent或动态加载 MCP。

## 知识任务

`vault/AGENTS.md` 及 `vault/99-System/Agent/` 中的 canonical Skill 继续约束知识收录、关联、写作和 MOC。平台入口只负责转发，不复制业务规则。

