# 聊天读链接的浏览器升级：现状、根因与修复方案

> 触发：2026-10-16 主人通过飞书发送一篇微信公众号文章链接，管家回复「看不到。直抓被微信的人机验证页拦截了（verification_redirect）……」，全程没有尝试用本机浏览器读取。
> 状态：**已实施**（2026-10-16，阶段 0 + 阶段 1，见文末「实施记录」）；阶段 2（「继续」续办）未做。

## 实施记录（2026-10-16）

- 阶段 0：`locateCommand` 在 POSIX 下把 `$HOME/.local/bin` 作为 PATH 之后的兜底搜索目录
  （`packages/syno-core/process-runner.mjs`）。本机复刻 LaunchAgent 收窄 PATH 验证：
  `bsk` 解析为 `/Users/hoye/.local/bin/bsk`。**未**改 LaunchAgent plist，因此没有动本机生命周期。
- 阶段 1：新增会话门禁 `packages/syno-dsh-plugin/plugins/capabilities/chat-session.mjs`；
  `fetch-tools.mjs` 懒构造 `BrowserCaptureAdapter` 并把 `context`/`browserCapture` 交给
  `fetchUrlForChat`；`capabilities/index.mjs` 从 `exec.agent.id` 取会话 id；共享库新增
  `chat` 渠道标记与 `sessionId` 身份的 workflowId；`syno-agent.md` 与
  `channel-conversation-handler.mjs`（含过期的 `knowledge.fetch_url` 工具名）文案同步。
- 门禁：`pnpm test` 929 项（909 通过 / 0 失败 / 20 跳过）、`pnpm run verify`（2392 文件 + 8 文档）、
  `git diff --check` 全绿。
- 未做（留后）：续办（阶段 2）、DSH 侧 journal（跨进程单写者原则，改用 DSH 会话日志 +
  工具返回的 `via`/`blocked` 取证）。
- 待真机验收：重启生产 DSH 后，在飞书发一篇会命中 `verification_redirect` 的微信文章，
  期望 `via=browser` 正文。

## 1. 现象与期望

- 现象：飞书发链接 → 直抓命中 `verification_redirect` → 模型改走公开搜索 → 无替代来源 → 回「看不到」+ 建议主人提供标题或粘贴正文。
- 期望（主人描述的原设计）：`直抓 → 命中反爬 → 浏览器（BSK 操作本机已登录浏览器）→ 仍被拦则搜索公开镜像/转载`。

## 2. 现状调查（证据）

### 2.1 飞书消息最终在 DSH 里跑模型

- 飞书适配器把消息交给 Host 的会话处理器：`apps/syno/syno/runtime.mjs:1090-1094`（`channel: "feishu"`）。
- 处理器不走 Host 内 Agent，而是调 `this.runtime.run(...)`：`packages/syno-core/channel-conversation-handler.mjs:685-692`。
- 该 runtime 唯一产品实现是 `DeepSeekHarnessCognitiveRuntime`：`apps/syno/syno/runtime.mjs:582-587` → 会话落在 `dsh --profile syno --host 127.0.0.1 --port 3088`（`apps/syno/syno/deepseek-harness-supervisor.mjs:819-828`）。

### 2.2 那个会话里的读链接工具没有浏览器升级

- 实际生效的工具是 capabilities 插件注册的 canonical `syno_knowledge_fetch_url`（`packages/syno-dsh-plugin/plugins/capabilities/index.mjs:80-95`），工具描述自述：「受控直抓公网网页正文；**没有浏览器升级或续办**」。
- 它调用共享库时不传浏览器与上下文：`packages/syno-dsh-plugin/plugins/capabilities/fetch-tools.mjs:5-12` → `fetchUrlForChat({ url, maxChars })`。
- 而升级逻辑要求这两个参数都在：
  - `packages/syno-core/fetch-url-tool.mjs:169`（签名默认 `browserCapture = null, context = null`）
  - `packages/syno-core/fetch-url-tool.mjs:183`：`if (wall && browserCapture && LIVE_CHAT_CHANNELS.has(context?.channel))`
  - `packages/syno-core/fetch-url-tool.mjs:17`：`LIVE_CHAT_CHANNELS = {weixin, feishu, web}`
  - 结论：墙检测命中（`verification_redirect`），但升级分支永远进不去，直接走 `:203-211` 返回「尚未取得文章正文」。
