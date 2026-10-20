# Mac 主部署剩余工作（2026-10-20 更新）

生产已从 Windows 切换到本机 macOS（Apple Silicon），飞书为唯一日常渠道；微信栈已物理删除。当前剩余项为 P2 登录冷启动及可选 P3 浏览器便利入口。P0 主动服务计划已取消，P1 仅保留历史分支追溯，不再将当时缺 GitHub 凭据视为当前阻塞。

## 现状（已完成，仅作事实基线）

- Host（8888 控制面）与 DSH chat（3088）在本机运行，`health/readiness=ready`，store／harness／channels 均 ready（2026-10-20 只读复核）。旧 deliveryOk 属于已删除的主动投递健康字段。
- 历史认知链 smoke 覆盖 Kimi、知识检索、原文读取与联网搜索；通用 web_fetch 已于 2026-10-17 禁用，当前网页读取只用受控 knowledge.fetch_url，不再将旧五轮工具面当当前入口。
- 飞书渠道：沿用既有应用 `cli_aa4dde442d395bdd`，Owner 已绑定；真实消息收发已验收。
- 凭据存储：`packages/syno-core/secret-protector.mjs`（macOS 钥匙串主密钥 + AES-256-GCM；Windows 保持 DPAPI），分支 `codex/mac-deployment` 提交 `d0d54b2`。
- Home channel 为飞书；本次状态为 running／available／ownerBound／home 均 true，不使用旧主动目标健康字段。
- 2026-10-20 f91a40a 回归为 772 pass／1 fail／19 skipped；失败是沙箱禁止真实钥匙串写入，仓库与文档检查通过。旧 875 pass 为历史基线，不能视作本次全量通过。

## P0 主动服务飞书化（已取消，2026-10-17）

主人要求删除全部主动推送；晨报、晚间复盘、周报、今日灵感、主动通知设施及其开关已删除，不再执行开启投递、confirm-test 或连续三日收卡验收。历史测试卡只证明当时版本的投递，不是当前能力。启动监督器的本机桌面崩溃告警仍保留，与产品主动消息不同。

## P1 平台修复分支（历史记录）

初始平台开发分支为 `codex/mac-deployment`，钥匙串接缝提交为 `d0d54b2`。当前 main 已包含平台实现；本轮没有检查远端认证或 CI，不沿用 2026-10-13 的“缺 GitHub 凭据”阻塞结论，也不自动 Push／创建 PR／合并或重启。

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

- `docs/PLATFORM-COMPATIBILITY.md` 声明的"真实 Mac 登录、渠道、浏览器验收"中，登录项见 P2；飞书真实收发已有 2026-10-13 历史验收，本轮只复核在线与 Owner 绑定；浏览器验收并入 P3。
- 微信通道栈及主动目标设施已物理删除，不存在重新绑定或启用开关。用户请求触发的收录／发布恢复仍保留。

## 风险与注意

- 钥匙串主密钥丢失（如手动删除条目）→ 已加密载荷不可解：飞书 Secret 需重新录入、受保护执行载荷可能不可恢复。建议保留 login 钥匙串并纳入 Time Machine 备份；不要删除 `credentials-master-key.v1` 条目。
- `.env` 与 `.local-data` 均不入库，密钥不写入日志。凭据轮换在主人授权的独立运维流程中执行，不使用已取消的 P0 主动投递步骤。
- 每次修改 `apps/ packages/ scripts/` 后需重启 Host 生效（无热加载）。
