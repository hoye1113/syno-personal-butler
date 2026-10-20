# Syno 本地运维、备份与恢复

当前口径：2026-10-20。日常入口为飞书私聊，8888 仅提供白名单控制 API（根路径 404），3088 为需启动令牌认证的受控 DSH 会话面。当前能力与验证限制见 [README](../README.md)、[已知限制](KNOWN-LIMITATIONS.md) 和 [P1 验收](KNOWLEDGE-FEISHU-P1.md)。下文带历史日期的验收不覆盖当前版本。

## 状态分层

- 单仓（本仓）：Git 同时跟踪 `contracts/`、`config/`、应用源码、脚本、文档、`vault/` 和 `ops/`——长期知识与全部运行记录共用一个事实源和远端。
- 本地可重建：`.runtime/` 的索引、锁、队列快照和临时状态。
- 本地敏感：`PATHS.localDataRoot/credentials` 的受保护凭据；Windows 为 DPAPI，macOS 为登录钥匙串主密钥＋AES-256-GCM 信封，严禁复制到仓库、日志或工单。`PATHS.localDataRoot` 由 `SYNO_LOCAL_DATA` 或平台默认值解析；下文 Windows 路径示例不代表 macOS 路径。
- 本地持久：对话、等待重试的 Job、未完成摄取状态。清理前先停 Syno Host 并备份。

## 知识库单仓运行与回滚（2026-10-20 更新）

- 本仓同时管理 `vault/`、`ops/`、产品代码、配置和文档。生产必须不设置 `SYNO_KNOWLEDGE_ROOT`；该变量只留为回滚兼容入口，不是推荐部署方式。
- 知识读写、Job／Proposal／事件和产品提交均在本仓，Job 使用 `.worktrees/` 隔离及精确路径 Git 校验；开发分支不应作为产品写入目标。
- 外部 `syno-knowledge` 冻结副本、原 Obsidian 独立目录和旧路径 junction 已清理，不再执行恢复这些路径的旧 runbook。
- 回滚先保存未提交内容和执行状态，再使用本仓 Git 历史及已核验备份恢复。源码／合并回滚与服务停止／重启仅由主人授权的开发／运维流程执行，不使用 `git reset --hard` 或强制推送丢弃用户数据。

## 备份

1. 停止 Syno Host（Windows 任务或 `pnpm start` 进程），确认没有 `running` Job。
2. 记录当前 Git commit 和 `git status --short`；未跟踪的用户资料不得遗漏。
3. 备份知识仓库（`vault/`、`ops/` 全量或 `git bundle create --all`）与代码仓配置文档。
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

- 源码回滚只由开发 Agent 在独立开发流程执行；Syno 本身无源码修改能力。
- 回滚前保存未提交差异，不使用 `git reset --hard` 丢弃用户修改。
- 数据契约升级必须先备份，再运行迁移；迁移失败时保持旧数据不变并输出报告。
- 恢复命令 `pnpm state:archive -- restore <绝对归档目录>` 只接受空的状态目标，拒绝覆盖现有状态；先验证清单再复制。
- Provider 故障不回滚本地事实：Job 留在 `waiting_provider`，恢复连接后精确重试。
- 渠道故障不删除本地知识、待办或待决策项；认证 DSH Web 的可用性需单独检查。自然语言业务依赖模型和受控工具，不承诺 Provider 故障时有固定口令兜底或主动提醒。

## 保留与清理

