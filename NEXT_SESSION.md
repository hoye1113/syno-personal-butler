# 下一会话启动指令

## 2026-07-20 重启交接：知识库迁移正在第一轮基础设施封板

### 当前必须先知道的事实

- 当前分支仍是 `codex/round3-remediation`，固定实施起点 `a78e713`；已提交迁移基础设施首版 `64dc6c8 feat: add audited vault migration pipeline`。不得 reset、checkout、修改原库或 Push。
- Codex 全局 Goal 已重新建立并处于 `active`：完成原知识库只读单向迁移、知识闭环初始化、三轮审查和全产品封板。
- 当前工作树有 **7 个未提交实现/测试文件**，均属于第一轮审查修复：
  - `apps/syno/syno/knowledge-store.mjs`
  - `apps/syno/syno/runtime.mjs`
  - `apps/syno/syno/vault-migration-service.mjs`
  - `contracts/migration-manifest.schema.json`
  - `scripts/vault-migrate.mjs`
  - `tests/knowledge-and-git.test.mjs`
  - `tests/vault-migration.test.mjs`
- 另外，本交接会修改 `NEXT_SESSION.md` 和 `docs/HANDOFF-EXECUTION-PLAN.md`。只能精确暂存这些路径，禁止 `git add -A`。
- **尚未执行实际迁入**：没有 submit、没有迁移审批、没有 apply；当前 `vault/` 未被本轮 Manifest 写入。

### 最新有效 Manifest

- 只使用：`migration-20260720-df900fe7`
- 本机路径：`.runtime/migrations/migration-20260720-df900fe7/manifest.json`
- digest：`83ad621478e222e2f184defb08b2dc3d3fab655d7cebb1d0f3df6182fa22a5ee`
- 源 HEAD：`883fbf5c457156805b9e9b53358175ce84940b59`
- 源 dirty entries：19
- 结果：import 454、conflict 4、identical 19、excluded 5；content 438、integration 16、duplicate source groups 9。
- 5 个 excluded 是 4 篇敏感内容候选和 1 个缺失 PNG 引用，不能擅自放行：
  - `01-Areas/AI Agent Development/Super Agent 实战课/05-Skills Plugins Channel/5-3 Channel 抽象——让 Agent 活在飞书群里.md`
  - `01-Areas/AI Agent Development/Super Agent 实战课/07-部署/7-1 收官——配置系统、CLI 入口与部署上线.md`
  - `02-Resources/AI and Agents/Loock AI 全栈应用开发/2-LangGraph.js 教程/2-6 节点设计.md`
  - `02-Resources/AI and Agents/Loock AI 全栈应用开发/3-Next.js 基础/3-9 中间件与认证模式.md`
  - `99-System/Attachments/1772372691239-7f8d2bf1-8f38-4023-ab9c-7eeed69251c3.png`（源中缺失）
- 旧 Manifest `56d19bd7`、`09ec9d47`、`db22c3c7`、`aec821ac`、`a58bd56e`、`439ecbcb`、`7d5745ab` 全部仅作调试历史，禁止 submit/apply。

### 已完成的安全与语义修复

- 源扫描改为知识目录白名单；隐藏目录、控制目录、credentials/secrets 不扫描，`.env` 等无关路径连文件名都不进入 Manifest。
- Git 探针使用 `--no-optional-locks`、`GIT_OPTIONAL_LOCKS=0` 并关闭 fsmonitor/untracked cache；真实原库 `.git` 前后 SHA-256 树摘要一致：`571894E7ACCA214F090FDE13A9CAA25E7EDE0CDC76F5B47C305DD77EEEB0138A`，dirty entries 前后均为 19。
- Job payload 锁定 Manifest digest；submit 只接受 ID，phase 和 digest 由服务端选择；旧 Manifest 遇到新增/修改源文件、Git 快照漂移或目标漂移会 fail closed。
- 源、staged、vault 目标与 `ops/artifacts/migrations` 审计路径逐段拒绝 symlink/junction；已有 junction 回归测试。
- 附件只收录实际引用、MIME/扩展一致且在 10 MB 单文件/50 MB 总量内的文件；缺失或歧义引用显式进入 excluded。
- fatal UTF-8 解码；非法编码不会生成替换字符副本。
- frontmatter 保留全部原标签到 `legacy_tags`，记录重复字段原值；created 使用原字段、Git 首次出现日期、文件时间顺序。
- 文件名冲突使用确定性 hash 后缀；路径型和短 wikilink 同步更新；拓扑区分 incoming/outgoing，excluded 笔记不参与连接。
- conflict 固定 `keep-syno` 并带双方 hash/首差异行摘要；重放不会覆盖首次迁移审计。
- 中文/Unicode 二元词索引写 `.runtime/knowledge-index-v1.json`，默认检索隐藏测试、审计和系统协议噪声，并返回命中原因、状态与质量信息。

### 测试与审查状态

