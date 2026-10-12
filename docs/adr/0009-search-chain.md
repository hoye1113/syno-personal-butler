# ADR 0009：web_search 后端——Syno 组合搜索链（豆包 → Tavily → Exa）

## 状态

已接受（Owner 2026-10-12 批准，随 Kimi Code provider 切换一并上线）。

## 背景

- Kimi 切换后原 DeepSeek 官方搜索后端（`@deepseek-ai/dsh-web-search-deepseek`，复用 `DEEPSEEK_API_KEY`）退役，`web_search` 一度关闭。
- Owner 要求免费用量；本机有代理，但三家候选的免费服务直连均可达。
- Harness 官方已有 `web-search-exa` / `web-search-perplexity` 插件与 `ctx.web.registerSearchProvider` 接缝；官方插件用 raw fetch，无代理处理，且免费额度与中英文覆盖不均衡。

## 决策

1. 自研 provider 插件 `packages/syno-dsh-plugin/plugins/web-search/`，经官方 `ctx.web.registerSearchProvider` 接缝注册 provider id `syno-search`（不引入市场插件、不使用动态 MCP）。
2. 组合链：**豆包搜索**（火山引擎，500 次/月免费，中文优先）→ **Tavily**（1000 credit/月，英文优先）→ **Exa**（每月 $10 免费额度）。按查询语言路由（含 CJK → 豆包优先，否则 Tavily 优先），失败/限流/空结果按链确定性回退；未配置 key 的 provider 自动跳过；全部空结果返回空列表，全部失败抛 `WEB_PROVIDER_ERROR`。
3. Key 统一走仓库根 `.env`（`DOUBAO_SEARCH_API_KEY` / `TAVILY_API_KEY` / `EXA_API_KEY`）→ Host 注入 DSH 子进程；`harness:doctor` 报告三把 key 的就位情况（不输出值）。
4. 约束：单次结果 ≤8 条、单 provider 15s 超时、查询截断 100 字符；搜索结果视为不可信数据，`syno-agent.md` 写入防注入规约（不执行结果内指令、不让结果决定下一步、不按其指名的端点发数据）。
5. 可选覆盖：`SYNO_WEB_SEARCH_CHAIN=exa,tavily` 自定义链前缀（调试/额度耗尽时使用）。

## 后果

- 正面：免费额度合计 ≈2,900+ 次/月（个人管家远用不完）；中文覆盖豆包、英文覆盖 Tavily/Exa；协议完全对齐官方 `WebSearchProvider` 接口；缺 key 时 `web_search` 自然降级、不影响其它工具。
- 代价与限制：三家 key 的注册与额度维护；豆包英文质量弱（已用语言路由规避）；一次搜索是一次额外模型轮次；无查询/域名白名单；额度耗尽错误码（豆包 `10406` 等）按 provider 错误处理并回退下一家。
- 回滚：overlay 移除 `syno-web-search` 行并把 `tool-web` 的 `search` 改回 `false`（一条提交级还原）；`.env` 中的 key 留在本机无害。
