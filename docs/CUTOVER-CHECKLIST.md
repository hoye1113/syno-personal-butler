# Syno 最终切换清单

所有步骤必须保留可复核输出。真实外部步骤由主人在本机完成扫码、授权或凭据录入；Token 不进入聊天、日志、截图或 Git。

## A. 代码与事实源

- [x] 分支保持 `codex/round3-remediation`，没有 reset 原有整改历史。
- [x] 原始 `D:\workSpace\obsidian_repository` 不属于运行写入根，保持只读。
- [x] `vault/` 与 `ops/` 分别是知识和行动事实源；`.runtime/` 可删除重建。
- [x] 原生 `ToolLoopAgent` 是唯一活动 `CognitiveRuntime`；Hermes 淘汰且无静默回退。
- [x] Syno 不具备源码、Shell、任意文件、Git、Policy 或 Skill 修改工具。

## B. 自动验证

- [x] 主工作树完整 Node、vault 与仓库验证通过。
- [x] 全新克隆完成锁文件安装、完整测试和仓库验证。
- [x] Provider 固定配置、Model ID 漂移、上下文上限、错误脱敏和 durable retry 有自动测试。
- [x] 收录、去重、冲突证据、Teach-back、用户学习证据和输出机会有自动测试。
- [x] 微信/飞书 Adapter 的鉴权、去重、顺序、降级和恢复边界有 Fake/契约测试。
- [x] 状态归档 CLI 在隔离目录完成 backup、verify、restore 和拒绝覆盖演练。
- [x] Playwright 完成桌面/移动、键盘、减少动画、Token 不回显和控制台验收。

## C. 主人本机外部验收

- [x] 在主人明确授权下，从 OpenClaw last-good 档案将 token-cloud Token、固定 Model ID 和上下文长度直接迁入 Syno DPAPI。
- [x] 执行 `pnpm probe:provider-real -- --confirm-live --trials 5`，五轮均通过原生工具循环且 Model ID 不漂移。
- [x] 真实 `PROVIDER_HTTP_ERROR` 后同一微信 Job 进入 `waiting_provider`，重启恢复后仍由固定 `AIPC-deepseek-v4-flash` 完成。
- [x] 微信凭据从主人授权的 OpenClaw 本机配置迁入 Syno DPAPI，Owner 绑定与真实连接健康通过。
- [ ] 微信 Owner 私聊 4/4 连续回复、Provider 失败恢复和 durable seen ID 跨重启已通过；真实 MD 已解密隔离并通过修复后的 Intake 形成 Artifact/Proposal，仍需主人修复后直发一次确认新 Artifact ID。
- [x] 飞书消息完成扫码绑定、4 条 Owner 私聊、真实 ID 重放拒绝和 Worker 重启恢复。
- [x] 飞书日历完成 user 授权、「Hoye」主日历选择、真实创建、同 event ID 双更新、清理、错误拒绝和重启恢复。

真实渠道步骤与安全记录格式见 `docs/CHANNEL-ACCEPTANCE.md`。
Provider 自动采用门、故障注入与主人真实断网步骤见 `docs/PROVIDER-ACCEPTANCE.md`。

## D. 数据保护与启动

- [x] 停止 Web/Worker，确认没有 `running` Job。
- [x] 记录精确 Git commit 与 `git status --short`（当前验收代码基线 `bc5937b`；封板文档和缓存稳定性修复为本 Job 明确差异）。
- [x] 备份仓库 `vault/`、`ops/`、`contracts/`、`config/` 和配置文档到 `C:\tmp\syno-repository-backup-20260720.zip`；407 项，敏感根排除，SHA-256 前缀 `9FF69A0E4A86E2ED`。
- [x] 执行状态 backup/verify；`C:\tmp\syno-state-final-bc5937b` 真实归档 52 项，manifest 的 `credentialsIncluded` 为 `false`，SHA-256 为 `DE0AD96C68170CA10498721C53F625A8405205DA912E095C2EFD026F70DAD969`。
- [x] 在空隔离状态目录完成恢复演练，并验证二次恢复被拒绝；正式状态未被覆盖。
- [x] 启动 Web/Worker，验证 Today、本地搜索、审批、提醒和微信/飞书消息通道健康；日历授权与选择在重启后恢复。
- [x] 检查 `docs/KNOWN-LIMITATIONS.md`；当前唯一真实设备门槛为修复后微信附件直发回执，其余剩余项是最终封板流程。

## E. 封板

- [ ] 更新 `docs/FINAL-ACCEPTANCE.md` 为全部必选项通过，并附真实外部证据摘要。
- [x] 对 `bc5937b` 再次运行完整测试、仓库和 `C:\tmp\syno-fresh-bc5937b`；锁文件离线安装下载 0，Node 150/150、vault 57/57、仓库校验通过。最新服务已完成桌面/移动无溢出、焦点恢复、减少动画、Token 不回显与 0 error/0 warning 浏览器复验。
- [ ] 对最终封板提交再执行一次 fresh-clone 安装、Node/vault/verify 和启动检查。
- [ ] 仅精确暂存本 Job 路径并创建本地提交；禁止 `git add -A`。
- [ ] 不自动 Push。Push 或远端发布只能由主人另行明确要求。

若 C、D 或 E 中任一必选项未完成，保持全局 Goal active，不把“本地功能可用”等同于“最终切换完成”。
