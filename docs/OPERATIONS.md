# Syno 本地运维、备份与恢复

## 状态分层

- Git 跟踪：`vault/`、`ops/`、`contracts/`、应用源码与文档。
- 本地可重建：`.runtime/` 的索引、锁、队列快照、投递通知和临时状态。
- 本地敏感：`%LOCALAPPDATA%\Syno\credentials` 的 DPAPI 凭据；严禁复制到仓库、日志或工单。
- 本地持久：对话、等待重试的 Job、未完成摄取状态。清理前先停 Syno Host 并备份。

## 备份

1. 停止 Syno Host（Windows 任务或 `pnpm start` 进程），确认没有 `running` Job。
2. 记录当前 Git commit 和 `git status --short`；未跟踪的用户资料不得遗漏。
3. 备份仓库的 `vault/`、`ops/` 与配置文档。
4. 对本机状态做加密备份；DPAPI 凭据只能在同一 Windows 用户上下文恢复。Token 更推荐在新机器重新输入。
5. `.runtime/` 可省略；恢复后重建索引。

可执行的本地状态流程（归档目录必须是绝对路径）：

```powershell
pnpm state:archive -- backup D:\Backups\syno-state-20260717
pnpm state:archive -- verify D:\Backups\syno-state-20260717
pnpm state:archive -- restore D:\Backups\syno-state-20260717
```

归档仅包含 `%LOCALAPPDATA%\Syno\state`，不会包含 DPAPI credentials；`manifest.json` 记录版本、文件大小与 SHA-256。请再使用系统加密备份保护归档目录。

完整测试包含一次使用隔离 `SYNO_LOCAL_DATA` 的 CLI 端到端演练：创建等待 Provider 的 Job 与对话状态，依次执行 backup、verify、restore，并验证二次恢复因目标非空而失败。该测试不会访问真实 `%LOCALAPPDATA%\Syno`。

2026-07-20 封板演练在确认 0 个 `running` Job 后短暂停止当时的 Worker 进程（现已并入 Host），将真实非凭据状态备份到 `C:\tmp\syno-state-final-bc5937b`：52 项，`credentialsIncluded=false`，manifest SHA-256 为 `DE0AD96C68170CA10498721C53F625A8405205DA912E095C2EFD026F70DAD969`。归档在全新隔离根恢复成功，第二次恢复按预期拒绝；随后 Host 重启，微信与飞书探针均从 `running_worker` 返回连接健康。

## 恢复与回滚

- 源码回滚只由 Codex 在独立开发流程执行；Syno 本身无源码修改能力。
- 回滚前保存未提交差异，不使用 `git reset --hard` 丢弃用户修改。
- 数据契约升级必须先备份，再运行迁移；迁移失败时保持旧数据不变并输出报告。
- 恢复命令 `pnpm state:archive -- restore <绝对归档目录>` 只接受空的状态目标，拒绝覆盖现有状态；先验证清单再复制。
- Provider 故障不回滚本地事实：Job 留在 `waiting_provider`，恢复连接后精确重试。
- 渠道故障只降级渠道；Web、本地搜索、任务、提醒和待决策项继续运行。

## 保留与清理

