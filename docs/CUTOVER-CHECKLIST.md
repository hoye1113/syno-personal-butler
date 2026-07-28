# Syno 最终切换清单

所有步骤必须保留可复核输出。真实外部步骤由主人在本机完成扫码、授权或凭据录入；Token 不进入聊天、日志、截图或 Git。

## A. 代码与事实源

- [x] 分支保持 `codex/round3-remediation`，没有 reset 原有整改历史。
- [x] 原始 `D:\workSpace\obsidian_repository` 不属于运行写入根，保持只读。
- [x] `vault/` 与 `ops/` 分别是知识和行动事实源；`.runtime/` 可删除重建。
- [ ] OpenCode CLI 是唯一活动 `CognitiveRuntime`；原生运行时只保留为非活动迁移回滚，且无静默回退。此项须在 R5 真实验收后确认。
- [x] Syno 不具备源码、Shell、任意文件、Git、Policy 或 Skill 修改工具。

## B. 自动验证

- [x] 主工作树完整 Node、vault 与仓库验证通过。
- [x] 全新克隆完成锁文件安装、完整测试和仓库验证。
- [x] Provider 固定配置、Model ID 漂移、上下文上限、错误脱敏和 durable retry 有自动测试。
- [x] 收录、去重、冲突证据、Teach-back、用户学习证据和输出机会有自动测试。
- [x] 微信/飞书 Adapter 的鉴权、去重、顺序、降级和恢复边界有 Fake/契约测试。
- [x] 状态归档 CLI 在隔离目录完成 backup、verify、restore 和拒绝覆盖演练。
- [x] Playwright 完成桌面/移动、键盘、减少动画、Token 不回显和控制台验收。
- [x] Windows 任务 XML 的单一登录触发器、`PT30S` 延迟、执行权限、固定命令/参数/目录、单实例、隐藏、无限执行和失败重启契约已有自动测试；安装器在启动前验证持久化后的 XML。

## C. 主人本机外部验收

- [x] 在主人明确授权下，从 OpenClaw last-good 档案将 token-cloud Token、固定 Model ID 和上下文长度直接迁入 Syno DPAPI。
- [x] 执行 `pnpm probe:provider-real -- --confirm-live --trials 5`，五轮均通过原生工具循环且 Model ID 不漂移。
- [x] 真实 `PROVIDER_HTTP_ERROR` 后同一微信 Job 进入 `waiting_provider`，重启恢复后仍由固定 `AIPC-deepseek-v4-flash` 完成。
- [x] 微信凭据从主人授权的 OpenClaw 本机配置迁入 Syno DPAPI，Owner 绑定与真实连接健康通过。
- [x] 微信 Owner 私聊 4/4 连续回复、Provider 失败恢复和 durable seen ID 跨重启已通过；主人直发 MD 收到 `artifact-20260720-ac6c5d41`，后台形成 `ingest-50964b42`，未出现审批码且未写入 vault。
- [x] 飞书消息完成扫码绑定、4 条 Owner 私聊、真实 ID 重放拒绝和 Worker 重启恢复。
- [x] 飞书日历完成 user 授权、「Hoye」主日历选择、真实创建、同 event ID 双更新、清理、错误拒绝和重启恢复。

真实渠道步骤与安全记录格式见 `docs/CHANNEL-ACCEPTANCE.md`。
Provider 自动采用门、故障注入与主人真实断网步骤见 `docs/PROVIDER-ACCEPTANCE.md`。

## D. 数据保护与启动

- [x] 停止 Web/Worker，确认没有 `running` Job。
- [x] 记录精确 Git commit 与干净 `git status --short`（当前验收代码基线 `3c2b362`）。
- [x] 使用 `git archive` 备份当前跟踪事实、源码和配置到 `C:\tmp\syno-repository-backup-3c2b362.zip`；650 项，不包含本机忽略目录或凭据，SHA-256 `430BA4B9440AB011308A43EA24EEF1F149DBA39A7D59A6795A312B2B32E491F6`。
- [x] 执行状态 backup/verify；`C:\tmp\syno-state-final-bc5937b` 真实归档 52 项，manifest 的 `credentialsIncluded` 为 `false`，SHA-256 为 `DE0AD96C68170CA10498721C53F625A8405205DA912E095C2EFD026F70DAD969`。
- [x] 在空隔离状态目录完成恢复演练，并验证二次恢复被拒绝；正式状态未被覆盖。
- [x] 启动 Web/Worker，验证 Today、本地搜索、审批、提醒和微信/飞书消息通道健康；日历授权与选择在重启后恢复。
- [x] 检查 `docs/KNOWN-LIMITATIONS.md`；当前没有未完成的发布门槛，剩余条目均为显式运行限制或后续兼容性债务。

