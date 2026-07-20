# Codex 重启交接（2026-07-20）

## 重启后第一句话

> 完整读取 `NEXT_SESSION.md` 和 `docs/HANDOFF-EXECUTION-PLAN.md`，检查当前 Goal 与工作区，然后从迁移 Job `job-20260720-a6a77574` 的主人审批点继续。不要重新 inventory，不要绕过 Policy，不要修改原 Obsidian 库，不要 reset，不要 Push。

## 当前唯一可信状态

- 工作目录：`D:\workSpace\syno-personal-butler`
- 分支：`codex/round3-remediation`
- 最新迁移实现提交：`342983f fix: harden audited vault migration`
- 本交接文档作为其后的独立本地提交；重启时以 `git log -1 --oneline` 核对实际 HEAD，不要把文档中的实施基线误当成分支尖端。
- 固定实施起点：`a78e713`
- 已提交迁移基础设施：
  - `64dc6c8 feat: add audited vault migration pipeline`
  - `342983f fix: harden audited vault migration`
- 当前全局 Goal：`active`
  - 完成原知识库单向只读迁移、知识闭环初始化、三轮审查、fresh clone、Web/Provider/微信/飞书/Windows/备份回滚验收。
- 不允许：修改原库、重置/丢弃整改分支、绕过审批直接 apply、`git add -A`、自动 Push、让 Syno 修改自身源码。

## 当前工作区

当前只有两个未跟踪文件，均为已经提交迁移请求后生成的真实运行事实，不是垃圾文件，不得删除或手工改写：

- `ops/jobs/2026/07/job-20260720-a6a77574.md`
- `ops/events/2026/07/event-20260720115447003-8b9729.md`

它们应在 Job 按既有 Policy 正常执行并形成完整结果后，随对应精确路径一起处理。禁止把它们与无关修改混合暂存。

## 当前阻塞点：主人审批

- Job：`job-20260720-a6a77574`
- 操作：`vault.migration.content`
- 状态：`awaiting_approval`
- 审批级别：single
- 已收审批：0
- 审批码：`541B12`
- 请求键：`web:local-user:migration:migration-20260720-df900fe7:content`
- 预期范围：438 个 content 阶段迁入项，经 `ToolRegistry → Policy → Job → isolated worktree → validators → GitGuard` 执行。

必须由主人明确回复 `批准 541B12` 后，才可调用现有批准入口。不得把本交接请求、先前的“完全授权”或自动 Goal 续跑视为该 Job 的审批。

## 唯一有效 Manifest

- ID：`migration-20260720-df900fe7`
- 本机文件：`.runtime/migrations/migration-20260720-df900fe7/manifest.json`
- digest：`83ad621478e222e2f184defb08b2dc3d3fab655d7cebb1d0f3df6182fa22a5ee`
- source fingerprint：`d25242f8b2bfa2c3b2db1e9df77b23cbfd1421d07af9f585623d5b52c008a939`
- 原库 HEAD：`883fbf5c457156805b9e9b53358175ce84940b59`
- 原库 dirty entries：19
- 汇总：import 454、conflict 4、identical 19、excluded 5、content 438、integration 16、duplicate source groups 9。
- 导入类型：453 篇 Markdown + 1 个 Loop Engineering PDF。

所有更早 Manifest 都是无效调试历史，禁止 submit/apply。只要源集合、源哈希、Git 快照、目标文件或迁移代码发生变化，当前 Manifest 也必须 fail closed，并重新 inventory。

## 明确排除与冲突

5 个排除项不得擅自放行：

1. `01-Areas/AI Agent Development/Super Agent 实战课/05-Skills Plugins Channel/5-3 Channel 抽象——让 Agent 活在飞书群里.md`：敏感凭据赋值候选。
2. `01-Areas/AI Agent Development/Super Agent 实战课/07-部署/7-1 收官——配置系统、CLI 入口与部署上线.md`：敏感凭据赋值候选。
3. `02-Resources/AI and Agents/Loock AI 全栈应用开发/2-LangGraph.js 教程/2-6 节点设计.md`：敏感凭据赋值候选。
4. `02-Resources/AI and Agents/Loock AI 全栈应用开发/3-Next.js 基础/3-9 中间件与认证模式.md`：敏感凭据赋值候选。
5. `99-System/Attachments/1772372691239-7f8d2bf1-8f38-4023-ab9c-7eeed69251c3.png`：原库缺失。

4 个同路径冲突固定为 `keep-syno`，本轮只记录 Proposal，不覆盖：

1. `vault/01-Areas/AI Agent Development/04-Context Engineering/4-5 Just-In-Time Context.md`
2. `vault/02-Resources/AI and Agents/Agent Design & Patterns/Spec Kit vs OpenSpec vs Superpowers - CCC.md`
3. `vault/02-Resources/AI and Agents/Authors/CCC.md`
4. `vault/02-Resources/AI and Agents/Authors/ConardLi.md`

## 已完成证据

