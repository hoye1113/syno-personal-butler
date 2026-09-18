# PR-04A0 Identity Capability Spike

日期：2026-07-29（Asia/Shanghai）

## 范围

- implementation base：`35a20a5`
- branch：`codex/exec-p04a0-identity-spike`
- 本阶段只记录能力研究，不切换移动生产回复链，不发送业务写入。

## 当前已验证

- Host health/readiness：协议 v2，Store、OpenCode、Channels ready。
- 微信和飞书：当前运行实例均 `running=true`、`available=true`、`ownerBound=true`。
- OpenCode：真实 Session、assistant message 和 parts identity 可从响应读取；批次一重启演练确认旧 Session 可由 `getSession()` 只读核对并保持连续性。
- 微信出站当前每次随机生成 `client_id`；飞书 Adapter 当前 `channel.send` 不接收稳定 delivery key。

## 尚待 Owner 实测

- 微信和飞书各一轮 `[Syno TEST <runId>]` 受控发送：相同候选身份重发、回复/主动路径和超时窗口。
- Owner 需在手机端报告每个 TEST 标识的实际可见条数、顺序和是否重复；不得以 HTTP 成功或 SDK 类型声明替代。
- 真实探针完成前，两个渠道均按 at-least-once/`delivery_unknown` 设计，exactly-once 不宣称。

## 证据边界

- 本记录不是微信/飞书 exactly-once 验收，也不是移动生产链切换批准。
- 未读取、输出或提交任何凭据、Token、Cookie 或消息正文。

