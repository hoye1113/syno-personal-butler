# V2 验证报告：多对象上下文与持久恢复

- 日期：2026-11-17
- 结论：**V2 完成。假模型多对象完整链路与敌意故障闭环 12/12；真实 OpenCode CLI + DeepSeek 4.1 Flash 四对象五任务语义闭环通过；V0/V1 无费用回归通过。**
- 范围：真实 autoloop HTTP Hub、独立 Worker 进程、合成 Owner 消息、假/真 CLI、假飞书 Channel。
- 未执行：真实飞书、真实 vault、DSH、生产服务；本报告不代表 V3 已开始。

## 实际命令与结果

```bash
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v0
# 5/5 通过

npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v1
# 12/12 通过；全部为假 CLI，无真实模型调用

npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v2
# 12/12 通过：adapter 单元 2 项 + integration 10 项
```

该次假模型连续回归共 **29/29 通过**，没有跳过或取消；真实 OpenCode 调用单独记录在下节。

## V2 通过项与证据

1. **首次 claim 前批量 A/B/X 隔离**：三条 Owner 消息合并为一个 Root 轮次；capture A/B 与 idea X 各自完成 Object、Worker、Result；三个 Worker Session 不同；正文、检查点和通知不串线；Root/Object/Worker 假调用计数为 1/3/3。
2. **来源重放和通知去重**：重复 `v2:a` 被 Hub 判为 duplicate，不新增 Root run；重复 deliver 不增加已确认通知。
3. **继续、切换与歧义**：讨论 A 创建 `knowledge:A` 而非重复 `capture:A`；idea X 第二次 Object run 复用 Session；多候选指代产生带两个候选的追问；显式无效操作产生拒绝卡片。
4. **失败退避合并**：Root 失败退避期间第四条消息并入原 run，失败时不产生任何下游 context/task/result。
5. **stale 与并发竞争**：同版本两个 create 只有一个成功；create→continue→archive 后旧快照 message 返回 409；archived 写入、重复 create 均拒绝，Registry 始终只有一个对象。
6. **并行与同对象串行**：慢 A 期间 B 可完成；A 后续消息排队并最终生成独立结果，共五个 Result run；B 与排队 A 的通知各一条。
7. **Adapter 提交后崩溃**：测试专用 crash hook 在事件已提交、HTTP 响应未返回时退出；Hub/Adapter 重启后仅从 Hub 重建出 `capture:A`；同 Owner 事件的 create 重放返回 409，不形成第二对象或第二事实源。
8. **Worker 强杀与 Hub 重开**：A/B 两个 Worker 同时持有时 SIGKILL，重启后恢复四个结果；再次重开 Hub 与 Worker，两个后续任务的通知各一条，两个对象检查点均可从投影定位。
9. **信任分区**：恶意 Worker 的“伪造偏好”仅进入 `untrusted_working.answer`；Owner 明确确认后 `confirmed.statement` 才是“只保留本地事实”；后续 Worker 结果不能覆盖 confirmed。
10. **Registry 重建与归档恢复**：孤立检查点不改变投影；删除 registry 缓存语义等价于重开 Hub 后重建；归档恢复后 Worker 复用原 Session，通知关联原 Owner 事件。
11. **缺失检查点显式失败**：归档后删除被引用文件，恢复 Root 停在带“缺失”错误的重试状态；不启动新 Worker，不静默切换上下文，对象仍保持 archived。
12. **关联伪造拒绝与回执契约**：Object/Worker 忽略模型提交的伪造 context_id、task_id，只从可信事件复制；错误 subject/type/id 被拒绝；文本回执可由上游直接读取且不包含非法 outcome。

## 权威与恢复边界

- Registry 是 Hub `context.*` 事件的可重建投影，不是独立事实源。
- 路由提交必须携带 `expectedVersion`；提交前同步重建并检查。当前仅验证单写入等效事务，不宣称多写入生产一致性。
- 检查点先写 SHA-256 内容寻址文件，再提交 Hub 引用；无引用文件忽略，有引用但缺失或哈希不符则失败。
- `confirmed`、`operational`、`untrusted_working` 分区没有被 Worker 文本打通。
- autoloop 仍为至少一次执行；测试证明的是确定性事件 ID、关联校验、确认通知和恢复逻辑共同防止业务结果重复生效，不宣称外部副作用天然 exactly-once。

## 真实 OpenCode 语义与完整链路

用户于 2026-11-17 明确允许使用真实 OpenCode CLI 和 DeepSeek 4.1 Flash 验证，不担心额度限制。实际只使用固定模型 `opencode-go/deepseek-v4.1-flash`，凭据 integration 为 `opencode-go`；没有读取、复制或输出 Key，没有使用隔离的 Console 凭据。

```bash
opencode --version
# opencode v2.0.29

opencode run --standalone --model 'opencode-go/deepseek-v4.1-flash' '只回复 OK'
# OK

npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run real:v2
# {"complete":true,"flows":5,"contexts":["capture:A","capture:B","idea:X","knowledge:A"],"rootRuns":3}

npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v2
# 接入后假模型回归仍为 12/12
```

最终成功样本：

- 首次批量四条消息合并为一个 Root run，分别创建 `capture:A`、`capture:B`、`knowledge:A`、`idea:X`。
- 五个任务全部经过 `owner.chat → context.<domain>.message → task.<domain> → task.result → notice`，不是单独测试分类器。
- 四个对象的 Worker Session 全部不同；第二次讨论 A 复用同一个 knowledge Object Session。
- 第二次讨论 A 和其余四个任务的通知各恰好一条；测试按完整任务 ID 判重，避免 `knowledge-a` 误匹配 `knowledge-a-2`。
- 多候选“继续讨论它”由真实模型返回 ask，选项包含四个活跃对象，没有按最近对象盲目续接。
- 最终成功运行包含 3 个 Root、5 个 Object、5 个 Worker 真实 CLI 调用。证据：`/Users/hoye/Documents/workspace/butler-superagent/v2/opencode-evidence.json`。

调试记录：第一次 Root 给 context_id 附加标题，被可信 Adapter 拒绝且没有下游事件；随后收紧精确 ID 提示与错误信息。第二次完整执行后，测试辅助函数因任务 ID 前缀 substring 误报重复，改为完整 ID 匹配后第三次成功。持久计数器中真实 Wrapper 累计 Root/Object/Worker 为 7/10/10，包含这些调试运行；另有两次独立 CLI 连通/JSON 契约探测。没有把这些调试运行算作最终通过样本。

真实 CLI 使用 `--agent plan`，未使用 `--auto`，cwd 为合成实验目录；这不是 OS 沙箱或凭据隔离边界。请求成功只证明模型与链路可用，**不代表已在 Go 官方控制台核对扣费渠道**。

## 已知限制与下一步

- 真实 OpenCode 样本只覆盖四对象创建、知识对象继续与歧义追问；归档、stale、崩溃和恶意 Worker 的敌意覆盖由假模型测试承担。
- 下一切片是 V3 现有飞书应用的 Owner 私聊/指定测试会话闭环；本报告没有连接真实飞书，也没有切换生产流量。
