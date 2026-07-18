# 下一会话启动指令

1. 完整读取 `AGENTS.md` 与 `docs/HANDOFF-EXECUTION-PLAN.md`，再读取架构、策略、安全和设计文档。
2. 保持 `codex/round3-remediation`，不得 reset、checkout、修改原 Obsidian 知识库仓库或自动 Push。
3. R3-0 已提交 `c34ba05`，知识闭环首轮 `3ff0484`，可靠性基线 `9a0a61a`，CognitiveRuntime `f003276`，Hermes 决策与固定 Provider 加固 `f015921`，Web 无障碍和浏览器验收 `200fb1f`，最终切换控制 `2a8d195`，渠道凭据与探针加固 `04005b2`，飞书 durable delivery `1540b66`；主工作树和 `C:\tmp\syno-fresh-1540b66` 均为 Node 120/120、vault 57/57、仓库校验通过。
4. 已落地领域契约、单一 `CognitiveRuntime` 接口、原生 `ToolLoopAgent` 可信适配器、固定 Provider、收录/学习/创作闭环、微信/飞书 Adapter、Today 五入口 Web 与四层纸片法老。不要恢复旧 OpenCode 产品运行时或 3D 品牌方向。
5. 所有写入继续经过 Policy、审批、validator 和 GitGuard；Syno 永远不能修改自身源码。
6. 只精确暂存当前阶段路径，不用 `git add -A`，不 Push。
7. Hermes 候选锁定 `0f102fa4dc04b7dfdab048169aaaa640d09d7523`，但已确认会在 Chat Completions 外探测多个模型元数据路径，违反 Syno Provider 单端点契约，故该版本正式不采用且不得接触真实 Token。原生 Runtime 是唯一活动实现。
8. 用户级 `npx 11.7.0` 与 Playwright CLI 已安装。主人通过 Settings 安全配置后，用 `pnpm probe:provider-real -- --confirm-live --trials 5` 验证原生固定模型；微信与飞书扫码往返仍依赖主人设备。
9. 2026-07-18 已重新完成隔离 Playwright 验收，并修复关闭抽屉仍暴露焦点/可访问性树及移动端 Provider 设置入口不可达的问题；记录与截图见 `docs/BROWSER-ACCEPTANCE.md`，Web 基线为 `200fb1f`。
10. 备份恢复 CLI、单向迁移、运维、已知限制、最终切换清单和验收矩阵已固化；见 `docs/OPERATIONS.md`、`docs/MIGRATION.md`、`docs/KNOWN-LIMITATIONS.md`、`docs/CUTOVER-CHECKLIST.md` 和 `docs/FINAL-ACCEPTANCE.md`。当前仍只等待真实 Provider、微信和飞书主人验收，不能提前标记 Goal complete。
11. 微信 Bot Token 与回复 context 已改为 DPAPI，加密凭据与可备份 cursor/去重状态分离；旧明文 JSON 首次加载自动安全迁移。微信/飞书真实探针必须 `--confirm-live`，拒绝命令行凭据且只输出脱敏状态；流程见 `docs/CHANNEL-ACCEPTANCE.md`。
12. 飞书 Owner 私聊事件先进入最多保留 30 天的 pending 状态，只有 Agent 处理和回复都成功后才写 durable dedupe；失败事件可自动重试或跨 Worker 重启恢复，成功消息跨重启不重复执行。
