# 当前执行状态（2026-10-12）

本节是当前交接摘要；下方各期交接仅用于追溯，不能覆盖这里的事实。

## 认知层 Provider 切换 + 搜索链恢复（已提交、已重启，待 Owner 真机验收）

- **分支/远端**：`main`，本轮已提交两个提交：`e424250`（切换 + 搜索链）与 `65e964f`（投递失败种子时序修复）；**未 Push**。
- **首轮真机验收发现并修复（2026-10-12，两轮 fix 提交）**：主人发「搜一下今天的 AI 新闻」暴露两处用户可见缺陷——① 系统提示从未注入当前时间（Harness 的 `@deepseek-ai/dsh-time-context` 存在但无 bundle 挂载），模型把「今天」猜成 2026-09-24；② 回复把英文过程叙述与草稿备注写进正文——根因是 0.1.7 生产根的 `kimi-for-coding` 目录条目缺 `thinkingLevelMap`，未声明档位时请求不启用 thinking，模型的「思考」全部落进 text 通道。修复：两个 chat overlay 挂载 `time-context`（Asia/Shanghai）；三处 kimi 路由经 `modelOverrides.reasoningEfforts` 补齐 low/high/max 档位并启用 `reasoning: high`（capture 用 `low`）；`syno-agent.md` 增加「正文只给结果、不给过程叙述、以 time-context 快照为准」规约。重启后 spike 实测 reasoning 块恢复（与 DeepSeek 时代一致）。
- **生产运行态（2026-10-12 11:35 重启后实测）**：Host `ready`、`deliveryOk=true`（failures 0）、微信/飞书均 `running + ownerBound`、3088 DSH chat 子进程已按 `kimi-for-coding` 路由启动；current home channel = **feishu**（微信 proactive 目标因 09-29～10-09 的 9 条 `PROACTIVE_DELIVERY_EXHAUSTED` 旧记录处于冻结态，主动卡自 10-09 起投往飞书）。真机验收（微信发消息）仍待 Owner 执行。
- **决策**：产品认知层改用 Kimi Code 订阅（ADR 0008）。模型链 `kimi-coding/kimi-for-coding` → `kimi-coding/k3-256k`，经 DSH 内置 pi-ai 适配器的 `kimi-coding` 目录路由（`https://api.kimi.com/coding`，Anthropic Messages 协议）。`llm-deepseek` 保留惰性挂载作为回滚面。
- **密钥链路**：仓库根 `.env`（gitignored，Owner 已填 `KIMI_API_KEY` + 三把搜索 key）→ supervisor 统一读出后按进程环境变量注入三个 DSH 子进程（chat web / chat JSON-RPC / capture）；`syno-key-loader.mjs` 取代旧 deepseek loader（删除 opencode `auth.json` 兜底）；`.env.example` 入库。
- **web_search 恢复**：自研 `syno-search` 链（ADR 0009）——豆包搜索（500 次/月免费，中文优先）→ Tavily（1000 credit/月，英文优先）→ Exa（每月 $10 额度），按查询语言路由、失败/限流/空结果确定性回退、缺 key 自动跳过；单次 ≤8 条、单 provider 15s 超时；`SYNO_WEB_SEARCH_CHAIN` 可覆盖链前缀。生产 web profile 与 JSON-RPC chat 回退面同链（回退面相对路径加载，插件对 `@deepseek-ai/dsh-web` 采用可选解析）；preset `tool-web` 已同时开放 `search` 与 `fetch`。kimi 路由图片预算收紧（单图 786KB / 聚合 1.4MB base64）对齐 Kimi ~2MB 请求上限。
- **改动面**：`apps/syno/syno/`（`syno-key-loader.mjs`、supervisor、cognitive-runtime）、`packages/syno-dsh-plugin/`（生产 overlay、新 `plugins/web-search/`、channel-core 默认模型、capabilities spike）、`config/deepseek-harness/`（chat/capture overlay、syno-agent.md 含防注入规约）、`scripts/`（doctor/spike/probe）、受影响测试与当前态文档；新增 `docs/adr/0008`、`docs/adr/0009`、`docs/plans/kimi-code-provider-switch.md` 与 `ops/acceptance/kimi-provider-switch/` 证据。
- **验证基线**：`pnpm test` **811/811 pass**；`pnpm verify` 通过；`harness:doctor` closure ok + `kimi-key present` + `search-keys {doubao,tavily,exa} 全 true`；真实链路 `pnpm spike:capabilities` 五轮全绿（pong → syno_knowledge_search → read_snippet → **web_search 8 条来源** → **web_fetch 读取 example.com**）；JSON-RPC chat 回退面真实启动验证 `web_search 返回了 8 条来源`；三家搜索 API 直连探针 CN/EN 全 200（豆包 456ms/198ms、Tavily 2.9s/3.8s、Exa 0.95s/0.39s，均无需代理）；capture sidecar 与旧 DeepSeek 会话延续均已验证（证据 `ops/acceptance/kimi-provider-switch/spike-evidence-2026-10-12.md`）。
- **环境发现（本轮不修复，待 Owner 决策）**：
  1. 用户级 `SYNO_DSH_ROOT` 指向一个外部克隆（**0.1.7-alpha.2**，生产正在使用）；repo 钉住的是子模块 **0.2.1-alpha.1**（2026-10-08 升级目标）。两者本轮均验证可用，但版本漂移需收敛。
  2. 子模块 0.2.1 的 runtime closure 检查把外部依赖 `@deepseek-ai/libreoffice-kit` 判为 `#runtime-entry` missing（pnpm 严格布局下该包不在根 node_modules），导致**未设置 `SYNO_DSH_ROOT` 时** `harness:doctor` 的 capture-sidecar 报 closure 不完整；外部克隆（0.1.7）无此依赖所以不受影响。
  3. 收敛二选一：升级外部克隆到 0.2.1，或修 closure 的外部依赖解析后切回子模块缺省。
- **下一步（按序）**：
  1. Owner 微信真机验收：知识检索、「新对话」、收录一条、灵感卡反馈、**联网搜索一条（如「搜一下今天的 AI 新闻」）**；观察 `waiting_provider` 与失败码分布。
  2. 当日对账：Kimi 控制台额度 + 豆包/Tavily/Exa 三家搜索用量（均由控制台查看）。
  3. 首 72h 观察失败码（401/403/429）；回滚 = `git revert` 本轮两提交 + `.env` 保留/移除对应 key（`llm-deepseek` 惰性挂载即回滚面；搜索回滚 = overlay 摘 `syno-web-search` 行并恢复 `search:false`）。
  4. 可选：如需恢复微信主动卡，清理/解冻 outbox 中 9 条 09-29～10-09 的 `PROACTIVE_DELIVERY_EXHAUSTED` 记录或把 home 切回微信（`channels/home`）。
- **边界**：不改 `vendor/`；不内联 key；不新增高频自动调用（Kimi 社区规则禁止非交互批量自动化）。

## 知识库维护巡检优化与孤岛笔记双链闭环（2026-10-12 完成）

- **背景与根因**：飞书周报此前误报 54 篇孤岛笔记（`99-System` 41 篇、`03-Archive` 2 篇、`02-Resources` 10 篇）。排查发现：
  1. 系统/审计/历史归档（`99-System/`、`03-Archive/`）等技术设施被当成普通知识笔记巡检；
  2. 孤岛检测在统计 `corpus` 时排除了 MOC 文件，导致 MOC 目录中的双链没有计入；且只支持绝对字符串匹配 `[[${basename}]]`，无法识别管道别名 `[[basename|alias]]`、小节锚点 `[[basename#heading]]` 和相对路径。
