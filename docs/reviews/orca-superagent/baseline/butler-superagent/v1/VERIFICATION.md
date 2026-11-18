# V1 验证报告：单上下文真实 Claude Code 闭环

- 日期：2026-11-17
- 状态：**完成；两条真实完整流程与 Session resume 均通过**
- 范围：合成公开问题、单对象 `research:demo`、假飞书、真实 HTTP Hub、独立 Worker 进程、沙箱 Claude Code
- 真实证据：`/Users/hoye/Documents/workspace/butler-superagent/v1/real-evidence.json`

## 一、最终验收结论

两条真实消息均完成：

```text
owner.chat
→ Root Claude
→ context.research.message
→ Object Claude
→ task.research
→ Worker Claude
→ task.result
→ Result Lane
→ 假飞书通知
```

- Root、Object、Worker、Result 共 8 个 run 全部为 `done`；
- 两条通知分别关联 `task:feishu:real-1` 与 `task:feishu:real-2`；
- 第二次 Object 与 Worker 均复用第一次的真实 Session；
- Root 两次使用不同 Session，没有错误共享对象上下文；
- 所有真实 run 均有非零输入、输出 token 和费用记录；
- 两次成功链路的 run 费用合计为 `$0.1145952`，单次均低于 `$0.25` 硬上限；该合计不包含早期失败启动。

## 二、真实 Session 与结果证据

| 项目 | 第一次 | 第二次 | 结论 |
|---|---|---|---|
| Root Session | `2054ed47-1857-4f06-837b-7a9e10e46446` | `0d88dc85-adb8-49c5-975c-2f16581cc626` | 独立，符合 Root 不持有对象长 Session |
| Object Session | `fbe8c868-a8e4-4da2-8a50-0f3d15979875` | 同左 | **resume 通过** |
| Worker Session | `dc17f047-4a10-4052-a821-1e56f8cca6c7` | 同左 | **resume 通过** |

真实通知：

1. `research:demo / task:feishu:real-1`：回答“什么是事件溯源”；
2. `research:demo / task:feishu:real-2`：接着给出本地笔记库的新建、修改、删除事件示例。

完整 run、事件、用量和通知见 `/Users/hoye/Documents/workspace/butler-superagent/v1/real-evidence.json`。该文件不包含认证 Token、Cookie、真实 vault 或个人记忆。

## 三、最终无费用回归

### V0

```bash
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v0
```

结果：**5/5 通过**。

### V1 适配器与真实 HTTP/Worker 假 CLI

```bash
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v1
```

最终结果：**12/12 通过，0 失败，0 跳过**。

覆盖：

- Root 逐 `owner_event_id` 决定，缺项、未知 ID、非 JSON 和伪造关联被拒绝；
- Object/Worker 的关联字段只从可信 Job context 复制；
- 新 Session、resume、流式 started、环境参数与文本回执契约；
- 完整链路、慢 Worker 非阻塞、来源重放和通知去重；
- 失败不产生下游事件，原生退避期间同 lane 消息合并等待；
- 取消保持终态，迟到结果不能生成成功通知；
- 每角色预算到顶即失败，重试不能绕过计数，stale lock 可回收；
- **Root、Object、Result 各自执行期间强杀 Worker 进程均恢复**；
- Worker 执行期间强杀后恢复，Hub 重开后事实保留，结果和卡片只生效一次。

真实模型只用于两条成功闭环及下文记录的失败启动；故障、取消、预算和各阶段强杀均使用假 CLI 注入，不额外消耗真实额度。

## 四、沙箱、认证与预算证据

- `sandbox-exec` 启动 Claude `2.1.325` 成功；
- 最终 `claude auth status` 预检：`exitCode=0, loggedIn=true`；
- `CLAUDE_CODE_TMPDIR`、`TMPDIR`、`XDG_RUNTIME_DIR` 指向 V1 隔离目录；
- Home、cwd、Session 和缓存均使用 V1 隔离路径；
- 禁用工具、MCP、hooks、Skills 和权限提示，模型只返回角色语义 JSON；
- 经用户明确批准，仅选择性传递 `ANTHROPIC_AUTH_TOKEN` 与 `ANTHROPIC_BASE_URL`；不打印、不写入证据，其他 API Key 和 Hub 变量不继承；
- 沙箱只读声明的二进制、系统资源和实验代码，只写 V1 Home/tmp，不读取真实 vault 或 Syno 凭据。

最终持久计数：

```json
{"counts":{"root":5,"object":2,"worker":2}}
```

初始额度为各角色 2 次；Root 因临时目录、认证和 JSON 契约问题，经用户分别明确批准追加到 5 次。Object/Worker 上限始终为各 2 次，单次 `--max-budget-usd 0.25` 未变。计数固定在 `/Users/hoye/Documents/workspace/butler-superagent/v1/state/budget.json`，不能通过重建临时 Hub 重置。

## 五、真实接入中修复的问题

1. **临时目录**：沙箱无法查看已存在的共享 `/tmp/claude-501`，改用官方 `CLAUDE_CODE_TMPDIR` 指向隔离目录；
2. **认证**：当前登录依赖两个环境变量，取得明确授权后选择性转发，并用无模型调用的 `auth status` 预检；
3. **Root 语义错位**：模型曾直接回答问题。修复为 Root 不接收问题正文、不继承上游回执长提示，只接收事件 ID 并输出逐消息决定数组；新增非 JSON 假样本回归；
4. **回执协议**：`outcome` 只能由结论文本表达，不能放入 autoloop JSON 代码块；
5. **进程恢复**：wrapper 流式上报真实 started/Session，缺失参数不再被误认为 `--role`；
6. **预算持久性**：真实计数不放在临时 Hub Home，失败启动也计次数。

早期第 3 轮阻断曾按返工护栏停止并留档；用户随后明确指令继续，完成上述修复与验收。

## 六、边界

V1 完成不等于生产就绪。仍未进入：多对象 A/B/X、批量与 stale Registry、检查点信任分区、真实飞书、DSH/OpenCode、主动发现、真实 vault 和生产迁移。下一步是否启动 V2，由用户决定。
