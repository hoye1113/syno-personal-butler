# Windows 与 Apple Silicon 安装

当前生产平台为 macOS Apple Silicon，Windows 保留兼容支持。2026-10-20 Host／Harness／存储／飞书均 ready，飞书已绑定 Owner；当前在线不替代登录冷启动、浏览器交互及跨平台完整矩阵验收。剩余项见 [Mac 部署计划](plans/mac-deployment-remaining-work.md)，当前自动检查限制见 [已知限制](KNOWN-LIMITATIONS.md)。

测试时间夹具统一使用 Asia/Hong_Kong，与机器所在时区无关；每个测试最长 180 秒，超时直接失败，不缩小测试集合。

停止仅清理所属进程组，不向已退出、可能被复用的正 PID 发信号。清理失败保留 Supervisor 实例，Runtime 关闭返回失败且可重试，不记录 shutdown.completed；Host 保持控制面与租约，主人可以重试停止。锁初始化中的临时文件清理失败也必须释放内核租约。Mac CI 额外覆盖忽略 SIGTERM 的孙进程、无关兄弟进程存活及跨进程竞争恢复。

使用 Node 24；Mac 使用原生 arm64 Node 和 Xcode Command Line Tools。两端运行 `pnpm install --frozen-lockfile`、`pnpm run harness:setup`、`pnpm run harness:doctor`。Harness 使用已锁定的子模块与工具链，安装构建不启动第二个生产渠道连接。

受保护凭据走平台接缝（`packages/syno-core/secret-protector.mjs`）：Windows 保持 DPAPI（每值自包含密文）；macOS 使用登录钥匙串中的一把 32 字节主密钥做 AES-256-GCM 信封（`syno-secret-v1:` 前缀，钥匙串只存主密钥、文件只存自包含密文，主密钥不经 argv）；其它平台显式拒绝，不静默降级。飞书、工作流及 effect receipt／通道延续等受保护载荷共用这一接缝，macOS 不依赖 DPAPI。微信 iLink、主动目标和 accepted request／聊天补发设施已删除。真实钥匙串测试在受限沙箱中可能被系统拒绝；这不等于已通过该项验收。

登录自启：Windows 由计划任务运行 `scripts/start-syno.ps1`（PowerShell 监督循环）；macOS 由 LaunchAgent（`com.syno.butler.host`，`apps/syno/syno/mac-service-manager.mjs`）运行 `scripts/syno-launchd.mjs`（Node 监督循环）。两者同一行为契约：收养端口上已健康的本仓 Host、崩溃后 60 秒退避重启、连续 3 次快速崩溃弹桌面告警（每小时重告，一次正常存活 ≥60 秒重置）、JSONL 启动日志保留 14 天；macOS 日志为 `launchd-task-*.jsonl` 与 `launchd-agent.{out,err}.log`（位于本地数据根 `logs/`）。macOS 监督器在孵化新 Host 前回收孤儿 DSH（Host 以 detached 独立进程组孵化 DSH，被硬杀后 DSH 会占住 3088 端口；只回收命令行指向本仓 DSH 根的监听者，先 SIGTERM 后 SIGKILL）。安装/卸载由主人手动执行（`pnpm macos:install|status|restart|uninstall`），不进入管家能力面。

新机器在仓库 .env 配置 `SYNO_LOCAL_DATA=./.local-data`，不复制旧机器的凭据、会话或依赖目录。不设置 SYNO_KNOWLEDGE_ROOT。Knowledge 的事实源仍是当前仓库 vault/ 与 ops/。