- 最终工作树完整 Node 回归：189/189 通过。
- 最终工作树 vault pytest：57/57 通过。
- 最终工作树仓库验证：635 files 通过；相关 JS `node --check` 全部通过。
- 迁移专项 15/15 通过；quoted-key `secret-bearing` 定向回归 1/1 通过。
- 第一轮 Spec 复核已明确 P0/P1 = 0。
- 第一轮 Standards 最终复核已明确 P0/P1 = 0；JSON/YAML quoted credential key 已修复并新增 `"bot_token"` 回归。重启后仍须重跑完整回归，确认最终工作树整体状态。
- 项目没有 `typecheck` script；不要把 `ERR_PNPM_NO_SCRIPT` 误记为类型失败。现有 JS 以 `node --check`、Node tests、`pnpm verify` 验证。

### 备份与未决用户数据

- 迁移前完整 Git bundle：`C:\tmp\syno-pre-migration-a78e713.bundle`
- SHA-256：`2D7A22B7571C3857CB170ED135E2112897C6D602ACCE0731821654DF540161B0`
- 非凭据状态备份：`C:\tmp\syno-state-pre-migration-a78e713`，`credentialsIncluded=false`。
- 现有 Claim Job `job-20260720-3168722f` 仍等待主人决定；两个相似 Anthropic MD Proposal 仍应形成合并/保留建议，禁止自动批准或丢弃。

### 重启后的精确执行顺序

1. 完整读取本文件、`AGENTS.md`、本文链接的权威计划和安全/架构文档；确认 Goal 为 active。
2. `git status --short` 和 `git diff --check`；不得丢弃上述 9 个交接范围文件的修改。
3. 运行 `node --test tests/vault-migration.test.mjs tests/knowledge-and-git.test.mjs`、`pnpm test`、`pnpm verify`、`python -m pytest vault/tests`、相关 `node --check`。
4. 记录第一轮 Standards 与 Spec 已达到 P0/P1=0；若代码再变，重新 inventory，旧 Manifest 立即作废。
5. 更新真实源 `.git` 树摘要和 19 条 dirty 状态证据；对最新 Manifest 做 preview 与数量/附件/排除项核对。
6. 精确暂存迁移基础设施及交接文档，创建本地提交；不 Push。
7. 让运行中的 Syno Host 加载新代码，再以 `pnpm vault:migrate -- submit --id migration-...` 创建 server-owned content Job。单审批完成并验收后，再由同一命令创建 integration 双审批 Job。不得绕过 Policy/GitGuard 直接 apply。
8. 实际迁入后开始第二轮数据审查：数量/hash/正文保真/冲突/索引/源库只读；随后初始化待批准 Goal、零掌握度学习队列、输出机会和轮换维护 backlog。
9. 继续第三轮全系统 Standards/Spec、fresh clone、浏览器、Provider、微信、飞书、Windows 自启动、备份回滚与最终 bundle；最后本地精确提交，不 Push。