- **治理与落地**：
  1. **管家巡检逻辑修复**：在 `packages/syno-core/knowledge-maintenance-source.mjs` 中过滤技术设施前缀，并在全库范围（含 MOC）提取规范链接目标集合并支持管道别名；
  2. **深度文章补齐双链**：为 9 篇优质深度长文补齐 `## 🔗 双向链接与引用`，并反向更新到 3 大关键 MOC 枢纽（[[MOC - AI 时代个人发展与组织]]、[[MOC - Harness Engineering]]、[[MOC - 具身智能与脑机接口]]），同时为儿童折纸定格动画与水粉剪纸贴纸卡补全了技能回链；
  3. **实测孤岛清零**：运行 `weeklySummary()` 实测全库孤岛笔记总数从 54 篇降为 **0 篇**；自动化测试 794/794 全部通过，`verify-repository` 验证通过。

---

# 2026-10-11 交接（追溯用）

本节是当时交接摘要；下方各期交接仅用于追溯，不能覆盖当时的迁移事实。

## 知识库 V4 排版跃迁、Agent Skills 范式重构与 31 大 S 级神级武器库全景沉淀

- **分支/远端**：`main` 与 `origin/main`（`https://github.com/hoye1113/syno-personal-butler.git`）保持同步；工作区严格受控。
- **Agent Skills 武器库全量收录（31 大原子卡片 + 1 统一 MOC 导航）**：
  - **第一批（9 个）**：`ponytail`（架构师减法）、`archify`（交互动态架构图）、`reality-check`（代码诚实度审计）、`open-design`（开源全能设计引擎）、`concept-fable`（零术语寓言）、`geo-content-optimizer`（GEO生成式引用优化）、`huashu-excel`（严谨对账与口径治理）、`travel-memory-sticker-card`（水粉剪纸手帐贴纸卡）、`kid-papercraft`（儿童折纸定格动画短片）。
  - **第二批（8 个）**：`deep-interview`（苏格拉底自适应访谈）、`sigma`（Bloom 2-Sigma认知导师）、`financial-report-reader`（财报三表10项暴雷排查）、`hv-analysis`（横纵深度研报）、`web-video-presentation`（16:9网页伪视频）、`yichen-x-slicer`（推文切片视频引擎）、`khazix-writer`（卡兹克长文去AI味）、`reverse-skill`（逆向工程与安全路由包）。
  - **第三批（5 个 S 级新核心）**：`BiliNote`（视频音画智能笔记与截图沉淀）、`book-study`（读书教练与深度知识库编译）、`remotion-best-practices`（Remotion 纯代码视频构建标准）、`equity-researcher`（机构级上市公司投研研报生成器）、`product-behavioral-nudge-engine`（行为心理学与防疲惫助推引擎）。
  - **第四批（李继刚认知与思想铸造全景套件 · 方案 A：1 主套件 + 4 核心原子卡片）**：`ljg-suite`（认知套件总览）、`ljg-card`（思想铸卡老宋体）、`ljg-think-rank`（追本之箭与降秩）、`ljg-writes`（汪曾祺阿城笔调）、`ljg-invest`（秩序机器与创生公式）。
  - **第五批（Matt Pocock 顶级研发心智流套件 · 4 核心原子卡片）**：
    1. `grilling` — 交互式需求深度拷问与反向对齐（决策树 Frontier 推进，在敲代码前挖尽未解假设与隐性决策）；
    2. `wait-what` — 历史代码考古学与防御性治理（反常遗留代码强制刹车，Git 考古，特征测试先行，拒绝盲目重构）；
    3. `design-it-twice` — 深度模块设计与强制双对立方案裁决（John Ousterhout 深度模块哲学，小接口大实现，强制双轨方案权衡）；
    4. `writing-for-agents` — 高确定性高密度 Agent 契约指令写作法（两项负荷平衡，信息天梯，抗早熟完成防线）。
  - **总导航枢纽**：`vault/02-Resources/AI and Agents/MOC - Agent Skills 武器库.md` 同步更新，形成覆盖工程攻坚、深度研究、知识萃取、视听生活与认知哲学的 31 大矩阵场景决策树。
- **Harness & 上下文治理深度理论研报沉淀（2 篇重磅研报）**：
  1. `AI 产品上下文压缩方法论与三板斧实践.md`（Manus/Claude Code/OpenClaw 上下文核心哲学：Reduce/Offload/Isolate，文件系统外挂大脑，KV Cache 命中优化）；
  2. `原位自演化智能体 In-situ Self-evolving Agent 架构.md`（零预设工具 Zero-Skills 起步，运行期原位合成工具，双环沙箱门禁与收敛规律）。
- **飞书多维表格（Bitable Table 2 `tblnyAKG4iUEMgMv`）全量同步**：
  - 运行 `node scripts/sync-vault-catalog-to-bitable.mjs`，累计收录增至 **239 篇**正文笔记，100% 保持端云镜像对齐。
- **全景技能资产盘点与梯队分层**：
  - 完成对 `skill-collection`（15分类/197技能）及本地独立工程（`BiliNote`、`SlideNarrator`、`meeting_minutes_agent`、`tenacitOS`）的四梯队全量扫描，输出 `ops/artifacts/candidates/full-skills-inventory.json`。
- **武器库反哺管家执行契约全面升级（Butler Feedback & Capability Elevation）**：
  - `vault/99-System/Agent/ROUTER.md` 升至 v4，将 31 大 S 级武器库卡片全面编织进管家任务路由网关，实现一跳按需唤醒；
  - `vault/99-System/Agent/DENSITY-PROFILE.md` 升至 v4，深度融合李继刚汪曾祺/阿城纯正中文白描（五刀三磨彻底去 AI 味）、Matt Pocock `writing-for-agents` 契约写作天梯，以及 Manus 上下文压缩三板斧（Reduce, Offload, Isolate）；
  - `vault/99-System/Agent/INGEST-CONTRACT.md` 扩充多模态与视觉出卡扩展协议（`BiliNote` 抽帧、`yichen-x-slicer` 切片与 `ljg-card` 思想铸卡）；
  - `vault/AGENTS.md` 启动契约全面绑定现代研发心智（Frontier 需求拷问、怪异代码考古、双轨架构设计与纯正中文画像）。
- **回归基线与门禁**：
  - 仓库完整性门禁：`node scripts/verify-repository.mjs` 扫描全通过（零个人路径硬编码）。
  - 测试套件：`tests/adapters.test.mjs` 与 `tests/feishu-bitable-sync.test.mjs` 42/42 pass。

---

# 2026-10-08 交接（追溯用）

## 知识库二源合一 + dsh 升级