- 会话绑定与终态加密载荷保留 30 天，已验证终态恢复 journal 保留 90 天；未完成／未知效果不得因终态保留策略被清理。
- 未完成任务保留到 completed/failed/rejected/canceled 等终态。
- 删除缓存前验证目标是仓库 `.runtime/` 或明确的 Syno 本地目录，不对宽泛路径递归操作。
- `.pnpm-store/` 是安装缓存，删除需要按仓库受控执行规则提供精确目标和影响预览。
- 工作流 outbox 的终态记录（`delivered`/`failed_terminal`）由 `retain()` 按小时节流、超 14 天自动淘汰，目录不再单调膨胀（drain 时 best-effort，不阻塞投递）。
- 收录重复 URL 不会重新调用模型或创建活动 Workflow：渠道直接返回已有收录编号和当前状态。工作流结果回执与聊天回复分开处理；2026-10-17 起不再有聊天受理记录的崩溃补发。终态 URL 仍允许新的来源检查，因此主人可以主动重新收录。
- 质量拒收通知入队成功后，Workflow 进入 `rejected` 终态，清除 `pendingAction`、`nextRetryAt` 和 `lastError`；Host 重启恢复不会再次触发质量分析或重复生成拒收通知。
- Workflow Outbox 的 `delivered` 只表示渠道 Provider 接受了 at-least-once 投递请求，不代表主人已经阅读。飞书工作流回执使用该请求绑定的 `deliveryTarget`（`chatId` 必需，`replyTo` 可选），目标缺失走有界可重试路径，耗尽后记录脱敏终态事件。旧 `OwnerChannelTargetStore` 已随主动投递设施删除。
- 飞书没有 typing API：收到主人私聊后先发一条可原位更新的「⏳ Syno 正在回复中…」卡片（引用原消息），答复就绪后用 `im.v1.message.patch`（`channel.updateCard`）把同一条卡片更新为最终答复；更新失败则收回占位卡并退回普通发送，占位发送失败不阻断正常回复；模型处理异常时收回占位卡；旧 v2 ack／崩溃补发路径已删除。默认开启，`SYNO_FEISHU_TYPING=0|false` 可关。
- 系统性「静默无限重试/停滞」bug 类已由 P1–P4 + 收尾复审 R1–R3（commit `8ce4cb3`）根治：凡是 `loop / retry / 定时 drain / setInterval tick` 的回调内 uncaught throw 被外层归默认 retryable、又无终态升级、再加过宽 `.catch(()=>{})` 吞错，就会不抛错不告警地永远重试或永远不推进。**改动任何重试/循环路径必须保留三件套**：终态出口（`failed_terminal`）、maxAttempts 上限（惯例 8）、可观测回调（`recordEvent`，不得 `.catch(()=>{})` 吞）；且 maxAttempts cap 必须放在 `send()`/调用**之前**（事后 cap 在 send 抛错时结构性不可达，R3）。诊断事件：`INGEST_PREPARE_EXHAUSTED`（收录 prepare 重试耗尽）、`WORKFLOW_DELIVERY_EXHAUSTED`（投递耗尽转终态）。这些只在真实故障时出现，正常启动不应刷屏。

## 故障检查顺序

1. 查看 `%LOCALAPPDATA%\Syno\logs\syno-runtime-YYYY-MM-DD.jsonl` 的最新脱敏事件。
2. 查询 `/api/syno/readiness`、`/api/syno/channels` 和 `/api/syno/harness` 的安全状态字段；8888 没有旧状态页，不读取或回显 secret。
3. 查看 Job 状态、事件和脱敏错误码。
4. 运行配置、契约和仓库验证。
5. 运行针对性测试后再跑完整测试。
6. 生成 `BugReport` 或 `ImprovementProposal`；不要让 Agent 修改源码绕过故障。

Windows 计划任务（launcher）监督日志在 `%LOCALAPPDATA%\Syno\logs\windows-task-YYYY-MM-DD.jsonl`（保留 14 天），事件包括 `launcher.started`、`host_started`、`host_crashed`（含 `exitCode` 与 `uptimeSeconds`）、`adopted`、`health_ok`、`crash_loop`。Host 连续 3 次在启动后 60 秒内崩溃时，launcher 追加 `launcher.crash_loop` 事件并在桌面弹出 120 秒自动关闭的告警弹窗；弹窗投递失败（`popupDelivered=false`）不中断 60 秒退避重启循环，告警最多每小时重复一次，Host 一次正常存活 ≥60 秒即重置计数。排查启动崩溃循环时先看 `host_crashed` 的 `exitCode`/`uptimeSeconds`，再查 vault 数据与契约状态（历史案例：坏 frontmatter 击穿启动校验导致每 62 秒一崩的循环）。

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

