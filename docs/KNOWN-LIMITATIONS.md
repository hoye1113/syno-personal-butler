# Syno 已知限制

更新日期：2026-07-28

## 发布门槛状态

- token-cloud 固定模型五轮真实工具调用、故障持久等待和同模型恢复已通过，不再是发布门槛。
- 微信 iLink 已完成扫码、Owner 绑定、4/4 连续回复、故障恢复和 durable seen ID 跨重启；主人直发真实 MD 收到 Artifact 回执，后台形成 Proposal 且未写入 vault。
- 飞书消息已完成 Owner 私聊、真实 ID 重放拒绝与重启恢复；飞书日历已完成 user 授权、主日历 CRUD、错误拒绝与恢复。
- `0cc2669` 的 fresh clone 已通过 Node 172/172、vault 57/57 和仓库校验；`a4ec17d` 完成最终回归。真实 Windows Web 生命周期与桌面/移动浏览器增量复验通过。当前代码完整 bundle 为 `C:\tmp\syno-repository-backup-a4ec17d.bundle`，SHA-256 见最终验收矩阵。

旧固定 Provider 的历史验收已经完成，但 OpenCode 重构重新打开了运行时发布门槛。当前尚未配置 Syno 独立 Zen Token，也未完成 R5 的真实跨渠道计数、提示注入、OpenCode 重启恢复和 Windows 登录恢复。不得把自动测试或旧 Provider 证据表述为 OpenCode 已封板。

OpenCode 自动化基线已经通过 Node 370/370、vault 57/57、Repository verify 1358 files，并通过真实 1.18.2 无模型 Server 探针；三轴审查未解决 P0/P1 为 0。这些证据验证接缝与安全边界，不替代上述真实 R5 门槛。

当前 OpenCode 提交的 fresh clone 已在 `C:\tmp\syno-fresh-863bcca` 通过 Node 370/370、vault 57/57 和 Repository verify 1356 files。首次纯离线安装因本机 pnpm store 缺少 `mammoth@1.9.1` tarball 失败；随后按未改变的锁文件联网补齐缓存并通过，故“任意机器完全离线安装”不是已保证能力。

## 运行时限制

- 仅支持 Windows；Provider Token、微信 Bot/回复上下文和飞书 App Secret 使用当前 Windows 用户的 DPAPI，不可作为跨用户可移植凭据。
- 只启用 OpenCode Provider；Syno 按固定三模型链确定性尝试。仅在枚举的瞬态/契约失败且尚无不可逆副作用时尝试下一模型，不切换 Provider 或 Runtime。
- Hermes `0.18.2` 因会访问 Chat Completions 以外的模型元数据路径而被淘汰；Hermes sidecar 代码仅保留审计和回归用途，不可选用。
- OpenCode/模型不可用时，本地搜索、收录回执、任务、提醒与审批解析继续工作；需要模型的 Job 保留为 `waiting_provider`，不会自动换 Provider 或原生 Agent。
- Syno 不能修改自身源码；只能产生 `BugReport`、`ImprovementProposal` 和 SettingsRegistry 白名单内的偏好变更。

## 数据与渠道限制

- `vault/` 是唯一可写知识事实源。原始 Obsidian 仓库只读，不双向同步；渠道会话和飞书文档不是知识事实源。
- 状态归档只包含 `%LOCALAPPDATA%\Syno\state`，不包含 DPAPI credentials，也不代替对 Git 跟踪的 `vault/`、`ops/` 和配置文档做备份。
- Web/系统投递通知是可重建运行状态，只写 `.runtime/notifications`，不会因 Host 启动自动污染 `ops/`；需要长期保留的任务、审批和学习证据仍写入 canonical `ops/`。
- 自动收录先形成 `IngestProposal`；覆盖、移动、合并、新 tag 和新 MOC 仍需独立审批，以降低错误整理的不可逆成本。
- 飞书消息长连接使用 Syno 注册的 Feishu App；日历排期仍使用历史 `lark-cli` 授权。两者共享 Syno Policy 和 Markdown 事实源，但当前需要分别完成消息与日历授权，后续可统一凭据体验。
- 微信仅支持绑定 Owner 的私聊入口，不读取个人聊天历史，也不支持群聊授权。
- 外部网页、Bilibili、PDF 和附件受来源、大小、MIME、SSRF 与隔离规则限制；失效链接或无法安全提取的内容会保留失败状态，不会猜测补全。

## 兼容性债务

- 原生 Provider/ToolLoopAgent/ContextManager/ConversationStore、旧 OpenCode/Claude Executor 和 Hermes 代码在 R6 真实验收门槛前保留，但全部不是活动回退路径。达到门槛后应删除，而不是长期维护第二套 Agent。
- 当前事实记录以 Markdown/JSON 契约版本 1 为基线；未来破坏性契约变更必须新增显式迁移器，不能原地静默升级。