- **分支/远端**：`main` 本地领先 `origin/main` 的提交（`20f145d` 合并 + `1feffee` 回归修复，连同此前未推的 `0cec716`、`4cafac5`）已于 2026-10-08 推送同步。
- **知识库唯一事实源**：本仓 `vault/`。obsidian_repository 策展主线已并入（547 文件同步 / 205 篇旧布局重复清除 / 74 篇捕获原位保留 / 逐 basename 校验零丢失）；历史外部目录及 junction 别名已彻底清理移除，本仓 `vault/` 为唯一直接访问入口。
- **dsh 运行时一体化与升级**：已通过 Git Submodule 将官方 DeepSeek Harness 挂载至 `vendor/deepseek-harness` 并升级锁定在 `0.2.1-alpha.1`（`5badb15009`），`pnpm install --ignore-scripts` + `pnpm run build` 构建通过；`apps/syno/syno/deepseek-harness-supervisor.mjs` 支持未配置 `SYNO_DSH_ROOT` 时自动缺省使用该子模块，并已适配上游移除 `@deepseek-ai/dsh-invariants`；`harness:doctor` 全 ok，`pnpm test`（782/782 pass）、`pnpm verify` 以及 `pnpm spike:capabilities` 端到端会话与知识检索验证均全绿通过。
- **回归基线**：`pnpm test` 782/782；`pnpm verify` 通过；vault pytest 58/58；vault-audit 623 files / 338 unmatched / 69 orphan / 27 no-FM / 25 incomplete / Duplicate FM fields 0。
- **合并回归与修复**：obsidian 主线 4 篇 B站笔记携带重复 `created` 字段（syno 迁移管道曾修复，覆盖时回归），击穿 validator 致 `KnowledgeStore.rebuild` 崩溃——`1feffee` 删重 + vault-audit 增加重复字段检查与测试防线。
- **生产运行态**：单仓形态不变；`SYNO_KNOWLEDGE_ROOT` 用户级/系统级均未设置且必须保持未设置；ops 仍归本仓。
- **下一步（按序）**：
  1. obsidian 远端仓 `hoye1113/longterm-ai-vault` 后续保留只读或删除由 Owner 定夺。
  2. 既有产品路线不变：B5 删除类、C1b 尾段、C5、Phase D/E（见 2026-09-24 交接）。

---

# 2026-09-24 交接（追溯用）

本节是当时交接摘要；下方「2026-09-18 交接」与「历史交接」仅用于追溯，不能覆盖当时的迁移事实。

## Claw 直通 DSH 迁移（ADR 0007）

- **分支/远端**：`main` 已与 `origin/main` 同步（本轮推送至 `74f2148`）。
- **已完成波次**：
  - A 期 + B1：`packages/syno-core` 抽取（knowledge 切片）；capabilities 插件骨架；知识三件套 in-process。
  - B2：灵感反馈链路 + `process-lock` 原子发布（修并发 flake）。
  - B3：`fetch_url` + `capture.*` 内嵌。
  - B4：19 个治理模块（policy/agent-host/job-store/git-guard/…）+ `jobs.list`/`jobs.submit`/`today.read`。
  - B5：**默认接管已完成并 Owner 真机验收通过（2026-09-24 微信知识检索）**——canonical `syno_*` 为默认工具面；回滚开关 `SYNO_CHAT_TOOLS=bridge`；bridge 代码保留一个版本；收录 sidecar / JSON-RPC 回退经 `allowWhenPluginMode: true` 继续用桥。
  - C0：19 个通道/渠道模块迁入 syno-core（生产不变）。
  - C1a/C1b：in-process 通道核心 + `ChannelConversationHandler` 确定性路由接回（`SYNO_CHANNEL_OWNER=dsh` 门控；spike 验证「新对话」+ 模型 `pong`）。
- **回归基线**：`pnpm test` 780/780；`pnpm run verify` 2274 files；active docs 8；静态相对导入解析 236 文件全通过。
- **真实验证**：`pnpm spike:capabilities`（已入仓 `scripts/spike-capabilities.mjs`）——默认（canonical `syno_*`）、`SYNO_CHAT_TOOLS=bridge`（回滚，`syno_core_*`）、`SYNO_WEIXIN_SPIKE=1`（确定性「新对话」+ 模型 `pong`）。**生产真机验收（2026-09-24）**：微信知识检索经 canonical 插件工具返回 3 篇真实笔记标题。
- **下一步（按序）**：
  1. B5 删除类：桥实现保留一个版本后再删（`syno-tool-bridge.mjs`、`syno-tool-bridge-plugin.mjs`、`/api/syno/bridge/mcp` 与 allowlist、`FALLBACK_TOOLS`、`SYNO_BRIDGE_CONTEXT_*`）；收录 sidecar/JSON-RPC 回退在删除时一并改挂一次评估。
  2. C1b 尾段：typing/ACK/Outbox 投递归位、维护页 C4、真实扫码。
  3. C5：通道 owner 双轨前置已落（Host 在 `SYNO_CHANNEL_OWNER=dsh` 下不轮询、delegated 状态）；剩余维护页委派、真实扫码、切默认与真实微信验收矩阵。
  4. Phase D/E：主动内嵌、Host 收缩。
- **权威文档**：`docs/adr/0007-claw-direct-to-dsh.md`、`docs/plans/claw-direct-to-dsh-migration.md`（波次进度）、`docs/plans/claw-direct-to-dsh-execution-and-verification.md`（执行与验收规范、开放决策）。
- **生产运行态**：Host 任务 `running=true`、8888 ready、3088 DSH ready、微信 connected；工具面自 2026-09-24 起默认由 in-process capabilities 提供（canonical `syno_*`），回滚开关 `SYNO_CHAT_TOOLS=bridge`；通道路径仍由 Host 承担（`SYNO_CHANNEL_OWNER` 未设）。

---

# 2026-09-18 交接（追溯用）

本节是当时交接摘要；下方“历史交接”仅用于追溯，不能覆盖这里的单仓运行事实。

- **唯一活动事实源**：本仓库。`vault/` 与 `ops/` 已回到本仓库，由本仓库 Git 和 `origin/main` 管理；主分支基线为 `ccf559b`，当前交接分支为 `chore/single-repo-runtime-followup`，有 2 个尚未推送的本地提交。
- **生产配置**：planner `vaultRoot` 指向本仓库；用户级和系统级 `SYNO_KNOWLEDGE_ROOT` 均未配置。外部知识仓及备份目录仅作为冻结回滚材料保留。
- **运行态**：8888 `/api/syno/health` 为 `ready`，delivery 正常；`/api/settings` 与 `/api/syno/today` 均从本仓库读取，当前 `needsYou=0`、待收录=0。
- **Host 身份**：当前 Host lock 所在 `.runtime` 属于本仓库，PID 33176、入口为 `apps/syno/server.mjs`、repo fingerprint 为 `a57a9503618a0646`。Windows 任务已安装且当前 `running=true`，`startup=at_logon`，`lastTaskResult=267009`（运行中状态），8888 已由任务 wrapper 托管并以 `adopted` 模式接管现有 Host；任务安装/重启需主人手动执行，Agent 不绕过系统生命周期权限。真正的注销/重启后冷启动仍待验证。
- **环境风险**：当前 Codex 命令进程仍继承了旧的 `SYNO_KNOWLEDGE_ROOT` 值，但不是用户级或系统级配置。后续从该会话启动 Node 前必须显式清除它；生产 Host 的当前 lock、planner 和 API 读路径已证明使用本仓库。
- **已完成验证**：`pnpm run verify` 通过（2219 files）；`git diff --check` 通过；Agent 契约检查通过；vault 审计基线为 579 files / 332 unmatched wikilinks / 63 orphan / 25 no frontmatter / 20 incomplete frontmatter；B站专项测试 63/63 通过；真实 frontmatter 识别的 83 篇 B站 v2 笔记全量通过。
- **完整回归**：`pnpm test` 已通过 758/758，0 failed、0 skipped；此前的等待问题已通过测试替身隔离 fake-agent 进程清理路径修复。
- **当前待办顺序**：
  1. 下次注销或重启 Windows 后，运行 `pnpm windows:status` 验证登录冷启动，并确认 `/api/syno/health` 仍为 `ready`；
  2. 完成真实 DSH、跨渠道、重启恢复和每日灵感反馈验收；
  3. 处理 `Generate glossary` 孤立笔记和 5 篇今日重读候选；
  4. 渐进治理历史 wikilink、orphan 和 frontmatter，不批量改写。
