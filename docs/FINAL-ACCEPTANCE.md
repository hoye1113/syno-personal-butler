# Syno 最终验收矩阵

更新日期：2026-07-18

当前结论：**内部知识闭环加固已通过本地自动与浏览器验收，尚未完成最终外部切换。** 剩余发布门槛依赖主人本机凭据、账号或设备，不能用 Fake 测试替代。

| 要求 | 状态 | 权威证据 |
| --- | --- | --- |
| R3-0 测试隔离、日历契约、只读权限 | 通过 | `c34ba05` 及完整回归 |
| 知识闭环领域契约与唯一事实源 | 通过 | `contracts/`、`vault/`、`ops/`、schema 与 knowledge-loop tests |
| 唯一 CognitiveRuntime、固定模型、无 fallback | 通过 | `f003276`、`f015921`、Provider/Runtime tests |
| Hermes 能力最小化采用门槛 | 未通过并按计划淘汰 | `docs/HERMES-SPIKE.md`；固定版越出唯一 Provider 端点，未接触真实 Token |
| 收录、学习、复习、创作闭环 | 通过自动验收 | 显式 IngestDecision、三层生命周期、真实用户原文 Artifact、Claim/Evidence 聚合、OutputOpportunity 生命周期与 knowledge-loop tests |
| 跨渠道会话连续性 | 通过自动验收 | ConversationRouter、固定 Conversation ID、逐会话排他执行与 Provider Agent 回归 |
| 主动信号和有效偏好 | 通过自动验收 | SignalSourceRegistry、时效 Claim/收录/创作/维护信号；cadence、quiet hours、review count、display order 与 density 生效 |
| Policy、审批、GitGuard 和源码禁改 | 通过自动验收 | policy、knowledge-and-git、cognitive-runtime、reports tests |
| Web 桌面/移动/键盘/减少动画 | 通过 | `docs/BROWSER-ACCEPTANCE.md`；新增桌面/移动 Create 与主动偏好真实交互，0 error/0 warning |
| 状态备份、校验、空目录恢复 | 通过自动验收 | `state-archive.mjs`、库级测试和隔离 CLI 端到端测试 |
| fresh clone 可重复安装与验证 | 通过 | `620b8d6` 在 `C:\tmp\syno-fresh-620b8d6` 按锁文件安装；Node 127/127、vault 57/57、仓库校验通过 |
| token-cloud 真实 Provider | 待主人验收 | 安全探针已覆盖本地上下文/超时/离线故障注入；Settings 配置后仍需五轮真实调用和主人真实断网/恢复 |
| 微信真实 Owner 与设备链路 | 待主人验收 | DPAPI/旧格式迁移、Fake/契约和安全探针已通过；缺真实扫码与往返 |
| 飞书真实账号与日历链路 | 待主人验收 | DPAPI、durable pending/dedupe/restart recovery、Fake/契约和安全探针已通过；缺真实授权与往返 |
| 最终备份、启动、回滚和切换 | 待外部门槛后执行 | `docs/CUTOVER-CHECKLIST.md` D/E |
| 分支、原知识库和远端边界 | 持续满足 | 当前分支未重置、原知识库未修改、没有自动 Push |

## 当前自动验证命令

```powershell
pnpm test
python -m pytest vault/tests
pnpm verify
```

## 外部验收顺序

1. 主人在 Settings 中录入 Provider Token 和固定 Model ID，不在聊天中发送 Token。
2. 执行五轮真实 Provider 工具调用，并验证超时、离线、恢复和上下文边界。
3. 完成微信真实设备验收。
4. 完成飞书真实账号与日历验收。
5. 执行切换清单 D/E，更新本矩阵并重新跑完整验证。

只有本矩阵所有必选项都有直接证据时，才能把全局 Goal 标记为 complete。
