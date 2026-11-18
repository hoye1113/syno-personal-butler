# Pi Worker 真实纵向验证报告

- 日期：2026-11-18
- 最终结论：**通过。真实 Pi Agent Core 经 loopback OpenCode Server 的直接模型接口，使用 `opencode-go/deepseek-v4.1-flash` 完成收录 Worker 闭环；Server 退出后知识 Worker 继续运行。**
- 运行包：`@earendil-works/pi-agent-core@1.5.2`、`@earendil-works/pi-ai@1.5.2`
- 脱敏证据：`/Users/hoye/Documents/workspace/butler-superagent/v4/pi-evidence.json`
- 接口预检：`/Users/hoye/Documents/workspace/butler-superagent/v4/PI-SERVER-PREFLIGHT.md`

## 最终实测链路

```text
合成 Owner URL
→ capture:<document_id>
→ Pi Agent Core
→ 自定义 streamFn
→ loopback OpenCode Server
→ POST /api/experimental/generate
→ opencode-go/deepseek-v4.1-flash
→ {"go":true}
→ 确定性 captureSource()
→ Result Lane 独立复核
→ 原 Owner 通知
→ OpenCode Server 退出
→ 后续知识 Worker 查询成功
```

实测断言：

- Pi 版本为 `1.5.2`。
- 运行中 Server 的 `/openapi.json` 包含 `experimental.generate.text`。
- provider/model 固定为 `opencode-go/deepseek-v4.1-flash`。
- 模型请求恰好一次：`providerRequests = 1`。
- 工具事件为零：`toolEvents = 0`。
- Pi 返回合法 go 决定，随后才调用收录器。
- 副本 vault 生成一份完整 Markdown，Result Lane 复核通过。
- 收录和后续知识查询各产生一条对应 Owner 通知。
- OpenCode Server 已退出；进程检查无 `opencode serve` 残留。
- 知识回答包含“持久恢复依赖 Hub 事实日志”，证明 Hub 与其他 Worker 不依赖 Pi/OpenCode Server 常驻。

## 从失败到通过的根因

最初三轮使用：

```text
opencode run --standalone --agent plan
```

该路径形成“Pi Agent 套 OpenCode Plan Agent”，三次均未满足固定 JSON 契约：

1. 第一次返回自然语言解释。
2. 第二次发现伪 `system:` 角色正文与测试 Session 复用。
3. 第三次修正这两个问题后，模型仍优先遵循 Plan Agent 会话规则。

按返工上限停止后，只读预检发现 OpenCode v2.0.29 的独立 `generate.text` 接口。最终改为：

```text
opencode serve --hostname 127.0.0.1 --port 0
→ POST /api/experimental/generate
```

该接口直接执行一次性 `llm.generate()`，不保存 Session，也不进入 Plan Agent。第四次真实纵向测试在新桥接下通过。三次失败没有被删除或改写为成功。

## 凭据与数据边界

- OpenCode Go 凭据始终由现有 OpenCode CLI/Server/Store 内部使用。
- 未执行 `opencode auth export`，未读取、复制、打印或保存订阅 Key。
- loopback Server 使用公开的测试占位密码 `local-fixture`；它不是订阅 Key，仅用于本地 HTTP Basic Auth。
- 仅发送合成任务文本；未访问真实 URL，未写正式 vault，未发送真实私有正文。
- 未升级 Syno 生产 vendor，未切换生产。

## 回归证据

Pi 实测后实际执行：

```bash
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v4
# 11/11
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v0
# 5/5
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v1
# 12/12
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v2
# 12/12
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v3
# 1/1
# 合计 41/41
```

真实 Pi 测试使用独立命令，不纳入默认无费用测试套件：

```bash
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run real:pi
# complete=true，providerRequests=1，flows=2
```

## 当前实现文件

- `/Users/hoye/Documents/workspace/butler-superagent/v4/pi-worker.mjs`
- `/Users/hoye/Documents/workspace/butler-superagent/v4/real-pi.mjs`
- `/Users/hoye/Documents/workspace/butler-superagent/v4/plugin-agent.ts`
- `/Users/hoye/Documents/workspace/butler-superagent/v4/harness.mjs`
- `/Users/hoye/Documents/workspace/butler-superagent/v4/pi-runtime-lab/package.json`
- `/Users/hoye/Documents/workspace/butler-superagent/v4/pi-runtime-lab/package-lock.json`
- `/Users/hoye/Documents/workspace/butler-superagent/package.json`

首次中断的旧命名空间安装残留 `/Users/hoye/Documents/workspace/butler-superagent/v4/pi-lab` 未删除，避免未经授权清理。

## 仍未证明的范围

- 一次真实成功不等于长期稳定性优于 DSH；尚未做重复运行、并发、取消、超时和崩溃恢复矩阵。
- 当前接口为非流式文本生成，未证明长回答流式能力。
- 未验证多个 Specialist 同时共用 Pi Runtime 的隔离与资源开销。
- 请求成功不代表已核对 Go 控制台扣费渠道。
- Pi 目前是可替换 Worker 的实测候选，不是已切换的统一生产 Runtime。
