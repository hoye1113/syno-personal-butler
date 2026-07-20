# Codex 续跑交接（2026-07-20）

## 续跑入口

> 完整读取 `NEXT_SESSION.md`、根 `AGENTS.md` 和 `docs/HANDOFF-EXECUTION-PLAN.md`，检查当前 Goal、工作区和 Host，然后从新 Manifest 的 content Job 提交点继续。不得重用失败 Job 或旧 Manifest，不得修改原 Obsidian 库，不得绕过 Policy，不得 reset，不得 Push。

## 当前唯一可信状态

- 分支：`codex/round3-remediation`
- 当前 HEAD：`7c438dd fix: make Feishu ownership teardown fail safe`
- 固定实施起点：`a78e713`
- 当前全局 Goal：`active`
- 工作树：本文件更新前为 clean；续跑时必须重新用 `git status --short --branch` 核对。
- 当前 Host：`GET /api/syno/health` 返回 `ok=true`，但提交新迁移 Job 前必须重启 Host，确保运行进程加载当前 HEAD。
- 未 Push。

## 失败历史：禁止重试

- 旧 Job：`job-20260720-a6a77574`
- 旧 Manifest：`migration-20260720-df900fe7`
- 最终状态：`failed`
- 旧审批码 `541B12` 已消费，只是历史审计，不得再次使用。
- 失败原因：旧校验错误拒绝迁移专用 `link_status`；12 个嵌套 MOC 被错误划入单审批 content 阶段。
- 失败为 fail closed，没有把半迁移内容合并进 `vault/`；Job worktree 已清理。

## 已完成修复

- `5475187 fix: enforce migration topology and MOC gates`
  - 迁移专用 `connected | orphan` 只对带合法 `migration_id` 和 `source_sha256` 的迁移笔记开放。
  - 任意层级的 `MOC - ...` 都进入 integration，不再混入 content。
- `a992821 fix: centralize knowledge gates and serialize Feishu state`
  - MOC/知识路径判定集中到共享 Policy。
  - 飞书 StateStore 跨实例串行化，原子写入使用唯一临时文件。
- `51e147b fix: enforce single Feishu recovery owner`
  - 飞书恢复流程增加进程级文件锁，只允许一个进程成为 owner。
- `7c438dd fix: make Feishu ownership teardown fail safe`
  - teardown、断线恢复和旧 WebSocket handler 增加 owner-generation fencing。
  - SDK disconnect 抛错时仍能释放所有权并阻止旧 handler 执行或回复。

最终复审范围 `6afb061...7c438dd`：Standards P0/P1/P2 均为 0；Spec P0/P1/P2 均为 0。

## 当前唯一有效 Manifest

- ID：`migration-20260720-47646cb4`
- 本机文件：`.runtime/migrations/migration-20260720-47646cb4/manifest.json`
- digest：`64edd6d3d49ef3416681955ef136455e7eac72b616905d7b25d743d32674744a`
- source fingerprint：`d25242f8b2bfa2c3b2db1e9df77b23cbfd1421d07af9f585623d5b52c008a939`
- 原库 Git HEAD：`883fbf5c457156805b9e9b53358175ce84940b59`
- 原库 dirty entries：19
- 汇总：import 454、conflict 4、identical 19、excluded 5、content 426、integration 28、duplicate source groups 9。
- 导入类型：453 篇 Markdown + 1 个 Loop Engineering PDF。

不得重用更早 Manifest。只要源集合、源哈希、Git 快照、目标文件或迁移代码发生变化，当前 Manifest 必须 fail closed，并重新 inventory。

## 新 Manifest 审计证据

- expected staged：454；actual staged：454；extra：0；missing：0。
- source hash mismatch：0；staged hash mismatch：0。
- content：426；integration：28；content 中 MOC：0。
- Markdown：453；缺 frontmatter：0；非 `knowledge_state: captured`：0。
- excluded staged：0。
- 13 个名称不是 `MOC - ...` 的 integration 项均有确定原因：Windows 安全文件名重命名、wikilink 重写，或两者兼具；不存在无理由升级。
- Manifest full preview 已成功退出 0。一次被 `Select-Object -First` 提前关闭 stdout 导致的 EPIPE 只是命令管道现象，完整 preview 随后成功，不是迁移缺陷。

