# AGENTS.md — Syno 执行契约

## 项目事实源

- `vault/`：长期知识事实源。
- `ops/`：任务、行动、内容、记忆候选、产物和事件事实源。
- `contracts/`：机器可校验的数据契约。
- `.runtime/`：可删除、可重建的缓存和运行状态，禁止提交。

## 权限边界（trust-but-clarify）

1. 读取、搜索与所有写入（新增笔记、写 `ops/`、覆盖、删除、移动、新 MOC、新 tag）默认自动执行（`approval:none`），在隔离 worktree 内合并；不要求审批确认。
2. 只有"系统歧义"才回到人在环：收录撞重复、多方案（新建/分开/追加/关联）、信息不足时暂停澄清。明确指派的覆盖/删除/移动不算歧义，直接执行。
3. 改管家自身源码（`code_change`）与本机生命周期控制（`system_control`）受显式配置开关控制（`policy.allowSelfModify` / `policy.allowSystemControl`），**默认关**；关闭时拒绝并给出可操作提示。
4. 非显式 `code_change` 意图的 diff 触及源码根（`apps/contracts/config/scripts/tests`）= 模型 scope creep，硬拒绝（全开后唯一保留的硬拒绝）。
5. 长期记忆只能先写为 `MemoryProposal`，确认后才能进入 `vault/`。
6. 自动提交只能暂存 Job 声明的精确路径；禁止 `git add -A`，禁止自动 Push。
7. 不读取、输出或提交 Token、Cookie、密钥和 `%LOCALAPPDATA%\Syno` 下的凭据。
8. Web、微信 iLink、飞书同权限：已绑定 Owner 即可直接指挥，澄清确认不要求六位审批码。

## 执行器

- 产品只启用 `OpenCodeCognitiveRuntime`；原生 Agent 在真实验收完成前仅作为非活动迁移回滚实现，禁止自动回退。
- 模型链固定为 `deepseek/deepseek-v4-flash`、`deepseek/deepseek-chat`（2026-07-31 Owner 决策：免费档持续 429 限流；key 来源 = host 环境变量 `DEEPSEEK_API_KEY` 优先，缺省时 supervisor 自动读用户本机 opencode 凭据存储 `~/.local/share/opencode/auth.json` 的 deepseek 条目注入子进程，零手工配置），兜底 `opencode/mimo-v2.5-free`、`opencode/deepseek-v4-flash-free`、`opencode/laguna-s-2.1-free`。
- 仅在不可用、限流、连接失败、超时、5xx、空响应或契约校验失败，且本次尝试尚未产生不可逆副作用时，才由 Syno 按上述顺序确定性回退。
- OpenCode Agent 不得选择模型、Provider 或回退目标；全部失败时进入 `waiting_provider`，不得升级到 Claude Code 或原生 Agent。
- OpenCode 只能使用项目内 `syno-*` Skills 和静态 `syno_*` Tool Bridge；禁止直接读写仓库、执行 Shell/Git、分享会话、启动子 Agent或动态加载 MCP。

## 知识任务

`vault/AGENTS.md` 及 `vault/99-System/Agent/` 中的 canonical Skill 继续约束知识收录、关联、写作和 MOC。平台入口只负责转发，不复制业务规则。

