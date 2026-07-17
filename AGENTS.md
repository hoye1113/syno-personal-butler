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

- 普通任务依次使用 `opencode/mimo-v2.5-free`、`opencode/hy3-free`、`opencode/deepseek-v4-flash-free`。
- 仅在超时、不可用、无效 JSON 或契约校验失败时回退下一模型。
- 复杂/高风险任务或 OpenCode 全部失败时升级 Claude Code。
- 不给 Claude Code 传模型参数；禁止 OpenCode `--auto`。

## 知识任务

`vault/AGENTS.md` 及 `vault/99-System/Agent/` 中的 canonical Skill 继续约束知识收录、关联、写作和 MOC。平台入口只负责转发，不复制业务规则。

