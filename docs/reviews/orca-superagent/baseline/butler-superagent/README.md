# Butler Super Agent 实验工程

当前 **V0、V1、V2、V3、V4.1、V4.2 均已完成实验验收**：V1 两条真实 Claude 完整流程和真实 Session resume 已完成；V2 假模型敌意测试 12/12，并通过真实 OpenCode 四对象五任务完整链路；V3 真实飞书 Owner 私聊、四结果卡片、按钮关闭、重启去重与旧 Runtime 恢复通过；V4.1 合成 vault 只读检索、精确引用、安全拒读和恢复测试通过；V4.2 本地合成来源收录、去重、回滚、崩溃恢复，以及真实 DSH `0.2.2-rc.3` 可替换 Worker、退出后知识 Worker 存续均通过。另有真实 Pi `1.5.2` Worker 经 loopback OpenCode Server 和固定 Go 模型完成收录与退出后知识查询，全量无费用回归 **41/41**。DSH 验收是 RC 预发布实验，Pi 也尚未切换为统一生产 Runtime。

- V0 验证证据：`/Users/hoye/Documents/workspace/butler-superagent/v0/VERIFICATION.md`
- V1 执行方案：`/Users/hoye/Documents/workspace/butler-superagent/v1/PLAN.md`
- V1 验证报告：`/Users/hoye/Documents/workspace/butler-superagent/v1/VERIFICATION.md`
- V1 真实证据：`/Users/hoye/Documents/workspace/butler-superagent/v1/real-evidence.json`
- V2 执行方案：`/Users/hoye/Documents/workspace/butler-superagent/v2/PLAN.md`
- V2 验证报告：`/Users/hoye/Documents/workspace/butler-superagent/v2/VERIFICATION.md`
- V2 真实 OpenCode 证据：`/Users/hoye/Documents/workspace/butler-superagent/v2/opencode-evidence.json`
- V3 执行方案：`/Users/hoye/Documents/workspace/butler-superagent/v3/PLAN.md`
- V3 验证报告：`/Users/hoye/Documents/workspace/butler-superagent/v3/VERIFICATION.md`
- V3 真实飞书证据：`/Users/hoye/Documents/workspace/butler-superagent/v3/live-evidence.json`
- V4.1 执行方案：`/Users/hoye/Documents/workspace/butler-superagent/v4/PLAN.md`
- V4.1 验证报告：`/Users/hoye/Documents/workspace/butler-superagent/v4/VERIFICATION.md`
- V4.2 阶段验证报告：`/Users/hoye/Documents/workspace/butler-superagent/v4/V42-VERIFICATION.md`
- Pi 纵向方案：`/Users/hoye/Documents/workspace/plan/butler-pi-worker-vertical-slice.md`
- Pi 验证报告：`/Users/hoye/Documents/workspace/butler-superagent/v4/PI-VERIFICATION.md`
- Pi 脱敏证据：`/Users/hoye/Documents/workspace/butler-superagent/v4/pi-evidence.json`

- 方案：`/Users/hoye/Documents/workspace/plan/butler-superagent-autoloop-vertical-slices-v4.md`
- 架构：`/Users/hoye/Documents/workspace/plan/butler-superagent-autoloop-plan-v4.md`
- 验证证据：`/Users/hoye/Documents/workspace/butler-superagent/v0/VERIFICATION.md`

## 范围

使用固定提交的 autoloop 真实 Hub 内核、确定性 Adapter 和假 Router/Worker/Feishu，验证：

```text
owner.chat
→ context.research.message
→ task.research
→ task.result
→ Result Lane notice
→ 假飞书卡片投递
```

