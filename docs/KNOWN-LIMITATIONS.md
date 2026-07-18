# Syno 已知限制

更新日期：2026-07-18

## 当前发布门槛

- token-cloud 真实 Provider 尚未由主人在 Settings 中录入凭据，因此真实工具调用、超时、离线、恢复和上下文边界尚未验收。Fake Provider 与无凭据测试不能替代此项。
- 微信 iLink 尚未完成主人设备扫码、Owner 绑定、真实重复投递、失败重试和恢复验收。
- 飞书尚未完成主人账号扫码/授权、日历选择、真实重复与乱序事件、权限拒绝和恢复验收。

以上任一项未完成时，Syno 可继续作为本地知识工作台使用，但全局 Goal 和最终外部切换不能标记完成。

## 运行时限制

- 仅支持 Windows；Provider Token、微信 Bot/回复上下文和飞书 App Secret 使用当前 Windows 用户的 DPAPI，不可作为跨用户可移植凭据。
- 只启用一个固定 OpenAI-compatible Provider 和一个 Model ID，没有自动模型分层、Provider 切换或 fallback。
- Hermes `0.18.2` 因会访问 Chat Completions 以外的模型元数据路径而被淘汰；Hermes sidecar 代码仅保留审计和回归用途，不可选用。
- Provider 不可用时，本地搜索、任务、提醒与审批继续工作；需要模型的 Job 保留为 `waiting_provider`，不会自动换模型。
- Syno 不能修改自身源码；只能产生 `BugReport`、`ImprovementProposal` 和 SettingsRegistry 白名单内的偏好变更。

## 数据与渠道限制

- `vault/` 是唯一可写知识事实源。原始 Obsidian 仓库只读，不双向同步；渠道会话和飞书文档不是知识事实源。
- 状态归档只包含 `%LOCALAPPDATA%\Syno\state`，不包含 DPAPI credentials，也不代替对 Git 跟踪的 `vault/`、`ops/` 和配置文档做备份。
- 自动收录先形成 `IngestProposal`；覆盖、移动、合并、新 tag 和新 MOC 仍需独立审批，以降低错误整理的不可逆成本。
- 飞书消息长连接使用 Syno 注册的 Feishu App；日历排期仍使用历史 `lark-cli` 授权。两者共享 Syno Policy 和 Markdown 事实源，但当前需要分别完成消息与日历授权，后续可统一凭据体验。
- 微信仅支持绑定 Owner 的私聊入口，不读取个人聊天历史，也不支持群聊授权。
- 外部网页、Bilibili、PDF 和附件受来源、大小、MIME、SSRF 与隔离规则限制；失效链接或无法安全提取的内容会保留失败状态，不会猜测补全。

## 兼容性债务

- 历史 OpenCode/Claude Executor 仍为旧 V1 回归和未迁移操作保留在代码中，但不是产品 Agent Runtime，也不应暴露为用户运行时选择。
- 当前事实记录以 Markdown/JSON 契约版本 1 为基线；未来破坏性契约变更必须新增显式迁移器，不能原地静默升级。
