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

## 真实项目写任务接入（P2）

P3 project 写任务现在真实经过 `TaskWorkspaceManager`。链路：

```text
project.request → Object Context / Task / Attempt
→ TaskWorkspaceManager isolated-write（一个 Task 一个 worktree）
→ 确定性 Worker 正文写入隔离候选目录
→ Host Result Lane 复核对象、版本、正文、manifest、精确路径、pinned commit
→ GitGuard 以 pinned commit --no-ff 合回知识仓
→ delivery 仍按原语义（queued / unknown / accepted）
```

边界与实现：

- 只有配置了 Git 知识仓（`repoRoot`／`GitGuard`）的 Host 才启用隔离写；生产知识仓必须是 Git 仓（生产固定满足），未配置的独立/离线 Runtime 直接写 `projectRoot`（不伪造 worktree）。飞书客户端按 `<knowledgeRoot>/.git` 是否存在选择模式，并在启动时写 `project-workspace-isolated` / `project-workspace-standalone` 审计事件。
- `projectRoot` 必须是仓库内 `vault/**` 或 `ops/**`。生产配置已改为 `<knowledgeRoot>/vault/04-Projects`；`runtime/p3-project-artifacts` 不再是最终写根。
- 一个 Task 对应一个 workspace 记录 `project-workspace:<taskId>`（`records` 集合，kind=`project_workspace`），持久化 `directory`、`branch`、`base`、`relativeRoot`、`state`（`prepared → committed → merged`）、`commit`、`diffHash`、`mergeCommit`。
- 候选路径 = `<worktree>/<relativeRoot>/<projectId>/v<planVersion>/*.md|manifest.json`；`Task.acceptance.path` 仍是仓库内逻辑 manifest 路径，版本绑定不随 workspace 漂移。
- Result Lane 复核全部通过后，Host 只提交这三个固定路径：`TaskWorkspaceManager.commit` 先检查 worktree 没有未声明脏路径，再经 `GitGuard.commitPaths`（D10：仅 `vault/**` 与 `ops/**`）提交，`pinWorktree` 校验 commit 与 diffHash，`finalize` 以 commit + diffHash 合回。
- 合回后逐个重读仓库文件，哈希必须等于步骤记录；随后才写 `verification`、`finalizeTask`、`recordPlan` 并入 delivery。未验收、路径越界、commit 变化、对象/版本/Attempt 不匹配都不会合并。
- workspace 身份按 Task 派生（`projectWorkspaceTaskId(taskId)`），同一消息重放复用同一 worktree、同一 Task/Attempt，不重建、不重复合并；`committed` 证据在合并前持久化，崩溃后按原 commit 恢复。合并完成后 worktree 与分支释放，仓库成为唯一副本。
- 建树与写 `project-workspace` 记录之间崩溃时，恢复用同一 Task 派生的既有目录/分支做**严格 adopt**：必须是该分支唯一注册的工作区、HEAD 仍等于原分叉点且工作区干净；脏目录或身份不符直接拒绝，绝不新建第二个 worktree。
- 合回完成后崩溃分两种：`committed` 记录先按 `isAncestor(pinned)` 对账，已合并则不重复 merge；`merged` 记录只需补业务结算。`mergeCommit` 只从“第二父等于 pinned commit”的唯一真实 merge commit 取得；当前主仓 HEAD 永不冒充审计证据，无法唯一证明时写 `null`。
- 自动装配的 GitGuard 固定 `productBranch:"main"`：项目产物只允许合回 main 主检出，主检出在其他分支时 pinned 候选保持不合并，切回 main 后可继续结算。
- 不同项目/版本使用不同 Task、不同 worktree 与不同分支，不共享可变目录。

验证方式：

- 集成测试 `tests/superagent-p3-project-workspace.test.mjs`：临时真实 Git 仓 + 真实 P3 Host/project Specialist 接缝；覆盖隔离候选、pinned commit 合回、哈希与 Task/Attempt/Context 一致性、同消息崩溃恢复（含建树后未记录时严格 adopt、脏/身份不符目录拒绝、commit 后 merge 前崩溃复用持久化 commit、merge 后与 merged 记录后的结算恢复）、mergeCommit 只认唯一真实 merge commit、旧 standalone v1 → 新 isolated v2 修订、主检出非 main 时拒绝合回、双对象隔离、未验收/越界/版本不符拒绝、pin 后分支变化拒绝。
- 既有 `tests/task-workspace.test.mjs`、`tests/superagent-p3-project.test.mjs`、`tests/plugin-canary.test.mjs`、`tests/knowledge-and-git.test.mjs` 保持通过。

## 当前未自动化或有意的边界

- Worker 仍不自己 merge、不选模型、不读凭据；Host 持有全部 workspace 生命周期。
- 生产从 `runtime/p3-project-artifacts` 切到 `vault/04-Projects` 后，旧运行目录通过显式 `legacyProjectRoot` 保留为**只读冻结修订输入**：旧 v1 可直接作为 `previousRoot` 被 Worker 读取并生成隔离 v2，但绝不自动迁移、复制或覆盖旧文件；新版只合回 vault。`real-worker-probe` 以 `--previous-root` 与 `--project-root` 分别读取旧版本和本轮候选。
- 失败/取消的写 Task 会保留 worktree 与分支供对账，当前没有自动回收清扫；需要运维按 `.worktrees` 手动清理。
- 飞书文档创建已收回 Host；P5 只返回 AST。
- 插件 canary 已接入 Host 对话控制：`插件状态` 查看 active／previous／canary，`插件批准 <version>` 只批准该版本，`插件回滚 <当前version>` 只回滚所见的 active；merge 后恢复按 pinned commit 对账，不重复合并。代码尚未部署到生产。

## 验收

- 只读任务不创建 worktree。
- `code_change` / `write` 自动请求隔离 worktree。
- 合并前必须有 commit。
- P5 插件激活校验 contract、能力、入口路径和 sha256。
- 回滚能切回上一 active 版本。
