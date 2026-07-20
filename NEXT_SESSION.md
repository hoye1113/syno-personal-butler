# 下一会话启动指令

1. 完整读取 `AGENTS.md` 与 `docs/HANDOFF-EXECUTION-PLAN.md`，再读取架构、策略、安全和设计文档。
2. 保持 `codex/round3-remediation`，不得 reset、checkout、修改原 Obsidian 知识库仓库或自动 Push。
3. R3-0 已提交 `c34ba05`，知识闭环首轮 `3ff0484`，可靠性基线 `9a0a61a`，CognitiveRuntime `f003276`，Hermes 决策与固定 Provider 加固 `f015921`，Web 无障碍和浏览器验收 `200fb1f`，最终切换控制 `2a8d195`，渠道凭据与探针加固 `04005b2`，飞书 durable delivery `1540b66`，Provider 采用门 `fdd0c04`，闭环封板加固 `620b8d6`，Windows Provider 凭据修复 `cbfa882`，微信二维码 `3c50299`，轮询与连续回复 `e6d9746`，只读基线指纹 `141d0be`，恢复态清理 `a390462`，飞书注册/Windows 日历恢复 `8492d0f`，运行中渠道探针 `eef3ca5`，渠道媒体与日志安全 `9837366`，Windows 日历 CLI 重启发现 `2e1dfd0`；主工作树和 `C:\tmp\syno-fresh-2e1dfd0` 均为 Node 144/144、vault 57/57、仓库校验通过。
4. 已落地领域契约、单一 `CognitiveRuntime` 接口、原生 `ToolLoopAgent` 可信适配器、固定 Provider、收录/学习/创作闭环、微信/飞书 Adapter、Today 五入口 Web 与四层纸片法老。不要恢复旧 OpenCode 产品运行时或 3D 品牌方向。
5. 所有写入继续经过 Policy、审批、validator 和 GitGuard；Syno 永远不能修改自身源码。
6. 只精确暂存当前阶段路径，不用 `git add -A`，不 Push。
7. Hermes 候选锁定 `0f102fa4dc04b7dfdab048169aaaa640d09d7523`，但已确认会在 Chat Completions 外探测多个模型元数据路径，违反 Syno Provider 单端点契约，故该版本正式不采用且不得接触真实 Token。原生 Runtime 是唯一活动实现。
8. 用户级 `npx 11.7.0`、Playwright CLI 与官方 `@larksuite/cli` 1.0.72 已安装。主人授权后已从 OpenClaw last-good 认证档案直接迁移 token-cloud 到 Syno DPAPI；固定 `AIPC-deepseek-v4-flash` 五轮真实工具调用 5/5 通过。微信凭据已迁移，Owner 绑定、自动扫码、连续消息、故障恢复和 durable seen ID 跨重启通过；只剩无隐私附件实机往返。
9. 2026-07-20 已在最新代码 `2e1dfd0` 上重新完成 Playwright 桌面/移动复验；无横向溢出、Hoye 日历重启恢复、Token 不回显、设置焦点恢复、减少动画规则和 0 error/0 warning 均通过。记录与既有截图索引见 `docs/BROWSER-ACCEPTANCE.md`。
10. 备份恢复 CLI、单向迁移、运维、已知限制、最终切换清单和验收矩阵已固化；见 `docs/OPERATIONS.md`、`docs/MIGRATION.md`、`docs/KNOWN-LIMITATIONS.md`、`docs/CUTOVER-CHECKLIST.md` 和 `docs/FINAL-ACCEPTANCE.md`。真实 Provider、飞书消息/日历、fresh clone 和浏览器均已通过；下一步只完成微信无隐私附件实机与最终文档封板。
11. 微信 Bot Token 与回复 context 已改为 DPAPI，加密凭据与可备份 cursor/去重状态分离；旧明文 JSON 首次加载自动安全迁移。微信/飞书真实探针必须 `--confirm-live`，拒绝命令行凭据且只输出脱敏状态；流程见 `docs/CHANNEL-ACCEPTANCE.md`。
12. 飞书 Owner 私聊事件先进入最多保留 30 天的 pending 状态，只有 Agent 处理和回复都成功后才写 durable dedupe；失败事件可自动重试或跨 Worker 重启恢复，成功消息跨重启不重复执行。
13. Provider 真实探针在五轮 token-cloud 调用前执行不触网的上下文、超时和离线故障注入，并要求随后仍由同一 Model ID 全部成功；真实断网/恢复仍需主人按 `docs/PROVIDER-ACCEPTANCE.md` 操作，不能以故障注入冒充。
14. 未批准的收录载荷与 Proposal 只保存在可重建本地状态；批准 Job 才在隔离工作树中一次写入 Artifact、Candidate、Proposal 和 Note。学习证据必须包含至少 20 字主人原始输出，并在同一审批 diff 中生成 Artifact。
15. ConversationRouter 将单一 Owner 跨 Web/微信/飞书映射到同一 Conversation，并按会话排他执行。SignalSourceRegistry 已接通到期 Claim、待收录、输出机会和维护信号；通知节奏、安静时间、每日复习数、五区顺序和紧凑显示均有实际消费者。
16. 微信登录页已移除手动“我已扫码确认”，改为自动状态轮询和过期重试；长轮询具备客户端超时、成功清错和动态服务端 timeout。只读聊天允许开发工作区保留既有修改，但通过 Git 内容指纹检测执行期篡改；可写 Job 仍要求干净主工作区。
17. 真实微信故障记录 `job-20260719-461dea5d` 曾进入 `waiting_provider`，2026-07-20 重启后由固定 `AIPC-deepseek-v4-flash` 恢复完成。`a390462` 起成功重试会清除旧 error/nextRetryAt；旧记录保留原错误字段作为历史证据。
18. 飞书消息主人扫码注册、4 条真实 Owner 私聊、真实 seen ID 重放拒绝和 Worker 重启恢复通过。飞书 user 日历「Hoye」已通过真实创建、同 event ID 双更新、清理、错误拒绝与恢复；本地日历选择通过单审批 Job 持久化。剩余外部门槛仅为微信附件实机。
19. `eef3ca5` 修复运行中健康 probe 误报：微信不再争抢 poller lock，飞书不再打开第二条长连接；两个真实 probe 均从本机 Worker 返回 `ok/configured/ownerBound/connected=true` 与 `source=running_worker`。
20. `9837366` 按真实 iLink 协议补齐图片/文件 AES-128-ECB 解密和固定腾讯 CDN fallback，解密后仍执行 10 MB、MIME/魔数与隔离规则；飞书 SDK 使用静默 Logger，曾含敏感请求配置的精确 `.runtime` 临时日志已删除且未进入 Git。
21. `2e1dfd0` 让 Windows 服务在未设置 `LARK_CLI_PATH` 时自动发现与 `node.exe` 同目录或常见全局目录的官方 CLI。真实服务重启后恢复 `Hoye`、valid、lark-cli 1.0.72；不再依赖启动终端环境。
