# Syno 最终验收矩阵

更新日期：2026-07-20

当前结论：**内部知识闭环、真实 Provider、飞书消息与日历、最新 fresh clone 和浏览器复验均已通过；尚未完成最终外部切换。** 剩余门槛是微信附件实机与完成后的最终仓库备份/文档封板，不能用 Fake 测试替代。

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
| 状态备份、校验、空目录恢复 | 通过 | `state-archive.mjs` 自动测试；真实非凭据状态归档 24 项、`credentialsIncluded=false`，在空隔离目录恢复成功并拒绝二次覆盖 |
| fresh clone 可重复安装与验证 | 通过 | `2e1dfd0` 在 `C:\tmp\syno-fresh-2e1dfd0` 按锁文件离线安装；Node 144/144、vault 57/57、仓库校验通过 |
| token-cloud 真实 Provider | 通过 | OpenClaw last-good Token 已迁入 DPAPI；固定 `AIPC-deepseek-v4-flash` 五轮真实工具调用 5/5；真实 `PROVIDER_HTTP_ERROR` 后同一微信 Job 持久等待并由同一模型恢复完成 |
| 微信真实 Owner 与设备链路 | 部分通过 | Owner 绑定、自动扫码、连续消息、Provider 故障恢复与 durable seen ID 跨重启通过；`9837366` 已补齐真实 iLink 加密附件协议，仍缺附件实机往返 |
| 飞书真实账号与消息链路 | 通过 | 主人扫码绑定 Owner；4 条真实私聊全部完成、同一会话、真实 seen ID 重放拒绝、Worker 重启自动恢复 |
| 飞书真实日历链路 | 通过 | lark-cli 1.0.72 user 身份；「Hoye」主日历读取、真实创建、同 event ID 双更新、清理、拒绝错误后恢复和重启恢复通过 |
| 运行中渠道健康探针 | 通过 | 微信/飞书均从本机健康 Worker 返回 `ok/configured/ownerBound/connected=true`；不再竞争微信锁或建立第二条飞书连接 |
| 最终备份、启动、回滚和切换 | 部分通过 | 状态 backup/verify/空目录 restore、仓库 407 项显式备份、Worker/渠道重启恢复通过；最新服务在无 `LARK_CLI_PATH` 下恢复 Hoye 日历；待微信附件后的最终备份与文档提交 |
| 分支、原知识库和远端边界 | 持续满足 | 当前分支未重置、原知识库未修改、没有自动 Push |

## 当前自动验证命令

```powershell
pnpm test
python -m pytest vault/tests
pnpm verify
```

## 外部验收顺序

1. 从微信完成无隐私附件实机往返。
2. 执行切换清单 E 的最终主工作树复验和封板提交。

只有本矩阵所有必选项都有直接证据时，才能把全局 Goal 标记为 complete。
