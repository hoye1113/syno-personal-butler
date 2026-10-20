# Syno 文档索引

本文只负责说明文档分类、唯一权威性和当前状态；具体产品规则以对应 Normative 文档为准。

当前状态（2026-10-20）：单仓 `vault/` + `ops/` 为事实源，生产不设置 `SYNO_KNOWLEDGE_ROOT`；外部知识仓和旧路径 junction 已清理，回滚依靠本仓 Git 与核验备份。飞书为唯一日常渠道，3088 为需认证的受控 DSH 会话面，8888 仅提供白名单控制 API，根路径无页面。

当前能力为检索／深度分析、收录、知识维护、待办、独立记忆和飞书三端发布（25 个业务工具＋知识三件套＋web_search＋skill）。学习、项目、微信、今日灵感、主动推送和历史聊天补发均已下线；只有 `/new` 与 `/stop` 绕过模型。生产发布已于 2026-10-19 启用，标签已冻结，验收范围与已知缺口分别见下表；旧计划和旧测试数字不能覆盖这些事实。

## Normative

| 文档 | 唯一权威内容 | 状态 |
|---|---|---|
| `README.md` | 项目入口、当前运行方式和基本边界 | Current |
| `AGENTS.md` | Agent 执行契约、权限边界、编码和源码修改规则 | Normative |
| `docs/ARCHITECTURE.md` | 当前模块边界、数据流和事务边界 | Normative |
| `docs/POLICY.md` | Owner、Policy、Job、工具和写入权限 | Normative |
| `docs/SECURITY.md` | 工具、身份、凭据与外部效果安全边界 | Current security model |
| `docs/product-slimming-and-inspiration-plan.md` | 产品方向决策及执行沿革追加区；旧阶段以顶部最新口径解释 | 原始计划保留追溯，持续追加 |
| `contracts/*.schema.json` | 机器可校验的数据契约 | Normative |
| `config/deepseek-harness/syno-agent.md` | DSH Syno Agent 的工具与行为边界 | Normative |
| 知识仓 `vault/AGENTS.md`、`vault/99-System/Agent/` | 知识收录、关联、写作和 MOC 规则 | Normative |

## Current

| 文档 | 用途 | 状态 |
|---|---|---|
| `NEXT_SESSION.md` | 当前会话交接、基线、下一步和停止条件 | Current handoff |
| 知识仓 `ops/README.md` | durable `ops/` 记录目录说明 | Current |
| `docs/KNOWN-LIMITATIONS.md` | 已知限制、已复现回执误报及验证边界 | Current |
| `docs/KNOWLEDGE-FEISHU-P1.md` | 2026-10-19 生产发布授权、存量回填、2026-10-20 最终冻结评测 | Current acceptance |
| `docs/KNOWLEDGE-MEMORY-V02-IMPLEMENTATION.md` | v0.2 实施沿革、当前交付与旧记忆边界 | Updated implementation record |
| `docs/evals/knowledge-memory-v1-label-review.md` | 主人审核冻结的标签规则及覆盖限制 | Frozen v1 |
| `docs/OPERATIONS.md` | 当前启动、工具面、备份恢复和发布运维 | Current |

## Historical

`docs/CUTOVER-CHECKLIST.md`、`docs/CHANNEL-ACCEPTANCE.md`、`docs/BROWSER-ACCEPTANCE.md`、`docs/V1-VERIFICATION.md`、`docs/OUTSTANDING-WORK.md`、`docs/FINAL-ACCEPTANCE.md`、`docs/PROVIDER-ACCEPTANCE.md`、`docs/HANDOFF-EXECUTION-PLAN.md`、`docs/TODO-EXECUTION-PLAN.md`、`docs/project-aware-knowledge-execution-plan.md`（2026-09-01 SUPERSEDED）以及 `docs/archive/` 中的旧 OpenCode、旧分支和已归档计划只用于追溯。它们不能覆盖 `AGENTS.md`、`docs/ARCHITECTURE.md`、`docs/POLICY.md` 或当前执行计划；旧计划必须标记为 superseded 或 historical。

## Working plans（`docs/plans/`）

`docs/plans/` 存放**执行中的**计划、检修记录与设计草案：它们不是 Normative，不能覆盖上面的权威文档，只用于追溯「为什么这么做、当时否决了什么」。计划落地或被替代后，必须在该文件开头标注状态（如「已实施 YYYY-MM-DD」「已取消」「被 X 取代」），确认无引用后再移入 `docs/archive/`。

当前在册：`chat-read-browser-escalation.md`（读链接浏览器升级，已实施）、`dead-surface-cleanup.md`（死面清理，执行中）、`claw-direct-to-dsh-migration.md`（迁移计划，B5 已落地、D/E 待办）、`claw-direct-to-dsh-execution-and-verification.md`、`claw-only-headless-remediation.md`、`kimi-code-provider-switch.md`、`mac-deployment-remaining-work.md`（主动推送计划已取消，仅登录冷启动／可选 Web 入口等剩余项有效）。

## Generated

- Node 测试输出：命令行 `pnpm test`；如需持久化验收材料，保存到知识仓 `ops/acceptance/`。
- Project-aware DSH live 证据：知识仓 `ops/acceptance/project-aware-knowledge-mvp/`；默认不调用真实模型，只有显式 `SYNO_RUN_REAL_DSH=1` 才运行。
- 仓库与 active-doc 检查：`pnpm run verify`。
- 运行缓存和索引：`.runtime/`，可删除、可重建、禁止提交。
- 本机 Harness／渠道运行状态：`PATHS.localDataRoot` 下的 state 与 logs（由 `SYNO_LOCAL_DATA` 或平台默认值解析），不是仓库事实源。

## 交接规则

1. 先读本索引、`AGENTS.md`、当前执行计划（`docs/product-slimming-and-inspiration-plan.md`）和 `NEXT_SESSION.md`。
2. 任何阶段状态、实际修改文件、测试结果、commit hash、Owner 证据、deferred 内容和停止条件触发只追加到当前执行计划的「执行记录」区。
3. 不能用历史测试数字、Fake DSH 或静态检查冒充当前真实产品验收；代码验收以测试文件、Schema 和服务端运行时回归为准。
4. 本轮提交和推送权限分离：执行 Agent 可以按计划提交，但不得自动 Push 或 merge。
