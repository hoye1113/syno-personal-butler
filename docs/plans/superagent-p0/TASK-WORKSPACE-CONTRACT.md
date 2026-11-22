# Task / Workspace 契约（P5 插件与多 Worker）

## 目标

让一个聊天会话可以启动多个 Task，但不让所有 Task 共用一个可变工作区。默认只读共享，写任务按需创建隔离 worktree；代码/插件版本独立激活，不阻塞核心 router。

## 三种工作区

| 类型 | 目录 | 生命周期 |
|---|---|---|
| 聊天 Session | 无 worktree，持久消息/上下文 | 会话级 |
| 只读 Task | `knowledgeRoot` 共享 | 单次执行 |
| 写 Task | `.worktrees/syno-job-<taskId>` | 执行到 discard/merge |
| 插件版本 | `plugins/p5-radar/<version>` | 激活到回滚 |

## Task 描述

```json
{
  "taskId": "task-20261122-p5-doc",
  "ownerKey": "local-user",
  "threadKey": "main",
  "kind": "code_change",
  "write": true,
  "writePaths": ["experiments/superagent-p0/p5-radar"]
}
```

规则：

- `taskId` 只允许字母、数字、点、下划线和短横线。
- `policy` 缺省由 `write` / `kind=code_change` / `writePaths` 推导。
- `shared-readonly` 不创建 worktree。
- `isolated-write` 必须通过 `GitGuard.prepareWorktree` 创建。
- 合并必须带已测试的 `commit`；不提供隐式合并。

实现：

- `packages/syno-core/task-workspace.mjs`
- 复用 `packages/syno-core/git-guard.mjs`

## P5 插件版本

契约：

```text
syno.p5-radar/1
```

能力白名单：

```text
health, collect, renderDailyDoc, feedback, status
```

激活记录：

```text
<runtimeRoot>/plugins/p5-radar/active.json
```

记录包含 `version`、`path`、`entry`、`sha256`、`capabilities` 和 `previous`。
`readActivePlugin` 会校验 manifest、入口在插件目录内、入口哈希未变化；回滚切回上一版。

实现：

- `packages/syno-core/plugin-version.mjs`
- 测试：`tests/plugin-version.test.mjs`、`tests/task-workspace.test.mjs`

## P5 插件 v1 现状

- 插件目录：`plugins/p5-radar/2026.11.22.7`
- 入口：`bin/plugin.mjs`
- 已实现 action：`health`、`collect`、`renderDailyDoc`、`feedback`、`status`、`preference`
- v7 canary 实跑：50 条 / 487 blocks；approve 后合并并切 active v7；Host 未重启
- `renderDailyDoc` 返回中性文档 AST，不创建飞书文档、不读取飞书凭据
- 中性 AST 定义：`experiments/superagent-p0/p5-radar/document-model.mjs`
- 插件通过 stdin/stdout JSON 契约调用；`renderOnly` 路径不会加载飞书模块
- **已接入 P3 Host**：`active.json` 指向 `2026.11.22.7`；Host 读取 AST 后用自己的飞书凭据创建/更新文档
- `collect` 已内聚为 `p5-radar/collect.mjs`，插件 v3 不再调用旧 CLI；`feedback`/`status` 直接走 P5 store
- v4 发布演练：在 `.worktrees/syno-job-p5-plugin-v4` 隔离开发，测试后通过 TaskWorkspaceManager 合并，再切 active v4；Host 未重启
- 插件失败时自动回退旧 P5 CLI；回滚只需切换 active 指针

## Canary 发布命令

```bash
# 1. canary：隔离测试 + 真实 AST dry-run，不合并、不激活
node scripts/release-p5-plugin.mjs \
  --canary \
  --source <plugin-version-dir> \
  --p5-home /path/to/p5-radar \
  --max-items 50

# 2. 人工检查报告后批准
node scripts/release-p5-plugin.mjs --approve

# 3. 回滚 active
node scripts/release-p5-plugin.mjs --rollback

# 放弃 canary
node scripts/release-p5-plugin.mjs --discard
```

流程：

1. 在 `.worktrees/syno-job-p5-plugin-canary-<version>` 创建隔离 worktree
2. 复制插件版本
3. 在 worktree 跑插件契约测试
4. 用真实 P5 数据 render 一次 AST，不写飞书
5. 提交候选版本并写 canary 状态
6. 人工检查后 `--approve` 合并并切 active
7. 回滚用 `--rollback`

测试失败、AST 异常或不批准都不会合并/激活。canary 默认 24 小时过期。

## 当前未自动化的部分

- P3 Host 还没有把每个写 Task 自动接到 `TaskWorkspaceManager`；先有契约和测试，后续按具体写路径接入。
- 飞书文档创建已收回 Host；P5 只返回 AST。
- 插件 canary 需要人工批准，尚未接入 Host 对话审批。

## 验收

- 只读任务不创建 worktree。
- `code_change` / `write` 自动请求隔离 worktree。
- 合并前必须有 commit。
- P5 插件激活校验 contract、能力、入口路径和 sha256。
- 回滚能切回上一 active 版本。