1. 完整读取 `AGENTS.md` 与 `docs/HANDOFF-EXECUTION-PLAN.md`，再读取架构、策略、安全和设计文档。
2. 保持 `codex/round3-remediation`，不得 reset、checkout、修改原 Obsidian 知识库仓库或自动 Push。
3. R3-0 到 Windows 日历恢复的历史提交保持不变；三轮审查与最终复审修复为 `02d45b3`、`99b2ea2`、`0cc2669`、`a4ec17d`。`C:\tmp\syno-fresh-02d45b3` 在 `0cc2669` 上冻结锁文件离线安装下载 0 个包，Node 172/172、vault 57/57、仓库校验 617 项；`a4ec17d` 完成主工作树最终回归，真实计划任务和桌面/移动浏览器验收通过。
4. 已落地领域契约、单一 `CognitiveRuntime` 接口、原生 `ToolLoopAgent` 可信适配器、固定 Provider、收录/学习/创作闭环、微信/飞书 Adapter、Today 五入口 Web 与四层纸片法老。不要恢复旧 OpenCode 产品运行时或 3D 品牌方向。
5. 所有写入继续经过 Policy、审批、validator 和 GitGuard；Syno 永远不能修改自身源码。
6. 只精确暂存当前阶段路径，不用 `git add -A`，不 Push。
7. Hermes 候选锁定 `0f102fa4dc04b7dfdab048169aaaa640d09d7523`，但已确认会在 Chat Completions 外探测多个模型元数据路径，违反 Syno Provider 单端点契约，故该版本正式不采用且不得接触真实 Token。原生 Runtime 是唯一活动实现。
8. 用户级 npx、Playwright CLI 与官方 `@larksuite/cli` 1.0.72 已安装。主人授权后已从 OpenClaw last-good 认证档案直接迁移 token-cloud 到 Syno DPAPI；固定 `AIPC-deepseek-v4-flash` 五轮真实工具调用 5/5 通过。微信凭据已迁移，Owner 绑定、自动扫码、4/4 连续回复、故障恢复和 durable seen ID 跨重启通过。
9. 2026-07-20 已在 `bc5937b` 上重新完成 Playwright 桌面/移动复验；1280×720 与 390×844 均无横向溢出，Token 不回显、设置焦点恢复、减少动画规则和 0 error/0 warning 均通过。记录与既有截图索引见 `docs/BROWSER-ACCEPTANCE.md`。
10. 备份恢复 CLI、单向迁移、运维、已知限制、最终切换清单和验收矩阵已固化。真实状态归档 52 项、`credentialsIncluded=false`，空目录恢复成功且二次覆盖被拒绝；双渠道健康。当前代码完整 bundle 为 `C:\tmp\syno-repository-backup-a4ec17d.bundle`，24,197,710 bytes，SHA-256 `9046CAE6CAAFA3485609B5E86E97C853702E21BB46839CC75748184D01084088`；旧 `3c2b362` 归档仅作为历史恢复点。
11. 微信 Bot Token 与回复 context 已改为 DPAPI，加密凭据与可备份 cursor/去重状态分离；旧明文 JSON 首次加载自动安全迁移。微信/飞书真实探针必须 `--confirm-live`，拒绝命令行凭据且只输出脱敏状态；流程见 `docs/CHANNEL-ACCEPTANCE.md`。
12. 飞书 Owner 私聊事件先进入最多保留 30 天的 pending 状态，只有 Agent 处理和回复都成功后才写 durable dedupe；失败事件可自动重试或跨 Worker 重启恢复，成功消息跨重启不重复执行。
13. Provider 真实探针在五轮 token-cloud 调用前执行不触网的上下文、超时和离线故障注入，并要求随后仍由同一 Model ID 全部成功；此外真实 Job `job-20260719-461dea5d` 已因 `PROVIDER_HTTP_ERROR` 进入 `waiting_provider`，跨重启后由同一固定模型恢复完成，因此没有再人为中断整机网络。
14. 未批准的收录载荷与 Proposal 只保存在可重建本地状态；批准 Job 才在隔离工作树中一次写入 Artifact、Candidate、Proposal 和 Note。学习证据必须包含至少 20 字主人原始输出，并在同一审批 diff 中生成 Artifact。
15. ConversationRouter 将单一 Owner 跨 Web/微信/飞书映射到同一 Conversation，并按会话排他执行。SignalSourceRegistry 已接通到期 Claim、待收录、输出机会和维护信号；通知节奏、安静时间、每日复习数、五区顺序和紧凑显示均有实际消费者。
16. 微信登录页已移除手动“我已扫码确认”，改为自动状态轮询和过期重试；长轮询具备客户端超时、成功清错和动态服务端 timeout。只读聊天允许开发工作区保留既有修改，但通过 Git 内容指纹检测执行期篡改；可写 Job 仍要求干净主工作区。
17. 真实微信故障记录 `job-20260719-461dea5d` 曾进入 `waiting_provider`，2026-07-20 重启后由固定 `AIPC-deepseek-v4-flash` 恢复完成。`a390462` 起成功重试会清除旧 error/nextRetryAt；旧记录保留原错误字段作为历史证据。
18. 飞书消息主人扫码注册、4 条真实 Owner 私聊、真实 seen ID 重放拒绝和 Worker 重启恢复通过。飞书 user 日历「Hoye」已通过真实创建、同 event ID 双更新、清理、错误拒绝与恢复；本地日历选择通过单审批 Job 持久化。
19. `eef3ca5` 修复运行中健康 probe 误报：微信不再争抢 poller lock，飞书不再打开第二条长连接；两个真实 probe 均从本机 Worker 返回 `ok/configured/ownerBound/connected=true` 与 `source=running_worker`。
20. `9837366` 按真实 iLink 协议补齐图片/文件 AES-128-ECB 解密和固定腾讯 CDN fallback，解密后仍执行 10 MB、MIME/魔数与隔离规则；飞书 SDK 使用静默 Logger，曾含敏感请求配置的精确 `.runtime` 临时日志已删除且未进入 Git。
21. `2e1dfd0` 让 Windows 服务在未设置 `LARK_CLI_PATH` 时自动发现与 `node.exe` 同目录或常见全局目录的官方 CLI。真实服务重启后恢复 `Hoye`、valid、lark-cli 1.0.72；不再依赖启动终端环境。
22. `e02f62b` 让每条微信回复使用唯一 iLink `client_id`，保留 `-14` 冷却凭据并串行轮换 Worker；主人 4 条连续消息全部得到回复。`2dde18d` 将微信 MD/TXT/PDF 从通用 `curate_note` 审批改为 Artifact/Proposal 两阶段 Intake；错误 Job `job-20260720-36ee2701` 已拒绝。主人修复后直发 MD 收到 `artifact-20260720-ac6c5d41`，后台形成 `ingest-50964b42`、风险 additive、无重复匹配，建议 Note 尚不存在，附件外部验收通过。
