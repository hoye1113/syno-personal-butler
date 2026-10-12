# Kimi Code Provider 切换执行方案（2026-10-12）

> 对应 ADR：[0008-kimi-code-provider](../adr/0008-kimi-code-provider.md)。本方案是本次切换的唯一执行事实源。
> 证据：`ops/acceptance/kimi-provider-switch/spike-evidence-2026-10-12.md`。

## 目标与边界

- 目标：认知层全部 (chat web / chat JSON-RPC / capture) 从 DeepSeek 官方 API 切到 Kimi Code，模型链 `kimi-coding/kimi-for-coding` → `kimi-coding/k3-256k`。
- 边界：不改 `vendor/deepseek-harness`；不引入社区插件/动态 MCP；不把 key 写入配置、日志或 Git；合成步骤维持既有频率（Kimi 社区规则禁止非交互批量自动化）。

## 阶段与硬门槛

### Phase 0 证据归档
- 可行性 spike（直连 API / chat web / 工具调用 / 旧会话延续 / capture 树解析）全部通过并落 `ops/acceptance/kimi-provider-switch/`。
- 门槛：证据文件入库；本方案与 ADR 落档。

### Phase 1 实现

| 模块 | 改动 |
|---|---|
| 密钥链路 | 新增 `apps/syno/syno/kimi-key-loader.mjs`（进程 env → 仓库根 `.env`）；删除 `deepseek-key-loader.mjs`；supervisor `#profileEnv` 注入 `KIMI_API_KEY` |
| 模型链 | `HARNESS_MODEL_CHAIN`、`parseHarnessModel`（只收 `kimi-coding/<model>`）、`assertCognitiveCapabilities` 校验、supervisor 默认 route |
| 生产 overlay | `packages/syno-dsh-plugin/cordis.patch.yml`：`llm-pi-ai` 的 kimi 路由（含图片预算）+ `agent-default-model` 覆盖 + `syno-web-search` 搜索链（后续由 ADR 0009 落地，取代最初的 `search:false` 处置） |
| JSON-RPC chat | `config/deepseek-harness/syno-chat.cordis.yml`：`llm-deepseek` patch → `llm-pi-ai` patch |
| capture | `config/deepseek-harness/syno-capture.cordis.yml`：`insert` `llm-pi-ai` 路由（spike 已验证） |
| 插件/脚本 | `channel-weixin/channel-core.mjs` 默认模型；`capabilities/spike.mjs`；`scripts/spike-capabilities.mjs`；`scripts/probe-harness.mjs`；`scripts/deepseek-harness-runtime.mjs` doctor |

门槛：所有文件改动完成；`kimi-key-loader` 有测试。

### Phase 2 自动门禁

- `pnpm test` 全量 0 fail；`pnpm verify` 通过；`pnpm harness:doctor`（closure ok、`KIMI_API_KEY present`）；`git diff --check`。

### Phase 3 验收

- 自动：`pnpm spike:capabilities`（真实模型 + 工具面，kimi 路由）。
- 真机（Owner）：`pnpm windows:restart` → 微信知识检索 → 观察 `harness.start.completed`；「新对话」验证干净会话；当日 Kimi 控制台额度对账。
- 门槛：微信真实回复正常；waiting_provider=0；额度消耗与预期量级一致。

### Phase 4 观察与回滚（首 72h）

- 观察：`waiting_provider`、失败码分布（401/403/429）、capture 收录成功率、会话标题生成。
- 回滚：还原 Phase 1 变更 + `.env` 填回 `DEEPSEEK_API_KEY`（`llm-deepseek` 惰性挂载即回滚面）；触发条件 = 账号风控/额度冻结或 provider 失败率异常且可复现。

## 负向红线

- 不内联 key；不改 vendor；不跳过 Phase 2 直接真机；不新增高频自动调用；不修改/伪装 User-Agent。
