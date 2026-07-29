# PR-10 R6 Seal

## 当前结论

R6 尚未通过。`owner-acceptance.json` 只是自动生成的待填写模板；没有 Owner 在真实微信、飞书、Windows 登录和手机操作后的证据，Legacy 清理保持阻断。

## 自动门禁与真实边界

- `scripts/r6-readiness.mjs` 只读检查 Owner evidence 与工作区是否干净，不修改状态、不删除 Legacy。
- Node 测试、Repository verify、Vault unittest、健康探针不能填充 `performedBy=owner/result=passed`。
- PR-04A/04B 的移动生产切换、跨渠道 exactly-once 能力和 Windows 下次登录仍需要 Owner 实测；当前平台能力未验证时继续按 at-least-once/unknown 处理。

## 只有 Owner 完成后才允许

1. 在停止 ingress、冻结非终态 AcceptedRequest 并归档 stateRoot 后执行 Schema migration。
2. 验证旧版本回滚边界。
3. 停止生产 Native/ToolLoop/Hermes legacy Runtime 构造并增加禁止 import 检查。
4. 删除旧字段、独立 Worker 和最终无调用 Legacy。
5. 清理后运行完整 Node/Vault/verify、fresh clone 和移动双渠道 smoke test。

任何一项失败都回滚对应 PR；Goal 不能标记 complete。