模型能力错误在已有基础方案时降级回主人决策；分析契约错误 `CAPTURE_INVALID_CONTRACT` 先按持久 `nextRetryAt` 在五秒后快重试一次，第二次仍无效才降级。其他可重试失败遵守原期限和次数上限；Host 恢复轮询为六十秒。受控收录／发布的重试计时器仍存在，与已删除的主动推送调度不同。

当来源正文被 CSS 噪声污染时，`fetchSourceText` 会抛「来源正文疑似 CSS 噪声，低质量」，
命中 `empty_or_low_quality` 的浏览器兜底（`fetchMethod=bsk`），不再把样式表收进笔记。
浏览器兜底返回的正文同样过噪声门（`applyBrowserSnapshot` 二次检查），双重防护。

BSK 由 Host 环境中的持久守护进程和浏览器扩展提供。Syno 只探测它们，不在单次任务中安装、启动或重启。
每次读取使用 `bsk session start --no-focus` 创建后台 Agent Window，复用已连接浏览器的既有登录态，但不借用普通用户标签页；任务结束后立即停止 Session。
生产环境应让 BSK daemon 随登录长期运行，并在扩展 Automation 设置中关闭人工求助。若页面仍要求登录、验证码或人机验证，Syno 仅做一次有界重试，随后记录 `BROWSER_BLOCKED_UNATTENDED` 并关闭窗口，不等待主人回复。

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

渠道健康 probe 可以在 Host 运行时直接执行。它优先读取 `http://127.0.0.1:<PORT>/api/syno/channels` 的脱敏状态，返回 `source: running_worker`（历史字段名，表示本机 Host 渠道进程在线）；仅在本机服务不可达时才启动独立 Adapter。这样不会重复建立飞书长连接，也不会与 Host 内的渠道进程争锁。

### zh-CN 主机的 PowerShell/子进程编码陷阱

本机 zh-CN 系统 ACP=936（GBK）。任何 `spawn("powershell.exe" / python / ...)` 后经 `[Console]::In`/`[Console]::Out` 或默认 stdio 文本层往返非 ASCII（中文、emoji）payload 时，PowerShell/Python 的默认编码是 GBK，**双向**都会把 UTF-8 字节转码损坏，且只在下游 `JSON.parse` 抛 `SyntaxError` 时才暴露（静默无报错）。

根治约束：**只让 Base64（7-bit ASCII，所有常见代码页的公共子集）跨过 console/stdio 边界**——Node 侧 `Buffer.from(x,"utf8").toString("base64")` 写入 stdin，脚本内只用 `FromBase64String/ToBase64String`（Python 侧用 `io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")` 或注入 `PYTHONUTF8=1`），绝不调 `UTF8.GetString/GetBytes` 或依赖默认编码。`runDpapi`（`provider-credential-store.mjs`）与 Harness JSON-RPC sidecar 均遵循此约束；新增任何跨进程文本往返必须沿用，否则中文路径会静默损坏。

### 会话控制与自然语言业务（2026-10-20）

只有 `/new`（新会话）与 `/stop`（紧急停止）绕过模型。`今天有什么`、`记住…`、收录、待办和确认／拒绝等自然语言由模型在当前 loop 中调用业务工具处理，不再有固定中文业务口令。

聊天面为 25 个业务工具＋受控知识三件套＋`web_search`＋`skill`。知识读取默认走 capabilities 插件，业务操作始终走认证 Bridge；`SYNO_CHAT_TOOLS=bridge` 回滚面使用同一 core 名单。`work.overview` 查询待办、待决策项、收录与后台 Job，不调用每日 planner；记忆确认及删除／合并必须使用准确 ID、版本和后续真实 Owner 消息。

`received/queued` 不等于入库，Job 完成不等于云端完成。当前收录摘要仍会误报“云端发布未启用”，须结合 `sync` 或 `knowledge.sync_status`，详见 [已知限制](KNOWN-LIMITATIONS.md)。

### 通道（2026-10-16）