- 对话默认 30 天；确认转录后的原始语音 7 天；失败载荷 30 天。
- 未完成任务保留到 completed/failed/rejected/canceled 等终态。
- 删除缓存前验证目标是仓库 `.runtime/` 或明确的 Syno 本地目录，不对宽泛路径递归操作。
- `.pnpm-store/` 是安装缓存，删除需要按仓库受控执行规则提供精确目标和影响预览。
- 主动/工作流 outbox 的终态记录（`delivered`/`failed_terminal`）由 `retain()` 按小时节流、超 14 天自动淘汰，目录不再单调膨胀（drain 时 best-effort，不阻塞投递）。
- 历史上 `proactive.bundle.recovery_failed`（如 f1b29459）刷屏的根因是对账循环重读已损坏的 outbox payload 抛错、每 tick 记一条失败——已由「对账排除 `failed_terminal`（C6）」+「drain 时把结构损坏 payload 转终态（A1）」根治，不再复现。若日志仍见，多为修复前残留记录：把 `state/channel-outbox/<id>.json` 的 status 改 `failed_terminal`，或删除其 `.dpapi` payload 后重启即可。
- 系统性「静默无限重试/停滞」bug 类已由 P1–P4 + 收尾复审 R1–R3（commit `8ce4cb3`）根治：凡是 `loop / retry / 定时 drain / setInterval tick` 的回调内 uncaught throw 被外层归默认 retryable、又无终态升级、再加过宽 `.catch(()=>{})` 吞错，就会不抛错不告警地永远重试或永远不推进。**改动任何重试/循环路径必须保留三件套**：终态出口（`failed_terminal`）、maxAttempts 上限（惯例 8）、可观测回调（`recordEvent`，不得 `.catch(()=>{})` 吞）；且 maxAttempts cap 必须放在 `send()`/调用**之前**（事后 cap 在 send 抛错时结构性不可达，R3）。诊断事件：`accepted_request.recovery_failed`（accepted 恢复 tick 抛错）、`INGEST_PREPARE_EXHAUSTED`（收录 prepare 重试耗尽）、`WORKFLOW_DELIVERY_EXHAUSTED`/`PROACTIVE_DELIVERY_EXHAUSTED`（投递耗尽转终态）、`proactive.bundle.blocked_sensitive`（主动提醒命中高精度凭据，已净化为回退文案）。这些只在真实故障时出现，正常启动不应刷屏。

## 故障检查顺序

1. 查看 `%LOCALAPPDATA%\Syno\logs\syno-runtime-YYYY-MM-DD.jsonl` 的最新脱敏事件。
2. 查看 Provider/渠道状态页，不读取或回显 secret。
3. 查看 Job 状态、事件和脱敏错误码。
4. 运行配置、契约和仓库验证。
5. 运行针对性测试后再跑完整测试。
6. 生成 `BugReport` 或 `ImprovementProposal`；不要让 Agent 修改源码绕过故障。

收录工作流终态审计（只读，不改任何状态）：

```powershell
pnpm audit:ingest            # 按 错误码 × retryable × fetchMethod 聚类
pnpm audit:ingest --all      # 展开单条样例，含候选/方案/Job 引用
```

`HARNESS_ATTEMPTS_EXHAUSTED` / `HARNESS_ABORT_UNKNOWN` / `HARNESS_NOT_RUNNING` /
`PROVIDER_RATE_LIMITED`（以及历史 `OPENCODE_*` 记录）已改成**降级而非终态**：模型不可用时保留 propose 已产出的基础方案，
把「远程语义分析未完成，请人工确认」写进 unresolved，经 onProposed 转入
`awaiting_decision` 回主人手工决定，不再把整个收录流程锁进 `failed_terminal`。
这类 workflow 仍在 `listPending` 可见、可 approve/reject，不发 `workflow.failed`。
只有非模型类错误（契约校验、浏览器捕获、远程内容安全检查等）才照旧走 failed/terminal。

注意：模型能力错误**一次失败即降级**，不经过 coordinator 级 60s 重试——Harness
运行时已先对模型链做过多轮 fallback，到达协调器时通常已确认耗尽；立即回到主人
决策可避免重复消耗整条模型链。若需要为瞬时抖动保留少量重试缓冲，可在此处调整。

当来源正文被 CSS 噪声污染时，`fetchSourceText` 会抛「来源正文疑似 CSS 噪声，低质量」，
命中 `empty_or_low_quality` 的浏览器兜底（`fetchMethod=kimi_webbridge`），不再把样式表收进笔记。
浏览器兜底返回的正文同样过噪声门（`applyBrowserSnapshot` 二次检查），双重防护。

运行日志按天写入 JSONL，默认保留 14 天，覆盖 Syno 初始化、Harness
配置/进程/健康/退出、渠道启动，以及消息的附件、决策、收录和 Runtime
阶段。日志只记录渠道、消息 ID、Artifact/Job/Run ID、状态和脱敏错误，不保存
主人对话正文；`Token`、`Authorization`、Cookie、密码、API Key 和带凭据 URL
会在落盘前递归脱敏。

查看当天最后 80 条：