- 带完整升级能力的 Host 版 `knowledge.fetch_url`（`apps/syno/syno/runtime.mjs:430-459`，传 `browserCapture, context, recordEvent`）默认**不挂进会话**：桥插件在 `SYNO_CHAT_TOOLS !== "bridge"` 且未声明 `allowWhenPluginMode` 时静默（`config/deepseek-harness/syno-tool-bridge-plugin.mjs:102-107`），B5 之后生产默认正是这个状态。

### 2.3 这是已知延后项，不是新 bug

- 迁移计划里写明：**「延后：浏览器升级/续办（Phase C 通道上下文）」**（`docs/plans/claw-direct-to-dsh-migration.md:42`，另见 `:77`）。
- 审查整改顺手删掉了无人调用的参数：**「`fetch_url` 工具移除无调用方的 `browserCapture` 参数」**（`docs/plans/claw-direct-to-dsh-migration.md:78`）。
- 提示词层已按「降级态」写死：`config/deepseek-harness/syno-agent.md:7`——「默认插件仅支持直抓，不保存读取续办」。
- Phase C 目前只做了微信通道内嵌（C0/C1），飞书仍是 Host 路由（`docs/plans/claw-direct-to-dsh-migration.md:23,83-95`）。

### 2.4 升级所需的浏览器能力本身是好的

- `BrowserCaptureAdapter` 已在 `packages/syno-core/browser-capture-adapter.mjs`（无 Host 耦合，自己 spawn `bsk`）。
- 本机 `bsk` 可用且 daemon 在跑：`/Users/hoye/.local/bin/bsk`，`~/.bsk/daemon.json` 的 pid 有活进程。
- 收录链路的浏览器工具（`browser.*`）只在 capture Workflow 内可见，由 `captureContext` 门禁（`apps/syno/syno/browser-capture-tools.mjs:1-8`），与聊天会话无关。

### 2.5 另一个前置缺口：BSK 在 Host/DSH 进程里解析不到

- `locateCommand("bsk", "SYNO_BSK_COMMAND")` 只认环境变量或 `PATH`（`packages/syno-core/process-runner.mjs:5-13`）。
- 本机 LaunchAgent 只注入了 `PATH=/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin`（`~/Library/LaunchAgents/com.syno.butler.host.plist`），不含 `~/.local/bin`；`.env` 也没有 `SYNO_BSK_COMMAND`；仓库内无 `.local/bin` 引用。
- 后果：**即便把升级逻辑接回去，也会先掉进 `browser_unavailable`**（`packages/syno-core/fetch-url-tool.mjs:152-166`）。

## 3. 方案对比

| 方案 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **A（推荐）** | 把浏览器升级接回 capabilities 的 `fetch_url`，门禁按「会话身份」判定 | 行为与原设计一致：主人对话自动兜底，无需模型自觉；改动局限插件层 | 需要解决 DSH 侧拿不到 `channel` 的问题（见 A2） |
| B | 新增显式工具 `syno_browser_read`，由模型自行决定用浏览器 | 改动最小，行为可预期 | 没有自动兜底，主人仍可能被回「看不到」；门禁弱（靠提示词） |
| C | 设 `SYNO_CHAT_TOOLS=bridge`，整体退回 Host 工具面 | 立刻恢复升级+续办 | 等于回滚 B5 的 canonical 工具面，副作用面最大 |

### A 的通道门禁怎么解（原设计要禁 proactive/capture 升级）

Host → DSH 的会话 id 是确定性的 `syno-<threadKey>-<uuid>`（`apps/syno/syno/deepseek-harness-cognitive-runtime.mjs:#session`），且工具执行时能拿到会话 id（DSH `ToolRunContext.agent.id`，`vendor/deepseek-harness/packages/core/agent/src/types.ts:15`）。