## E. 历史封板（已被 OpenCode R0–R6 重构重新打开）

- [x] 更新 `docs/FINAL-ACCEPTANCE.md` 为全部必选项通过，并附真实外部证据摘要。
- [x] 对 `3c2b362` 再次运行完整测试、仓库和 `C:\tmp\syno-fresh-3c2b362`；锁文件离线安装下载 0，Node 150/150、vault 57/57、主/fresh 仓库校验均为 570 项；隔离 4327 端口冷启动通过。最新服务已完成桌面/移动无溢出、焦点恢复、减少动画、Token 不回显与 0 error/0 warning 浏览器复验。
- [x] 仅精确暂存本 Job 路径并创建本地提交；未使用 `git add -A`。
- [x] 未自动 Push。Push 或远端发布只能由主人另行明确要求。

上述旧 Provider 封板证据不等于 OpenCode 运行时验收。当前 R5/R6 门槛以
`docs/TODO-EXECUTION-PLAN.md` 为准；主人已授权完成一次性凭据迁移，但真实模型、
真实跨渠道计数、OpenCode 重启恢复和旧实现删除尚未完成。

若 C、D 或 E 中任一必选项未完成，保持全局 Goal active，不把“本地功能可用”等同于“最终切换完成”。

## F. Web 收敛与 Windows 常驻服务（2026-07-20）

- [x] Today、Capture、Knowledge、Learn、Create 已按渐进披露原则收敛，并完成桌面/移动浏览器复验。
- [x] `pnpm start` 默认启动完整 Host；`SYNO_WEB_ONLY=true` 保留为隔离诊断入口。
- [x] Windows 管理命令、固定参数 Web API、JSON/同源保护和 Dry Run 自动测试已完成。
- [ ] OpenCode 重构后的真实 `Syno` 计划任务安装、状态、重启及下次 Windows 登录恢复由主人验收；本轮 Codex 未触碰真实 Task Scheduler。
- [x] 真实 `Syno` 登录任务已完成安装、显式打开、受控 PID 重启、卸载数据保留和重装恢复；最终任务为 Running，PID 从 57656 受控切换到 59040，PID 文件、Node 路径、仓库指纹与 4317 监听进程一致，未检测到 `Syno Worker`。
- [x] 真实演练覆盖交互式 Host 接管，以及未知 4317 服务导致新任务安装失败时按原 XML 恢复旧任务；恢复前后 XML SHA-256 同为 `65af6957e340540353e79f5ecaf53f582604a9d6ad196b45bce2ef71ebf9a79b`。旧任务停止、PID 所有权校验和替换注册均已纳入同一回滚边界。
- [x] 以 `1c4e782` 干净克隆叠加本轮精确路径完成隔离复验，并修复两条飞书测试误写真实 `%LOCALAPPDATA%\Syno` 的隔离遗漏。
- [x] 无 `node_modules` 的隔离克隆使用冻结锁文件冷安装成功，下载 0；`0cc2669` fresh clone 为 Node 172/172、vault 57/57、仓库校验 617 项，并完成真实 Web/Windows 验收。
- [x] 本轮实现提交为 `5d13db7`，Windows 临时目录清理竞态修复提交为 `22e6c5e`；从 `22e6c5e` 全新克隆后冻结安装下载 0，Node 165/165、vault 57/57、仓库校验 588 项全部通过。
- [x] 三轮审查发现的 Today 隐藏 pane、Web 自卸载、回滚恢复、Policy 审计、电池策略、通知事实源、输出状态散落和旧安装器问题已由 `02d45b3` 修复；真实 Web 审计、微信状态一致性和 launcher 单实例由 `99b2ea2`、`0cc2669` 固化。
- [x] 最终进程审计发现并修复 Web 重装遗留 launcher 包装进程；卸载后 Host 健康且包装进程为 0，重装后任务健康且包装进程严格为 1。
