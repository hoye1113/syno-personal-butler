# Syno 赛诺：新会话交接与执行计划

更新日期：2026-07-17（Asia/Shanghai）

本文是后续开发的权威执行入口。新会话不应依赖旧聊天记录，应先读根目录 `AGENTS.md`、本文、`docs/ARCHITECTURE.md`、`docs/POLICY.md`、`docs/SECURITY.md` 和 `docs/V1-REVIEW-LOG.md`。

## 1. 不变目标

Syno 是 Windows 本地、单用户、私有 GitHub 同步的个人管家和第二大脑：

- Afu 原生 Web 界面是主界面，不依赖 Obsidian 或 OpenClaw。
- `vault/` 和 `ops/` 中的 Markdown/YAML 是长期事实源；索引和 SQLite 只是可重建缓存。
- V1 使用 OpenCode 优先、Claude Code 确定性升级的执行器架构。
- V2 在 V1 上增加自有 Provider LLM Tool Loop Agent，并接入微信 iLink 和飞书扫码渠道。
- 所有写入都必须经过 `Policy`、审批、校验、隔离 worktree 和精确路径 Git 提交。
- 不自动 Push。只有用户在当次会话明确授权才允许推送。

## 2. 当前权威状态

### 仓库

- 当前开发仓库：`D:\workSpace\obsidian_repository\.syno-build`
- 最终目标路径：`D:\workSpace\syno-personal-butler`
- 远端：`https://github.com/hoye1113/syno-personal-butler.git`
- 当前分支：`main`
- 尚未 Push，尚未创建 V1 tag。

### 可回退基线

`a75502c fix: harden transactional V1 workflows` 是最后一个已验证基线：

- 66/66 自动化测试通过。
- 仓库安全验证通过。
- OpenCode 真实结构化调用通过。
- Syno UI 浏览器交互冒烟通过，无控制台错误。
- Afu 和原知识库只作为快照导入，原仓库未被修改。

### 当前未完成工作

`main` 上有第三轮审查整改的未提交改动。整改方向包括跨进程锁、敏感 payload 本地化、PDF 文本提取、ContentBrief 校验、外部副作用降级/重试、进程树终止、worktree 恢复、`syno-code` 收权、Windows 任务计划修复、复杂任务路由、微信任务路由和长期记忆批准入口。

这些改动当前不是可发布状态：最近一次完整测试为 **53/66 通过，13 项失败**。不得覆盖、重置或丢弃这些改动，也不得把 `docs/V1-VERIFICATION.md` 的旧绿灯结论当成当前工作树结论。

已知第一批故障：

1. 新进程锁和 payload 根目录错误地落到 `%LOCALAPPDATA%\Syno`，fixture 测试在受限环境中出现 `EPERM`。自定义 `repoRoot`/`opsRoot` 时必须派生测试本地路径，生产默认值才使用 `%LOCALAPPDATA%`。
2. 外部副作用结果新增 envelope 后，日历测试读取的结果路径不一致。应稳定 `AgentHost` 的公开结果形状，不让调用者理解内部重试结构。
3. `Policy` 给只读任务增加了 `ops-contracts` validator，破坏既有确定性契约。该 validator 只应进入相应写入路径。
4. 修复上述问题后可能暴露第二批逻辑故障，必须重新跑完整测试，不能只跑当前失败用例。

## 3. 设计约束与深模块

后续实现必须保持以下 seam，不在 HTTP 路由、UI 或渠道 Adapter 中复制业务规则：

- `SynoCore.execute(command) / snapshot(query)`：隐藏 Markdown、索引、审批、校验和 Git。
- `AgentHost.receive / inspect / cancel / approve`：拥有 Job 生命周期、恢复、通知和副作用协调。
- `Policy.evaluate(intent, context)`：纯确定性函数；模型和渠道不得选择权限、审批级别或升级规则。
- `Executor.submit / inspect / cancel`：OpenCode、Claude、Fake 和后续 Provider Agent 共用的执行 seam。
- `ChannelAdapter.start / stop / send / status`：Web、Windows、Weixin、Feishu 和 Fake Adapter。
- `CalendarAdapter`：Markdown、飞书和 Fake Adapter；不恢复任何 macOS 实现。

