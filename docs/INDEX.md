# Syno 文档索引

本文只负责说明文档分类、唯一权威性和当前状态；具体产品规则以对应 Normative 文档为准。

2026-09-01 Owner 决策产品范围收敛为搜索、收录、深度探索分析、知识库查找与今日灵感；学习子系统与项目子系统已物理移除（`f23954d`、`ec068b9`），用户入口只允许更改知识库（`e49a66c`、`b634efd`）。当前唯一执行事实源是 `docs/product-slimming-and-inspiration-plan.md`。Project-aware Knowledge MVP 已关闭为 SUPERSEDED，其计划文档与 `ops/acceptance/project-aware-knowledge-mvp/` 证据仅作历史追溯。

## Normative

| 文档 | 唯一权威内容 | 状态 |
|---|---|---|
| `README.md` | 项目入口、当前运行方式和基本边界 | Current |
| `AGENTS.md` | Agent 执行契约、权限边界、编码和源码修改规则 | Normative |
| `docs/ARCHITECTURE.md` | 当前模块边界、数据流和事务边界 | Normative |
| `docs/POLICY.md` | Owner、Policy、Job、工具和写入权限 | Normative |
| `docs/product-slimming-and-inspiration-plan.md` | 产品精简与今日灵感的唯一执行事实源 | IN_PROGRESS（Owner 2026-09-01 批准，执行中） |
| `contracts/*.schema.json` | 机器可校验的数据契约 | Normative |
| `config/deepseek-harness/syno-agent.md` | DSH Syno Agent 的工具与行为边界 | Normative |
| `vault/AGENTS.md`、`vault/99-System/Agent/` | 知识收录、关联、写作和 MOC 规则 | Normative |

## Current

| 文档 | 用途 | 状态 |
|---|---|---|
| `NEXT_SESSION.md` | 当前会话交接、基线、下一步和停止条件 | Current handoff |
| `ops/README.md` | durable `ops/` 记录目录说明 | Current |
| `docs/KNOWN-LIMITATIONS.md` | 已知限制和未完成验收 | Current |

## Historical

`docs/HANDOFF-EXECUTION-PLAN.md`、`docs/TODO-EXECUTION-PLAN.md`、`docs/project-aware-knowledge-execution-plan.md`（2026-09-01 SUPERSEDED）以及 `docs/archive/` 中的旧 OpenCode、旧分支和已归档计划只用于追溯。它们不能覆盖 `AGENTS.md`、`docs/ARCHITECTURE.md`、`docs/POLICY.md` 或当前执行计划；旧计划必须标记为 superseded 或 historical。

## Generated

- Node 测试输出：命令行 `pnpm test`；如需持久化验收材料，保存到 `ops/acceptance/`。
- Project-aware DSH live 证据：`ops/acceptance/project-aware-knowledge-mvp/`；默认不调用真实模型，只有显式 `SYNO_RUN_REAL_DSH=1` 才运行。
- 仓库与 active-doc 检查：`pnpm run verify`。
- 运行缓存和索引：`.runtime/`，可删除、可重建、禁止提交。
- 本机 Harness/渠道运行状态：`%LOCALAPPDATA%\Syno\state` 和日志目录，不是仓库事实源。

## 交接规则

1. 先读本索引、`AGENTS.md`、当前执行计划（`docs/product-slimming-and-inspiration-plan.md`）和 `NEXT_SESSION.md`。
2. 任何阶段状态、实际修改文件、测试结果、commit hash、Owner 证据、deferred 内容和停止条件触发只追加到当前执行计划的「执行记录」区。
3. 不能用历史测试数字、Fake DSH 或静态检查冒充当前真实产品验收；代码验收以测试文件、Schema 和服务端运行时回归为准。
4. 本轮提交和推送权限分离：执行 Agent 可以按计划提交，但不得自动 Push 或 merge。
