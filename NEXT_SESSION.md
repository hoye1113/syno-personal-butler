# Syno OpenCode 重构交接（2026-07-28）

## 新对话第一句话

> 完整读取根 `AGENTS.md`、`NEXT_SESSION.md` 和 `docs/TODO-EXECUTION-PLAN.md`。先核对分支、HEAD、工作树与真实测试，再从当前 OpenCode 重构断点继续。保留两项主人知识变更；不要修改原 Obsidian 库，不要 reset，不要 `git add -A`，不要 Push。

## 当前基线

- 分支：`codex/round3-remediation`
- 本轮固定起点：`f0333f3`
- 已完成实现提交：`5890dad`
- OpenCode CLI：`1.18.2`
- OpenCode 实际二进制：
  `%LOCALAPPDATA%\mise\installs\node\24.13.0\node_modules\opencode-ai\bin\opencode.exe`
- OpenCode 子进程端口：`127.0.0.1:4318`
- mise shim 后台启动会递归，禁止作为生产启动目标。
- Windows 计划任务 XML 加固前的 OpenCode 自动验证：Node 370/370、vault pytest 57/57、Repository verify 1358 files。
- Windows 计划任务 XML 加固后的当前自动验证：Node 375/375、vault pytest 57/57、Repository verify 1359 files、`git diff --check` 通过。
- 干净克隆 `C:\tmp\syno-fresh-863bcca`：Node 370/370、vault 57/57、Repository verify 1356 files；按现有锁文件安装成功。
- 真实无模型 OpenCode 探针已通过 1.18.2、loopback、Basic Auth、Session create/abort/delete、静态 `syno` MCP 和禁止内置工具不可调用。
- 主人已明确授权将全局 OpenCode 配置中的可用凭据一次性迁入 Syno DPAPI；产品运行时不会自动读取或依赖全局 `auth.json`。
- 真实免费模型、渠道与 Windows 登录恢复仍由主人验收，不能把凭据已配置、Fake/无模型探针或 XML 单元测试表述为真实产品验收。

## 必须保留的主人变更

以下两项不属于 OpenCode 重构，禁止覆盖、暂存或提交：

- `vault/02-Resources/AI and Agents/MOC - Agent 架构与工程.md`
- `vault/02-Resources/AI and Agents/Agent Design & Patterns/当编码不再是瓶颈 - Berkeley RDI 软件自主开发三级框架.md`

## 已实现

- OpenCode Supervisor、真实二进制解析、版本锁定、Basic Auth、loopback、独立 profile、自有 PID 树。
- `opencode:doctor/status/restart/configure` 与真实 Server 探针。
- `OpenCodeCognitiveRuntime` Capability v2、Session binding、跨渠道 main Session、主动 proactive Session、串行、取消、保留清理和固定三模型链。
- 项目级 `syno` Agent 与 capture/knowledge/learn/review/create/maintain 六个 Skills。
- 静态 Syno MCP Tool Bridge；OpenCode 只能调用 ToolRegistry 允许的 `syno_*` 工具。
- 统一渠道处理器、自然语言单审批、严格双审批、Owner/thread/TTL/digest/replay 边界。
- SourceDescriptor 与 URL/文件/个人观点/未知来源收录追溯。
- Web OpenCode 状态、独立 Zen Token 配置和重启入口。
- 根 `AGENTS.md` 已移除 `hy3-free` 与 Claude 自动升级规则。
- Token 由 DPAPI 保存，并通过内联配置引用子进程环境变量，不进入参数或状态元数据。
- 活跃旧会话迁移只保留脱敏摘要和最近用户消息；私密内容、工具输出和密钥不进入 OpenCode。
- `waiting_provider` 有周期恢复；并发后台/手动重试只能有一个调用取得 Job 执行权。
- Proposal 修改会取消旧 Job；附件正文不能触发审批。
- Standards / Spec / Security 三轴已完成修复复核，未解决 P0/P1 为 0。
- Windows 安装器已改为通过 `Syno.WindowsTaskXml.psm1` 保护并验证任务 XML：固定单一登录触发器、30 秒延迟、执行身份、命令、参数、工作目录、单实例、隐藏运行、无限执行和每分钟重启。现有健康任务只有在导出 XML 通过同一契约后才可复用。

## 当前断点

1. 主人运行 `pnpm opencode:doctor`，确认凭据状态，再运行 `pnpm start`，用非敏感内容执行真实模型与提示注入探针。
2. 主人停止手动 Host 后运行 `pnpm windows:install`、`pnpm windows:status` 和 `pnpm windows:restart`，验证计划任务安装、健康与受控重启。
3. 主人完成真实微信、飞书、Web 多轮上下文、工具、普通审批、双审批和三类来源计数。
4. 主人验证 OpenCode 重启后的上下文与 PendingDecision 恢复，并在下次 Windows 登录后复验 Syno Host 与 OpenCode 子进程共同恢复。
5. 真实门槛全部满足前不得进入 R6 或删除旧实现。

## R6 封板门槛

旧 Provider/ToolLoopAgent/ContextManager/ConversationStore/Executor/Hermes 代码尚未删除，且现在不允许删除。必须先完成：

- 30 条真实跨渠道消息
- 10 组多轮追问
- 5 次 ToolRegistry 调用
- 3 次普通审批
- 1 次完整双审批
- 3 种来源类型收录
- OpenCode 重启后上下文与 PendingDecision 恢复

完整状态、接口、测试矩阵和执行顺序以 `docs/TODO-EXECUTION-PLAN.md` 为准。
