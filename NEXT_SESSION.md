# Codex 新对话交接（2026-07-20）

## 新对话第一句话

> 完整读取 `NEXT_SESSION.md`、根 `AGENTS.md` 和 `docs/HANDOFF-EXECUTION-PLAN.md`。检查当前分支、工作区、Host 和 Goal；如果新线程没有 Goal，请按本文“全局 Goal 原文”创建承接 Goal。从 `e8cc714` 的 Standards/Spec 审查与重新 inventory 开始继续。不要重用任何旧 Manifest 或失败 Job，不要修改原 Obsidian 库，不要绕过 Policy，不要 reset，不要 Push。

## 全局 Goal 原文

在 `codex/round3-remediation` 上完成 Syno 原知识库单向只读迁移与私人管家封板：先完成迁移基础设施双轴审查和完整回归，使用固定 Manifest 经 Policy/审批/GitGuard 分批迁入，初始化 Goal/学习/输出闭环，修复全产品缺口，完成三轮审查、fresh clone、Web/Provider/微信/飞书/Windows/备份回滚验收；不修改原 Obsidian 库、不重置、不自动 Push。

旧线程 Goal 当前为 `blocked`，原因只是连续三轮等待主人审批。主人随后已回复“全部批准”，批准并执行了当时已展示的 content Job。新线程不得把旧 Goal 标记 complete；若工具不跨线程保留 Goal，创建上述承接 Goal。

## 当前唯一可信状态

- 分支：`codex/round3-remediation`
- 当前 HEAD：`e8cc714 fix: stage large migrations without Windows arg overflow`
- 固定实施起点：`a78e713`
- 本文件更新前工作树为 clean；新线程必须重新运行 `git status --short --branch`。
- Windows Host 已在 `e8cc714` 后重启：installed=true、running=true、startup=at_logon、legacy=false。
- `GET /api/syno/health`：`ok=true`。
- Web、Windows、微信、飞书均 running/available；微信和飞书 ownerBound=true，lastError 为空。
- 未 Push。
- 原知识库尚未迁入；主分支 `vault/` 没有 426 项半成品。

## 两次失败迁移历史：全部禁止重试

### 第一次失败

- Job：`job-20260720-a6a77574`
- Manifest：`migration-20260720-df900fe7`
- 审批码：`541B12`，已消费。
- 原因：旧校验错误拒绝迁移专用 `link_status`，且 12 个嵌套 MOC 被错误划入单审批 content。
- 修复提交：`5475187`、`a992821`、`51e147b`、`7c438dd`。

### 第二次失败

- Job：`job-20260720-fff2e9f0`
- Manifest：`migration-20260720-47646cb4`
- 审批码：`E5EF63`，已消费。
- approvalsReceived：1。
- Job 审计提交：
  - `ef3a17f syno: start job-20260720-fff2e9f0`
  - `53ff261 syno: isolate job-20260720-fff2e9f0`
  - `01118e7 syno: run job-20260720-fff2e9f0`
  - `50276bc syno: fail job-20260720-fff2e9f0`
- operation 阶段在隔离 worktree 成功生成 426 项；最终 GitGuard 调用一次 `git add -- <426 long paths>` 时触发 Windows `spawn ENAMETOOLONG`。
- cleanup.removed=true，没有合并半迁移内容。
- 修复提交：`e8cc714`。
  - GitGuard 使用 `git add --pathspec-from-file=- --pathspec-file-nul`，路径经 stdin NUL 分隔传入。
  - 每项加 `:(literal)`，继续保证只暂存 Job 声明的精确路径，禁止 `git add -A`。
  - 新增 426 个长路径的真实 Windows 回归测试，并验证未声明文件保持未跟踪。
  - 同时修复飞书测试隔离：默认进程锁从 `stateStore.file` 派生，共享状态的生产进程仍互斥，临时测试状态不再争用真实 Host 锁。

`migration-20260720-47646cb4` 现在是退役审计材料，不是可执行 Manifest。原因：它的 content requestKey 已绑定终态失败 Job，且执行安全边界已由 `e8cc714` 修改。禁止 retry、submit 或手工改 Job；必须重新 inventory 生成新 ID。

## 退役 Manifest 的数据基线

重新 inventory 后数字预计相同，但必须以新 Manifest 实际结果为准：