- Node：`pnpm test`，189/189 通过。
- Vault：Python pytest，57/57 通过。
- 仓库：`pnpm verify`，635 files 通过。
- 迁移相关脚本：`node --check` 通过。
- 第一轮迁移基础设施审查：Standards 与 Spec 均为 P0=0、P1=0。
- 原始知识库物理 `.git` 树迁移盘点前后摘要一致：`571894E7ACCA214F090FDE13A9CAA25E7EDE0CDC76F5B47C305DD77EEEB0138A`。
- 原库 HEAD 和 19 条 dirty 状态保持不变。
- Windows 任务 `Syno`：installed=true、running=true、startup=at_logon、legacy=false，Host health `ok=true`；运行中的 `lastTaskResult=267009` 是计划任务 running 状态码。
- 未 Push。

迁移 staged 预审已确认：454 个导入、实际 staged 454、额外 0、缺失 0、源哈希不匹配 0、staged 哈希不匹配 0、大小写路径冲突 0、缺 frontmatter 0、453 篇 Markdown 均为 `knowledge_state: captured`、5 个 excluded 均未 staged。

一次临时 PowerShell 统计曾把 `extraStaged` 和 `missingStaged` 都误报为 454，原因是反斜杠未正确标准化；随后已用 Node 逐文件按 `path.relative(...).split(path.sep).join('/')` 重算并得到 expected=454、actual=454、extra=0、missing=0、hashMismatch=0。不得把先前临时误报当成产品缺陷。

重启前 Host `GET /api/syno/health` 返回 `ok=true`。现有 Web 审批入口已在 `apps/syno/syno/runtime.mjs` 确认为 `POST /api/syno/jobs/{jobId}/approve`，JSON body 可带 `code`；仍须先取得主人针对当前审批码的明确批准，不得提前调用。

## 备份与回滚点

- 迁移前 Git bundle：`C:\tmp\syno-pre-migration-a78e713.bundle`
- SHA-256：`2D7A22B7571C3857CB170ED135E2112897C6D602ACCE0731821654DF540161B0`
- 非凭据状态备份：`C:\tmp\syno-state-pre-migration-a78e713`
- `credentialsIncluded=false`
- 回滚必须使用已验收提交或反向迁移清单，不得 `git reset --hard`。

## 重启后的精确执行顺序

1. 完整读取本文件、根 `AGENTS.md`、`docs/HANDOFF-EXECUTION-PLAN.md`，再检查 `get_goal`、`git status --short --branch`、当前 Job 文件和 Host health。
2. 不重新规划，不重新 inventory，不重复已经完成的第一轮审查；先等待主人明确回复 `批准 541B12`。
3. 收到明确审批后，先从代码/测试确认现有批准 API 或 CLI 的准确调用方式，再批准 `job-20260720-a6a77574`；不得手改 Job，不得直接调用 migration apply。
4. 轮询 Job 到终态，核验 438 个 content 项、审计文件、changed paths、validators、GitGuard、源库 HEAD/dirty/.git 摘要保持不变，并重建/验证中文知识索引。
5. 再次执行同一 `submit --id migration-20260720-df900fe7`。服务端应自动选择 integration 阶段，并产生需要两次主人明确批准的 Job；两次审批都不可代批。
6. integration 完成后执行第二轮数据审查：454 导入总量、4 conflict keep-syno、19 identical、5 excluded、正文/源哈希/附件/标签/frontmatter/链接/索引/幂等性。
7. 通过受控审批初始化全局 Goal、每日 5 项且零掌握度的学习队列、首批输出机会和轮换维护 backlog；迁移笔记不得自动提高掌握度。
8. 处理但不擅自裁决既有主人事项：Claim Job `job-20260720-3168722f`，以及两个相似 Anthropic MD Proposal 的合并/保留建议。
9. 完成第三轮 Standards/Spec 与全产品封板：fresh clone、桌面/移动 Web、固定 Provider、微信、飞书、Windows 自启动、备份/恢复/最终 bundle。
10. 每批只精确暂存 Job 声明路径并创建本地提交；不 Push。最终汇报必须区分已验证事实、候选项、主人待审批项和已知限制。

## 架构事实不得回退

- Syno 保留单一 active `CognitiveRuntime`；原生 `ToolLoopAgent` 是可信实现。
- Hermes 候选固定版本未满足单端点 Provider 硬门槛，当前不采用，也不得接触真实 Token。
- Provider 固定 token-cloud OpenAI-compatible endpoint 和单一 Model ID，无自动换模型或 fallback。
- 微信、飞书、Web 共用同一 Owner、Conversation、Policy、审批和事实源。
- `vault/` 是唯一可写知识事实源；`D:\workSpace\obsidian_repository` 永久只读、无双向同步。
- AI 草稿不能提高掌握度；只有主人自己的口述、打字、答题或实践证据可以推进学习状态。

## 交接完成定义

重启后的 Codex 能从本文件直接得出：当前 HEAD、有效 Manifest、等待审批 Job、审批码、验证证据、禁止事项和下一步顺序；在没有主人明确审批时只允许继续只读核验，不能执行迁入。