- 当前只有飞书一条通道（`feishu`）：微信 iLink 客户端、DSH `channel-weixin` 插件、`/api/syno/weixin/*` 端点与 `/maintenance/weixin` 重绑页已随「只用飞书」一并删除。
- 通道默认 home 取注册到的通道（多通道时优先飞书）；系统不发主动消息。
- 飞书入站附件：图片/文件走官方资源接口下载到 `.runtime/quarantine/feishu`（isolated/autoRead 同规约）→ 图片直传模型，文件仅提供临时附件引用及正文，不自动收录；下载上限 25MB，具体 Intake 格式有更小限制，超限或格式无法识别时如实拒绝。

### DeepSeek Harness 生产 chat（2026-08-21）

产品 chat 已倒转：Web 是 DSH 壳，Syno 是 Cordis 插件 + 8888 控制面。改启动、协议或 permission 前先读本节；不要再起 jsonrpc chat sidecar，也不要把 `dsh web` 当成生产。

**进程与端口**

- `http://127.0.0.1:8888`：Syno Host 白名单控制 API（health/readiness、Harness、channels、settings、Bridge、publishing），根路径返回 404，没有旧工作台。
- `http://127.0.0.1:3088`（`SYNO_DSH_WEB_PORT`）：受控 DSH Web，与生产 chat 同一 Harness Session。这是特权壳（`approval: never`），不是 8888 的聊天 UI。能打开该 origin 的本机进程等于该 session 的代理。
- 收录分析仍是第二进程 JSON-RPC sidecar（`dsh --profile sdk-minimal --patch syno-capture.cordis.yml`）：Syno overlay 关闭两个持久 shell 工具，不挂载 filesystem/web 工具，只插入 Syno Bridge。JSON-RPC 聊天回退使用官方 `sdk` profile 和 `syno-chat.cordis.yml`。禁止 JSON-RPC chat 与生产 DSH Web 同时写同一 session。紧急回切：`$env:SYNO_DSH_CHAT_SURFACE = "jsonrpc"`。

**实际 argv（不要抄错）**

Host 监督的是 **syno profile 上的 Web 表面**，不是 launcher 的 `web` 子命令：

```text
node …/tsx …/apps/cli/src/bin.ts --profile syno --host 127.0.0.1 --port 3088 --no-open
```

- `dsh web` = `--profile web`，会启动库存 `web` profile，**不是**生产 `syno`。
- `dsh --profile syno web` 里的 `web` 会变成 syno profile 的内部参数，不要当启动方式。
- 手工 `dsh --profile syno` 若没有 Host 注入的 `SYNO_BRIDGE_ORIGIN` / `SYNO_BRIDGE_TOKEN`，`@syno/dsh-plugin` 会直接拒绝加载。

**Harness 根必须构建（子模块或外部克隆）**

DSH 根缺省是本仓 Git Submodule `vendor/deepseek-harness`；也可是 `SYNO_DSH_ROOT` 指向的外部 checkout。无论哪种，都必须：

```powershell
cd vendor\deepseek-harness   # 或 cd $env:SYNO_DSH_ROOT
pnpm install
pnpm run build
```

只 `pnpm install` 不够。CLI 可用 tsx 跑源码，但 typert 与 `dsh.client` 包的 `exports` 指向 `lib/*.js`。未 build 时典型失败：`Cannot find module …/typert.host.js`、`MissingClientBundleError`、从 `%LOCALAPPDATA%\Syno\harness\home\profiles\node_modules` 解析到空 `lib/`。

`pnpm harness:doctor` 检查 DSH CLI、官方 `sdk` / `sdk-minimal` profile bundle 和 JSON-RPC server runtime closure，并返回 `runtimeClosure.ok/cliEntry/required/missing/source`；closure 不完整时返回 `HARNESS_RUNTIME_CLOSURE_UNAVAILABLE`，不会仅凭 `node_modules` 报告 sidecar 可启动。doctor 仍不能代替真实 sidecar 初始化、模型回合或 Owner 真机验收。

