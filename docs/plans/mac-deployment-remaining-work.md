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
- 步骤 3（已完成）：Owner 在飞书确认只收到一条测试卡。
- 步骤 4（已完成）：`/api/syno/proactive/confirm-test` 写入发布证据（`confirmedAt=2026-10-13T15:38:35Z`）。
- 步骤 5（已完成）：`notifications.proactiveDeliveryEnabled=true`（`confirmed=true` 必需），`proactive/status` 显示 `enabled=true, homeTargetAvailable=true, 连续失败 0`。
- 验收（进行中）：Observe 首日投递——08:30 晨报、22:00 晚间复盘、12:30 灵感卡按点到达飞书，连续 3 日 `deliveryHealth.consecutiveFailures=0`。
- 回滚：将 `notifications.proactiveDeliveryEnabled` 置回 `false`；无需回退 home（如需可再切回）。
- 注意：受控测试期间必须保持真实投递暂停；证据只能由确认入口写入。

## P1 平台修复分支推送与合并（阻塞：本机缺 GitHub 凭据）

- 分支 `codex/mac-deployment` 含两项提交：钥匙串凭据接缝修复（`d0d54b2`）与本方案文档。
- 需要：提供 GitHub PAT（HTTPS）或配置 SSH；随后 `git push -u origin codex/mac-deployment`。
- 验收：平台工作流 Windows + macOS 双绿；PR 用 squash 合并；合并后本机 `git pull` 同步。
- 合并后动作：本机即生产，重启 Host 后用 `pnpm run verify` 与 `/api/syno/health` 复核。

## P2 macOS 登录自启（开发完成，待主人登录冷启动验收）

目标：登录自动拉起 Host；崩溃循环有主动告警；安装/卸载由主人手动执行（不进入管家能力面）。

- 交付物（分支 `codex/macos-launchd`）：`scripts/syno-launchd.mjs`（Node 监督循环：收养已健康 Host、60 秒退避重启、快速崩溃连击桌面告警、JSONL 日志与 14 天保留，行为契约对齐 `scripts/start-syno.ps1`）；`apps/syno/syno/mac-service-manager.mjs`（LaunchAgent `com.syno.butler.host` 的安装/状态/重启/卸载）；`scripts/manage-macos-agent.mjs` + `pnpm macos:*`；测试 `tests/macos-launcher.test.mjs`、`tests/macos-service.test.mjs`（20 例）；`packages/syno-core/repo-fingerprint.mjs`（与 server 共用指纹公式）。
- 真机验收（2026-10-14，本机）：
  - 安装后 Agent `jobState=running`，自动收养端口上的会话 Host（`launcher.adopted`）；
  - 终止 Host → 60 秒退避后自动拉起（16:26:30 / 16:27:46 / 16:29:01 三次实测）；
  - 连续 3 次快速崩溃（uptime 51.1s→15.6s→11.6s）→ `launcher.crash_loop streak=3 popupDelivered=true`，桌面告警实际弹出；
  - 验收发现并修复（其一）：Host 以 detached 独立进程组孵化 DSH，Host 被 SIGKILL 硬杀后 DSH 成孤儿占住 3088，新 Host 绑定失败进入 `HARNESS_EXITED` 恢复循环。监督器现在在孵化新 Host 前回收命令行指向本仓 DSH 根的孤儿监听者（SIGTERM → 宽限 → SIGKILL，陌生服务不碰），`launcher.orphan_reaped` 事件留痕；
  - 验收发现并修复（其二）：macOS 的 `p_comm` 被截断为 16 字符（绝对路径启动的 node 显示为 `/usr/local/bin/n`），采用校验按 comm 匹配 node 会误判并把监督器停掉。监听者解析改为从 `ps -o args=` 首个 token 取可执行路径；采用校验失败改为有界重试（15 秒间隔，连续 3 次才安静停下），旧 Host 优雅退出中的瞬态不再导致停机；
  - 修复：日志函数曾因 `fs.promises` 上误调 `appendFileSync` 而静默失败（已修复 + 日志落盘单元测试 + stderr 兜底）。
- 待主人验收：注销/重启后的登录冷启动（登录后 60 秒内自动拉起、`health=ready`）。
- 停用/回滚：`pnpm macos:uninstall`（bootout + 删除 plist）。

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
