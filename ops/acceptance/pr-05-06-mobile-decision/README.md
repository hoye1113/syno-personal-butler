# PR-05 / PR-06 Mobile Observability 与 Decision UX

日期：2026-07-29（Asia/Shanghai）

## 范围

- implementation base：`7f094c4`
- branch：`codex/exec-p05-mobile-observability`
- PR-05：RecentInteraction 只读聚合、移动状态人话、确定性“刚才那个/取消刚才的/继续第 2 项”解析和 `/api/syno/recent-interactions`。
- PR-06：PendingDecision presentationId、固定 orderedDecisionIds、channel/version、微信编号文本兼容、跨渠道已处理提示。

## 已实现语义

- 多个候选不会交给模型猜测；“取消刚才的”必须先返回编号列表，只有明确选中后才调用取消。
- RecentInteraction 只返回状态、ID、计数和来源渠道，不返回消息正文、路径或凭据。
- Decision presentation 由持久 presentationId、版本、渠道、业务版本和有序 Decision IDs 组成；重复展示保持同一编号。
- 回复前仍校验 Owner/thread、TTL、diffDigest 和可选 businessVersion；已消费事项回到原渠道时明确告知“该事项已处理，当前渠道不会重复执行”。
- 磁盘 Job 继续使用 `awaiting_approval`；移动/API 层以 `awaiting_decision` 语义表达。

## 自动门禁

| 门禁 | 结果 |
| --- | --- |
| PR-05/06 定向测试 | 27/27 passed |
| Node 全量测试 | 506/506 passed；首轮既有 Binding 并发波动独立复跑 3 次均 7/7，第二轮全量通过 |
| `pnpm verify` | passed；1443 files，active docs 7 |
| Python 3.11 Vault unittest | 57/57 passed |
| `git diff --check` | passed |

## 尚待 Owner 验收

- 微信/飞书单项、多项、跨渠道确认、过期 Decision、稳定编号和自然语言指代。
- 真实移动状态、原渠道回复和 Unknown Case 处理仍未完成；Web 诊断 API 不是移动操作依赖。

## 证据边界

- 自动测试和本地 API 不等同于微信/飞书真实 Owner 验收。
- 未读取、输出或提交凭据、Token、Cookie 或私人消息正文。