旧版曾通过 `packages/examples/jsonrpc-demo/src/runner.ts` 启动 sidecar；该 demo runner 已从 DSH 0.1.7 移除。当前 Supervisor 直接运行已构建的 `apps/cli/lib/bin.js`，capture 使用官方 `sdk-minimal`，JSON-RPC chat 回退使用官方 `sdk`。不得恢复 demo runner 或退回旧 Agent；缺少 CLI、bundle 或 server runtime entry 时，确定性返回 `HARNESS_RUNTIME_CLOSURE_UNAVAILABLE`。

Windows 计划任务 `start-syno.ps1` **不会**写入 `SYNO_DSH_ROOT`。未设置用户/机器环境变量时，Host 缺省使用本仓子模块 `vendor/deepseek-harness`；若要用外部克隆，须在用户级环境变量设置 `SYNO_DSH_ROOT`（且该克隆已 build），否则 `pnpm windows:restart` 起的 Host 会在起模型前就缺少可用的 Harness 根。

**事件通道是 WebSocket mux，不是 SSE（0.1.7 起需先换 cookie）**

0.1.7 起 `dsh web` 强制浏览器令牌认证：启动横幅打印 `dsh web: http://127.0.0.1:<port>/?token=<一次性进程令牌>`，Supervisor 解析令牌后由客户端 `GET /?token=...`（303 + `set-cookie`）换回会话 cookie，所有 `POST /api/*` 与 mux upgrade 都必须携带。无 cookie 一律 401（生产实证 `session.list HTTP 401` 即缺 cookie）。

现网事件面是单条 `ws://127.0.0.1:3088/api/remote.mux`：客户端发 `{type:"open", streamId, endpoint, payload:{args}}` 开逻辑流，服务端回 `{type:"item"|"end"|"error", streamId, value?}`。会话事件走每会话一条的 `session/follow` 逻辑流（首帧 `snapshot` 之后按 seq 追加 `{type:"event", event}` 项）；`snapshot.records` 是历史回放，不得当 live 事件消费。一元 RPC 端点从 `session.prompt` 点号式改为 `session/prompt` 两段式，payload 包一层 `{args:{request:{...}}}`（`session/list` 的形参名是 `_request`）。GET 升级路径仍回 426；不要把 SSE GET 加回去。旧版 `/api/events.host`、`/api/events.mux` 与 `server-request` 信封在 0.1.7 已删除。

**permission 表只准一档**

`workspace-write` + `approval: never` 不是 DSH 库存 preset（库存 `workspace-write` 是 `ask`）。必须在 `packages/syno-dsh-plugin/cordis.patch.yml` 里显式 `defaultPreset: workspace-write`，且 `presets` **只**含这一条（`sandbox: workspace-write` + `approval: never`）。缺省时 boot 报：`composed sandbox and approval defaults match no preset`。

禁止再往生产表加 `danger-full-access` 或 `read-only`/`ask`。`/permission` UI 与 `/permission <name>` 会按表切换：全盘访问会离开 `DSH_CWD`，绕过 `syno_*` + Policy + GitGuard；`ask` 会让聊天回合卡在没有审批 UI 的地方。`tests/syno-dsh-profile.test.mjs` 锁住生产 patch 不含 `sandbox: danger-full-access`。

沙箱根是 `%LOCALAPPDATA%\Syno\harness\workspace\chat`，**不是** git 仓库根。

**Profile 由 Host 生成**