- **诊断归档**：`.tmp-webbridge-snapshot-20260917-c.json`、`webbridge-req-20260917-omission-06.json`、`webbridge-req-20260917-omission-13.json` 已移入 `.runtime/quarantine/webbridge-20260917/`，不纳入 Git；如需复查可从该目录恢复。

---

# 历史交接：Syno 执行语义与移动可靠交付（2026-07-29）

## 2026-09-04 当前交接：#11 验收稳定性 Day 1/3（重计 09-04 准点出卡）；#17 全链落码且**全部部署**——L0b+L2（`8d13c30` 12:38）+ P1（`faedbe6` 14:34，Owner 指令豁免封板闸门）

当前唯一执行入口是 [`docs/product-slimming-and-inspiration-plan.md`](docs/product-slimming-and-inspiration-plan.md)（Owner 2026-09-01 经 /goal 批准，指示一次性执行完全部任务）；本文下方 2026-08/07 内容仅作历史背景，不覆盖该执行计划。

- 产品范围（Owner 2026-09-01 决策）：搜索、收录、深度探索分析、知识库查找、今日灵感（整合知识库文章产出串联/新观点的"做梦"功能）。学习与项目管理不在范围内。
- 当前代码基线：`main` @ `84c2b4c`（本地，沿现规不自动 Push）；工作树干净。
- **双仓形态（2026-09-01 D13 拆库，已封板）**：知识仓（`SYNO_KNOWLEDGE_ROOT` 指向；本机路径与回滚预案见 `docs/OPERATIONS.md`「知识仓库拆分」；HEAD `ec57a03`）持有 `vault/`（长期知识事实源）+ `ops/`（任务/行动/记录事实源）；代码仓经用户级 `SYNO_KNOWLEDGE_ROOT` 指向它，未设置时回退单库形态。GitGuard 默认根=知识仓，主检出非 `main` 拒绝产品提交与合回（`productBranch: "main"`；worktree `syno/job/*` 不受限）；validator 双根（vault 扫描/HEAD 在知识仓、`config/vault-contract.json` 在代码仓）；verify 双模式；管家的全部读写与产品提交只落知识仓 main。**地雷**：不得从拆库前（<`60a8c43`）分支/提交启动 Host；回滚=unset env + revert `60a8c43`；旧历史 bundle `C:\tmp\syno-pre-split-24e97af.bundle`（36MB）。细节见 `docs/OPERATIONS.md`「知识仓库拆分」。
- 已完成：边界加固①/②（`e49a66c`、`b634efd`）；拆墙①/②（`f23954d`、`ec068b9`）；封板 #8（`1b66dec`+`14f6678`）；今日灵感①/②（`c5fa1bf`、`67cb311`）；拆库①/②（`98cd3ed`、`24e97af`+`97e557a`+`60a8c43`）；**拆库③ #16 封板（本轮）**——复审补强 `391d654`（productBranch 闸门覆盖合回路径）。
- 封板回归快照（2026-09-02 当轮实测）：拆库形态（env 设置）`pnpm test` 713/713 pass、0 fail；回退形态（env 缺席）712 pass + 1 skip（知识检索集成用例按设计安静跳过）；`pnpm run verify`（env 设置）通过（Repository verification 341 files——拆库前 1655，代码仓已零知识内容；active docs 8 files）；`git diff --check` 通过。验收证据：知识仓 `ops/acceptance/repo-split/`。
- 当前回归基线（2026-09-04 #17 当轮实测）：双形态 `npm test` 全绿——默认形态 748/748 pass；显式 `SYNO_KNOWLEDGE_ROOT=.runtime-test-knowledge` 形态 747 pass + 1 skip（既有）、0 fail；`node scripts/verify-repository.mjs` 通过（346 files）。
- 兼容要点：效应幂等键保留 `<none>` 段字面量，跨重启去重连续；历史 Job/Workflow/Note 的 projectRef/project_refs 字段保留只读（契约留 optional 属性供旧记录 round-trip，读取方忽略，不再写入）。
- 运行态：8888 Host 运行代码=main HEAD（#17 全链：L0b+L2 `8d13c30` 于 12:38 部署——树钉起栈法；P1 `faedbe6` 于 14:34 部署——Owner 指令豁免封板闸门，标准停-杀-启，DSH 子进程同轮重孵化新 pid；生产新格式 `tick.completed{lockWaitMs,decideMs,composeMs,commitMs}` 稳定，两次部署后均零 tick.failed）；`/api/health` ok；dsh-web:3088 在听；kimi-webbridge daemon（10086）在线。微信轮询新格式锁正常、心跳新鲜。**09-02 的验收阻塞已全清**（token 刷新 + 锁 PID 复用修复上线）。#11 验收快照：Day 1（09-02）12:30 首卡全链路一次成功 + 反馈口令落账（useful）；Day 2（09-03）预算饥饿缺陷发现→B1 修复→13:29 当日补卡首投即成 + 15:03 反馈二次落账（useful）；稳定性重计 Day 1（09-04）12:31 卡准点出（attempts=1 首投即成，旧代码取证干净，随后才部署重构）。灵感卡每日 12:30 出卡，回「有用/没用/一般」即可（**P1 已于 14:34 部署：反馈改走 `syno_inspiration_record_feedback` 工具 LLM 路由，handler 确定性拦截已删**——09-03 两条反馈证据属旧机制，归因已在验收档标注）。
- 运行时事实不变：产品只走 `DeepSeekHarnessCognitiveRuntime`；生产 chat = `dsh --profile syno --host 127.0.0.1 --port 3088 --no-open`，8888 是控制面；模型链 `deepseek/deepseek-v4-flash-vision-exp → deepseek/deepseek-v4-flash`，不使用 Pro；`SYNO_DSH_ROOT` clone 必须 `pnpm run build`；图片走 Host `syno_image_read`（Zen `mimo-v2.5-free`）；chat `web_search` 已启用。
- #19（验收期缺陷修复，`92a04f7`）：web client turn 结算竞态——工具轮次只投递 step-1 预告文本、step-2 最终答案丢弃（生产实证：host 状态流 idle 比 mux 事件流最终消息抢先 21ms）。修复=结算锚 mux 流 `turn/end`（`turn/start` 配对 + `promptAccepted` 门防陈旧帧自我污染），idle 降为无 turn/start 兼容面的静默期兜底（`turnSettleQuietMs=400`）；竞态复现测试 + 变异检查（旧码必挂）守门。**生产验证已通过**（Owner 确认收到完整答复；当时答复内容=公众号反爬拦截如实告知，催生 #20）。同轮运维（Owner 指令）：收录积压 20 条 pending 全删，5 条失状态 failed_retryable legacy workflow 翻 `failed_terminal`（`INGEST_STATE_PURGED`）收束；机制 gap 留档：failed 态混入 pending 信号，#17 后评估。
- #20（`9b00e90`）：fetch_url 内置浏览器升级——直抓命中反爬验证码墙（微信 wappoc_appmsgcaptcha 重定向/「完成验证后即可继续访问」正文特征/短正文验证码特征）或 HTTP 401/403/429 时，活聊天上下文（weixin/feishu/web）自动改用主人本地浏览器（kimi-webbridge BrowserCaptureAdapter）读取，对模型透明（工具数不变）；确定性 `workflow-chatread-<sha256(owner|thread|url)[:16]>` 支撑主人说「继续」原地续抓（observation→continue→过期重开）；scheduler/proactive/capture 后台上下文绝不升级（不在主人不知情时开浏览器标签）；interaction_required 与 daemon 不可用均如实降级。测试 7 条新增（墙检测/升级/门禁矩阵/续抓/降级），文件 13/13。
- #21（`f8e2cca`）：聊天工具面摘除 11→6——约 115 轮生产会话实证审计零调用，摘 `workflow.context`/`capture.status`/`capture.list_pending`/`jobs.list`/`jobs.submit`；保留知识三件套（search/read_snippet/fetch_url）+ `today.read` + `capture.start` + `image.read`。收窄面=CORE_CHAT_TOOL_NAMES 单点（plugin toolSet=core 过滤 + cognitive-runtime 双闸门自动生效）；ToolRegistry 注册与 BRIDGE_TOOL_NAMES 不动（收录 workflow 显式 allowedTools 独立）；**FALLBACK_TOOLS 不动**（落码前实证纠正了计划：capture cordis 无 toolSet 走 all，降级目录需全量）。Skill 文档同步死引用：syno-knowledge/syno-maintain 的 canonical 规则改走 vault 检索（workflow.context 本就读 99-System canonical 文件，同事实源）、syno-capture 进度改靠确定性推送、syno-create 保存走 capture.start。supervisor 测试加防回流断言。**生产终验已通过**（20:18 Owner 重发链接：直抓仍被拦→浏览器升级真实命中→无需人工验证→结构化总结送达，会话存证 turn 14；同轮在 6 工具面下运行正常）。
- 下一步：#11 今日灵感③ 验收续跑——触发/投递/反馈路由/次日出卡四项已验，连续多日稳定性重新累计中（09-04 = Day 1 重计，目标 ≥3 天，证据落知识仓 `ops/acceptance/inspiration/`）后封板。#17 **全链已部署**（Owner 2026-09-04 指令提前开工，14:34 再豁免封板闸门直部 P1；设计冻结于 plans/idempotent-knitting-toast.md）：L0b+L2 `8d13c30` + P1 `faedbe6` 均在产线；live eval 3/3 部署前预跑通过。tools/list 直接探针不可行（bridge token 每 boot 随机、仅存 DSH 子进程 env），改为构造性论证：host 侧注册无条件（runtime.mjs 静态数组）+ DSH 插件 tools/list 失败时降级目录 FALLBACK_TOOLS 亦含该工具 + eval 走同 wiring 路径；**残余验证=主人下次有机口令落账**（watch `inspiration.feedback.recorded` 事件，12:37 日巡检兼看）。#17 挂账（封板后评估）：reconcileOutbox 灵感标记死路径（apply 删条目后才取 pending）；failed 态混入 pending 信号（#19 留档）；capture 侧 browser×5 收敛；registry 隐形工具审计；**state 无 GC 缺口**（job-payloads 128/accepted-requests+payloads 102×2/capture-chunks 15 均无 retention 代码，无限增长——对照 channel-outbox cleanupExpired 与日志 14 天保留正常）；**pendingBundles 无 TTL 扫描**（27 条陈旧、最老 08-08，仅靠 cap 挤出，不阻塞新卡——signalVersions 绑定日期身份）。2026-09-04 物理清理：`.runtime` 2.5GB→80K（8 个历史 fresh-clone 验证副本+诊断日志删除，全部 gitignored 可重建；副作用=通知中心历史随之清空——`paths.mjs` runtimeRoot=repo/.runtime 系设计内一次性运行时状态，15:14 起 L2 reconcile 回补已重建 17 条）；18 个已 merged 历史分支（codex/exec-*、round3-remediation、feat/project-*）删除，commit 全可达零损失。注意：本会话 shell 不继承用户级 `SYNO_KNOWLEDGE_ROOT`（注册表已设，新开终端/登录任务会继承）；双仓回归需显式 env 或新开终端。
- 停止条件（计划 D8）：任一阶段若需删除 Job 治理链、改动渠道去重/Outbox 语义、批量改写 vault 历史笔记，立即记录 `BLOCKED_SCOPE_DEVIATION` 并暂停回 Owner。
- 提交规则：按 Job 声明精确路径暂存；禁止 `git add -A`；不自动 Push；commit 结尾不加 Co-Authored-By；跨仓库 git 一律 `git -C` 绝对路径。