```powershell
$log = Get-ChildItem "$env:LOCALAPPDATA\Syno\logs\syno-runtime-*.jsonl" |
  Sort-Object LastWriteTime |
  Select-Object -Last 1
Get-Content -LiteralPath $log.FullName -Tail 80
```

渠道健康 probe 可以在 Host 运行时直接执行。它优先读取 `http://127.0.0.1:<PORT>/api/syno/channels` 的脱敏状态，返回 `source: running_worker`（历史字段名，表示本机 Host 渠道进程在线）；仅在本机服务不可达时才启动独立 Adapter。这样不会与微信进程锁竞争，也不会为飞书重复建立长连接。

### zh-CN 主机的 PowerShell/子进程编码陷阱

本机 zh-CN 系统 ACP=936（GBK）。任何 `spawn("powershell.exe" / python / ...)` 后经 `[Console]::In`/`[Console]::Out` 或默认 stdio 文本层往返非 ASCII（中文、emoji）payload 时，PowerShell/Python 的默认编码是 GBK，**双向**都会把 UTF-8 字节转码损坏，且只在下游 `JSON.parse` 抛 `SyntaxError` 时才暴露（静默无报错）。

根治约束：**只让 Base64（7-bit ASCII，所有常见代码页的公共子集）跨过 console/stdio 边界**——Node 侧 `Buffer.from(x,"utf8").toString("base64")` 写入 stdin，脚本内只用 `FromBase64String/ToBase64String`（Python 侧用 `io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")` 或注入 `PYTHONUTF8=1`），绝不调 `UTF8.GetString/GetBytes` 或依赖默认编码。`runDpapi`（`provider-credential-store.mjs`）与 Harness JSON-RPC sidecar 均遵循此约束；新增任何跨进程文本往返必须沿用，否则中文路径会静默损坏。

### DeepSeek Harness 生产 chat（2026-08-21）

产品 chat 已倒转：Web 是 DSH 壳，Syno 是 Cordis 插件 + 8888 控制面。改启动、协议或 permission 前先读本节；不要再起 jsonrpc chat sidecar，也不要把 `dsh web` 当成生产。

**进程与端口**

- `http://127.0.0.1:8888`：Syno Host 控制面（凭据、渠道、Policy、`GET /api/syno/harness`）。
- `http://127.0.0.1:3088`（`SYNO_DSH_WEB_PORT`）：受控 DSH Web，与微信同一 Harness Session。这是特权壳（`approval: never`），不是 8888 的聊天 UI。能打开该 origin 的本机进程等于该 session 的代理。
- 收录分析仍是第二进程 jsonrpc（`syno-capture.cordis.yml`，无 bash/fs/web）。禁止 jsonrpc chat 与生产 DSH Web 同时写同一 session。紧急回切：`$env:SYNO_DSH_CHAT_SURFACE = "jsonrpc"`。

**实际 argv（不要抄错）**

Host 监督的是 **syno profile 上的 Web 表面**，不是 launcher 的 `web` 子命令：

```text
node …/tsx …/apps/cli/src/bin.ts --profile syno --host 127.0.0.1 --port 3088 --no-open
```

- `dsh web` = `--profile web`，会启动库存 `web` profile，**不是**生产 `syno`。
- `dsh --profile syno web` 里的 `web` 会变成 syno profile 的内部参数，不要当启动方式。
- 手工 `dsh --profile syno` 若没有 Host 注入的 `SYNO_BRIDGE_ORIGIN` / `SYNO_BRIDGE_TOKEN`，`@syno/dsh-plugin` 会直接拒绝加载。

**本机 clone 必须构建**

`SYNO_DSH_ROOT` 指向的 `deepseek-harness` checkout 需要：

```powershell
cd $env:SYNO_DSH_ROOT
pnpm install
pnpm run build
```

只 `pnpm install` 不够。CLI 可用 tsx 跑源码，但 typert 与 `dsh.client` 包的 `exports` 指向 `lib/*.js`。未 build 时典型失败：`Cannot find module …/typert.host.js`、`MissingClientBundleError`、从 `%LOCALAPPDATA%\Syno\harness\home\profiles\node_modules` 解析到空 `lib/`。