`ensureSynoDshProfiles` 每次 chat 启动会重写 `%LOCALAPPDATA%\Syno\harness\home\profiles\syno\` 的 manifest / `cordis.patch.yml`，并把 `@syno/dsh-plugin` junction 进 profile `node_modules`。`syno` Agent preset 作为 `preset-syno` 声明在 `@syno/dsh-plugin` bundle patch 中；当前 DSH 不再扫描 `$DSH_HOME/.agent-presets`。生产 Web Supervisor 在 `session.create` 显式传 `agentPreset: syno`；不要依赖可被 DSH 用户设置覆盖的默认 preset。按当前 Harness checkout 的 manifest，生产 profile 固定 `@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app` 和 `@syno/dsh-plugin`；base 提供 token meter/session，受控 Web preset 提供官方 compaction、tool-result-pruner 和 compact command，`@deepseek-ai/dsh-schedule` 声明在 bundle patch 中但已 disabled，不开放会话内调度。JSON-RPC chat 同样显式挂载 token-meter、tool-result-pruner、compaction-basic 和 command-compact。若当前 `SYNO_DSH_ROOT` 缺少这些官方包或构建 closure 不完整，启动应失败并报告安装问题，不回退到 Syno 自研上下文链路。不要对生产 `syno` 跑 `dsh plugin add`。

Syno 插件实现位于 linked root `packages/syno-dsh-plugin/` 内：官方包不安装、不 vendoring，由该包 `peerDependencies` 加 DSH 运行时拦截按 realpath 解析；插件内对 `packages/syno-core/` 的导入也是相对路径。不要给 DSH 子进程加 `--preserve-symlinks` 或把插件改为复制安装——两者都会让插件内的相对导入与 peer 投影失效。

实验只用 `syno-lab`。Host 重建 lab manifest 时会保留 DSH CLI 已安装的 bundle/dependency，并剔除 `@syno/dsh-plugin`，因此不会因生产 Host 重启而丢失实验插件。按 DSH profile 机制安装并锁定 Mnemon：

```powershell
dsh plugin --profile syno-lab add dsh-mnemon@0.2.13
```

`dsh-mnemon` 仅用于隔离实验；Windows Mnemon Native 版本至少 `0.2.3`，外部 Memory Provider 必须全部关闭，只使用 Runtime Memory、Documents 与本地 Native。不要把 `vault/` 或 `ops/` 映射为 Mnemon 可写目录，不要放入 Token、Cookie、私钥或原始敏感日志。上游当前没有确定性密钥扫描器；Mnemon 数据不等于 Syno canonical fact。缺少 Native 时，lab 应保持可启动并显示明确降级状态，但不得把插件标记为生产可用。

改完 plugin YAML、profile bundle 或实验插件版本后必须重启 Host（8888 与 3088），正在跑的 DSH 进程不会热加载 preset。生产推广 Mnemon 需要固定版本/构建产物、数据边界验证、独立安全审查和显式政策批准。

**图片直投与收录转写**

图片（飞书）：主人发的图直接作为 image 内容块投给模型（2026-10-16 起，模型链支持看图；单图原始上限 3MB，超限/未过隔离校验则如实说明）；明确「收录」才额外做一次模型转写（同链、capture sidecar 无工具），结构化 JSON 当 `kind: text` Intake。PDF／文本附件先隔离并供临时读取，只有主人明确要求保存才收录。

### Windows 飞书日历 CLI（历史适配器）

当前聊天待办只记录排期，不开放日历 CRUD；以下仅供维护保留的适配器，不是当前必装组件或用户入口。历史验收锁定官方 `@larksuite/cli` 1.0.72：

```powershell
npx @larksuite/cli@1.0.72 install
lark-cli version
```

不要安装不存在的 `@larksuite/lark-cli` 包。若服务进程早于 CLI 安装启动，重启 Syno；它会检查 `LARK_CLI_PATH`、与当前 `node.exe` 同目录的包装器以及常见 npm/pnpm 全局目录。仍可显式把 `LARK_CLI_PATH` 指向 `lark-cli.ps1` 或 `lark-cli.cmd`。Syno 将 npm 包装器解析到官方 Node 入口，避免直接 spawn `.ps1` 的 `EFTYPE` 错误。用户日历仍需 `lark-cli auth login --domain calendar` 授权，消息 App 扫码不能替代日历 user 授权。

## 发布和切换

- 当前知识发布授权与验收记录在 `docs/KNOWLEDGE-FEISHU-P1.md`；旧 CUTOVER／FINAL-ACCEPTANCE 是历史清单，不再要求恢复微信、旧工作台或学习能力。未来发布按当次目标与主人授权验收。
- 任何真实 Provider 或飞书门槛未通过时，只能继续本地隔离运行，不得宣称完成最终切换。
- 已知限制统一维护在 `docs/KNOWN-LIMITATIONS.md`；修复后必须附对应测试或真实验收证据再移除。

## 主人实测验收

本节后半为按需执行的当前能力清单；先记录相关自动检查及环境限制，再做明确范围的真实验收。下列 2026-07-28 数字仅保留追溯，不是当前进入验收的门槛。生产发布已有的验收见 P1 记录，本轮文档同步不触发新的真实写入。

### 历史交付状态（2026-07-28，不代表当前版本）

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

产品只走 DeepSeek Harness。既可使用本仓内置的 Git Submodule `vendor/deepseek-harness`（推荐，无需设置环境变量；克隆时使用 `git clone --recurse-submodules` 并执行 `pnpm harness:setup`），亦可设置环境变量 `SYNO_DSH_ROOT` 指向外部 `deepseek-harness` 克隆的绝对路径。

```powershell
# 方式 A：使用内置 Submodule（推荐缺省）
pnpm harness:setup
pnpm start