V0 不包含真实模型；V1 仅在沙箱中使用合成公开问题调用 Claude。V2 增加多对象路由、可重建 Registry、条件版本、内容寻址检查点与信任分区，使用假模型敌意测试和真实 OpenCode 语义样本。V3 复用现有飞书应用完成 Owner 私聊真实通道闭环，测试后已恢复旧 Runtime。V4.1 使用合成 vault 和确定性 Worker 验证本地只读检索与独立引用复核；V4.2 使用本地合成来源和独立副本 vault 验证收录、去重、回滚与恢复，并用 DSH `0.2.2-rc.3` 真实 SDK 进程加 loopback 假模型验证 Worker 替换和退出后存续。Pi `1.5.2` 另以 loopback OpenCode Server 的直接模型接口完成一次真实 Go 模型收录与退出后知识查询。真实 URL、正式 vault、真实外部模型驱动 DSH、生产 vendor 升级与全量生产切换尚未执行。

## 文件

- `v0/rules.json`：Root/Object/Worker/Result 四条静态规则及来源隔离。
- `v0/flow.mjs`：逐消息上下文适配、任务与结果 envelope、关联校验和通知生成。
- `v0/flow.test.mjs`：成功、失败重试、取消、伪造关联、重放和恢复测试。
- `v1/adapter-core.mjs`：模型语义输出与确定性事件 envelope 的边界。
- `v1/claude-structured.mjs`：沙箱 Claude wrapper、流式 Session 和持久调用硬门。
- `v1/integration.test.mjs`：真实 HTTP Hub/Worker 下的假 CLI 完整链路与故障恢复。
- `v1/real.mjs`：受持久额度约束的真实流程验收。
- `v2/adapter-service.mjs`：从 Hub 重建 Registry 的权威 Context Adapter、条件路由提交和唯一 Checkpoint Writer。
- `v2/integration.test.mjs`：多对象完整链路、stale/并发、并行、信任分区、崩溃恢复与通知去重。
- `v2/real-opencode.mjs`：真实 OpenCode 四对象五任务完整链路与语义路由验收。
- `v3/feishu-bridge.mjs`：现有 Feishu Adapter 与 autoloop Owner 事件、卡片投递和按钮 answer 的桥接。
- `v3/live-runner.mjs`：真实飞书单监听测试运行器与脱敏证据采集。
- `v4/knowledge.mjs`：document_id 映射、只读检索与 Result Lane 独立引用复核。
- `v4/structured.mjs`：确定性 Root/Object/只读知识 Worker。
- `v4/capture.mjs`：本地合成来源收录、原子写入、去重与独立全文复核。
- `v4/dsh-worker.mjs`：真实 DSH SDK Worker、显式 profile/Home、loopback mock 与退出审计。
- `v4/dsh-lab`：锁定 `0.2.2-rc.3` 及当前平台必需原生依赖的独立实验目录，不连接生产 vendor。
- `v4/pi-worker.mjs`：真实 Pi Agent Core Worker，经 loopback OpenCode Server 直接调用固定 Go 模型。
- `v4/real-pi.mjs`：真实 Pi 收录、独立复核、Server 退出和后续知识查询验收。
- `v4/pi-runtime-lab`：锁定 Pi `1.5.2` 依赖的独立实验目录。
- `v4/pi-evidence.json`：真实 Pi 链路的脱敏证据。
- `v4/integration.test.mjs`：引用、安全拒读、权限、伪造结果、重启与 vault 零写入测试。
- `vendor/agent-autoloop`：固定上游 SHA 的独立实验克隆，无源码改动。

## 运行

```bash
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v0
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v1
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v2
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v3
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v4
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run preflight:v1
# 真实 V1 额度已全部用完；没有新的用户授权，不要运行 real:v1 或 real:resume。
# V2 真实 OpenCode 已获 2026-11-17 授权，仅使用固定 Go integration 与 DeepSeek 4.1 Flash。
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run real:v2
# real:pi 会产生真实 Go 模型请求，不属于默认无费用回归；没有新的用户授权不要重跑。
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run real:pi
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent/vendor/agent-autoloop" run typecheck
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent/vendor/agent-autoloop" test
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent/vendor/agent-autoloop" run test:sim
```

注意：Result Lane 使用 `tell:"needed"`。若设为 `never`，autoloop 会把它的 notice 标记为 quiet，通道不会投递。