- import：454
- content：426
- integration：28
- Markdown：453
- PDF：1（Loop Engineering）
- conflict：4，全部 `keep-syno`
- identical：19
- excluded：5
- duplicate source groups：9
- content 中 MOC：0
- 13 个非 `MOC - ...` 的 integration 项均由 Windows 安全重命名、wikilink 重写或两者共同触发。

退役 Manifest 的逐文件审计曾满足：expected=454、actual=454、extra=0、missing=0、source hash mismatch=0、staged hash mismatch=0、缺 frontmatter=0、非 `knowledge_state: captured`=0、excluded staged=0。

## 原知识库只读证明

- inventory 时原库 Git HEAD：`883fbf5c457156805b9e9b53358175ce84940b59`
- 原库 dirty entries：19，属于用户现有工作区状态。
- 最近一次 inventory 前后物理 `.git` 摘要相同：`fb027ffc2359c216652ee258bebf39c297586da9b913306818400be0372fefec`，1601 files。
- source fingerprint：`d25242f8b2bfa2c3b2db1e9df77b23cbfd1421d07af9f585623d5b52c008a939`
- 新线程在重新 inventory 前、后都必须重新核对 HEAD、dirty 数和物理 `.git` 摘要。
- 源库永久只读：不写缓存、不清理、不格式化、不提交、不双向同步。

## 固定排除与冲突

5 个排除项不得自动放行：

1. `01-Areas/AI Agent Development/Super Agent 实战课/05-Skills Plugins Channel/5-3 Channel 抽象——让 Agent 活在飞书群里.md`：敏感凭据赋值候选。
2. `01-Areas/AI Agent Development/Super Agent 实战课/07-部署/7-1 收官——配置系统、CLI 入口与部署上线.md`：敏感凭据赋值候选。
3. `02-Resources/AI and Agents/Loock AI 全栈应用开发/2-LangGraph.js 教程/2-6 节点设计.md`：敏感凭据赋值候选。
4. `02-Resources/AI and Agents/Loock AI 全栈应用开发/3-Next.js 基础/3-9 中间件与认证模式.md`：敏感凭据赋值候选。
5. `99-System/Attachments/1772372691239-7f8d2bf1-8f38-4023-ab9c-7eeed69251c3.png`：源工作区缺失。

4 个同路径冲突固定为 `keep-syno`，本轮只记录 Proposal，不覆盖：

1. `vault/01-Areas/AI Agent Development/04-Context Engineering/4-5 Just-In-Time Context.md`
2. `vault/02-Resources/AI and Agents/Agent Design & Patterns/Spec Kit vs OpenSpec vs Superpowers - CCC.md`
3. `vault/02-Resources/AI and Agents/Authors/CCC.md`
4. `vault/02-Resources/AI and Agents/Authors/ConardLi.md`

## 当前验证证据

在 `e8cc714` 提交前对完全相同的修复差异完成：

- GitGuard 定向测试：7/7。
- 飞书定向测试：11/11，真实 Host 同时运行时通过。
- Node 完整测试：194/194。
- Vault pytest：57/57（Python 3.13.7、pytest 9.0.3）。
- `pnpm verify`：647 files。
- `git diff --check`：通过。

`e8cc714` 尚未进行独立 Standards/Spec 双轴复审。新线程第一项必须审查 `50276bc...e8cc714`；高优先级发现修复后重新运行完整回归。此前 `6afb061...7c438dd` 的 Standards 与 Spec 已分别达到 P0/P1/P2=0。

## 已确认的产品数据事项

- Claim Job `job-20260720-3168722f` 仍 awaiting_approval，旧审批码 `86DDB1` 未处理。
  - 只会创建 candidate Claim，不会写成已验证事实。
  - 内容为 JIT Context 按需加载、降低 token 消耗并改善注意力的候选主张。
  - 建议迁移后批准候选，再关联 JIT 笔记形成 EvidenceCandidate；不得把主张直接表述为 verified。
- 两个 Anthropic MD 收录候选正文完全相同：
  - `artifact-20260720-ac6c5d41` / `ingest-50964b42`
  - `artifact-20260720-ef20760f` / `ingest-fd29b810`
  - content bytes 均为 255744；SHA-256 均为 `f89d272ada7b2fcdce4413eb361c67a9d4fc3e46199cf7ff70746ddf8c2aa7c1`。
  - 迁移成功后保留迁入的规范版本，这两个 Proposal 不应再次重复收录；处理动作仍需主人确认。

## 已发现但尚未实现的知识闭环缺口