删除任一深模块后，如果复杂性会散落到多个调用者，说明该模块有价值；如果只是转发，应合并而不是再叠一层。

## 4. 执行阶段

### R3-0：恢复第三轮整改的可测试基线

目标：保留当前整改意图，把工作树恢复为全绿。

1. 为 `GitGuard`、`JobStore`、`AgentHost`、Markdown record 注入或派生 runtime/lock/payload 路径。
2. 固定外部副作用的公开结果契约；内部允许 pending、retrying、completed、degraded，但调用者只读取稳定字段。
3. 将 `ops-contracts` validator 限定到相关写任务。
4. 补齐下列回归测试：跨进程锁、payload 脱敏和本地保存、崩溃恢复、worktree 清理、Windows 进程树终止、PDF 真实抽取、OpenCode Schema 回退、ContentBrief、MemoryProposal 批准。
5. 运行：

   ```powershell
   pnpm test
   pnpm run verify
   git diff --check
   ```

验收：完整测试全绿；fixture 不写用户全局目录；不产生半写入 Job；Git diff 无格式错误。

### R3-1：关闭 V1 第三轮审查问题

按风险顺序关闭，而不是按文件顺序修改：

1. **事务一致性**：Markdown 已合并但飞书等副作用失败时，Job 应成为 `completed_with_degradation` 或等价可恢复状态，并由 durable outbox 重试；不得谎报整体失败或回滚已合并事实。
2. **崩溃与取消**：启动时恢复中断 Job；取消/拒绝/超时清理隔离 worktree；Windows 终止整个子进程树。
3. **凭据与隐私**：原始请求、绝对路径、Token 不进入 Git；可展示内容使用脱敏摘要。
4. **契约完整性**：ContentBrief、PDF Artifact、MemoryProposal 全部通过 schema 和路径校验。
5. **执行器规则**：无效 JSON 和 Schema 失败都触发固定 OpenCode 模型回退；`complex_analysis` 等明确 intent 才升级 Claude，不能依赖模型判断。
6. **渠道路由**：微信“创建任务”必须落到 `create_action`，不是自由聊天写文件。
7. **OpenCode ACP**：使用官方 ACP 协议增加 Adapter，CLI 继续作为回退；二者通过同一 Executor 契约测试。

验收：第三轮 Standards/Spec review 均无 P0/P1；P2 要么关闭，要么记录明确延期理由。

### V1-CLOSE：V1 发布封板

1. 重做浏览器冒烟：知识搜索/阅读、选题、ContentBrief、审批 diff、任务、通知、聊天。
2. 做 Windows fresh clone、依赖安装、启动、Worker 恢复和任务计划程序重启验证。
3. 做真实外部验收并单独记录：Android 微信扫码和私聊往返、飞书日历、可选 Claude 调用。
4. 明确 Android 微信失败只影响可选渠道，不阻塞核心 V1。
5. 运行凭据、缓存、绝对个人路径和 Git staging 泄漏检查。
6. 创建本地 V1 提交和 annotated tag `v1.0.0`，不 Push。

### V2-0：Provider 凭据与模型 Adapter

目标：Syno 不依赖 OpenClaw 运行时即可调用用户 Provider。

1. 新建 `ProviderCredentialStore`，凭据存放在 `%LOCALAPPDATA%\Syno\credentials\provider.json`，原子写入、最小权限、永不回显或提交。
2. 提供一次性导入脚本，从 `%USERPROFILE%\.openclaw` 读取现有 Provider 配置，只复制所需字段，不记录 secret。
3. 默认采用已经独立探针成功的 OpenAI-compatible Provider；不要默认使用当前不可达的 `127.0.0.1:11080` 本地 router。
4. Provider Adapter 必须支持超时、取消、结构化错误、token/turn 上限和 Fake Adapter。

验收：没有 OpenClaw 进程时真实 Provider 探针仍可返回固定文本；日志、事件和 Git 中没有 key。

### V2-1：自有 Tool Loop Agent

