# Syno 本地运维、备份与恢复

## 状态分层

- Git 跟踪：`vault/`、`ops/`、`contracts/`、应用源码与文档。
- 本地可重建：`.runtime/` 的索引、锁、队列快照、投递通知和临时状态。
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

2026-07-20 封板演练在确认 0 个 `running` Job 后短暂停止 Worker，将真实非凭据状态备份到 `C:\tmp\syno-state-final-bc5937b`：52 项，`credentialsIncluded=false`，manifest SHA-256 为 `DE0AD96C68170CA10498721C53F625A8405205DA912E095C2EFD026F70DAD969`。归档在全新隔离根恢复成功，第二次恢复按预期拒绝；随后 Worker 重启，微信与飞书探针均从 `running_worker` 返回连接健康。

## 恢复与回滚

- 源码回滚只由 Codex 在独立开发流程执行；Syno 本身无源码修改能力。
- 回滚前保存未提交差异，不使用 `git reset --hard` 丢弃用户修改。
- 数据契约升级必须先备份，再运行迁移；迁移失败时保持旧数据不变并输出报告。
- 恢复命令 `pnpm state:archive -- restore <绝对归档目录>` 只接受空的状态目标，拒绝覆盖现有状态；先验证清单再复制。
- Provider 故障不回滚本地事实：Job 留在 `waiting_provider`，恢复连接后精确重试。
- 渠道故障只降级渠道；Web、本地搜索、任务、提醒和待决策项继续运行。

## 保留与清理

- 对话默认 30 天；确认转录后的原始语音 7 天；失败载荷 30 天。
- 未完成任务保留到 completed/failed/rejected/canceled 等终态。
- 删除缓存前验证目标是仓库 `.runtime/` 或明确的 Syno 本地目录，不对宽泛路径递归操作。
- `.pnpm-store/` 是安装缓存，删除需要按仓库受控执行规则提供精确目标和影响预览。

## 故障检查顺序

1. 查看 `%LOCALAPPDATA%\Syno\logs\syno-runtime-YYYY-MM-DD.jsonl` 的最新脱敏事件。
2. 查看 Provider/渠道状态页，不读取或回显 secret。
3. 查看 Job 状态、事件和脱敏错误码。
4. 运行配置、契约和仓库验证。
5. 运行针对性测试后再跑完整测试。
6. 生成 `BugReport` 或 `ImprovementProposal`；不要让 Agent 修改源码绕过故障。

运行日志按天写入 JSONL，默认保留 14 天，覆盖 Syno 初始化、OpenCode
配置/进程/健康/退出、渠道启动，以及消息的附件、决策、收录和 Runtime
阶段。日志只记录渠道、消息 ID、Artifact/Job/Run ID、状态和脱敏错误，不保存
主人对话正文；`Token`、`Authorization`、Cookie、密码、API Key 和带凭据 URL
会在落盘前递归脱敏。

查看当天最后 80 条：

```powershell
$log = Get-ChildItem "$env:LOCALAPPDATA\Syno\logs\syno-runtime-*.jsonl" |
  Sort-Object LastWriteTime |
  Select-Object -Last 1
Get-Content -LiteralPath $log.FullName -Tail 80
```

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

## 主人实测验收

Codex 完成 `docs/TODO-EXECUTION-PLAN.md` 的 P1–P3，并明确交付“自动门禁通过”证据后，再由主人执行本节。自动测试未通过时不要开始真实数据验收。

### 当前交付状态（2026-07-28）

- P1 收录自动封闭：完成。Outbox 租约/幂等、来源适配、DLP、规则 supersede、回执与拒绝恢复均已测试。
- P2 三轴复审：完成。Standards、Spec、Security 最终均为 P0 0、P1 0。
- P3 自动门禁：主工作树 Node 433/433、vault pytest 57/57、Repository verify 1382 files、`git diff --check` 通过；fresh clone Node 433/433、vault 57/57、Repository verify 1378 files 通过。
- 本轮未把真实浏览器页面、真实免费模型、Windows Task Scheduler 登录恢复、微信/飞书设备行为写成已通过。Playwright CLI/4329 本地页面受到当前 Codex 浏览器安全策略拒绝，真实页面验收移交主人 P4。Windows 任务的真实安装、状态与受控重启已有证据，但下次登录冷启动仍需主人确认。
- 当前工作树未提交；主人两项知识变更未被覆盖、未暂存；未 Push。

启动与诊断：

```powershell
pnpm opencode:doctor
pnpm start
pnpm opencode:status
pnpm windows:status
```

主人验收清单：

1. 微信发送一个 Markdown 文件，飞书发送一个 PDF，再发送一个纯 URL。
2. 分别发送“帮我收录这个 URL”和一次带“仅本地”的内容。
3. 查询“刚才的文件怎么样了”和“待我确认的收录”，确认不依赖模型也能返回持久状态。
4. 修改一次 Proposal，完成三次明确写入自动执行和一次冲突澄清。
5. 在 Proposal 生成前重启服务；另一次在 PendingDecision 形成后重启，确认状态和待决策项仍可恢复。
6. 从微信发起，在飞书查询或确认，验证同一 Owner 的跨渠道连续性。
7. 累计完成 30 条跨渠道消息、10 组多轮追问和 5 次 ToolRegistry 调用。
8. 对已收录知识做一次 teach-back，确认“已收录”不会自动提高掌握度，只有主人证据会推进学习状态。
9. 已执行真实 Windows 任务安装、状态和受控重启；仍需在下次登录后确认 Syno Host、OpenCode 子进程和未完成 Workflow 共同恢复。

每项至少记录：

```text
时间：
渠道：
输入类型：
Artifact / Workflow / Job ID：
期望结果：
实际结果：
是否通过：
相关日志 event：
截图或补充：
```

任一失败项都应保留 ID 与日志，回到自动修复阶段；不要重复写入或重复触发澄清、手工改 vault 或删除失败状态来制造通过结果。全部通过并由主人明确确认后，才允许规划 R6 清理旧运行时。