1. 没有迁移后知识画像生成器：主题、来源、稳定性、时效性、可靠性、孤岛、死链、证据缺口和潜在过时内容尚不能形成可审计画像。
2. 没有“每日 5 项、掌握度为零”的迁移学习队列初始化器；现有 `LearningService` 只在主人提交证据后创建状态。
3. `KnowledgeMaintenanceSource` 目前返回固定孤岛列表，缺少冷却、去重、轮换和周度维护摘要。
4. 全局知识 Goal 与首批 OutputOpportunity 尚未初始化。

上述功能必须在迁移完成后按 TDD 补齐；迁移笔记不得自动提高掌握度，AI 草稿不得成为 LearningEvidence。

## 新对话精确执行顺序

1. 完整读取本文、根 `AGENTS.md`、`docs/HANDOFF-EXECUTION-PLAN.md`，核对 `git status`、HEAD、Goal、Host health、渠道和 Windows task。
2. 使用 `$code-review` 对 `50276bc...e8cc714` 做 Standards/Spec 双轴审查；修复高优先级问题并跑 Node、vault、verify。
3. 重新计算源 HEAD、dirty 和物理 `.git` 摘要；然后执行新的 inventory 与 preview。禁止重用 `migration-20260720-47646cb4`。
4. 对新 Manifest 重新核验数量、阶段、哈希、frontmatter、初始状态、排除、冲突及 13 个 integration 原因。
5. 重启 Host 使其加载最终审查提交，再 submit 新 Manifest 的 content 阶段。
6. 新 content Job 必须是 426 项、single approval。未来 Job 和审批码尚未知；主人先前“全部批准”只批准了已展示的 `E5EF63`，不得预先替代新 Job 的明确审批。
7. content 完成后核验 426 项、migration audit、changed paths、GitGuard、中文索引和源只读证明。
8. 再次 submit 同一新 Manifest，生成 28 项 integration double-approval Job；两次审批都要展示固定差异和审批码。
9. integration 完成后做第二轮数据审查：总计 454、4 conflict、19 identical、5 excluded、正文/哈希/PDF/标签/frontmatter/链接/搜索/幂等性。
10. 按 TDD 实现知识画像、每日 5 项零掌握度学习初始化、维护冷却轮换和周摘要；通过受控审批创建全局知识 Goal 与首批输出机会。
11. 处理但不代主人裁决 Claim Job、两个重复 IngestProposal、4 个冲突 Proposal 和 5 个排除项。
12. 完成第三轮 Standards/Spec 与全产品封板：fresh clone、桌面/390×844 Web、键盘/减少动画/console、固定 Provider、微信、飞书、Windows 自启动、备份/恢复、最终 bundle。
13. 每批只精确暂存 Job 声明路径并创建本地提交；禁止 `git add -A`，禁止 Push。

## 备份与回滚

- 迁移前 Git bundle：`C:\tmp\syno-pre-migration-a78e713.bundle`
- SHA-256：`2D7A22B7571C3857CB170ED135E2112897C6D602ACCE0731821654DF540161B0`
- 非凭据状态备份：`C:\tmp\syno-state-pre-migration-a78e713`
- `credentialsIncluded=false`
- 回滚使用已验收提交或反向迁移清单，禁止 `git reset --hard`。

## 架构事实不得回退

- 只启用一个 `CognitiveRuntime`；原生 `ToolLoopAgent` 是当前可信实现。
- Hermes 未满足固定单端点 Provider 硬门槛，当前不采用，不得接触真实 Token。
- Provider 使用固定 token-cloud OpenAI-compatible endpoint 和单一 Model ID，无自动换模型或 fallback。
- 微信、飞书、Web 共用同一 Owner、Conversation、Policy、审批和事实源。
- `vault/` 是唯一可写知识事实源；原 Obsidian source root 永久只读，不做双向同步。
- Syno 不能修改自身源码，只能修改 SettingsRegistry 白名单配置并生成 BugReport/ImprovementProposal。
- AI 草稿不能提高掌握度；只有主人自己的口述、打字、答题或实践证据可以推进学习状态。

## 完成定义

当前只是迁移执行器恢复可信，Goal 尚未完成。只有新 Manifest 两阶段迁移、知识闭环初始化、三轮审查、fresh clone、Web/Provider/双渠道/Windows、备份与回滚全部有当前证据，并且候选项与主人判断未被伪装成事实后，才能将 Goal 标记 complete。
