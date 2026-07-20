# Syno 本地运维、备份与恢复

## 状态分层

- Git 跟踪：`vault/`、`ops/`、`contracts/`、应用源码与文档。
- 本地可重建：`.runtime/` 的索引、锁、队列快照和临时状态。
- 本地敏感：`%LOCALAPPDATA%\Syno\credentials` 的 DPAPI 凭据；严禁复制到仓库、日志或工单。
- 本地持久：对话、等待重试的 Job、未完成摄取状态。清理前先停 Worker 并备份。

## 备份

1. 停止 Syno Web/Worker，确认没有 `running` Job。
2. 记录当前 Git commit 和 `git status --short`；未跟踪的用户资料不得遗漏。
3. 备份仓库的 `vault/`、`ops/` 与配置文档。
4. 对本机状态做加密备份；DPAPI 凭据只能在同一 Windows 用户上下文恢复。Token 更推荐在新机器重新输入。
5. `.runtime/` 可省略；恢复后重建索引。

可执行的本地状态流程（归档目录必须是绝对路径）：

```powershell
pnpm state:archive -- backup D:\Backups\syno-state-20260717
pnpm state:archive -- verify D:\Backups\syno-state-20260717
pnpm state:archive -- restore D:\Backups\syno-state-20260717
```

归档仅包含 `%LOCALAPPDATA%\Syno\state`，不会包含 DPAPI credentials；`manifest.json` 记录版本、文件大小与 SHA-256。请再使用系统加密备份保护归档目录。

完整测试包含一次使用隔离 `SYNO_LOCAL_DATA` 的 CLI 端到端演练：创建等待 Provider 的 Job 与对话状态，依次执行 backup、verify、restore，并验证二次恢复因目标非空而失败。该测试不会访问真实 `%LOCALAPPDATA%\Syno`。

## 恢复与回滚

- 源码回滚只由 Codex 在独立开发流程执行；Syno 本身无源码修改能力。
- 回滚前保存未提交差异，不使用 `git reset --hard` 丢弃用户修改。
- 数据契约升级必须先备份，再运行迁移；迁移失败时保持旧数据不变并输出报告。
- 恢复命令 `pnpm state:archive -- restore <绝对归档目录>` 只接受空的状态目标，拒绝覆盖现有状态；先验证清单再复制。
- Provider 故障不回滚本地事实：Job 留在 `waiting_provider`，恢复连接后精确重试。
- 渠道故障只降级渠道；Web、本地搜索、任务、提醒和审批继续运行。

## 保留与清理

- 对话默认 30 天；确认转录后的原始语音 7 天；失败载荷 30 天。
- 未完成任务保留到 completed/failed/rejected/canceled 等终态。
- 删除缓存前验证目标是仓库 `.runtime/` 或明确的 Syno 本地目录，不对宽泛路径递归操作。
- `.pnpm-store/` 是安装缓存，删除需要按仓库审批规则提供精确目标和影响预览。

## 故障检查顺序

1. 查看 Provider/渠道状态页，不读取或回显 secret。
2. 查看 Job 状态、事件和脱敏错误码。
3. 运行配置、契约和仓库验证。
4. 运行针对性测试后再跑完整测试。
5. 生成 `BugReport` 或 `ImprovementProposal`；不要让 Agent 修改源码绕过故障。

渠道健康 probe 可以在 Worker 运行时直接执行。它优先读取 `http://127.0.0.1:<PORT>/api/syno/channels` 的脱敏状态，返回 `source: running_worker`；仅在本机服务不可达时才启动独立 Adapter。这样不会与微信进程锁竞争，也不会为飞书重复建立长连接。

### Windows 飞书日历 CLI

当前验收锁定官方 `@larksuite/cli` 1.0.72：

```powershell
npx @larksuite/cli@1.0.72 install
lark-cli version
```

不要安装不存在的 `@larksuite/lark-cli` 包。若服务进程早于 CLI 安装启动，重启 Syno；它会检查 `LARK_CLI_PATH`、与当前 `node.exe` 同目录的包装器以及常见 npm/pnpm 全局目录。仍可显式把 `LARK_CLI_PATH` 指向 `lark-cli.ps1` 或 `lark-cli.cmd`。Syno 将 npm 包装器解析到官方 Node 入口，避免直接 spawn `.ps1` 的 `EFTYPE` 错误。用户日历仍需 `lark-cli auth login --domain calendar` 授权，消息 App 扫码不能替代日历 user 授权。

## 发布和切换

- 发布前逐项执行 `docs/CUTOVER-CHECKLIST.md`，结果写入 `docs/FINAL-ACCEPTANCE.md`。
- 任何真实 Provider、微信或飞书门槛未通过时，只能继续本地隔离运行，不得宣称完成最终切换。
- 已知限制统一维护在 `docs/KNOWN-LIMITATIONS.md`；修复后必须附对应测试或真实验收证据再移除。
