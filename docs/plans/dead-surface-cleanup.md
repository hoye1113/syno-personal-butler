# 死面清理：可删清单与判定依据（2026-10-16）

> 起因：主人「没必要保留不可用的插件或工具」。
> 已执行：`image.read` 已摘除（commit `8cfc9d3`）。以下是**第二轮候选**，逐项附证据与风险，等主人点头再动。

## A. 已完成（本轮）

- `image.read`（Host 工具 + 桥目录 + 降级目录 + core 名单 + 两处提示词）。
- 判定依据：B5（2026-09-24）后默认聊天面是 capabilities 插件（6 件 canonical），bridge 默认静默，
  core 名单只影响 bridge 回滚面 → 该工具在任何模型面都到不了，却仍被提示词要求调用。
- 保留：图片**收录**链（`channel-conversation-handler` 的 `visionClient.read` → Zen HTTP）及其依赖模块。

## B. 注册了、但任何模型面都到不了的工具（建议删，需主人确认）

清单：`workflow.context`、`knowledge.read`、`goals.list`、`claims.propose`、`evidence.propose`、
`evidence.source_read`、`settings.adjust`。

证据：
- 默认聊天面 = capabilities 注册的 6 件（`config/deepseek-harness/syno-tool-sets.mjs`）。
- bridge 插件默认静默（`config/deepseek-harness/syno-tool-bridge-plugin.mjs:102-107`）。
- bridge core 面 = 同一份 core 名单（不含上述名字）。
- capture 面被运行时过滤成 browser.*（`apps/syno/syno/deepseek-harness-cognitive-runtime.mjs:505-517`）。

与 A 的区别（也是为什么没直接删）：`/api/syno/bridge/mcp` 的暴露集合 = ToolRegistry ∩ `BRIDGE_TOOL_NAMES`
（`apps/syno/syno/syno-tool-bridge.mjs:80-88`），这些名字仍在目录里 → **持有 token 的客户端点名仍可调用**。
删掉它们 = 撤掉这层「未公开但可调用」的能力，属于边界决策而不是清死代码。

验收：`pnpm gate` 全绿 + 全仓 `tools.execute("...")`/桥目录/文档零残留 + 生产重启后真实会话抽检一次。

## C. 一次性脚本（17 个，需主人确认哪些还要留）

无 `package.json` 入口、也无代码引用的脚本：
`configure-feishu`、`cutover-mobile-delivery`、`generate-knowledge-index-doc`、`heal-vault-wikilinks`、
`ingest-bilibili-opus`、`ingest-wechat-articles`、`inventory-all-skills`、`prune-coding-tutorials`、
`prune-vault-knowledge`、`r6-readiness`、`radar-trending-skills`、`reingest-tier1/2/3-articles`、
`sync-feishu-intake`、`sync-vault-to-wiki`、`update-wiki-home`。

注意：`docs/product-slimming-and-inspiration-plan.md:47` 明确写过「r6-readiness/cutover-mobile-delivery
为历史验收工具保持原样」——若要删，先改这条记录。`heal-vault-wikilinks`、`radar-trending-skills`、
`sync-feishu-intake` 在 devlog 里还被当 runbook 引用过。

## D. 回滚面与构图（建议保留，除非主人明确不要回滚能力）

- `config/deepseek-harness/syno-chat.cordis.yml` + `SYNO_DSH_CHAT_SURFACE=jsonrpc`：紧急回切聊天面。
- `syno-tool-bridge-plugin.mjs` 的 chat core 面：**不能整体删桥**——收录 sidecar 仍用桥（`toolSet: all`）。

## E. 文档归档（可选）

`docs/TODO-EXECUTION-PLAN.md`、`docs/handoff-pr10a-2026-07-30.md`、`docs/product-slimming-and-inspiration-plan.md`、
`docs/project-aware-knowledge-execution-plan.md`、`docs/plans/*` 多数已是历史记录；`docs/INDEX.md` 已有
Normative / Historical / Generated 分类，可把它们标注/移入归档，减少「过期文档被当现状引用」的概率。
