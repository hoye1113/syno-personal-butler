# Syno 已知限制

更新日期：2026-08-23

## 发布门槛状态

- 当前 Goal 状态为 `blocked`：P4.0–P4.6 已完成，P4.7 的真实渠道、自动执行与澄清、跨渠道连续性、重启恢复和下次 Windows 登录冷启动仍需主人验收；不得把自动测试、探针或当前任务 Running 状态表述为封板。
- `567f23d` 是执行语义与移动可靠交付计划的审查基线，不是所有后续 PR 的永久父提交。当前实现尚未提供 ACK 前持久化、通用 ChannelDeliveryOutbox、Effect Receipt 或 Unknown Case Store；这些能力必须按 ADR 0003–0005 和 TODO 的新批次门禁交付，不能从文档目标推断为已实现。

- token-cloud 固定模型五轮真实工具调用、故障持久等待和同模型恢复已通过，不再是发布门槛。
- 微信 iLink 已完成扫码、Owner 绑定、4/4 连续回复、故障恢复和 durable seen ID 跨重启；主人直发真实 MD 收到 Artifact 回执，后台形成 Proposal 且未写入 vault。
- 飞书消息已完成 Owner 私聊、真实 ID 重放拒绝与重启恢复；飞书日历已完成 user 授权、主日历 CRUD、错误拒绝与恢复。
- `0cc2669` 的 fresh clone 已通过 Node 172/172、vault 57/57 和仓库校验；`a4ec17d` 完成最终回归。真实 Windows Web 生命周期与桌面/移动浏览器增量复验通过。当前代码完整 bundle 为 `C:\tmp\syno-repository-backup-a4ec17d.bundle`，SHA-256 见最终验收矩阵。

历史 Provider/旧运行时验收不替代当前 DSH 发布门槛。当前生产只启用 `DeepSeekHarnessCognitiveRuntime`；真实模型、跨渠道计数、提示注入、长会话 compaction 行为、Harness 重启恢复和 Windows 登录恢复仍未完成。生产受控 `syno` agent preset、Web `agentPreset: syno` 显式绑定和 JSON-RPC 官方 compaction stack 已实现并通过构建产物级验证，但不能替代真实模型和 Owner 验收。不得把凭据已配置、自动测试或历史探针证据表述为 DSH 已封板。

历史自动门禁数字和旧运行时探针只作为追溯记录；本分支本次按 `package.json` 测试入口执行 Node 714 tests / 714 pass / 0 fail / 0 cancelled / exit 0。该结果只证明自动化门禁，不替代真实 DSH、渠道和 Owner 验收。

Windows 计划任务安装器已通过纯 XML 契约测试加固：注册后导出、保护、重注册并再次导出验证，且健康快路径也必须先通过同一契约。当前真实任务已安装并使用绝对 `node.exe`，受控重启验证时刻曾等待 8 秒仍保持 `Running` 且 Host 健康；安装器还修复了 mise shim 与相对 server 路径接管问题。本次复核（2026-07-28 约 22:26 CST）快照：任务当前 `State=Ready`、未运行，`LastRunTime=2026-07-28 20:31:19`、`LastTaskResult=3221225786`（0xC000013A 控制中断退出），`manage-windows-task -Action Status` 报告 `running=False`，8888 上存活的是更早（20:05:47）手动启动的 Host 进程而非活动任务实例。下次 Windows 登录恢复仍未实测，不能把当前运行态当作冷启动证据；`0xC000013A` 退出根因（疑似受控重启停止旧实例或撞端口占用）需在冷启动验收中确认。

运行日志现在按日写入 `%LOCALAPPDATA%\Syno\logs`、保留 14 天并脱敏，但它是诊断记录而不是长期知识或会话事实源；真实 DSH 模型回答和 Windows 登录恢复仍待主人验收。

