# 全管家项目冗余与死代码审计（2026-11-27）

## 结论

本轮覆盖整个 `syno-personal-butler-p0-hardening` 项目的受控源码、脚本、测试、插件与相关文档引用，排除 `node_modules` 和运行数据。没有把“静态无入边”直接等同于“可删除”。

最终最小清理：删除 10 个确认无有效引用的内部文件，移除 7 组未接线函数／常量及 `TokenTracker` 只写不读状态，并修正 1 个不支持未提交删除路径的发布测试。代码清理涉及 18 个既有文件、576 行删除、5 行新增，另新增本报告。未提交、未推送、未部署，生产未修改或重启。

## 入口与引用方法

建立三套模块可达性视图：

1. 生产入口：`real-feishu-client.mjs`、`p5-radar-site.mjs`。
2. 运维入口：生产入口、package scripts、带 Node shebang 的 CLI、`scripts/`。
3. 验证入口：运维入口及全部 `*.test.mjs`。

同时检查静态 import、字面量动态 import、导出符号、精确文件名、package scripts、Shell／PowerShell、插件 manifest、测试与 runbook 文本。重复内容只作为线索，不作为删除证据。

清理后的模块图：

| 指标 | 数量 |
| --- | ---: |
| 受控 `.mjs` | 306 |
| 生产可达 | 59 |
| 加入运维入口后可达 | 109 |
| 加入测试后可达 | 288 |
| 完全不可达但保留 | 15 |

审计脚本及最终模块图位于 `/tmp/syno-dead-code-audit.mjs`、`/tmp/syno-unused-function-audit.mjs`、`/tmp/syno-unused-exports-audit.mjs`、`/tmp/syno-code-graph-report.json`，均不属于项目新功能。

## 已安全删除的文件

| 文件 | 删除证据 |
| --- | --- |
| `apps/syno/syno/browser-tool-names.mjs` | 仅含旧 `BROWSER_TOOL_NAMES`，无代码、测试或文档消费者。 |
| `apps/syno/syno/http-security.mjs` | 三个安全 helper 均无调用；当前雷达网站使用自身已接线的安全头实现，删除不影响活跃安全路径。 |
| `apps/syno/syno/records.mjs` | 仅含无调用的 `walkRecords`。 |
| `apps/syno/syno/windows-service-manager.mjs` | 无调用的旧 Windows JS 服务管理器；当前生产为 macOS native Host。 |
| `experiments/superagent-p0/real-worker-switch-probe.mjs` | 无功能消费者的历史手工 probe，含硬编码本机路径。 |
| `packages/syno-core/env-toggle.mjs` | `envToggle` 无代码调用，仅历史清理文档提及。 |
| `packages/syno-core/job-summary.mjs` | `remoteSafeJobSummary` 无代码调用，仅历史迁移文档提及。 |
| `packages/syno-core/repo-fingerprint.mjs` | `repoFingerprintFor` 无 JS 消费者；PowerShell 指纹函数独立存在，不依赖此模块。 |
| `packages/syno-core/wechat-aesthetic-parser.mjs` | 已退役微信栈的解析器，导出符号无外部消费者。 |
| `scripts/sync-vault-to-docx.mjs` | 与另一入口内容完全相同且自身无引用；保留有 runbook 引用的 `sync-vault-catalog-to-bitable.mjs`。 |

## 已安全删除的局部无效代码

- `apps/syno/syno/context-manager.mjs`
  - 删除 `usageByConversation`、`TokenTracker.trackUsage()`、`lastRealTokens()` 及其唯一写入调用。
  - 保留公开 `ContextManager.trackUsage()` 签名、`#recordFeatureUsage()` 按 feature 聚合和 token 估算。
- `experiments/superagent-p0/p5-radar/score.mjs`
  - 删除无调用方的 `scoreItemWithLLM()` 及仅供它使用的 `INTEREST_PROFILE`；当前规则评分路径不变。