## 2026-08-26 历史交接：Project-aware DSH Phase 5（已 SUPERSEDED，仅追溯）

> 2026-09-01 注：Project-aware MVP 已随产品方向决策关闭为 SUPERSEDED；本节中 Project 闭环、`/project` 指令、Project 读取边界、PROJECT_BOOST 与 Phase 5 状态均不再描述当前产品，仅作历史记录。

- 基线分支/提交：`main` / `f6d2126`（`feat: switch to vision-capable DeepSeek model chain`）。当前实施分支：`feat/project-aware-dsh-phase5`，当前代码/测试 HEAD：`f2718f1`；后续 docs-only 提交不改变该 live 证据对应的实现提交。本阶段尚未自动 Push 或 merge。
- 当前实现已新增 Syno 侧 `apps/syno/syno/deepseek-harness-jsonrpc-launcher.mjs`，Supervisor 会检查完整 Capture/Chat DSH runtime closure，并在本地 staging 中调用 DSH 已有 `runJsonrpcAgent(bareModuleBaseUrl)`；由 `SYNO_DSH_ROOT` 指向的外部 Harness clone 未修改。
- 已提交阶段：Phase 0 `5c3b8e2`、Phase 1 `6ca3dae`、Phase 2 `04a792e`、Phase 3 `b569825`、Phase 4 `3362336`。
- 前序文档/边界修复提交：`80d21ce`、`d14bbde`、`cd785a0`；本阶段已提交 `80f4aa7`（文档）、`ae71e96`（适配）、`59e2cf7`（live 测试）、`0cad3b0`（证据状态）、`349bc80`（Capture fixture）、`77ba38c`（最终证据与交接文档）、`21e3c78`（Project 工具 live 覆盖）、`487b3e8`（可收录 Capture 素材）、`72a8d76`（证据刷新）、`3e1d961`（closure 入口与 Web 状态修复）、`0398c54`（当前 live 证据刷新）、`0dbaab5`（真实 Agent/清理探针）、`a48562d`（live 超时预算）、`b81366b`（自有 DSH 进程树清理）、`32ab1cd`（Agent/Bridge 脱敏证据）、`356d612`（正确 Agent 工具授权）、`f2718f1`（真实外部 DSH checkout 只读断言）。
- 当前代码闭环：Project → 显式 `/project <ref>` → trusted execution context → Job/Workflow/Proposal → Note `project_refs` → KnowledgeStore `PROJECT_BOOST = 3`。
- 基线回归为 `pnpm test` 749/749；本阶段当前 `pnpm test` 为 757 tests、755 passed、2 skipped（两个显式 live case）、0 failed；`pnpm run verify` 通过（Repository verification 1645 files、active docs 9 files），`git diff --check` 通过。旧的 731/731、737/737、755/753+2 仅保留作历史基线。
- 模型链固定为 `deepseek/deepseek-v4-flash-vision-exp` → `deepseek/deepseek-v4-flash`，不使用 Pro；用户级 `DEEPSEEK_API_KEY` 当前由宿主环境提供。doctor 只报告存在性，不输出 key。
- 官方 DeepSeek 真实验证已通过：模型列表包含 vision-exp；vision-exp 文本请求和图片请求成功，仓库绿色测试图片的视觉判断返回 `GREEN`。这只证明官方模型能力，不等于真实 DSH/Project 召回验收。
- `pnpm harness:doctor` 当前报告 `runtimeClosure.ok=true`、`missing=[]`、`kind=syno-jsonrpc-adapter`；最终真实 JSON-RPC sidecar 已完成 `initialize` 和 Capture round-trip，生产 Web Agent 已分别在 Project A、无 Project、Project B 上实际调用 `syno_knowledge_search`，真实 Web chat 已观察到官方 `web_search` 工具调用；最新 live 证据还直接断言外部 DSH checkout 前后均 clean、无变更。证据仍是 `PARTIAL`，因为 Owner 主观召回观察未回填。
- 外部 DSH clone 在 Windows 上 graceful protocol shutdown/EOF 可能触发其自身 libuv assertion；Syno 对自己创建的 JSON-RPC/Web 进程使用有界 process-tree termination 清理，最终 live 测试命令已正常退出。未修改外部 clone，后续只需关注生产重启/崩溃观测，不将外部 assertion 当作成功。
- Phase 5 仍为 `IN_PROGRESS`：最终测试文件已完成真实 DSH 模型、搜索、Project `create/list` Tool Bridge、Capture round-trip、A/B/no-Project 技术对照和外部 checkout 只读断言；最新脱敏证据为 `jsonrpc-20260826T153428Z.json`、`web-search-20260826T153523Z.json`，两个 case 均独立退出码 0。下一步只需 Owner 观察/结论回填，不得把技术证据单独标记为 `DONE`。
- 当前三条运行路径：生产 Web chat = `dsh --profile syno --host 127.0.0.1 --port 3088 --no-open`；Capture/Ingest = Syno 监督的 JSON-RPC sidecar；图片读取 = Host `syno_image_read`（Zen `mimo-v2.5-free`）。直接 DSH `ImageAttachmentRef` bridge 延期到 Phase 6。
- 旧页面曾在隔离测试 Host `http://127.0.0.1:8898/` 完成一次非规范浏览器 smoke，仅记录页面可访问和 malformed `/project` 的确定性错误。Web 页面即将重构，当前 UI/DOM 不属于 Project MVP 验收契约；Project A / 无 Project / Project B 的 Job、Workflow、Note、检索排名和错误隔离以测试文件、Schema 和运行时回归为准。技术对照已记录到 `ops/acceptance/project-aware-knowledge-mvp/jsonrpc-20260826T153428Z.json`，Owner 观察仍待回填，不因未完成而扩展 Session inheritance、Usage、Health、UI 或迁移。
- PendingDecision、AcceptedRequest、Unknown Case、Reconciliation Case、jobs.list/goals.list 和近期交互均已补上 Owner/Project 读取边界；裸的“确认/刚才那个”不会隐式继承 Project，Project-bound 决策必须再次显式 `/project <projectRef>`。
- Job ID 直达的 advice/approve/reject/cancel/retry 已补上 Owner 校验；Project-bound 的 approve/reject/cancel/retry 和 legacy Weixin 批准也必须显式带匹配的 Project 作用域。旧页面无作用域按钮不属于当前 MVP 兼容契约。
- 残余边界：显式 Project 不会自动切分 DSH Session 历史；同一会话切换 Project 时历史文本仍可能存在，但不作为服务端授权。若要求强会话隔离，后续需单独设计 Session 分区/压缩，不在本 MVP 内修改 Session Binding Store。
- 明确 deferred：Session/跨渠道自动继承、Usage、Learning feedback、Today/Planner 项目化、Area、PARA UI、Project UI、旧 Note 项目关联、Vault/Goal migration。
- 停止条件：若必须修改全局 `activeProject`、DSH Session Binding Store、模型 projectRef 输入、整个 frontmatter parser、旧 Note 批量迁移，或破坏 Owner 隔离/无 Project baseline，立即在执行计划记录 `BLOCKED_DESIGN_DEVIATION` 并暂停。
- 真实 DSH 未证明价值时记录 `MVP_VALUE_NOT_PROVEN`，不通过新增复杂排序、Session 继承或 Knowledge Health 功能补救。
- 本阶段不实现 Web/DOM、Session/跨渠道自动继承、Usage、Knowledge Health、Today/Planner/PARA/Project UI、旧 Note 关联、Vault/Goal migration 或直接 DSH 图片附件桥接；提交必须按 Job 声明精确路径暂存。

