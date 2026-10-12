# ADR 0008：认知层 Provider 从 DeepSeek 官方切换到 Kimi Code

## 状态

已接受（Owner 2026-10-12 指令执行）。执行方案见 [Kimi Code Provider 切换计划](../plans/kimi-code-provider-switch.md)；可行性证据见 `ops/acceptance/kimi-provider-switch/spike-evidence-2026-10-12.md`。

## 背景

- 产品认知层此前固定为 DeepSeek 官方两档模型链（`deepseek/deepseek-v4-flash-vision-exp` → `deepseek/deepseek-v4-flash`），凭据来自 host 环境变量或本机 opencode `auth.json`。
- Owner 要求改用 Kimi Code 订阅（`KIMI_API_KEY`，与登录设备共享订阅额度），不再使用 DeepSeek 官方 API。
- DSH Harness 已内置挂载休眠的 `@deepseek-ai/dsh-llm-pi-ai`（pi-ai 多供应商适配器），其官方目录含 `kimi-coding` provider（`https://api.kimi.com/coding`，Anthropic Messages 协议，模型 k3 / k3-256k / kimi-for-coding / highspeed）。

## 决策

1. 认知层走 pi-ai 的 `kimi-coding` 目录路由；模型链固定为 `kimi-coding/kimi-for-coding` → `kimi-coding/k3-256k`（确定性回退不变）。
2. 鉴权只用 API Key（官方文档化路径，共享订阅额度）；不使用 pi-ai 的非文档化 OAuth 订阅登录（该路径会把工具名改写为 Claude Code 命名且无官方背书）。
3. 密钥经仓库根 `.env`（gitignored）填写，Host supervisor 读出后按进程环境变量注入三个 DSH 子进程（chat web / chat JSON-RPC / capture）；`.env.example` 入库。
4. web_search 工具按 Owner 决策先关闭（原后端为 DeepSeek 官方搜索插件）；web_fetch 保留。`llm-deepseek` 行保持惰性挂载，作为回滚面。（2026-10-12 后续：搜索后端恢复为自研 `syno-search` 链，见 [ADR 0009](0009-search-chain.md)。）
5. 生产 overlay 收紧 kimi 路由图片预算（单图 ≤786KB 编码、聚合 ≤1.4MB base64），对齐 Kimi 单请求约 2MB 上限。
6. 旧 DeepSeek 会话不强制迁移：已验证可直接延续；切换后建议高频会话以「新对话」获得干净缓存域。

## 后果

- 正面：订阅制成本可预期；pi-ai 目录保证协议/thinking 映射/图片处理按 Kimi 对齐；三处 profile 均在 Harness 原生机制内完成，vendor 零改动。
- 代价与风险：切换本身是一次全量 prefill（一次性缓存成本）；Kimi 社区规则禁止非交互批量自动化，灵感/主动推送维持既有低频、不新增批量扇出；请求携带 DSH 真实身份 User-Agent（不可抑制、非伪造）；搜索能力一度缺省，已由 ADR 0009 的 `syno-search` 链恢复。
- 回滚：还原本决策涉及的配置/代码（独立 commit 可实现二进制回滚）+ `.env` 填回 `DEEPSEEK_API_KEY`；`llm-deepseek` 路由为惰性挂载，回滚无需改 composition。