- **A2-命名门禁（推荐先用）**：`syno-main-*` 视为活聊天线程（飞书/微信 Host 路由都是 `threadKey: "main"`，`runtime.mjs:1084,1093`）；显式排除 `syno-proactive-*`（`apps/syno/syno/proactive-orchestrator.mjs:304`）；未知形态一律不升级（fail closed）并记事件。capture 会话天然排除（该 profile 不挂 capabilities）。
- **A2-注册表（备选）**：Host 在 `runtime.run` 时把 `(sessionId → {channel, ownerKey, threadKey})` 原子写进 `.runtime`，插件读取判定。更稳，但引入一个跨进程契约。

## 4. 推荐实施步骤（待批）

### 阶段 0：打通前置（不做这步，后面都是空转）
1. 让 `bsk` 在 Host/DSH 进程可解析：LaunchAgent `EnvironmentVariables` 加 `SYNO_BSK_COMMAND=/Users/hoye/.local/bin/bsk`（或把 `~/.local/bin` 加进 `PATH`）。
2. `syno-doctor` 的 bsk 检查在 macOS 生产上从「可选」提升为显式呈现（`scripts/deepseek-harness-runtime.mjs:108-111` 已有该检查，当前 `required: false`）。

### 阶段 1：接回升级（核心）
3. `packages/syno-dsh-plugin/plugins/capabilities/fetch-tools.mjs`：懒构造 `BrowserCaptureAdapter`，给 `fetchUrlForChat` 传 `browserCapture` 与 `context: { channel, ownerId, threadKey }`。
4. `context` 由 `exec.agent.id` 经 A2-命名门禁派生（新增小模块 + 单测）。
5. workflowId 用 `sha256(sessionId + url)` 派生，保持确定性（同 `chatReadWorkflowId` 思路，`packages/syno-core/fetch-url-tool.mjs:93-96`）。
6. 文案同步：`config/deepseek-harness/syno-agent.md:7`、工具描述（`capabilities/index.mjs:81`）、`channel-conversation-handler.mjs:402,672` 里过期的 `knowledge.fetch_url` 名字。

### 阶段 2（可选）：续办
7. 主人说「继续」时原地续抓：先按确定性 workflowId + `adapter.observation` 续抓；Host 的 `link_read` 续办表（`runtime.mjs:436-459`）暂不跨进程搬。

## 5. 验收标准

- 单测：命中墙 → 走浏览器分支；门禁拒绝（proactive/未知会话）→ 不升级；BSK 不可用 → `browser_unavailable` 文案不变；`via`/`blocked` 字段契约不变。
- 真机：飞书发一篇会触发 `verification_redirect` 的微信文章 → 期望返回 `via=browser` 的正文；若浏览器仍被风控拦住 → 如实降级且不请求接管。
- 回归：`pnpm test` + `pnpm run verify` + `git diff --check`；微信通道（若走 Host 路由）同样验一遍。
- 事件：`knowledge.fetch_url.escalation` 在 DSH 侧也能落 journal（当前只有 Host 侧会记）。

## 6. 风险与边界

- **不绕过验证**：微信风控页即使用真浏览器也可能出现，届时仍是「如实说看不到」。这一级只提高成功率，不是保证。
- **后台窗口**：升级会为对话打开 BSK Agent Window（原设计已接受，但不抢焦点、无人值守即关闭）。
- **门禁脆弱性**：会话 id 形态变化会让门禁失效 → 用单测钉住命名规则；未知形态 fail closed。
- **搜索那一级已经在链上**：`web_search` 由 syno 搜索链提供（`packages/syno-dsh-plugin/cordis.patch.yml:96-97`，豆包→Tavily→Exa→Parallel），无需新增，只需在文案里明确「被墙后自动转镜像/转载搜索」。

## 7. 同源发现（不在本方案范围，另行裁决）

- `syno_image_read` 不在 capabilities 的 10 个工具里（只在 Host 注册表/桥），默认模式下看图工具对模型不可见，而 `channel-conversation-handler.mjs:683` 仍指示模型调用它。
- 文档滞后：`docs/OPERATIONS.md:253`、`docs/POLICY.md:11`、`docs/SECURITY.md:5`、`docs/ARCHITECTURE.md:43` 仍把 Bridge core 工具集描述为普通聊天工具面。
