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
```

归档仅包含 `%LOCALAPPDATA%\Syno\state`，不会包含 DPAPI credentials；`manifest.json` 记录版本、文件大小与 SHA-256。请再使用系统加密备份保护归档目录。

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
