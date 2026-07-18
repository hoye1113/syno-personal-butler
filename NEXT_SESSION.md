# 下一会话启动指令

1. 完整读取 `AGENTS.md` 与 `docs/HANDOFF-EXECUTION-PLAN.md`，再读取架构、策略、安全和设计文档。
2. 保持 `codex/round3-remediation`，不得 reset、checkout、修改原 Obsidian 知识库仓库或自动 Push。
3. R3-0 已提交 `c34ba05`，知识闭环首轮 `3ff0484`，可靠性基线 `9a0a61a`，CognitiveRuntime `f003276`，Hermes 决策与固定 Provider 加固 `f015921`，Web 无障碍和浏览器验收 `200fb1f`，最终切换控制 `2a8d195`，渠道凭据与探针加固 `04005b2`，飞书 durable delivery `1540b66`，Provider 采用门 `fdd0c04`；主工作树和 `C:\tmp\syno-fresh-fdd0c04` 均为 Node 121/121、vault 57/57、仓库校验通过。
4. 已落地领域契约、单一 `CognitiveRuntime` 接口、原生 `ToolLoopAgent` 可信适配器、固定 Provider、收录/学习/创作闭环、微信/飞书 Adapter、Today 五入口 Web 与四层纸片法老。不要恢复旧 OpenCode 产品运行时或 3D 品牌方向。
5. 所有写入继续经过 Policy、审批、validator 和 GitGuard；Syno 永远不能修改自身源码。
6. 只精确暂存当前阶段路径，不用 `git add -A`，不 Push。
7. Hermes 候选锁定 `0f102fa4dc04b7dfdab048169aaaa640d09d7523`，但已确认会在 Chat Completions 外探测多个模型元数据路径，违反 Syno Provider 单端点契约，故该版本正式不采用且不得接触真实 Token。原生 Runtime 是唯一活动实现。
8. 用户级 `npx 11.7.0` 与 Playwright CLI 已安装。主人通过 Settings 安全配置后，用 `pnpm probe:provider-real -- --confirm-live --trials 5` 验证原生固定模型；微信与飞书扫码往返仍依赖主人设备。
9. 2026-07-18 已重新完成隔离 Playwright 验收，并修复关闭抽屉仍暴露焦点/可访问性树及移动端 Provider 设置入口不可达的问题；记录与截图见 `docs/BROWSER-ACCEPTANCE.md`，Web 基线为 `200fb1f`。
10. 备份恢复 CLI、单向迁移、运维、已知限制、最终切换清单和验收矩阵已固化；见 `docs/OPERATIONS.md`、`docs/MIGRATION.md`、`docs/KNOWN-LIMITATIONS.md`、`docs/CUTOVER-CHECKLIST.md` 和 `docs/FINAL-ACCEPTANCE.md`。封板审计发现的会话连续性、真实学习原文、Claim/Evidence 聚合、重复收录决策、创作生命周期、主动信号/有效设置和飞书未送达竞态已完成修复；仍需在本轮精确提交后刷新 fresh clone，然后继续真实 Provider、微信和飞书主人验收。
11. 微信 Bot Token 与回复 context 已改为 DPAPI，加密凭据与可备份 cursor/去重状态分离；旧明文 JSON 首次加载自动安全迁移。微信/飞书真实探针必须 `--confirm-live`，拒绝命令行凭据且只输出脱敏状态；流程见 `docs/CHANNEL-ACCEPTANCE.md`。
12. 飞书 Owner 私聊事件先进入最多保留 30 天的 pending 状态，只有 Agent 处理和回复都成功后才写 durable dedupe；失败事件可自动重试或跨 Worker 重启恢复，成功消息跨重启不重复执行。
13. Provider 真实探针在五轮 token-cloud 调用前执行不触网的上下文、超时和离线故障注入，并要求随后仍由同一 Model ID 全部成功；真实断网/恢复仍需主人按 `docs/PROVIDER-ACCEPTANCE.md` 操作，不能以故障注入冒充。
14. 未批准的收录载荷与 Proposal 只保存在可重建本地状态；批准 Job 才在隔离工作树中一次写入 Artifact、Candidate、Proposal 和 Note。学习证据必须包含至少 20 字主人原始输出，并在同一审批 diff 中生成 Artifact。
15. ConversationRouter 将单一 Owner 跨 Web/微信/飞书映射到同一 Conversation，并按会话排他执行。SignalSourceRegistry 已接通到期 Claim、待收录、输出机会和维护信号；通知节奏、安静时间、每日复习数、五区顺序和紧凑显示均有实际消费者。
