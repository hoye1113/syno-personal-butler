# V1 执行方案：单上下文真实 Claude Code 闭环

- 日期：2026-11-17
- 状态：已完成；两条真实完整流程、真实 Session resume 与全部无费用回归均通过
- 前置证据：`/Users/hoye/Documents/workspace/butler-superagent/v0/VERIFICATION.md`
- 上游切片：`/Users/hoye/Documents/workspace/plan/butler-superagent-autoloop-vertical-slices-v4.md`

## 一、范围

只把 V0 的 Root Router、Object Control 和 Research Worker 替换为真实 Claude Code；Context Adapter、结果 envelope 和 Result Lane 仍由确定性代码负责。继续使用合成公开问题、单对象 `research:demo` 和假飞书，不接 DSH/OpenCode，不读写真实 vault，不进入 V2 多对象路由。

## 二、实现结构

```text
假飞书 / Hub HTTP
  → Root Claude Adapter
  → 模型只返回逐消息语义决定
  → 确定性 Context Adapter 生成 context.research.message
  → Object Claude Adapter
  → 确定性任务包装生成 task.research
  → Worker Claude Adapter
  → 模型只返回回答，代码复制 task/context/Owner 关联
  → task.result
  → 确定性 Result Lane
  → 假飞书
```

自定义 Agent 插件放在隔离 `AGENT_AUTOLOOP_HOME/plugins/`，不修改上游源码。Claude CLI wrapper 负责环境允许列表、工具限制、调用计数、预算和沙箱；模型文本不能直接决定事件 ID、cwd、access、task_id 或通知目标。

## 三、真实调用前的硬门

### 3.1 隔离方式

本机已确认：

- Claude Code：`2.1.325`，路径 `/Users/hoye/.local/bin/claude`；
- 没有 Docker、Podman 或 Colima；
- 有 macOS `/usr/bin/sandbox-exec`。

原架构要求独立系统账号或容器。用户已于 2026-11-17 明确批准：本次 V1 合成数据实验可采用 `sandbox-exec + Claude --restricted + 独立 Home/cwd + 环境允许列表` 作为等效 OS 沙箱。该批准仅覆盖 V1，不代表降低后续生产安全门。

沙箱配置目标：只读声明的 CLI/运行库与认证配置，只写隔离实验目录；禁止读取 Syno、vault、Hub 主密钥和其他项目目录；禁止 MCP、 hooks、Skills、Bash、WebFetch 和其他工具。认证配置只按 CLI 需要只读使用，不复制、不打印、不写入报告。

### 3.2 最小额度与追加记录

首次真实验收总额已获用户批准：**最多 6 次 Claude 调用，Root/Object/Worker 各最多 2 次，单次 `--max-budget-usd 0.25`**。两次完整流程用于证明首次会话与 resume 路径。达到任一上限即拒绝新调用，不依赖模型自觉节约，也不允许 Hub 重试绕过计数。

2026-11-17 首次 Root 在模型请求前因沙箱临时目录检查失败，按“失败也计次数”消耗 Root=1。用户随后明确批准仅追加 Root 启动额度 1 次。第二次 Root 因隔离环境未携带当前登录所需的认证变量而失败，仍未取得模型响应，计数至 Root=2。用户随后明确批准：（1）选择性传递 `ANTHROPIC_AUTH_TOKEN` 与 `ANTHROPIC_BASE_URL`，不打印、不写入证据，其他密钥和 Hub 变量仍剔除；（2）再追加 Root 启动额度 1 次。第三次 Root 返回非约定 JSON，修复 Root 输入与提示后，第四次 Root 完成首条真实闭环。用户最后明确批准再追加 Root 1 次用于复用成功 Session 的第二条流程。最终硬上限为 **Root=5、Object=2、Worker=2**，且已全部使用；单次 `--max-budget-usd 0.25` 不变。真实计数固定保存在 `/Users/hoye/Documents/workspace/butler-superagent/v1/state/budget.json`，不得通过重建临时 Hub 重置。

故障、取消、伪造结果和预算耗尽优先用假 CLI 注入，不消耗真实额度。

## 四、执行顺序

1. 写隔离 rules、Claude adapter、受限 wrapper 和假 CLI；用契约测试验证参数、环境、计数和确定性 envelope。
2. 重跑 V0，确保共享拓扑与结果语义没有回归。
3. 在假 CLI 下跑通 V1 全流程、第二条消息不阻塞、失败/取消、迟到结果、预算耗尽和重启。
4. 用户确认沙箱替代与额度后，运行第一次真实完整流程，检查事件链、Session、用量和通知。
5. 运行第二次真实流程验证 resume；若失败则停在未知/对账，不盲目重复副作用。
6. 重跑全部测试并写 `/Users/hoye/Documents/workspace/butler-superagent/v1/VERIFICATION.md`，随后停在 V1。

## 五、验收标准

- 一条真实 Claude 指令完成路由、后台调研和统一回复；第二次完整流程证明可重复与续接。
- Worker 运行期间，第二条 Owner 消息可以进入 Root/Object 新轮次，不被长 Worker 同步阻塞。
- 模型不能伪造关联或权限；失败/取消不生成成功结果，重复结果与通知不重复生效。
- Root/Object/Result/Worker/Hub 重启后，已确认事实不丢；Session 接不上时进入未知或对账，不盲目重跑。
- 总调用与各规则调用到顶即停；预算耗尽产生显式失败，不继续消费。
- 所有真实输入均为合成公开文本；无真实 vault、个人记忆、生产凭据或飞书流量。

## 六、明确不在本切片

多对象 A/B/X、批量与 stale 快照、持久 Context Registry、检查点信任分区、真实飞书、DSH/OpenCode、主动发现和生产迁移。
