# Syno 最终验收矩阵

更新日期：2026-07-20

当前结论：**全部必选验收项通过，可以完成最终外部切换。** 当前修复基线为 `99b2ea2`：Windows Web 生命周期已纳入 Policy/Job 审计，真实卸载响应不中断 Host、重装恢复成功，Today/微信设置完成桌面与移动复验；内部知识闭环、真实固定 Provider、微信、飞书消息与日历仍有既有直接证据。分支、原知识库、凭据与不 Push 边界持续满足。

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
| 状态备份、校验、空目录恢复 | 通过 | `state-archive.mjs` 自动测试；真实非凭据状态归档 52 项、`credentialsIncluded=false`，在空隔离目录恢复成功并拒绝二次覆盖 |
| fresh clone 可重复安装与验证 | 通过 | `02d45b3` 在 `C:\tmp\syno-fresh-02d45b3` 按冻结锁文件离线安装，下载 0 个包；Node 171/171、vault 57/57、仓库校验 593 项通过。`99b2ea2` 仅增加同一 UI 回归与真实审计事实，随后完成当前 HEAD 增量复验 |
| token-cloud 真实 Provider | 通过 | OpenClaw last-good Token 已迁入 DPAPI；固定 `AIPC-deepseek-v4-flash` 五轮真实工具调用 5/5；真实 `PROVIDER_HTTP_ERROR` 后同一微信 Job 持久等待并由同一模型恢复完成 |
| 微信真实 Owner 与设备链路 | 通过 | Owner 绑定、自动扫码、4/4 连续回复、Provider 故障恢复与 durable seen ID 跨重启通过；微信直发 MD 返回 `artifact-20260720-ac6c5d41`，后台形成 `ingest-50964b42`，未生成通用审批 Job、未写 vault |
| 飞书真实账号与消息链路 | 通过 | 主人扫码绑定 Owner；4 条真实私聊全部完成、同一会话、真实 seen ID 重放拒绝、Worker 重启自动恢复 |
| 飞书真实日历链路 | 通过 | lark-cli 1.0.72 user 身份；「Hoye」主日历读取、真实创建、同 event ID 双更新、清理、拒绝错误后恢复和重启恢复通过 |
| 运行中渠道健康探针 | 通过 | 微信/飞书均从本机健康 Worker 返回 `ok/configured/ownerBound/connected=true`；不再竞争微信锁或建立第二条飞书连接 |
| 最终备份、启动、回滚和切换 | 通过 | 真实状态归档 52 项、`credentialsIncluded=false`，清单校验、空目录 restore、二次覆盖拒绝和双渠道重启恢复通过；旧 `3c2b362` 归档保留为历史恢复点，当前 `99b2ea2` 分支另生成 Git bundle 与 SHA-256 sidecar；微信附件直发通过 |
| 分支、原知识库和远端边界 | 持续满足 | 当前分支未重置、原知识库未修改、没有自动 Push |

## 当前自动验证命令

```powershell
pnpm test
python -m pytest vault/tests
pnpm verify
```

## 验收结论

微信附件回执只确认“已安全收录为候选”，不等于批准写入知识库。是否应用 `ingest-50964b42` 仍由主人在 Web 审核；本次未自动创建 Note。Windows 生命周期变更同样要求 Web 明确确认并留下 canonical Job。全部发布门槛已有直接证据。