`pnpm harness:doctor` 目前只要看到 clone 的 `node_modules` + CLI 源码就会把 chat-web 标成 bootable，**不能**当作 DSH Web 已能启动。

Windows 计划任务 `start-syno.ps1` **不会**写入 `SYNO_DSH_ROOT`。用户/机器环境变量里没有它时，`pnpm windows:restart` 起的 Host 会 `waiting_provider`。`pnpm start` 必须在该进程环境里设置。

**事件通道是 WebSocket，不是 SSE**

现网 `client-connection` 对 `GET /api/events.host` 与 `/api/events.mux` 返回 **426 Upgrade Required**。Host 客户端（`apps/syno/syno/deepseek-harness-web-client.mjs`）必须用 `ws://127.0.0.1:3088/api/events.*`。不要把 SSE GET 加回去；假服务器应对 GET 回 426、对 upgrade 推 `server-request` JSON 文本帧。

**permission 表只准一档**

`workspace-write` + `approval: never` 不是 DSH 库存 preset（库存 `workspace-write` 是 `ask`）。必须在 `packages/syno-dsh-plugin/cordis.patch.yml` 里显式 `defaultPreset: workspace-write`，且 `presets` **只**含这一条（`sandbox: workspace-write` + `approval: never`）。缺省时 boot 报：`composed sandbox and approval defaults match no preset`。

禁止再往生产表加 `danger-full-access` 或 `read-only`/`ask`。`/permission` UI 与 `/permission <name>` 会按表切换：全盘访问会离开 `DSH_CWD`，绕过 `syno_*` + Policy + GitGuard；`ask` 会让微信回合卡在没有审批 UI 的地方。`tests/syno-dsh-profile.test.mjs` 锁住生产 patch 不含 `sandbox: danger-full-access`。

沙箱根是 `%LOCALAPPDATA%\Syno\harness\workspace\chat`，**不是** git 仓库根。

**Profile 由 Host 生成**

