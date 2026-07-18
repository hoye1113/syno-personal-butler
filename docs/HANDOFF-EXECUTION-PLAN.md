# Syno 主动式知识闭环管家：权威执行计划

更新日期：2026-07-18（Asia/Shanghai）

本文是后续开发的权威执行入口。新会话先读根目录 `AGENTS.md`、`NEXT_SESSION.md`、本文以及 `docs/ARCHITECTURE.md`、`docs/POLICY.md`、`docs/SECURITY.md`。

## 产品目标

Syno 是 Windows 本地、单用户、主动式且可审计的知识闭环私人管家：

`输入收录 → 整理关联 → 理解学习 → 复习实践 → 创作输出 → 反馈更新`

它降低整理成本，但不替主人假装掌握。只有主人亲自口述、打字、答题或实践形成的 `LearningEvidence` 才能提高掌握度。AI 草稿只能提供脚手架。

## 不可变边界

- `vault/` 是唯一可写知识事实源，`ops/` 是行动和证据事实源；`.runtime/` 可删除重建。
- 原始 `D:\workSpace\obsidian_repository` 永久只读，不做双向同步。
- 产品运行时只有一个启用的 `CognitiveRuntime`。原生 `ToolLoopAgent` 是当前唯一活动实现；固定版本 Hermes 已因 Provider 表面越界而淘汰，不并行、不自动回退。OpenCode/OpenClaw 都不是产品运行时。
- Provider 只使用一个固定 Model ID 和一个 OpenAI 兼容 Base URL，不自动换 Provider、模型或分层。
- 模型不得唤醒自己、改变 Policy、扩大权限或绕过审批。
- Syno 不修改自身源码，只能生成 `BugReport`、`ImprovementProposal`，以及修改 `SettingsRegistry` 白名单配置。
- 不重置整改分支，不使用 `git add -A`，不自动 Push。

## 当前状态

- 仓库：`D:\workSpace\syno-personal-butler`
- 分支：`codex/round3-remediation`
- R3-0 已在本地提交 `c34ba05 fix: restore isolated R3 baseline`，当时 Node 66/66、vault Python 57/57 全绿。
- 主动知识闭环、单 Agent/Provider、渠道 Adapter、五区 Web 和纸片法老已完成首轮实现；本轮可靠性加固正在同一分支验收，以 `NEXT_SESSION.md` 的测试快照为准。
- `.pnpm-store/` 是本机安装缓存，不暂存；删除仍须按仓库审批规则执行。

## 固定实施顺序

1. **R3-0 可信基线**：测试隔离、日历副作用契约、只读权限、完整回归。
2. **产品和架构事实**：单 Agent、固定 Provider、Afu 改造边界、源码禁改、本地恢复策略。
3. **知识闭环契约**：Goal、Artifact、Ingest、Claim/Evidence、Learning、Output、Memory、Settings。
4. **运行时**：`SignalEngine → PriorityEngine → CognitiveRuntime → ToolRegistry`，Provider 离线持久等待。原生适配器是唯一活动实现；本轮固定版本 Hermes 已按硬门槛淘汰。

## Hermes 候选执行状态（2026-07-18）

