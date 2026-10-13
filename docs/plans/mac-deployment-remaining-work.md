# Mac 主部署剩余工作（2026-10-13）

生产已从 Windows 机器切换到本机 macOS（Apple Silicon）；飞书为唯一渠道入口，微信不绑定。本文件是当前剩余工作的执行方案与验收口径；完成后按各条归属更新对应文档。

## 现状（已完成，仅作事实基线）

- Host（8888 控制面）与 DSH chat（3088）在本机运行，`health=ready`、`deliveryOk=true`。
- 认知链真实验证：`pnpm spike:capabilities` 五轮全绿（Kimi 模型 → 知识检索 → 原文读取 → web_search → web_fetch）。
- 飞书渠道：沿用既有应用 `cli_aa4dde442d395bdd`，Owner 已绑定；真实消息收发已验收。
- 凭据存储：`packages/syno-core/secret-protector.mjs`（macOS 钥匙串主密钥 + AES-256-GCM；Windows 保持 DPAPI），分支 `codex/mac-deployment` 提交 `d0d54b2`。
- Home channel 已切换到飞书（`/api/syno/channels/home`），`homeTargetAvailable=true`。
- 回归基线：`pnpm test` 875 pass / 0 fail / 20 skipped（Windows 专属用例）；`pnpm verify` 通过。

## P0 主动服务飞书化并开启投递（进行中，Owner 参与）

目标：晨报（08:30）、晚间复盘（22:00）、周报（周日 20:00）、今日灵感卡与系统告警全部投递到飞书。

- 步骤 1（已完成）：Home channel 切到 feishu。
- 步骤 2（已完成）：受控测试卡已投递（`runId=mac-accept-1`，`eventId=outbox-20261013151926881-ce410297`，`proactive.bundle.delivered`）。
- 步骤 3（待 Owner）：在飞书确认只收到这一条测试卡。
- 步骤 4（待执行）：`POST /api/syno/proactive/confirm-test`（`confirmed=true`，携带上述 eventId/runId，`visibleCount=1`、`order=single`、`result=passed`）写入发布证据。
- 步骤 5（待执行）：`POST /api/syno/settings`（`key=notifications.proactiveDeliveryEnabled`、`value=true`、`evidenceEventId=outbox-20261013151926881-ce410297`）打开真实投递。
- 验收：连续 3 日晨报/晚间复盘按点投递且 `deliveryHealth.consecutiveFailures=0`；灵感卡 12:30 出卡；期间 `waiting_provider`、失败码分布可查。
- 回滚：将 `notifications.proactiveDeliveryEnabled` 置回 `false`；无需回退 home（如需可再切回）。
- 注意：受控测试期间必须保持真实投递暂停；证据只能由确认入口写入。

## P1 平台修复分支推送与合并（阻塞：本机缺 GitHub 凭据）

- 分支 `codex/mac-deployment` 含两项提交：钥匙串凭据接缝修复（`d0d54b2`）与本方案文档。
- 需要：提供 GitHub PAT（HTTPS）或配置 SSH；随后 `git push -u origin codex/mac-deployment`。
- 验收：平台工作流 Windows + macOS 双绿；PR 用 squash 合并；合并后本机 `git pull` 同步。
- 合并后动作：本机即生产，重启 Host 后用 `pnpm run verify` 与 `/api/syno/health` 复核。

## P2 macOS 登录自启（开发任务，对齐 Windows 计划任务）

目标：登录自动拉起 Host；崩溃循环有主动告警；安装/卸载由主人手动执行（不进入管家能力面）。

- 交付物：`launchd` LaunchAgent 安装脚本（install/status/restart/uninstall），plist 固定仓库路径、Node 绝对路径、单实例；崩溃退避重启与 `launcher.crash_loop` 同类告警（对齐 `scripts/syno-launcher-crash-alert.ps1` 的行为契约）。
- 幂等与契约测试：安装后重复安装不改语义；卸载干净；非法路径/缺 Node 时快速失败。
- 验收：注销/重启后 60 秒内自动拉起、`health=ready`；人为杀死进程连续 3 次后出现桌面告警；一次正常存活 ≥60 秒重置计数。
- 现状风险：当前 Host 由交互会话启动，会话退出即停止。

## P3 对话页入口（可选，低优先级）

- 现状：3088 需进程令牌，Host 捕获但不外露；飞书已是日常入口，本项仅在需要本机浏览器对话时再做。
- 方案选项：a) Host 向本机 Owner 暴露 launch URL（loopback + Host 头白名单，与既有本机信任边界一致）；b) 由 8888 受控代理对话；c) 不做。
- 验收（若做）：本机浏览器可打开并对话；令牌不出 loopback；无新增对外暴露面。

## P4 其它平台验收项（低优先级）

- `docs/PLATFORM-COMPATIBILITY.md` 声明的"真实 Mac 登录、渠道、浏览器验收"中，登录项见 P2、渠道项见 P0；浏览器验收并入 P3。
- 微信渠道保持未绑定：代码保留、不再作为 home 或推送目标；历史 outbox/目标记录只读不动。

## 风险与注意

- 钥匙串主密钥丢失（如手动删除条目）→ 已加密载荷不可解：飞书 Secret 需重新录入、outbox 载荷不可恢复（可重建）。建议保留 login 钥匙串并纳入 Time Machine 备份；不要删除 `credentials-master-key.v1` 条目。
- `.env`（KIMI/搜索/无飞书 key）与 `.local-data` 均不入库；密钥不写入日志；聊天里出现过的飞书 Secret 可在飞书后台轮换后再录入（重录步骤同 P0 的凭据写入）。
- 每次修改 `apps/ packages/ scripts/` 后需重启 Host 生效（无热加载）。
