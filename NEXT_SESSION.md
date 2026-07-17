# 下一会话启动指令

请接管 Syno 项目，并严格按以下顺序继续：

1. 完整读取 `AGENTS.md`、`docs/HANDOFF-EXECUTION-PLAN.md`、`docs/ARCHITECTURE.md`、`docs/POLICY.md`、`docs/SECURITY.md`、`docs/V1-REVIEW-LOG.md`。
2. 执行 `git status --short --branch` 和 `git log --oneline -5`。当前第三轮整改可能处于未完成状态，不得 reset、checkout 或丢弃任何工作树改动。
3. 执行完整测试，先完成 `R3-0`：修复 fixture runtime/lock/payload 路径、稳定 side-effect 结果契约、恢复 Policy validator 契约，然后补齐第三轮安全回归测试。
4. 只有测试、仓库验证和 `git diff --check` 全绿后，才继续 `R3-1 → V1-CLOSE → V2-0 → V2-1 → V2-2 → V2-CLOSE`。
5. Markdown/YAML 是事实源；所有写入必须经过 Policy、审批、validator 和 GitGuard。禁止模型直写文件、执行 shell 或决定权限。
6. OpenCode 模型顺序固定；Claude Code 只由确定性规则升级且不传模型参数。V2 Provider 凭据只存 `%LOCALAPPDATA%\Syno`。
7. 不使用 OpenClaw 运行时；不修改原 Afu/知识库仓库；不使用 `git add -A`；不自动 Push。

最后一个已验证全绿基线是 `a75502c`。`docs/V1-VERIFICATION.md` 描述的是该提交，不代表后续未提交工作树仍为绿灯。