# 方式 B：使用外部已有克隆
$env:SYNO_DSH_ROOT = "<absolute-path-to-deepseek-harness>"
pnpm harness:doctor
pnpm start
```

运行时 clone 必须执行 `pnpm run build`，否则 8888 会起来但 3088 起不来（可直接运行 `pnpm harness:setup` 自动编译并检查）。完整踩坑见上文「DeepSeek Harness 生产 chat」。

`harness:doctor` 不把密钥写进输出。协议冒烟用 `pnpm probe:harness`（假 sidecar + 中文 UTF-8）；`pnpm probe:harness -- --real` 验证真实 Harness runtime closure 可发现并报告缺失项。显式设置 `SYNO_RUN_REAL_DSH=1` 的测试文件才允许执行真实模型验收；模型 key 只从宿主环境 `KIMI_API_KEY` 或仓库根 `.env` 读取，不写入测试参数、日志、仓库文件或验收产物。

生产 chat 由 Host 监督 `dsh --profile syno --host 127.0.0.1 --port 3088 --no-open`（可用 `SYNO_DSH_WEB_PORT` 覆盖），与普通聊天注入同一 Harness Session。Host 会把 `@syno/dsh-plugin` junction/symlink 进 `%LOCALAPPDATA%\Syno\harness\home\profiles\syno\node_modules`，不必再跑 `dsh plugin install`。该对话页是特权壳（`approval: never`，permission 表只有 `workspace-write`），不是普通聊天 UI。普通聊天的知识读取默认走 capabilities 插件（三件 `syno_knowledge_search`／`syno_knowledge_read_snippet`／`syno_knowledge_fetch_url`），25 个业务工具始终通过认证 Bridge。core 名单包含知识三件套及全部业务工具；`SYNO_CHAT_TOOLS=bridge` 时知识读取也经 Bridge。收录、待办、记忆和决策均由模型调用工具，不再靠固定中文口令。`knowledge.fetch_url` 受安全抓取策略约束。Capture Session 继续使用 Workflow 签发的浏览器 allowlist。`http://127.0.0.1:8888` 是控制面。收录分析仍是无 bash/fs/web 的 jsonrpc 第二进程。自动测试 / `SYNO_DSH_FAKE_AGENT` 仍走 jsonrpc fake。紧急回切 chat jsonrpc：`$env:SYNO_DSH_CHAT_SURFACE = "jsonrpc"`。不要把 jsonrpc sidecar 与生产 DSH Web 同时接到同一 session。不要执行 `dsh web`（那是库存 `--profile web`）。