`ensureSynoDshProfiles` 每次 chat 启动会重写 `%LOCALAPPDATA%\Syno\harness\home\profiles\syno\` 的 manifest / `cordis.patch.yml`，生成 Host 管理的 `.agent-presets\syno\agent.cordis.yml`，并把 `@syno/dsh-plugin` junction 进 profile `node_modules`。生产 Web Supervisor 在 `session.create` 显式传 `agentPreset: syno`；不要依赖可被 DSH 用户设置覆盖的默认 preset。按当前 Harness checkout 的 manifest，生产 profile 固定 `@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app` 和 `@syno/dsh-plugin`；base 提供 token meter/session，受控 Web preset 提供官方 compaction、tool-result-pruner 和 compact command，`@deepseek-ai/dsh-schedule` 作为官方 function plugin 由 Syno bundle patch 挂载。JSON-RPC chat 同样显式挂载 token-meter、tool-result-pruner、compaction-basic 和 command-compact。若当前 `SYNO_DSH_ROOT` 缺少这些官方包或 schedule 无法解析，启动应失败并报告安装问题，不回退到 Syno 自研上下文链路。不要对生产 `syno` 跑 `dsh plugin add`。

实验只用 `syno-lab`。Host 重建 lab manifest 时会保留 DSH CLI 已安装的 bundle/dependency，并剔除 `@syno/dsh-plugin`，因此不会因生产 Host 重启而丢失实验插件。按 DSH profile 机制安装并锁定 Mnemon：

```powershell
dsh plugin --profile syno-lab add dsh-mnemon@0.2.13
```

`dsh-mnemon` 仅用于隔离实验；Windows Mnemon Native 版本至少 `0.2.3`，外部 Memory Provider 必须全部关闭，只使用 Runtime Memory、Documents 与本地 Native。不要把 `vault/` 或 `ops/` 映射为 Mnemon 可写目录，不要放入 Token、Cookie、私钥或原始敏感日志。上游当前没有确定性密钥扫描器；Mnemon 数据不等于 Syno canonical fact。缺少 Native 时，lab 应保持可启动并显示明确降级状态，但不得把插件标记为生产可用。

改完 plugin YAML、profile bundle 或实验插件版本后必须重启 Host（8888 与 3088），正在跑的 DSH 进程不会热加载 preset。生产推广 Mnemon 需要固定版本/构建产物、数据边界验证、独立安全审查和显式政策批准。

**识图在 Host**

微信图片默认 `syno_image_read` → Zen HTTP `mimo-v2.5-free`；Zen key 留在 Host，不进 Harness 子进程。PDF/文本仍收录。明确「收录」才把识图 JSON 当 `kind: text` Intake。

### Windows 飞书日历 CLI

当前验收锁定官方 `@larksuite/cli` 1.0.72：

```powershell
npx @larksuite/cli@1.0.72 install
lark-cli version
```

不要安装不存在的 `@larksuite/lark-cli` 包。若服务进程早于 CLI 安装启动，重启 Syno；它会检查 `LARK_CLI_PATH`、与当前 `node.exe` 同目录的包装器以及常见 npm/pnpm 全局目录。仍可显式把 `LARK_CLI_PATH` 指向 `lark-cli.ps1` 或 `lark-cli.cmd`。Syno 将 npm 包装器解析到官方 Node 入口，避免直接 spawn `.ps1` 的 `EFTYPE` 错误。用户日历仍需 `lark-cli auth login --domain calendar` 授权，消息 App 扫码不能替代日历 user 授权。

## 发布和切换

- 发布前逐项执行 `docs/CUTOVER-CHECKLIST.md`，结果写入 `docs/FINAL-ACCEPTANCE.md`。
- 任何真实 Provider、微信或飞书门槛未通过时，只能继续本地隔离运行，不得宣称完成最终切换。
- 已知限制统一维护在 `docs/KNOWN-LIMITATIONS.md`；修复后必须附对应测试或真实验收证据再移除。

## 主人实测验收

Codex 完成 `docs/TODO-EXECUTION-PLAN.md` 的 P1–P3，并明确交付“自动门禁通过”证据后，再由主人执行本节。自动测试未通过时不要开始真实数据验收。

### 当前交付状态（2026-07-28）

- P1 收录自动封闭：完成。Outbox 租约/幂等、来源适配、DLP、规则 supersede、回执与拒绝恢复均已测试。
- P2 三轴复审：完成。Standards、Spec、Security 最终均为 P0 0、P1 0。
- P3 自动门禁：主工作树 Node 433/433、vault pytest 57/57、Repository verify 1382 files、`git diff --check` 通过；fresh clone Node 433/433、vault 57/57、Repository verify 1378 files 通过。
- 本轮未把真实浏览器页面、真实免费模型、Windows Task Scheduler 登录恢复、微信/飞书设备行为写成已通过。Playwright CLI/4329 本地页面受到当前 Codex 浏览器安全策略拒绝，真实页面验收移交主人 P4。Windows 任务的真实安装、状态与受控重启已有证据，但下次登录冷启动仍需主人确认。
- 当前工作树未提交；主人两项知识变更未被覆盖、未暂存；未 Push。

启动与诊断：

```powershell
pnpm harness:doctor
pnpm start
pnpm harness:status
pnpm windows:status
```

产品只走 DeepSeek Harness。启动前必须设置 `SYNO_DSH_ROOT` 为本机 `deepseek-harness` 克隆的绝对路径；未设置时 sidecar 拒绝启动。

```powershell
$env:SYNO_DSH_ROOT = "<absolute-path-to-deepseek-harness>"
pnpm harness:doctor
pnpm start
```

Clone 还要在 `$env:SYNO_DSH_ROOT` 里 `pnpm run build`，否则 8888 会起来但 3088 起不来。完整踩坑见上文「DeepSeek Harness 生产 chat」。

`harness:doctor` 不把密钥写进输出。协议冒烟用 `pnpm probe:harness`（假 sidecar + 中文 UTF-8）；`pnpm probe:harness -- --real` 只验证真实 Harness 构建产物可发现，完整 sidecar / Tool Bridge 由 Host 启动验收，不在探针中执行模型调用。

生产 chat 由 Host 监督 `dsh --profile syno --host 127.0.0.1 --port 3088 --no-open`（可用 `SYNO_DSH_WEB_PORT` 覆盖），与微信注入同一 Harness Session。Host 会把 `@syno/dsh-plugin` junction/symlink 进 `%LOCALAPPDATA%\Syno\harness\home\profiles\syno\node_modules`，不必再跑 `dsh plugin install`。该对话页是特权壳（`approval: never`，permission 表只有 `workspace-write`），不是普通聊天 UI。普通聊天只显示 Bridge core 工具：`workflow.context`、`knowledge.search`、`knowledge.read_snippet`、`today.read`、`capture.start`、`capture.status`、`capture.list_pending`、`jobs.list`、`jobs.submit`、`image.read`；隐藏工具的直接调用仍由 Host 拒绝。Capture Session 继续使用 Workflow 签发的浏览器 allowlist。`http://127.0.0.1:8888` 是控制面。收录分析仍是无 bash/fs/web 的 jsonrpc 第二进程。自动测试 / `SYNO_DSH_FAKE_AGENT` 仍走 jsonrpc fake。紧急回切 chat jsonrpc：`$env:SYNO_DSH_CHAT_SURFACE = "jsonrpc"`。不要把 jsonrpc sidecar 与生产 DSH Web 同时接到同一 session。不要执行 `dsh web`（那是库存 `--profile web`）。