新增四个深模块：

- `ProviderClient.complete(messages, tools)`：隐藏协议、认证和模型差异。
- `ToolLoopAgent.run(request)`：拥有 turn loop、tool call 校验、上下文压缩、取消和最终结果。
- `ToolRegistry.resolve(name)`：只暴露白名单工具及 JSON Schema。
- `ConversationStore`：保存可恢复会话状态，敏感数据留在本地 state。

V2 工具只允许：知识搜索/读取、Job 创建/查询/列表、选题/Brief/Action/MemoryProposal 的 canonical operation。禁止向模型暴露 shell、任意本地文件、浏览器、直接 Git 或直接 Markdown 写入；所有写操作仍穿过 `SynoCore → Policy → approval → validator → GitGuard`。

验收：Fake Provider 能完成多轮 tool call；恶意路径、Prompt 注入、越权工具、超长循环和取消均被确定性阻断。

### V2-2：微信与飞书外部渠道

#### 微信

- 复用现有 `WeixinIlinkAdapter`，接到 `ToolLoopAgent` 而不是 OpenClaw。
- 仅 owner 私聊，群聊默认永久关闭；message id 去重；单 token 单轮询器。
- 普通查询和低风险一次审批可在微信完成；删除、覆盖、代码修改和双审批必须回 Web。

#### 飞书

- 使用飞书官方 Node SDK 长连接，不要求公网 webhook。
- 使用官方一键创建机器人应用/二维码流程获取 App ID 和 App Secret；凭据只进入 `%LOCALAPPDATA%\Syno`。
- 单进程锁保证最多一个 `WSClient`；事件回调在时限内只做鉴权、去重和入队，实际 Agent 调用异步执行。
- 默认 owner allowlist、群聊关闭；未来外部渠道通过 `ChannelAdapter` seam 增加。

验收：Fake 渠道契约、重复消息、非 owner、二维码过期、断线重连和恢复测试全绿；真实扫码分别留下设备验收记录。

### V2-CLOSE：完整版本发布前审查

1. 对 Provider Agent、工具权限、微信、飞书做 Standards/Spec 双轴 code review。
2. 做真实 Provider、微信、飞书探针；测试失败时不得用 Fake 结论冒充真实验收。
3. 从空目录 fresh clone，验证安装、启动、Worker、索引、审批、恢复和渠道重连。
4. 确认 Afu 与原知识库仓库 commit 未改变。
5. 创建本地版本提交；是否打 V2 tag 由验收结果决定；不 Push。

## 5. 明确不做

- 不迁移旧仓库 Git 历史。
- 不使用 Obsidian 作为写入网关。
- 不引入 OpenClaw 运行时。
- 不控制个人微信，不开放微信群。
- 不在 V1/V2 自动发布图文或视频，也不抓取运营数据。
- 不让 LLM 自己决定权限、模型升级或审批次数。
- 不用 `git add -A`，不自动合并 Syno 自己的代码，不自动 Push。

## 6. 新会话启动顺序

1. `git status --short --branch` 和 `git log --oneline -5`，确认没有丢失当前整改。
2. 读取本文与根 `AGENTS.md`，不要先重构。
3. 运行完整测试，复现 53/66 基线并记录当前真实失败。
4. 从 R3-0 开始，只在全绿后进入 R3-1。
5. 每个阶段使用精确路径暂存并创建本地提交；重大阶段前保留可回退 commit。

## 7. 完成定义

只有同时满足以下条件，才能报告“完整版 Syno 完成”：

- V1 核心和 V2 Provider Agent 均通过完整测试和 fresh-clone 验收。
- Markdown 事实源、审批、Git 精确提交和崩溃恢复保持成立。
- OpenCode 固定回退、Claude 确定性升级规则有契约测试。
- Provider key、微信 token、飞书 secret 不在 Git 或日志中。
- 微信和飞书 Fake 测试全绿，真实能力结果如实记录。
- 三轮 V1 review 和 V2 最终 review 均已关闭 P0/P1。
- 原 Afu 与原 vault 仓库未改变，远端未在未经授权时被 Push。
