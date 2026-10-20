# AGENTS.md — Syno 执行契约

## 项目事实源

- 知识事实源就在本仓库根目录：`vault/` 是长期知识事实源，`ops/` 是任务、行动、内容、记忆候选、产物和事件事实源。生产环境必须不设置 `SYNO_KNOWLEDGE_ROOT`，程序默认从本仓库读取并写入；该变量只保留为故障回滚时的兼容入口。管家的全部读写与产品提交只落在本仓库。
- `contracts/`：机器可校验的数据契约。
- `.runtime/`：可删除、可重建的缓存和运行状态，禁止提交。

## 权限边界（trust-but-clarify）

1. 读取、搜索与所有写入（新增笔记、写 `ops/`、覆盖、删除、移动、新 MOC、新 tag）默认自动执行（`approval:none`），在隔离 worktree 内合并；不要求审批确认。
2. 只有"系统歧义"才回到人在环：收录撞重复、多方案（新建/分开/追加/关联）、信息不足时暂停澄清。明确指派的覆盖/移动直接执行；知识删除与合并必须先展示绑定目标版本的预览，经主人后续真实消息确认后执行。
3. 管家能力内**不存在**修改项目代码与本机生命周期控制（2026-09-01 D9）：`code_change`/`system_control` 意图无条件拒绝，不存在可开启的开关；装卸 Windows 后台服务由主人手动运行脚本。
4. D9 仅限制 Syno 产品运行时：产品产生的任何 diff 触及源码根（`apps/contracts/config/scripts/tests`）= 无条件硬拒绝。主人明确授权的开发 Agent 可以在独立分支修改源码，遵循下文源码修改与交付原则；不得因此放开产品运行时的源码写入或系统控制能力。（Owner 2026-10-18 明确授权澄清）
5. 长期记忆只能先写为候选，经主人后续消息确认后在 `ops/memory/` 生效；不进入 `vault/`、普通知识索引、Wiki 或目录表。遗忘清理当前正文，不重写 Git、聊天和备份历史。独立开发验收环境的知识发布默认关闭；生产已于 2026-10-19 经隔离验收及主人授权启用，发布目标与验收记录见 `docs/KNOWLEDGE-FEISHU-P1.md`。不得自行切换发布模式或目标。
6. 自动提交只能暂存 Job 声明的精确路径；禁止 `git add -A`，禁止自动 Push。
7. 不读取、输出或提交 Token、Cookie、密钥和 `%LOCALAPPDATA%\Syno` 下的凭据。
8. 当前飞书与受控 DSH Web 使用同一 Owner 权限：已绑定 Owner 即可直接指挥，澄清确认不要求六位审批码。微信 iLink 通道栈已删除，不再是产品入口。

## 执行器

- 产品只启用 `DeepSeekHarnessCognitiveRuntime`。不得选择或回退到 OpenCode、Claude Code 或原生 Agent。
- 模型链固定为 Kimi Code 两档：`kimi-coding/kimi-for-coding` → `kimi-coding/k3-256k`（经 DSH 内置 pi-ai 适配器的 `kimi-coding` 目录路由，Base URL `https://api.kimi.com/coding`）。Adapter 为 `deepseek-harness-sdk`（CognitiveRuntime v3）。key 来源 = host 环境变量 `KIMI_API_KEY` 优先，缺省时 supervisor 读仓库根 `.env`（gitignored）的 `KIMI_API_KEY` 注入子进程。DSH 根路径缺省使用本仓 Git Submodule `vendor/deepseek-harness`（推荐，无需环境变量）；也可用 `SYNO_DSH_ROOT` 指向外部克隆（说明见 `docs/OPERATIONS.md`）；不要把 Harness 源码 vendoring 进本仓库。
- 仅在不可用、限流、连接失败、超时、5xx、空响应或契约校验失败，且本次尝试尚未产生不可逆副作用时，才由 Syno 按上述顺序确定性回退。
- Agent 不得选择模型、Provider 或回退目标；全部失败时进入 `waiting_provider`。禁止动态 MCP。
- Harness 聊天会话**没有**终端、文件系统或通用抓取工具：模型只能使用受控业务工具（保留 capture.*，记忆和知识维护由 Host 受控执行）、受控知识三件套（`syno_knowledge_search`/`syno_knowledge_read_snippet`/`syno_knowledge_fetch_url`）、`web_search` 与 `skill`（2026-10-17 工具面重设计）。`web_search` 由自研 `syno-search` 链提供（豆包 → Tavily → Exa → Parallel 匿名备用，按查询语言路由，免费额度；key 走 `.env` 注入，见 ADR 0009），不安装社区 hub 插件或动态 MCP。主人发来的图片直接作为 image 内容块投给模型（模型链 `kimi-for-coding`/`k3-256k` 自身声明支持 image 输入，2026-10-16 起；Host `image.read` 工具已摘除）；只有明确「收录」的图片才额外做一次结构化转写（同一模型链、capture sidecar 且无任何工具）作为 Intake 正文；转写失败如实回报，禁止猜图。生产 chat 是受控 `dsh --profile syno --host 127.0.0.1 --port 3088 --no-open`（与渠道会话同一 session；`dsh web` 是 `--profile web` 别名，不是生产）。通道只有飞书（微信栈已于 2026-10-16 物理删除）；入站图片直投模型、文件落隔离区后走收录。收录分析 / 浏览器兜底仍用 `syno-capture.cordis.yml` jsonrpc（无 bash/fs/web）。8888 是控制面。知识写入与覆盖 canonical 笔记仍走 Job / Proposal；改 `apps/` 源码不属于管家能力（D9），只有开发 Agent 的人工开发流程能改。生产 profile 禁止 `dsh plugin add`，禁止把 `danger-full-access` 写进 `@syno/dsh-plugin` 的 permission 表。DSH 根必须 `pnpm run build`；事件通道是 WebSocket 不是 SSE。踩坑清单见 `docs/OPERATIONS.md`「DeepSeek Harness 生产 chat」。

