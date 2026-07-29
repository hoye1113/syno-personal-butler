---
status: accepted
---

# OpenCode 驱动的 Kimi WebBridge 边界

Syno 不把用户全局 `kimi-webbridge` Skill 作为产品运行时依赖，也不把它的 Shell/curl 示例直接暴露给 OpenCode。全局 Skill 只作为上游方法、版本和兼容性参照；项目内的 `syno-web-capture` 是可审计的薄适配层。

收录失败时，Syno 的 `IngestWorkflowCoordinator` 先完成确定性 URL 安全检查和直接 HTTP 尝试，只有安全的、可分类的失败才签发浏览器任务。OpenCode 在隔离的 `capture:{artifactId}` Session 中按项目 Skill 规划步骤，但只能看到固定的 `syno_browser_*` 工具；工具桥在服务端绑定 Workflow、Owner、精确 URL 和当前会话，不能传入任意 Kimi action、endpoint、标签页或 Shell 命令。

浏览器内容是不可信来源材料。登录、验证码、条款、表单和其他需要主人操作的页面进入可恢复的 `interaction_required` 状态，由主人用自然语言“继续刚才的收录”恢复同一 Workflow。Artifact、Proposal、Approval、Policy、GitGuard 和知识事实源仍由 Syno 持有，OpenCode Session 不是任务状态源。

这样既复用了 Kimi WebBridge 的真实浏览器能力，又避免全局 Skill 漂移、权限扩大和第二套收录规则；项目 Skill 缺失或 WebBridge 不可用时，系统报告结构化失败，不自行安装、修改全局配置或绕过受控执行。