Chat 的 `web_search` 走官方 `@deepseek-ai/dsh-web-search-deepseek`（复用已注入的 `DEEPSEEK_API_KEY`）；Web session 使用 Host 生成并显式绑定的 `syno` agent preset，compaction 与普通 schedule 由当前生产 profile 的官方 DSH 层接管（Web preset 使用官方 compaction-basic/tool-result-pruner/compact command，JSON-RPC 使用同一 stack，普通 schedule 由 `@deepseek-ai/dsh-schedule` function plugin 提供），Syno 的 SignalEngine / PriorityEngine / ChannelDeliveryOutbox 仍负责业务主动运营，不与普通 schedule 混用。不要对生产 `syno` profile 执行 `dsh plugin add`，也不要从 [dsh-plugin.org](https://dsh-plugin.org/plugins?q=search) 装社区搜索或记忆插件；实验 UI 只用 Host 生成的 `syno-lab` profile（无 Bridge、无 vault 写、无微信）。收录分析 profile 仍然没有 web。

微信图片默认走聊天识图（Host `syno_image_read` → Zen HTTP `mimo-v2.5-free`）；PDF/文本附件仍收录。明确说「收录」时，识图 JSON 作为 `kind: text` 进入现有 Intake / Proposal。本地知识搜索仍是 `syno_knowledge_search`。识图失败对微信可见，禁止猜图。

主人验收清单：

1. 微信发送一个 Markdown 文件，飞书发送一个 PDF，再发送一个纯 URL。
2. 分别发送“帮我收录这个 URL”和一次带“仅本地”的内容。
3. 查询“刚才的文件怎么样了”和“待我确认的收录”，确认不依赖模型也能返回持久状态。
4. 修改一次 Proposal，完成三次明确写入自动执行和一次冲突澄清。
5. 在 Proposal 生成前重启服务；另一次在 PendingDecision 形成后重启，确认状态和待决策项仍可恢复。
6. 从微信发起，在飞书查询或确认，验证同一 Owner 的跨渠道连续性。
7. 累计完成 30 条跨渠道消息、10 组多轮追问和 5 次 ToolRegistry 调用。
8. 对已收录知识做一次 teach-back，确认“已收录”不会自动提高掌握度，只有主人证据会推进学习状态。
9. 已执行真实 Windows 任务安装、状态和受控重启；仍需在下次登录后确认 Syno Host、Harness sidecar 和未完成 Workflow 共同恢复。

每项至少记录：

```text
时间：
渠道：
输入类型：
Artifact / Workflow / Job ID：
期望结果：
实际结果：
是否通过：
相关日志 event：
截图或补充：
```

任一失败项都应保留 ID 与日志，回到自动修复阶段；不要重复写入或重复触发澄清、手工改 vault 或删除失败状态来制造通过结果。全部通过并由主人明确确认后，才允许规划 R6 清理旧运行时。