> 以下历史交接内容保留用于追溯，不是本 Project MVP 的当前分支、HEAD、测试数字或下一步依据。

> **2026-08-21 当前运行时（先读这个）**
>
> 产品只走 `DeepSeekHarnessCognitiveRuntime`。生产 chat = 受控 `dsh --profile syno --host 127.0.0.1 --port 3088 --no-open`；8888 是控制面。微信与 3088 同一 Harness Session。事件流是 WebSocket（GET `/api/events.*` → 426），不是 SSE。本机 `SYNO_DSH_ROOT` clone 必须 `pnpm run build`。生产 permission 表只准 `workspace-write` + `never`，禁止 `danger-full-access`。完整踩坑：`docs/OPERATIONS.md`「DeepSeek Harness 生产 chat」。根契约：`AGENTS.md`。
>
> 下文关于 OpenCode 1.18.2 / 4318 / Zen Token、`codex/exec-p10-r6-seal`、「不要 Push」的条目是历史交接，不再是当前启动或提交规则。当前默认分支是 `main`。

> 2026-08-20 产品认知内核已切到唯一的 `DeepSeekHarnessCognitiveRuntime`。下文关于 OpenCode 1.18.2 / 4318 / Zen Token 的条目是历史背景，不再是当前运行时。
>
> 2026-07-30 最新断点已迁移到 `docs/handoff-pr10a-2026-07-30.md`。下一位 Agent 必须优先读取该文件；本文件其余内容仅作为历史背景，分支、HEAD、测试数和待办以新交接为准。

## 当前实施入口