Chat 的 `web_search` 由自研 `syno-search` 链提供（ADR 0009）：豆包搜索（500 次/月免费）→ Tavily（1000 credit/月）→ Exa（每月 $10 额度）→ Parallel 匿名 MCP 备用（免 Key、额度未公布），按查询语言路由（中文优先豆包、英文优先 Tavily），失败/限流/空结果自动回退；key 走仓库根 `.env`（`DOUBAO_SEARCH_API_KEY` / `TAVILY_API_KEY` / `EXA_API_KEY`）经 Host 注入，`harness:doctor` 的 `search-keys` 检查报告就位情况；可用 `SYNO_WEB_SEARCH_CHAIN=exa,tavily` 覆盖链前缀。JSON-RPC chat 回退面在 `syno-chat.cordis.yml` 挂载同一接缝（该面以相对路径加载插件，没有 bundle linked-root 的 peer 拦截，插件内对 `@deepseek-ai/dsh-web` 采用可选解析，见 `plugins/web-search/index.mjs`）。`web_fetch` 已于 2026-10-17 从会话面关闭（读网页只留受控路径，避免绕过 SSRF 防护与脱敏）。Web session 使用 Host 生成并显式绑定的 `syno` agent preset，compaction 由当前生产 profile 的官方 DSH 层接管，会话内 schedule 已禁用（Web preset 使用官方 compaction-basic/tool-result-pruner/compact command，JSON-RPC 使用同一 stack，`@deepseek-ai/dsh-schedule` 已于 2026-10-17 关闭，Host 不再有主动推送调度器，仍保留收录／发布恢复与重试计时器）。系统不再有任何主动推送：SignalEngine / ProactiveOrchestrator / ChannelDeliveryOutbox 已于 2026-10-17 删除。不要对生产 `syno` profile 执行 `dsh plugin add`，也不要从 [dsh-plugin.org](https://dsh-plugin.org/plugins?q=search) 装社区搜索或记忆插件；实验 UI 只用 Host 生成的 `syno-lab` profile（无 Bridge、无 vault 写、无微信）。收录分析 profile 仍然没有 web。

图片与附件（2026-10-16 起飞书同样支持）：主人发的图直接投给模型看图；文件（PDF/docx/md/txt/html）落隔离区后以临时引用供模型读取，只有主人要求保存才收录。明确说「收录」时图片才额外做一次模型转写（同链、capture sidecar 无工具），JSON 作为 `kind: text` 进入现有 Intake / Proposal。飞书资源下载走官方 `im/v1/messages/{id}/resources/{key}` 接口，权限要求由「获取单聊、群组消息」（注册时已申请 `im:message:readonly`）覆盖；单文件上限 25MB。本地知识搜索仍是 `syno_knowledge_search`。识图失败如实回报，禁止猜图。

当前主人验收清单（按需执行，历史双渠道／学习项不再适用）：

1. 在飞书发送一个 Markdown 文件、一个 PDF，再发送一个纯 URL，确认未明确保存时不会自动收录。
2. 分别发送“帮我收录这个 URL”和一次带“仅本地”的内容。
3. 查询“刚才的文件怎么样了”和“待我确认的收录”，核对模型调用准确 ID 的状态／决策工具，不将 received 说成入库。
4. 修改一次 Proposal，完成三次明确写入自动执行和一次冲突澄清。
5. 在 Proposal 生成前重启服务；另一次在 PendingDecision 形成后重启，确认状态和待决策项仍可恢复。
6. 在飞书查询或确认此前的收录与任务，验证同一 Owner 的会话连续性。
7. 在飞书完成多轮追问、知识检索、待办及工作概览；需要 Web 时单独验证同 Owner/thread 会话连续性，不再验微信。
8. 提出个人记忆候选，再用后续真实消息确认／纠正／遗忘；知识删除／合并先看预览再确认，多对象时不得猜测。
9. 在当前 macOS 登录冷启动后核对 Host、Harness 和未完成 Workflow 恢复；Windows 安装及历史验收另记，不能替代本机登录证据。

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

## 知识与飞书 P1 生产验收

发布诊断、稳定 ID 首次登记、隔离探针、配置模板及标签审核见 [P1 交付说明](KNOWLEDGE-FEISHU-P1.md)。生产发布已于 2026-10-19 经隔离验收后启用（`mode: production`，目标「云端发布」+「Syno 知识目录」）；回滚方式见该交付说明，改回 `disabled` 并重启即可。只读可见性不替代写权限与主人访问验收。
