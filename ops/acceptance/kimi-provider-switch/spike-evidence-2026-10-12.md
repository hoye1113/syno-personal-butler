# Kimi Code Provider 切换——可行性 Spike 证据（2026-10-12）

工具形态：临时独立 DSH home / 端口（3099）/ 独立会话根，生产 Host 未受影响。
Spike 脚本：`%LOCALAPPDATA%\Temp\opencode\kimi-spike\`（一次性，可删除）。
本轮不记录任何密钥材料；`.env` 中 `KIMI_API_KEY` 已由 Owner 填写（72 字符，无引号）。

## 1. 直连 Kimi API（`probe-api.mjs`）

Endpoint：`https://api.kimi.com/coding/v1/messages`（Anthropic Messages，`x-api-key`，`anthropic-version: 2023-06-01`）。

| 模型 | HTTP | stop_reason | 内容块 | 中文往返 | 流式 SSE |
|---|---|---|---|---|---|
| `kimi-for-coding` | 200 | end_turn | thinking + text | 通过（含「收到」） | message_start / content_block_delta / message_stop 齐全 |
| `k3-256k` | 200 | end_turn | thinking + text | 通过 | 未测（同端点） |
| `k3` | 200 | end_turn | thinking + text | 通过 | 未测（同端点） |

usage 观测：`k3` 命中 prompt cache（cache_read_input_tokens=91）；thinking_tokens 单独计量。
结论：Owner 档位 ≥ Moderato/Plus，`kimi-for-coding` 与 `k3-256k` 均可用。

## 2. Chat Web 形态（`spike-web.mjs`，生产同构：syno profile + @syno/dsh-plugin + pi-ai 路由）

| 用例 | 结果 |
|---|---|
| 初始化（provider=kimi-coding, model=kimi-for-coding, agentPreset=syno） | ok |
| 新会话「请只回复：pong」 | 通过（`pong`） |
| 工具调用往返（`syno_knowledge_search`） | 通过：`tool/call` + `tool/result` 共 6 个事件，0 错误信号 |
| 旧 DeepSeek 会话延续（`syno-main-87ac46…`，494KB zstd，含推理块与工具历史） | 通过（无缝续聊，无 400、无签名问题） |
| 会话标题生成（辅助 LLM 调用） | 正常（无报错） |

## 3. Capture（sdk-minimal）挂载 pi-ai（`spike-capture.mjs`）

- 在 sdk-minimal 树的 overlay 中直接 `insert` `@deepseek-ai/dsh-llm-pi-ai`（routes= kimi-coding）即可解析并运行：initialize ok，`capture-ok` 返回。
- 结论：此前评估的 P0（独立树 resolver manifest 约束）不成立，无需 node_modules shim，也不需要换 profile。

## 4. 未覆盖项（留给切换后真机观察）

- 图片输入路径（现行聊天基本不走聊天模型图片）。
- 配额/限流真实行为（5h 滚动窗口、403 并发风控、429 高峰）。
- `waiting_provider` 与 401/403 失败码在真实流量中的分布。

## 5. 生产链路验证（2026-10-12，正式改动完成后）

| 验证 | 子模块 `vendor/deepseek-harness`（0.2.1-alpha.1） | 外部克隆 `D:\workSpace\deepseek-harness`（0.1.7-alpha.2，生产当前使用） |
|---|---|---|
| `pnpm harness:doctor` | closure ok（capture pi-ai 可解析）；`kimi-key present (repo-dotenv)`；但 capture-sidecar 因 `@deepseek-ai/libreoffice-kit#runtime-entry` 报 closure 不完整（外部依赖不在根 node_modules 的既有检查缺口） | 全 ok（含 capture-sidecar） |
| `pnpm spike:capabilities`（真实模型 + 工具面） | SPIKE_A_OK（pong → 知识检索 2 条 → 读取真实笔记标题），17.1s | SPIKE_A_OK，8.4s |
| capture sidecar boot（spike） | initialize ok + `capture-ok` | initialize ok + `capture-ok` |
| `pnpm test` / `pnpm verify` | 793/793 pass；verify 通过（2347 files） | 同（同一仓库测试面） |

结论：两套 Harness 根均可承载本次切换；生产当前使用的 0.1.7 外部克隆已实测通过。版本漂移与子模块 closure 缺口记录在 `NEXT_SESSION.md`「环境发现」，本轮不修复。

## 6. 搜索链恢复验证（2026-10-12，ADR 0009）

- 直连探针（三家免费 key，均无需代理）：
  | provider | 中文查询延迟 | 英文查询延迟 | 备注 |
  |---|---|---|---|
  | 豆包搜索（火山） | 456ms | 198ms | 中文结果优；英文结果偏本地化页面（语言路由已规避） |
  | Tavily | 2.9s | 3.8s | 英文结果优 |
  | Exa | 0.95s | 0.39s | 最快，中英文均可 |
- 单测：`tests/web-search-syno.test.mjs` 14/14（三个归一化器 / 语言路由 / 失败与空结果回退 / 全失败错误 / 自定义链 / 取消语义）。
- 真机：`pnpm spike:capabilities` 新增 turn-4，kimi agent 真实调用 `web_search` 返回 8 条来源（走豆包链），四轮全绿。
- 门禁：`pnpm test` 809/809；`pnpm verify` 通过（2350 files）；`harness:doctor` `search-keys {doubao,tavily,exa} 全 true`。

## 7. 代码审查修复与复验（2026-10-12）

审查发现并修复：① JSON-RPC chat 回退面在 Kimi 切换后 web_search 回归为必失败（base 仍钉 DeepSeek 搜索 provider）——回退面接入同一 `syno-search` 接缝；② 回退面以相对路径加载插件时没有 bundle linked-root 的 peer 拦截，静态 `@deepseek-ai/dsh-web` import 令插件整块加载失败——改为可选解析（拦到用官方 `WebError`，拦不到退回携带 `code` 的本地等价类）并加回归测试；③ preset `tool-web` 的 `fetch:false` 与提示词 `web_fetch` 指引不一致——开放 `fetch: true` 并用 spike turn-5 实测通过；④ ARCHITECTURE/syno-agent 文案与导出面收敛。

复验：插件单测 16/16；`spike:capabilities` 五轮全绿（含真实 `web_search` 8 条来源与 `web_fetch` 读取 example.com）；JSON-RPC 回退面真实启动验证——`web_search 返回了 8 条来源`，0 错误信号（临时脚本 `verify-jsonrpc-chat.mjs`）。