- 已建立窄接口：`run / cancel / health / capabilities`，并将原生循环迁入该接口。
- 已锁定上游 `0f102fa4dc04b7dfdab048169aaaa640d09d7523`（Hermes `0.18.2`，MIT），本地源码只读。
- 无凭据 Fake Provider Spike 已通过：空 toolset 不暴露工具、白名单只含 Syno 代理工具、固定模型、无 fallback/memory/context/Gateway/CLI，并完成两轮非流式原生工具调用。
- Hermes 该版本必须设置固定 SHA 下的私有 `_disable_streaming` 标志才能满足 Syno 非流式契约；升级必须重新审计。
- 生产 JSONL sidecar 已通过最小环境、Token 脱敏、固定 SHA、恶意工具名、控制命令、取消、超时、崩溃重启、无效 JSON 和 Provider 429 门禁；取消采用终止单 Run 隔离进程并干净重启的语义。
- 收紧 Fake Provider 后确认上游仍会探测 `/api/v1/models`、`/api/tags`、`/v1/props`、`/props`、`/version`、`/v1/models` 或 `/models`，违反只允许 `POST /chat/completions` 的 Provider 契约。
- 当前决定：**该固定版本未通过硬门槛，不采用且不再接触真实 Token**。不以额外私有钩子、广域网络 monkey-patch、Hermes 专用过滤代理或安全 fork 绕过；原生 Runtime 是唯一活动实现。真实 Provider 验收仅验证原生固定模型。
- 决策与原生单次 Run 固定配置加固已提交 `f015921`；主工作树及 fresh clone 均通过 Node 112/112、vault 57/57 和仓库校验。
- 隔离 Web 验收已覆盖 1440×1000 与 390×844、键盘焦点循环与恢复、关闭抽屉的 `hidden/inert` 边界、减少动画、Token 不回显和控制台错误；同时补上移动端可实际点击的“连接设置”入口。证据见 `docs/BROWSER-ACCEPTANCE.md`。
- Web 修复提交 `200fb1f` 已在主工作树与全新克隆复验：Node 113/113、vault 57/57、仓库校验通过。
- 备份恢复、单向迁移、已知限制、最终切换清单和逐项验收矩阵分别由 `docs/OPERATIONS.md`、`docs/MIGRATION.md`、`docs/KNOWN-LIMITATIONS.md`、`docs/CUTOVER-CHECKLIST.md` 与 `docs/FINAL-ACCEPTANCE.md` 维护；未通过的真实外部门槛必须保持显式未完成。
- 切换控制提交 `2a8d195` 已在主工作树与 `C:\tmp\syno-fresh-2a8d195` 复验：Node 114/114、vault 57/57、仓库校验通过；状态归档 CLI 完成隔离 backup/verify/restore 演练。
- 渠道安全提交 `04005b2` 将微信 Bot/回复 context 改为 DPAPI、分离可备份运行状态、迁移旧明文格式，并为微信/飞书提供显式确认且不输出凭据的真实健康探针；主工作树与 `C:\tmp\syno-fresh-04005b2` 均通过 Node 118/118、vault 57/57 和仓库校验。
- 飞书恢复提交 `1540b66` 将 Owner 私聊事件持久化为 30 天 pending，成功回复后才写 durable dedupe，失败可重试或跨 Worker 重启恢复；主工作树与 `C:\tmp\syno-fresh-1540b66` 均通过 Node 120/120、vault 57/57 和仓库校验。
- Provider 采用门提交 `fdd0c04` 将本地上下文/超时/离线故障注入与五轮真实工具调用串联，要求故障后仍由同一固定 Model ID 全部成功；主工作树与 `C:\tmp\syno-fresh-fdd0c04` 均通过 Node 121/121、vault 57/57 和仓库校验。真实断网仍保留为主人验收。
- 2026-07-18 封板审计后的闭环加固新增 ConversationRouter、逐会话排他执行、真实用户原文 Artifact、Claim/Evidence 原子聚合、显式 IngestDecision 与三层生命周期、OutputOpportunity 进度、SignalSourceRegistry 和实际生效的主动偏好；同时修复飞书未送达却去重及微信轮询重复 DPAPI 的问题。批准前收录载荷不再提前污染 `ops/`。
5. **知识技能**：低成本收录、渐进整理、Teach-back、间隔复习、证据型创作、时效查证。
6. **外部渠道**：Web 完整控制；微信快速入口；飞书日程和结构化通知；同一 Agent/Policy/Store。
7. **Web 与品牌**：Today、Capture、Knowledge、Learn、Create；纸片法老知识守护者；WCAG AA。
8. **封板**：完整测试、浏览器验收、fresh clone、备份恢复、真实外部探针；不 Push。

## 固定领域状态

- 知识：`captured → curated → understood → applied → expressed → retained → integrated`
- 收录：`Artifact → 安全检查/提取/去重 → InboxCandidate → IngestProposal → 批准 → Note`
- 主动优先级：明确目标/项目 → 已承诺事项 → 到期复习和知识缺口 → 新信息 → 自由探索
- 每日资源配比：60% 消化已有知识、25% 新内容、15% 知识库维护
- 默认主动节奏：晨间计划、高价值事件、晚间复盘、每周深度复盘；每日主动通知最多 3 次

## Provider 和保留规则

- 默认 Base URL：`https://server.flowyaipc.cn/claw/v1`
- 请求：`POST {baseUrl}/chat/completions`，非流式，原生 tool calls
- Base URL、Token、Model ID、上下文长度由设置页录入；Token 由 Windows DPAPI 保存到 `%LOCALAPPDATA%\Syno\credentials`
- Provider 不可用时，本地能力继续；LLM Job 进入 `waiting_provider`，人工/定时重试后恢复
- 对话 30 天；确认转录后的原始语音 7 天；失败载荷 30 天；未完成任务保留到终态
- `ConversationStore.prune` 分别执行语音与对话保留；状态归档默认只包含 `%LOCALAPPDATA%\Syno\state`，明确排除 credentials，并以 SHA-256 清单校验。

## 完成定义

- `pnpm test`、类型检查、构建、配置和仓库验证全部通过；`python -m pytest vault/tests` 全部通过。
- 测试不读取或写入真实 `%LOCALAPPDATA%\Syno` 凭据和数据。
- 收录、学习证据、脱机重试、渠道去重/鉴权、审批和恢复均有契约测试。
- Web 通过键盘、对比度、响应式、减少动画和核心浏览器流程验收。
- fresh clone 可重复安装、构建、启动；备份、回滚、迁移与已知限制已记录。
- 真实 Provider Token、微信扫码和飞书扫码属于主人输入/设备验收，不以 Fake 测试冒充。
- 原始 Obsidian 仓库未改变，当前分支未被重置，远端未 Push。
