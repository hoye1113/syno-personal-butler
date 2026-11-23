# P2 TaskWorkspace 真实写任务实施任务书

## 背景

当前 `packages/syno-core/task-workspace.mjs` 已能创建／丢弃／合并 GitGuard worktree，P3 project Specialist 也已有 Task／Attempt／Result Lane／delivery 与版本化 Markdown 产物，但 `TASK-WORKSPACE-CONTRACT.md` 明确承认：P3 Host 尚未把真实写 Task 自动接到 TaskWorkspaceManager。

本次只完成这一条真实写路径，不新建通用任务框架，不接生产，不做 X、自由聊天或插件对话审批。

## 目标

让现有 P3 项目写任务真正经过 TaskWorkspaceManager：

```text
project.request → Object Context / Task / Attempt
→ TaskWorkspaceManager isolated-write
→ 确定性 Worker 候选写入隔离 worktree
→ Host Result Lane 校验对象、版本、正文、manifest、精确路径与 pinned commit
→ finalize 合回本地知识仓
→ delivery 仍按原语义
```

写产物只能是 `vault/**` 或必要的 `ops/**`，不得通过产品自动提交修改源码。合回前必须有已验证 commit；未验收不得合并。不同项目／版本不得共享可变 worktree。

## 必须阅读

- `AGENTS.md`
- `packages/syno-core/task-workspace.mjs`
- `packages/syno-core/git-guard.mjs`
- `experiments/superagent-p0/native-project-runtime.mjs`
- `experiments/superagent-p0/native-butler-runtime.mjs`
- `experiments/superagent-p0/real-feishu-client.mjs` 中 project 调用与通知路径
- `tests/superagent-p3-project.test.mjs`
- `tests/task-workspace.test.mjs`
- `docs/plans/superagent-p0/TASK-WORKSPACE-CONTRACT.md`
- `docs/plans/superagent-p0/WORK-MODEL.md`

## 验收标准

1. 有至少一个使用**临时真实 Git 仓库**的集成测试，走真实 project Specialist／Host 接缝，不只是 fake GitGuard 或单独测试 Manager。
2. 测试证明项目写任务创建独立 worktree，Worker 只在隔离目录写候选，验收前主仓没有该产物。
3. Result Lane 完整核验后，以 pinned commit 合回；最终主仓存在正确 Markdown／manifest，哈希和 Task／Attempt／Context 版本一致。
4. 同一消息恢复不创建第二个 worktree、不改变 Task／Attempt、不重复合并；需要为恢复设计可持久化的 workspace 身份／commit 证据。
5. 未验收、commit 变化、路径越界、对象／版本不匹配时不得合回；已有相关安全测试保持通过。
6. 不同对象仍保持 lane 与产物隔离；不削弱 queued、cancel、unknown delivery 或 Result Lane 既有行为。
7. 更新 `TASK-WORKSPACE-CONTRACT.md` 的“当前未自动化部分”，记录真实接入边界和验证方式。
8. 相关测试与全量 `corepack pnpm run gate` 通过。

## 实现约束

- 优先复用现有 Manager、GitGuard、project-object 与 Result Lane；不新增依赖。
- 允许对 project runtime 做必要重构，但保持既有公共测试契约；不要保留无调用方的新旧双轨。
- 如果现有 `projectRoot` 位于运行目录而非 Git 知识仓，必须明确处理候选路径与最终合回路径，不能假装 runtime 文件就是 worktree 写入。
- 不让 Worker 自己 merge、选择模型、读凭据或操作生产。
- 不调用真实 OpenCode 模型做测试；测试中的 Worker 用确定性夹具。
- 不读取生产数据库、`.env`、凭据、私有 Memory 或无关 vault 正文。
- 不修改 `/Users/hoye/Documents/workspace/syno-personal-butler-prod`，不重启服务，不 Push，不创建 Git commit；主 Agent 审查验收后统一提交。
- 只修改本任务必要文件。发现无关问题只报告，不顺手扩展。
