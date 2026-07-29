# PR-04B Channel Delivery Outbox

日期：2026-07-29（Asia/Shanghai）

## 范围

- implementation base：`ad187cb`
- branch：`codex/exec-p04b-channel-outbox`
- 本阶段实现统一 v2 ChannelDeliveryOutbox、DPAPI payload、ACK/Progress/Final 时序、版本顺序、supersede、退避和 delivery identity conflict。
- 移动生产回复链仍未切换；legacy 发送继续作为唯一用户可见路径，Outbox 当前只可被显式调用。

## 自动门禁

| 门禁 | 结果 |
| --- | --- |
| 定向适配器与 Outbox 测试 | 38/38 passed |
| Node 全量测试 | 495/495 passed |
| `pnpm verify` | passed；1433 files，active docs 7 |
| Python 3.11 Vault unittest | 57/57 passed |
| `git diff --check` | passed |

## 渠道能力边界

- 微信：Outbox `deliveryKey` 可传为 iLink `client_id`；当前能力仍标为 `at_least_once`，因为本地和 SDK 证据不足以承诺平台 exactly-once。
- 飞书：已检查 `@larksuiteoapi/node-sdk` 1.64.0 `OutboundSender.rawSend()`；普通消息 create/reply 没有调用方可控幂等字段。delivery key 仅保存在本地 Outbox/audit，渠道按 `at_least_once` 处理。
- 两个渠道均保留 `delivery_unknown` 语义，发送超时或本地记账窗口不自动假设成功或安全重试。

## 尚待 Owner 验收

- Owner 检查点 A（微信/飞书 TEST 消息可见条数、顺序、重复）仍未收到手机端结果。
- Owner 检查点 B（ACK/Progress/Final、原渠道恢复和受控 Host 重启）尚未执行。
- 因此本记录不构成 PR-04A/04B 联合切换批准，未执行 ingress 冻结或 `legacy → shadow → v2` 切换。

## 证据边界

- 自动测试、SDK 源码检查和本地 Outbox 行为不等同于真实平台 exactly-once 验收。
- 未读取、输出或提交任何凭据、Token、Cookie 或私人消息正文。
