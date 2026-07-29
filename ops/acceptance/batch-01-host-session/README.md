# 批次一真实 Windows Host/Session 演练

日期：2026-07-29（Asia/Shanghai）

## 范围

- implementation base：`de36175`
- exercise branch：`codex/exec-p03a-windows-health-contract`
- Host 健康契约修复：`9e1e1ca`
- 演练记录 head：`df4cc7c`
- 用户已明确授权本次启动/重启 Syno Windows 计划任务。

## 完整自动回归

- Node：480/480 passed。
- Vault：57/57 passed。
- 完整回归时 Repository verify：1418 files，active documentation 7 files passed。
- 写入真实 Job/Event 与本验收记录后 Repository verify：1424 files，active documentation 7 files passed。
- `git diff --check`：passed。

## 真实 Windows Host

- 首次重启暴露管理脚本仍按 Host 协议 v1 校验、而真实 Host 已返回协议 v2；任务实际启动成功，但管理命令错误超时。
- `9e1e1ca` 将计划任务健康校验固定到协议 v2，并增加拒绝 legacy v1 的回归断言。
- 修复后的计划任务重启成功，状态为 installed/running，启动方式为 `at_logon`，未检测到 legacy task。
- 重启前后 Host PID 和 instance identity 均发生变化；重启后的 PID 记录与 Host Lock 所有者一致。
- `/api/syno/health` 返回 `ready`、协议 v2；`/api/syno/readiness` 的 Store、OpenCode、Channels 均为 `ready`。
- 在主 Host 运行时真实启动第二个 Host，第二个进程以 `PROCESS_LOCK_HELD` 退出；原 Host 随后仍为 `ready`。

## 真实 OpenCode Session

- 重启前 Job `job-20260729-f74c40f8` 使用首选模型一次完成，返回固定文本 `BATCH1_SESSION_OK`，未产生工具调用或 changed paths。
- Windows Host 重启后，Binding Store 为 v2。真实 OpenCode `getSession` 成功确认旧 Session，因此 lifecycle 保持 `available`；未进入无法确认时才使用的 quarantine 分支。
- 重启后 Job `job-20260729-c5cc500f` 依赖上一轮上下文，返回 `BATCH1_SESSION_CONTINUITY_OK`。
- 两次 Job 的 OpenCode Session identity 相同，证明真实重启恢复与上下文连续性通过。
- 两个真实 Job 均按现有产品语义生成脱敏 Job/Event，并由 GitGuard 仅提交声明路径。

## 证据边界

- 这是本机真实 Windows 计划任务、真实 Host 与真实 OpenCode Session 演练，不是 Fake OpenCode 探针。
- 本次没有发送真实微信或飞书消息，也没有验证下次 Windows 登录冷启动；这些仍保留到后续批次和 R6。
- PR-07A 的 fork、abort 迟到工具调用和失败响应污染仍未验证。
- Owner 对本次计划任务操作已授权；R6 产品 Owner 验收未执行，不能由本记录替代。
