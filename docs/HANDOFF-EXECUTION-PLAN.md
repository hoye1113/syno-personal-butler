# Syno 主动式知识闭环管家：权威执行计划

更新日期：2026-07-17（Asia/Shanghai）

本文是后续开发的权威执行入口。新会话先读根目录 `AGENTS.md`、`NEXT_SESSION.md`、本文以及 `docs/ARCHITECTURE.md`、`docs/POLICY.md`、`docs/SECURITY.md`。

## 产品目标

Syno 是 Windows 本地、单用户、主动式且可审计的知识闭环私人管家：

`输入收录 → 整理关联 → 理解学习 → 复习实践 → 创作输出 → 反馈更新`

它降低整理成本，但不替主人假装掌握。只有主人亲自口述、打字、答题或实践形成的 `LearningEvidence` 才能提高掌握度。AI 草稿只能提供脚手架。

## 不可变边界

- `vault/` 是唯一可写知识事实源，`ops/` 是行动和证据事实源；`.runtime/` 可删除重建。
- 原始 `D:\workSpace\obsidian_repository` 永久只读，不做双向同步。
- 产品运行时只有一个启用的 `CognitiveRuntime`。原生 `ToolLoopAgent` 是可信基线；Hermes 是固定 SHA、不可并行、不可自动回退的候选认知内核。OpenCode/OpenClaw 都不是产品运行时。
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
4. **运行时**：`SignalEngine → PriorityEngine → CognitiveRuntime → ToolRegistry`，Provider 离线持久等待。当前启用原生适配器；Hermes 只有通过全部硬门槛后才能显式切换。

## Hermes 候选执行状态（2026-07-17）

- 已建立窄接口：`run / cancel / health / capabilities`，并将原生循环迁入该接口。
- 已锁定上游 `0f102fa4dc04b7dfdab048169aaaa640d09d7523`（Hermes `0.18.2`，MIT），本地源码只读。
- 无凭据 Fake Provider Spike 已通过：空 toolset 不暴露工具、白名单只含 Syno 代理工具、固定模型、无 fallback/memory/context/Gateway/CLI，并完成两轮非流式原生工具调用。
- Hermes 该版本必须设置固定 SHA 下的私有 `_disable_streaming` 标志才能满足 Syno 非流式契约；升级必须重新审计。
- 生产 JSONL sidecar 已通过最小环境、Token 脱敏、固定 SHA、恶意工具名、控制命令、取消、超时、崩溃重启、无效 JSON 和 Provider 429 门禁；取消采用终止单 Run 隔离进程并干净重启的语义。
- 当前决定：**候选可行但不采用/不启用**。真实 token-cloud 和全量知识闭环/审批/GitGuard 对比验收尚未完成；原生 Runtime 继续是唯一活动实现。
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