- `apps/syno/syno/capture-chunk-store.mjs`：删除无引用 `CHUNK_STATES`。
- `experiments/superagent-p0/decision-object.mjs`：删除无引用 `DECISION_CONTEXT_PREFIX`、`DECISION_KINDS`、`decisionContextId()`。
- `experiments/superagent-p0/p5-radar/translate.mjs`：删除无引用 `hasChinese()`。
- `packages/syno-core/output-lifecycle.mjs`：删除无引用 `OUTPUT_TERMINAL_STATUSES`。
- `packages/syno-core/policy.mjs`：删除无引用 `COMPLEX_INTENTS`。

## 测试修正

`tests/production-release.test.mjs` 的“Host 与测试不依赖仓外内核路径”测试枚举 `git ls-files` 后直接读取，遇到本轮尚未提交的删除路径会报 `ENOENT`。现仅增加 `existsSync` 过滤；对现存文件的仓外依赖断言完全不变。

首次完整 gate 因此得到 784 pass／1 fail。修正后定向发布测试 4／4 通过，完整 gate 恢复通过。这是本轮唯一红灯，未发现生产行为回归。

## 保留的动态、运维、公共与安全入口

以下 15 个模块在当前三套入口中完全不可达，但不能据此删除：

| 分类 | 模块 | 保留理由 |
| --- | --- | --- |
| 未接线产品能力 | `approval-advisor.mjs` | 有审批设计和历史验收语境，删除属于产品边界决策。 |
| Owner 授权边界 | `knowledge-confirmation.mjs` | 知识变更确认协议，不能按普通死代码处理。 |
| 发布／API 安全边界 | `server-api-allowlist.mjs` | 有生产验证与发布 runbook 引用。 |
| 平台兼容 | `mac-service-manager.mjs` | 有 macOS 部署文档与平台兼容引用。 |
| 手工对象验收 | `idea-worker-smoke.mjs`、`memory-worker-smoke.mjs`、`project-worker-smoke.mjs` | P0／P3 手工验收入口。 |
| 手工 Worker probe | `real-worker-probe.mjs` | 被 smoke、配置测试及任务工作区文档引用。 |
| 生产交接 | `production-rehearsal.mjs`、`legacy-production-handover.mjs` | 生产 rehearsal、交接 runbook 与测试路径使用。 |
| 文件路径读取 | `pi-worker-client.mjs` | 测试和 probe 通过路径读取，不依赖静态 import 可达性。 |
| 公共抓取与 SSRF 边界 | `fetch-url-tool.mjs` | 公共 `knowledge.fetch_url` 与浏览器升级方案相关。 |
| 凭据边界 | `provider-credential-store.mjs` | 凭据安全模块，不能凭无入边删除。 |
| 设置契约 | `settings-registry.mjs` | schema、设置契约和测试引用。 |
| 公共包入口 | `syno-core.mjs` | `verify-repository.mjs` 明确要求存在。 |

另外：

- `LarkCalendarAdapter` 虽无当前 JS 调用，但有真实飞书日历 CRUD 验收记录，作为公共适配器保留。
- `plugins/p5-radar/2026.11.22.7/bin/plugin.mjs` 与 `2026.11.22.8/bin/plugin.mjs` 内容相同，但属于不同不可变插件版本，均保留。
- `scoreItemWithLLM` 等已删符号在代码、配置、脚本中复查无残留引用；历史文档只作为当时决策记录，不改成伪历史。

## 验证证据

定向回归：

- Context／Radar：55 tests，55 pass，0 fail。
- Chunk／Policy／Decision／Output 相关：55 tests，55 pass，0 fail。
- Production release：4 tests，4 pass，0 fail。

最终完整 gate：

```text
tests 791
pass 785
fail 0
cancelled 0
skipped 6
Repository verification passed (3608 files).
Active documentation check passed (7 files).
git diff --check passed
```

完整日志：`/tmp/syno-cleanup-gate-with-report.log`。

## 限制与后续边界

- 模块图识别静态 import 和字面量动态 import；计算式动态加载、仓外消费者和人工未记录命令无法由静态分析完全排除。
- 本轮通过精确文本、导出符号、运维入口和 runbook 交叉检查降低误删风险，但不声称证明“全项目再无冗余”。
- 剩余 15 个不可达模块不是删除建议清单。若要继续精简，需 Owner 逐项裁定未接线产品、公共安全和兼容能力的目标与验收标准。
- 本轮只有开发 worktree 变更和测试证据，没有生产部署或生产 UI／自然调度验收。
