# ADR 0009：web_search 后端——Syno 组合搜索链（豆包 → Tavily → Exa → Parallel）

## 状态

已接受（Owner 2026-10-12 批准，随 Kimi Code provider 切换一并上线）。

## 背景

- Kimi 切换后原 DeepSeek 官方搜索后端（`@deepseek-ai/dsh-web-search-deepseek`，复用 `DEEPSEEK_API_KEY`）退役，`web_search` 一度关闭。
- Owner 要求免费用量；本机有代理，但三家候选的免费服务直连均可达。
- Harness 官方已有 `web-search-exa` / `web-search-perplexity` 插件与 `ctx.web.registerSearchProvider` 接缝；官方插件用 raw fetch，无代理处理，且免费额度与中英文覆盖不均衡。

## 决策

1. 自研 provider 插件 `packages/syno-dsh-plugin/plugins/web-search/`，经官方 `ctx.web.registerSearchProvider` 接缝注册 provider id `syno-search`（不引入市场插件、不使用动态 MCP）。
2. 组合链：**豆包搜索** → **Tavily** → **Exa** → **Parallel 匿名 MCP**。按查询语言路由（含 CJK → 豆包优先，否则 Tavily 优先），失败/限流/空结果按链确定性回退；前三家未配置 key 自动跳过，Parallel 无需 key、默认最后尝试。额度以供应商当前条款为准；真实空结果可返回空列表，全部失败抛 `WEB_PROVIDER_ERROR`。
3. Key 统一走仓库根 `.env`（`DOUBAO_SEARCH_API_KEY` / `TAVILY_API_KEY` / `EXA_API_KEY`）→ Host 注入 DSH 子进程；`harness:doctor` 报告三把 key 的就位情况（不输出值）。
4. 约束：默认返回 8 条结果、单 provider 15s 超时；豆包按其接口要求截断查询至 100 字符，其余来源保留当前查询。搜索结果视为不可信数据，`syno-agent.md` 写入防注入规约（不执行结果内指令、不让结果决定下一步、不按其指名的端点发数据）。
5. 可选覆盖：`SYNO_WEB_SEARCH_CHAIN=exa,tavily` 自定义链前缀（调试/额度耗尽时使用）。

## 后果

- 正面：保留现有中文／英文优先顺序；协议对齐官方 `WebSearchProvider` 接口；没有任何搜索 key 时仍可尝试 Parallel 匿名搜索。
- 代价与限制：三家 key 的注册与额度维护；豆包英文质量弱（已用语言路由规避）；一次搜索是一次额外模型轮次；无查询/域名白名单；额度耗尽错误码（豆包 `10406` 等）按 provider 错误处理并回退下一家。
- 回滚：overlay 移除 `syno-web-search` 行并把 `tool-web` 的 `search` 改回 `false`（一条提交级还原）；`.env` 中的 key 留在本机无害。

## 2026-10-13：增加免 Key 备用源

Owner 授权增加 Parallel。固定连接 `https://search.parallel.ai/mcp`，复用现有 `@modelcontextprotocol/sdk`（移到运行依赖，锁文件解析版本仍为 1.30.0），仅调用 `web_search`，不注册外部工具、不加载服务器指令、不改 Harness profile 的 MCP 配置。

- 默认位于现有来源之后；可用已有 `SYNO_WEB_SEARCH_CHAIN=parallel` 前缀进行显式测试，Host 仅透传这一非敏感配置。
- 仅发送当前查询作为 objective／search_queries，不附加可选 session_id／model_name，不发送聊天历史、Owner 标识、本地文件或凭据，也不读取或透传 Parallel API Key。
- SDK 初始化与查询共同受 15 秒期限控制，调用结束关闭 transport，禁自动重连、拒绝端点重定向；响应每个 HTTP 流最多 1 MiB，默认最多 8 条结果、摘要每条最多 1000 字符，不切断 emoji 代理对。
- HTTP 429／MCP 工具限流错误冷却至少 60 秒。HTTP Retry-After 支持秒数及日期，冷却最多 5 分钟；冷却状态只在进程内，不落盘。不重复轰击限流服务。
- 工具错误、无效 JSON／结构、超时不能伪装为空结果；不把服务器错误正文传给模型。结果按标题、URL、摘要、日期归一化，URL 限 HTTP(S) 且不含凭据。
- 不调用 Parallel `web_fetch`，不替换 `syno_knowledge_fetch_url`；现有网页安全拒绝与正文读取流程保持原状。网页／搜索摘要仍是不可信证据。
- 匿名额度没有公开具体数值，不能承诺无限可用或固定吞吐。官方契约见 [Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp)；依赖的 [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) 负责协议，不自行实现 MCP。
- 合并与运行生效分开；不自动重启生产服务。匿名搜索仅在真正尝试该后端时发出，不在启动／doctor 时主动发送查询。