## 源码修改原则

在权限边界已放行的前提下，修改本仓库源码（`apps/ contracts/ scripts/ tests/ config/`）或进行任何实现时，遵循以下原则：

1. 先阅读相关代码、测试、文档、依赖和现有相似实现，理解调用链后再修改，不凭局部信息猜测。
2. 选择满足当前需求的最小完整实现：先打通端到端流程，不为假设中的未来需求提前增加抽象、配置或扩展机制。
3. 保持现有模块边界、依赖方向和项目惯例；仅在当前需求确实受阻时进行必要重构，不顺手修改无关代码。
4. 对已确认废弃且无调用方的内部路径，直接删除，不保留新旧双轨、兼容层或回退逻辑。涉及公共 API、持久化数据、配置格式或外部调用方时，先确认兼容要求。
5. 实现方式按以下顺序选择：复用项目已有实现 → 使用已有依赖 → 引入成熟且持续维护的依赖 → 自行实现。新增依赖前先阅读其文档、类型定义和项目现有用法。
6. 不重复实现成熟库已可靠解决的通用能力，也不为简单的小型逻辑引入过重依赖。
7. 借鉴成熟产品、标准和开源方案中的已验证模式，但不要复制与当前规模无关的复杂架构。
8. 避免明显会在下一阶段被整体推翻的临时方案，但不要以“长期架构”为理由过度设计。
9. 修改范围仅限完成当前任务所必需的部分。发现无关问题时只说明，不自动扩大任务。
10. 完成后运行相关测试、类型检查、lint、格式检查和构建。无法验证的项目必须明确说明原因和剩余风险。

规则冲突时，优先级为：
当前任务与验收标准 > 正确性和数据安全 > 现有公共契约 > 项目规则与测试 > 现有架构惯例 > 最小完整实现 > 通用最佳实践。

不要只描述方案。在完成必要检查后直接实施，并在最终结果中简要说明：修改内容、关键决策、验证结果和剩余风险。

## 跨进程文本往返编码约束

本机 zh-CN 系统 ACP=936（GBK）。任何 `spawn`（powershell.exe / python / 其它）后经 `[Console]::In`/`[Console]::Out` 或默认 stdio 文本层往返非 ASCII（中文、emoji）payload 时，子进程默认编码是 GBK，**双向**都会损坏 UTF-8 字节，且只在下游 `JSON.parse` 抛 `SyntaxError` 时才暴露（静默无报错）——曾经的典型症状是「主动推送静默无限重试」。

**硬约束**：新增或修改任何跨进程文本往返时，只让 ASCII / 显式 UTF-8 跨过 stdio 边界，绝不依赖「默认编码刚好是 UTF-8」——在 zh-CN 主机它不是：

- Node 侧写 PowerShell stdin 用 `Buffer.from(x,"utf8").toString("base64")`；写 Python/其它子进程 stdin 直接写 UTF-8（Node 默认）。
- PowerShell 脚本内只用 `[Convert]::FromBase64String`/`ToBase64String`，绝不调 `UTF8.GetString/GetBytes` 或依赖默认编码。
- Python sidecar 用 `io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True, write_through=True)` 包裹协议 stdio（须在 `sys.stdout=sys.stderr` 重定向之前取 `buffer`），reader 侧同包 stdin；并让 bridge 经 `processBootstrapEnv` 注入 `PYTHONUTF8=1` / `PYTHONIOENCODING=utf-8` 作双保险。

参考实现：`runDpapi`（`apps/syno/syno/provider-credential-store.mjs`，Base64 传输）、DeepSeek Harness JSON-RPC sidecar（`apps/syno/syno/deepseek-harness-jsonrpc-client.mjs`，UTF-8 字节层）。运维侧说明见 `docs/OPERATIONS.md`「zh-CN 主机的 PowerShell/子进程编码陷阱」。新增跨进程文本往返必须有对应测试覆盖中文路径（参考 `tests/deepseek-harness-jsonrpc-client.test.mjs`）。

## 知识任务

知识仓 `vault/AGENTS.md` 及 `vault/99-System/Agent/` 中的 canonical Skill 继续约束知识收录、关联、写作和 MOC。平台入口只负责转发，不复制业务规则。

## 开发与交付

当前开发 Agent 负责需求理解、实现、自测、差异复核与修复，按主人指令完成交付。开发不要求先创建 Issue、跨 Agent 交接、指定外部审查员或专用标签。

在独立分支实施并保留已有文件和进程；PR 合并前核对最新提交的验收结果、必要 CI 与可合并状态，采用 squash 合并。发布、合并及生产重启按主人的授权执行。

只有主人明确要求时，才安排多 Agent 协作或定时研发巡检。