- 审查基线：`567f23d2d9b423a98d0e88868c6cc2eb3859d16f`。
- 当前实施分支：`codex/exec-p10-r6-seal`。
- 已提交阶段 HEAD：PR-04A0 `3c8fae5`、PR-04A `ad187cb`、PR-04B `3df84cd`、PR-04C/04D `7f094c4`、PR-05/06 `b813764`、PR-07A `e63b5e9`、PR-07B `043d3ba`、PR-08 `fd34708`、PR-09 `f9d9206`。
- PR-10 当前实现提交：`3d67f112`，R6 自动证据待随本提交更新，任务重启与 Host lock 身份证据在 `ops/acceptance/pr-10-r6-seal/`。
- 诊断聚合与完整回归提交：`80e60a6`，Node 520/520；陈旧 Host lock doctor 恢复证据在 `ops/acceptance/pr-10-r6-seal/lock-recovery-2026-07-29.json`。
- 严格 readiness 与移动 Unknown Resolution 提交：`d24f492`、`dc98e7c`；Windows lock 身份修复提交：`3d67f112`；最新 Node 523/523、fresh clone 523/523、Python 3.11 Vault 57/57。
- 微信、飞书是主要日常入口；AcceptedRequest、ChannelDeliveryOutbox、Effect Receipt、Unknown Case、Decision、Ephemeral Capture 和持久 Chunk 已实现，PR-04A/04B 已接入受门控的 `legacy/shadow/v2` runtime seam，但生产切换与 Owner 实测仍未完成。
- PR-10 只生成 Owner 验收模板和只读 readiness；未取得 Owner 手机、真实渠道和 Windows 冷启动证据前，不切换移动生产路径、不删除 Legacy、不标记 Goal complete。
- 执行语义见 `docs/adr/0003-execution-semantics.md`，移动交付见 `docs/adr/0004-mobile-delivery-contract.md`，迁移规则见 `docs/adr/0005-schema-migration-policy.md`。

## 当前 Goal 状态

- Goal：按 `docs/TODO-EXECUTION-PLAN.md` 实施 PR-00～PR-10。
- 当前状态：PR-10 R6 门禁准备中；Owner 真实微信/飞书、跨渠道连续性、Unknown/Decision、PDF/DOCX、Windows 下次登录仍是不可由自动化替代的门槛。
- 不修改 `vault/` 内容或原始 Obsidian 仓库；每个 PR 精确暂存，不 Push。
- 最新自动回归：Node 523/523、Repository verify 1464 files、active docs 7；fresh clone Node 523/523、verify 1461 files、Python 3.11 Vault 57/57；R6 readiness automatedPassed=true，但 Owner 验收未通过，Goal 保持 active。计划任务当前 Running，Host lock 身份核验通过，但 Windows 冷启动仍未由 Owner 验收。

## 新对话第一句话

> 完整读取根 `AGENTS.md` 和 `docs/OPERATIONS.md`「DeepSeek Harness 生产 chat」。当前内核是 DeepSeek Harness（3088 Web + 8888 控制面），不是 OpenCode。先核对分支、HEAD、`SYNO_DSH_ROOT` 是否已 build、工作树，再动手。不要 `git add -A`。未要求时不要 Push。本文件其余章节是 2026-07 历史交接，不要按其「OpenCode / 4318 / 不要 Push 作为永久规则」执行。

## 历史基线与兼容信息

- 分支：`codex/exec-p10-r6-seal`
- 本轮固定起点：`f0333f3`
- 已完成实现提交：`5890dad`
- OpenCode CLI：`1.18.2`
- OpenCode 实际二进制：
  `%LOCALAPPDATA%\mise\installs\node\24.13.0\node_modules\opencode-ai\bin\opencode.exe`
- OpenCode 子进程端口：`127.0.0.1:4318`
- 当前可信执行 HEAD：`3d67f112d7e7101192f70d89c3ea5f2e99a186b9`；本轮 PR-10 分支从 `f9d9206` 派生，R6 模板仍待 Owner 填写。
- mise shim 后台启动会递归，禁止作为生产启动目标。
- Windows 计划任务 XML 加固前的 OpenCode 自动验证：Node 370/370、vault pytest 57/57、Repository verify 1358 files。
- Windows 计划任务 XML 加固后的基线验证：Node 375/375、vault pytest 57/57、Repository verify 1359 files、`git diff --check` 通过。
- OpenCode 启动死锁与运行日志修复后的历史验证：Node 381/381、vault pytest 57/57、Repository verify 1365 files、`git diff --check` 通过。
- 当前工作树 P4.0–P4.6 自动门禁：Node 454/454、vault pytest 57/57、Repository verify 1396 files、`git diff --check` 通过。
- 历史只读运行态（2026-07-28 约 22:26 CST 复核）：当时任务曾为 `State=Ready`；该快照不代表当前状态。
- 当前只读运行态（2026-07-29 21:13 CST）：Syno Host health/readiness 为 ready，Windows 任务 `Syno=Running`，微信/飞书 connected；Host lock 通过 Windows 进程启动时间身份核验。Windows 下次登录冷启动仍待 Owner 验收。
- 当前差异 fresh clone `.runtime/p3-fresh-final-1785229932`：Node 433/433、vault 57/57、Repository verify 1378 files；按锁文件安装成功，排除了两项主人知识变更。
- 真实无模型 OpenCode 探针已通过 1.18.2、loopback、Basic Auth、Session create/abort/delete、静态 `syno` MCP 和禁止内置工具不可调用。
- 主人已明确授权将全局 OpenCode 配置中的可用凭据一次性迁入 Syno DPAPI；产品运行时不会自动读取或依赖全局 `auth.json`。
- 真实免费模型、渠道与 Windows 登录恢复仍由主人验收，不能把凭据已配置、Fake/无模型探针或 XML 单元测试表述为真实产品验收。Windows 任务的真实安装、状态和受控重启已由本轮验证通过；下次登录冷启动仍未验证。

## 必须保留的主人变更

以下两项不属于 OpenCode 重构，禁止覆盖、暂存或提交：

- `vault/02-Resources/AI and Agents/MOC - Agent 架构与工程.md`
- `vault/02-Resources/AI and Agents/Agent Design & Patterns/当编码不再是瓶颈 - Berkeley RDI 软件自主开发三级框架.md`

## 已实现（本轮新增）

- AcceptedRequest + DPAPI 恢复载荷、ChannelDeliveryOutbox、Effect Receipt/Unknown Case、RecentInteraction/Decision presentation。
- OpenCode Session 状态可知性、abort unknown 冻结、保守 fallback 和过滤消息复制策略。
- Capture ephemeral Session、持久 Chunk Manifest、重启恢复、策略失效、coverage、优先级/Aging/Provider/预算门控。

## 已实现（历史）

- OpenCode Supervisor、真实二进制解析、版本锁定、Basic Auth、loopback、独立 profile、自有 PID 树。
- `opencode:doctor/status/restart/configure` 与真实 Server 探针。
- `OpenCodeCognitiveRuntime` Capability v2、Session binding、跨渠道 main Session、主动 proactive Session、串行、取消、保留清理和固定三模型链。
- 项目级 `syno` Agent 与 capture/knowledge/learn/review/create/maintain 六个 Skills。
- 静态 Syno MCP Tool Bridge；OpenCode 只能调用 ToolRegistry 允许的 `syno_*` 工具。
- 统一渠道处理器、受控执行（含冲突澄清）与 Owner/thread/TTL/digest/replay 边界。
- SourceDescriptor 与 URL/文件/个人观点/未知来源收录追溯。
- Web OpenCode 状态、独立 Zen Token 配置和重启入口。
- 根 `AGENTS.md` 已移除 `hy3-free` 与 Claude 自动升级规则。
- Token 由 DPAPI 保存，并通过内联配置引用子进程环境变量，不进入参数或状态元数据。
- 活跃旧会话迁移只保留脱敏摘要和最近用户消息；私密内容、工具输出和密钥不进入 OpenCode。
- `waiting_provider` 有周期恢复；并发后台/手动重试只能有一个调用取得 Job 执行权。
- Proposal 修改会取消旧 Job；附件正文不能触发写入。
- 当前差异已完成 Standards / Spec / Security 最终复审，均为 P0 0、P1 0。
- Windows 安装器已改为通过 `Syno.WindowsTaskXml.psm1` 保护并验证任务 XML：固定单一登录触发器、30 秒延迟、执行身份、命令、参数、工作目录、单实例、隐藏运行、无限执行和每分钟重启。现有健康任务只有在导出 XML 通过同一契约后才可复用。
- 2026-07-28 修复 Syno/OpenCode 启动循环等待：OpenCode MCP bootstrap 路由不再等待正在依赖它完成的 `synoReady`。真实 Host 已验证 8888 健康、OpenCode 1.18.2 在 4318 `ready/healthy=true`，微信/飞书恢复连接。
- 新增 `%LOCALAPPDATA%\Syno\logs\syno-runtime-YYYY-MM-DD.jsonl` 脱敏运行日志，按天写入、保留 14 天；不记录对话正文。OpenCode 不可用现在按可重试 Provider 故障持久排队，不再只返回“尚未运行”。