本轮隔离 worktree 依赖安装先因 pnpm store 缺少 `@modelcontextprotocol/sdk` tarball 而离线失败，随后按未改变的锁文件联网补齐并完成定向测试；故“任意机器完全离线安装”不是已保证能力。

## 运行时限制

- 仅支持 Windows；Provider Token、微信 Bot/回复上下文和飞书 App Secret 使用当前 Windows 用户的 DPAPI，不可作为跨用户可移植凭据。
- 只启用 DeepSeek Harness SDK，模型链只有 `deepseek/deepseek-v4-flash` → `deepseek/deepseek-chat`。仅在枚举的瞬态/契约失败且尚无不可逆副作用时尝试下一模型，不切换 Runtime，不回退到其它 Agent。
- DeepSeek Harness 克隆路径必须由 `SYNO_DSH_ROOT` 指向本机 checkout；未设置则无法启动。该 checkout **必须** `pnpm run build`（`lib/` + web dist）；只 install 不够，`harness:doctor` 的 bootable 也不是现网证据。生产 chat 的真实 argv 是 `dsh --profile syno --host 127.0.0.1 --port 3088 --no-open`（`dsh web` = 库存 `--profile web`，不要当生产）。事件通道是 WebSocket（HTTP GET `/api/events.*` 返回 426），不是 SSE。loopback 3088 是特权壳（`approval: never`，permission 表只准 `workspace-write`，禁止 `danger-full-access`），不是 8888 控制面。收录分析仍通过 jsonrpc sidecar；自动测试走 `tests/support/fake-dsh-jsonrpc-agent.mjs`。不要把 Harness 源码 vendoring 进本仓库。Chat 沙箱工作区是 `%LOCALAPPDATA%\Syno\harness\workspace\<profile>`，不是 git 仓库根。生产 `syno` profile 禁止市场 `dsh plugin add`；Host 会把 `@syno/dsh-plugin` link 进 profile `node_modules`。Windows 计划任务默认不注入 `SYNO_DSH_ROOT`。踩坑清单：`docs/OPERATIONS.md`「DeepSeek Harness 生产 chat」。
- 识图走 Host Zen HTTP（`mimo-v2.5-free`），不进入模型链。微信图片默认聊天识图；明确「收录」才把识图 JSON 送进 text Intake。网络/超时最多再试 2 次，鉴权失败不重试，失败对微信可见、禁止猜图。
- Chat `web_search` 已启用，后端固定为官方 DeepSeek 搜索（Anthropic 兼容 Messages + 服务端 `web_search`）。该 seam 没有查询/域名白名单；每次搜索是一次额外模型轮次，比纯检索 API 更重。`web_fetch` 仍是匿名 HTTP(S)，Harness 侧不做 SSRF 过滤。收录分析 sidecar 没有 web。
- OpenCode、Hermes 和原生 Agent 不是产品运行时；旧认知模块的删除仍受 R6 真实验收门禁约束。
- 模型不可用时，本地搜索、收录回执、任务、提醒与决策解析继续工作；需要模型的 Job 保留为 `waiting_provider`，不会自动换 Provider 或原生 Agent。
- Syno 不能修改自身源码；只能产生 `BugReport`、`ImprovementProposal` 和 SettingsRegistry 白名单内的偏好变更。

## DSH Hub 与 Mnemon 限制

- `syno-lab` 是唯一实验 profile；`dsh-mnemon@0.2.13` 不加载到生产 `syno`，不接入 Syno Bridge、微信、飞书或 `vault/ops` 写入。
- Mnemon Native 需要 Windows release 至少 `0.2.3`。外部 Memory Provider 必须关闭，只允许 Runtime Memory、Documents 和本地 Native；Native 缺失时应显示降级状态而不是伪报 Recall/Remember/Forget 成功。
- Mnemon 数据不是 Syno canonical fact；生产推广需要固定版本/构建产物、敏感数据边界验证、独立安全审查和显式政策批准。
- 上游当前没有确定性密钥扫描器，故任何 Token、Cookie、私钥或原始敏感日志都不得进入 Mnemon；不得依赖插件自行完成脱敏。
- 生产 DSH 的 host token meter/session 由当前 `dsh-base` bundle 提供，Web 受控 agent preset 和 JSON-RPC chat 分别挂载官方 compaction-basic、tool-result-pruner、command-compact stack；schedule 由 `@deepseek-ai/dsh-schedule` function plugin 提供。所有包都必须在 `SYNO_DSH_ROOT` 的实际构建产物中可解析，缺失时应阻塞启动，不回退到旧 ContextManager 认知链路。