## 明确排除与冲突

5 个排除项不得擅自放行：

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

- Node：193/193 通过。
- Vault pytest：57/57 通过。
- `pnpm verify`：641 files 通过。
- 最终 Standards / Spec 双轴复审：均无未解决 P0、P1、P2。
- inventory 前后源 `.git` 物理摘要相同：`fb027ffc2359c216652ee258bebf39c297586da9b913306818400be0372fefec`，1601 files。
- inventory 前后源 HEAD 仍为 `883fbf5c457156805b9e9b53358175ce84940b59`，dirty entries 仍为 19。
- 未 Push。

## 备份与回滚点

- 迁移前 Git bundle：`C:\tmp\syno-pre-migration-a78e713.bundle`
- SHA-256：`2D7A22B7571C3857CB170ED135E2112897C6D602ACCE0731821654DF540161B0`
- 非凭据状态备份：`C:\tmp\syno-state-pre-migration-a78e713`
- `credentialsIncluded=false`
- 回滚使用已验收提交或反向迁移清单，禁止 `git reset --hard`。

## 下一步精确执行顺序

1. 核对本文件、根 `AGENTS.md`、权威计划、Goal、`git status`、当前 Manifest 和 Host health。
2. 重启 Windows Host，使运行进程加载当前 HEAD；验证 health、微信、飞书和计划任务所有权状态。
3. 执行 `node scripts/vault-migrate.mjs submit --id migration-20260720-47646cb4`，只提交固定 Manifest ID。
4. 新 Job 必须是 `vault.migration.content`、426 项、single approval。向主人展示新 Job ID 和新审批码；没有明确批准时不得代批。
5. content 到终态后核验 changed paths、validators、GitGuard、源只读证据和索引失效/重建。
6. 再次 submit 同一 Manifest；新 Job 必须是 `vault.migration.integration`、28 项、double approval。两次审批都必须由主人明确给出。
7. integration 完成后进行第二轮数据审查：454 导入、4 conflict keep-syno、19 identical、5 excluded、正文/哈希/附件/标签/frontmatter/链接/索引/幂等性。
8. 通过受控审批初始化全局知识 Goal、每日 5 项且零掌握度的学习队列、首批输出机会和轮换维护 backlog。
9. 不擅自裁决既有主人事项：Claim Job `job-20260720-3168722f`，以及两个相似 Anthropic MD Proposal。
10. 完成第三轮 Standards/Spec 与全产品封板：fresh clone、桌面/移动 Web、固定 Provider、微信、飞书、Windows 自启动、备份/恢复/最终 bundle。
11. 每批只精确暂存 Job 声明路径并创建本地提交；禁止 `git add -A`，禁止 Push。

## 架构事实不得回退

- Syno 只启用一个 `CognitiveRuntime`；原生 `ToolLoopAgent` 是当前可信实现。
- Hermes 候选未满足单端点 Provider 硬门槛，当前不采用，不得接触真实 Token。
- Provider 固定 token-cloud OpenAI-compatible endpoint 和单一 Model ID，无自动换模型或 fallback。
- 微信、飞书、Web 共用同一 Owner、Conversation、Policy、审批和事实源。
- `vault/` 是唯一可写知识事实源；inventory 指定的原 Obsidian source root 永久只读，不做双向同步。
- AI 草稿不能提高掌握度；只有主人自己的口述、打字、答题或实践证据可以推进学习状态。

## 完成定义

迁移基础设施修复完成不等于 Goal 完成。只有两阶段迁移、知识闭环初始化、第三轮审查、fresh clone、Web/Provider/双渠道/Windows、备份与回滚均有当前证据，且所有主人审批与候选判断被正确区分后，才能把 Goal 标记 complete。