## 当前断点

1. PR-00～PR-09 的自动门禁已分阶段通过；PR-04A/04B 生产切换、P4.7/R6 真实验收仍待主人执行。
2. 可信提交基线为 HEAD `f38ab18`；当前未提交差异已完成 454/454 全量回归，不把提交基线冒充为当前实现证据。
3. R4.1–R4.7 的主要代码已经位于未提交工作树：持久 Workflow、Context Compiler、capture Session、Outbox、统一渠道、canonical Proposal、受控写入和闭环候选均已实现。
4. 复审中发现的 P1 已修复：拒绝意图先落盘；恢复先核对 Job 状态，已拒绝 Job 不重发 Proposal。
5. P3 浏览器 CLI/本地 4329 页面受当前 Codex 浏览器安全策略拒绝，未将桌面、390×844、控制台或真实冷启动表述为通过；UI 静态测试和 fresh clone 自动门禁已通过，真实页面与设备验收移交 P4。
6. `docs/TODO-EXECUTION-PLAN.md` 的 P4.0–P4.6 已执行：自然语言意图路由、动态能力说明、项目级 `syno-web-capture` Skill、受限 `syno_browser_*` Tool Bridge、Coordinator 自动指派、可观察性与 Doctor；Node 24 pinned DNS `lookup` 和 Kimi `/command` envelope 兼容性已修复，并用真实 OpenRouter 直抓、知乎 403 WebBridge 兜底复验。
7. Windows 任务已真实注册并通过安装/状态/受控重启：使用真实 `node.exe`，等待 8 秒仍为 `Running`，Host 健康，启动器日志已落盘。本次复核补充：任务现已回落至 `State=Ready`、未运行，`LastRunTime=2026-07-28 20:31:19` 以 `0xC000013A`（控制中断）退出；不要把当前 8888 上存活的手动启动 Host（PID 14368）当作任务 `Running` 或下次登录恢复证据，退出根因需在冷启动验收中确认。
8. 架构已根据主人反馈修正：OpenCode 会真实加载项目 Skill 并完成多步浏览器抓取；Syno 仍持有授权、URL/动作边界、Workflow 状态、决策和写入控制。全局 `kimi-webbridge` 仅作为上游方法与版本参照，不作为隔离运行时的隐式依赖。
9. OpenCode fork/clone/read 真实能力未验证，当前策略为 `retain_current_session`；不得据客户端类型声明升级。
10. PR-10 `ops/acceptance/pr-10-r6-seal/owner-acceptance.json` 仍为 `pending_owner`；主人完成全部门槛前不得删除旧实现。

## 当前运行态探针记录

- 只读审计发现两条由本轮本地探针生成、尚未批准的收录 Workflow：
  - `workflow-6815e55b-910e-4471-b39d-127c88f4ce13` → `job-20260728-b23773b7`，浏览器兜底完成，等待一次审批。
  - `workflow-ff1a1323-53b6-46f4-ba60-a25c7578a581` → `job-20260728-c602fa26`，直抓完成，等待一次审批。
- 另有三条失败可重试探针：`workflow-72291c26-ac63-4efc-9095-44ba5ab403de`、`workflow-63fc7419-a1a8-4781-94f0-f408372d6e76`、`workflow-95428c90-0417-4cb5-a95a-10c9df6e13e5`；以及历史终态失败记录。不得代主人批准、删除或写入 vault，若需清理必须由主人明确决定。
- 2026-07-28 约 22:26 CST 本次复核确认：上述两条待审批 Job 仍为 `awaiting_approval`、`approvalsReceived=0`（`job-20260728-b23773b7` code `4286FE`、`job-20260728-c602fa26` code `23C10B`，均 `channel=web`、`ownerKey=local-user`），`changedPaths=[]`、未写入 vault；运行态与上一轮记录一致。

## 当前未提交实现范围

- 新增领域/运行模块：Workflow Coordinator、Context Compiler、Capture Analysis、Outbox、Runtime Journal、DLP、canonical tags 和 post-ingest candidates。
- 修改渠道、Runtime、OpenCode、审批、收录、知识、来源、操作注册表、契约、Skill 与测试。
- 文档同步与执行代码均位于当前未提交工作树；自动门禁已通过，真实渠道、浏览器交互和 Windows 登录恢复仍未验收。
- 不得覆盖或暂存“必须保留的主人变更”两项知识文件。

## 下一轮执行顺序

1. 重新读取 `AGENTS.md`、本文件和权威 TODO，核对 HEAD/工作树并创建承接 Goal。
2. 已完成 Outbox 语义、来源 Adapter 和组合回归。
3. 已完成 Standards 首轮及 Spec/Security 修复复审，当前 P0/P1 均为 0。
4. 已完成当前差异完整自动门禁和 fresh clone。
5. 主人按 TODO 的 P4.7 清单执行自然语言会话、普通 URL、浏览器兜底、交互恢复、仅本地、跨渠道收录、自动执行/澄清和下次登录冷启动验收；Windows 安装/状态/受控重启已有本轮证据。
6. 记录每次 Artifact/Workflow/Job、日志事件和实际结果；失败项回到对应 P4 子阶段修复。
7. P4.7 全部通过后才规划 P5/R6，删除旧 Runtime 前必须重新三轴审查和完整回归。

## R6 封板门槛

旧 Provider/ToolLoopAgent/ContextManager/ConversationStore/Executor/Hermes 代码尚未删除，且现在不允许删除。必须先完成：

- 30 条真实跨渠道消息
- 10 组多轮追问
- 5 次 ToolRegistry 调用
- 3 次明确写入自动执行（含高风险：删除/覆盖/移动/新 MOC/新 tag）
- 3 次系统歧义澄清（收录撞重/多方案/信息不足）
- 1 次收录多方案澄清
- 1 次源码越界硬拒绝
- 1 次自我修改开关（allowSelfModify）关闭拒绝
- 1 次系统控制开关（allowSystemControl）关闭拒绝
- 3 次副作用恢复/对账（对应 S1 Effect Receipt，待 S1 落地后补验）
- 3 种来源类型收录
- OpenCode 重启后上下文与 PendingDecision 恢复

完整状态、接口、测试矩阵和执行顺序以 `docs/TODO-EXECUTION-PLAN.md` 为准。