## 数据与渠道限制

- 当前 R4.1–R4.7 工作树已完成全量 Node、vault、Repository verify、fresh clone 和 `git diff --check` 自动门禁；浏览器真实页面、Windows 登录冷启动和微信/飞书设备行为仍由主人 P4 验收。
- 持久 Outbox 已采用 5 分钟可恢复租约、稳定 eventId/idempotencyKey 和接收方幂等边界，仍按 durable at-least-once 语义设计。Workflow Outbox 的 `delivered` 只证明 Provider 接受请求，不证明主人已读；若渠道已经接收而进程在送达状态落盘前崩溃，恢复后可能重复通知，这不会重复写入或重复触发澄清。重复 URL 会返回已有 Workflow 状态；未确认的最终通知只按重复消息 ID 补投一次，微信/飞书的当前目标（含微信 `contextToken`）只从加密 OwnerChannelTargetStore 恢复，不进入 Workflow、Outbox JSON、日志或记忆。
- Bilibili 专用 canonical 规则、HTML/DOCX 边界和来源更新组合场景已有 Spec/组合测试；Bilibili 未完成语义审阅时保持 incomplete，不伪报 verified。
- 当前差异的 Standards、Spec、Security 最终复审均完成，未解决 P0/P1 为 0。
- 当前项目没有 TypeScript 源码、`tsconfig` 或 `typecheck` 脚本；`pnpm run typecheck` 会返回 `ERR_PNPM_NO_SCRIPT`，JavaScript 语法与行为由 Node 全量测试覆盖。
- `vault/` 是唯一可写知识事实源。原始 Obsidian 仓库只读，不双向同步；渠道会话和飞书文档不是知识事实源。
- 状态归档只包含 `%LOCALAPPDATA%\Syno\state`，不包含 DPAPI credentials，也不代替对 Git 跟踪的 `vault/`、`ops/` 和配置文档做备份。
- Web/系统投递通知是可重建运行状态，只写 `.runtime/notifications`，不会因 Host 启动自动污染 `ops/`；需要长期保留的任务、待决策项和学习证据仍写入 canonical `ops/`。
- 自动收录先形成 `IngestProposal`；覆盖、移动、合并、新 tag 和新 MOC 在隔离工作区自动执行，整理冲突时暂停澄清，以降低错误整理的不可逆成本。
- 飞书消息长连接使用 Syno 注册的 Feishu App；日历排期仍使用历史 `lark-cli` 授权。两者共享 Syno Policy 和 Markdown 事实源，但当前需要分别完成消息与日历授权，后续可统一凭据体验。
- 微信仅支持绑定 Owner 的私聊入口，不读取个人聊天历史，也不支持群聊授权。
- 外部网页、Bilibili、PDF 和附件受来源、大小、MIME、SSRF 与隔离规则限制；失效链接或无法安全提取的内容会保留失败状态，不会猜测补全。

## 兼容性债务

- `ProviderClient` / `ConversationStore` / `ConversationRouter` / `ContextManager` / `ToolLoopAgent` 仍有 legacy 本地调用方；只有 R6 真实矩阵完成后才删除。`ApprovalAdvisor` 已收窄为只依赖 `IngestService` 的确定性模块。
- 当前事实记录以 Markdown/JSON 契约版本 1 为基线；未来破坏性契约变更必须新增显式迁移器，不能原地静默升级。
