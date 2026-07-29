# PR-04C / PR-04D Effect Receipt 与 Unknown 对账

日期：2026-07-29（Asia/Shanghai）

## 范围

- implementation base：`3df84cd`
- branch：`codex/exec-p04c-effect-receipts`
- PR-04C：持久 `EffectReceiptStore`、稳定 `toolInvocationKey`、参数 digest 冲突、Direct Effect/Business Outcome 和跨 Runtime replay。
- PR-04D：`EffectReconciliationCaseStore`、claim lease、退避、重启恢复、只读 Reconciliation Worker，以及 Owner/System 分离的 resolution 记录。

## 已实现语义

- 写工具在执行前先写 `pending` Receipt；同一调用身份和参数重投只返回持久 Receipt，不再次执行。
- 同一调用身份不同参数返回 `TOOL_INVOCATION_IDENTITY_CONFLICT`。
- `committed` 只描述 Direct Effect；Business Outcome 单独返回，不能由 Bridge 自动改写为业务 completed。
- 输出校验失败仍保存 Direct Effect Receipt；原始 invalid output 仅存 DPAPI payload，不写入元数据。
- pending/异常窗口打开 Unknown Case；自动 Worker 只调用注入的只读核对函数，不模型 fallback、不写操作重试。
- Owner Resolution 使用 `source=owner`，System Resolution 使用 `source=system`，原始 Unknown 记录不覆盖。

## 自动门禁（定向）

| 门禁 | 结果 |
| --- | --- |
| Effect Receipt / Unknown / Bridge 定向测试 | 19/19 passed |
| Node 全量测试 | 502/502 passed |
| `pnpm verify` | passed；1440 files，active docs 7 |
| Python 3.11 Vault unittest | 57/57 passed |
| `git diff --check` | passed |

## 尚待真实验收

- 真实 ToolRegistry 故障注入（commit 后、Receipt 返回前、Host 崩溃）和本机 state 恢复。
- Owner 从微信/飞书处理隔离 Unknown Case，确认未执行后使用新 Invocation Key。
- R6 前保留 `effectCounter`；不得把自动测试视为 Direct Effect/Unknown 生产验收。

## 证据边界

- 本记录未声称任何渠道 exactly-once，也未自动重试未知副作用。
- 未读取、输出或提交凭据、Token、Cookie 或私人消息正文。
