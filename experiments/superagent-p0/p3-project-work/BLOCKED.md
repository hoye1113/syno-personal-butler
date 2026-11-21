# BLOCKED

## 当前状态

- **无剩余 P0／P1 阻塞。** P3.2 Project Specialist 纵向切片已通过并停手：确定性 17/17、五文件合跑 49/49、全量 gate 903 项（884 通过、0 失败、19 跳过），真实本地 Worker 与真实飞书两个项目、四个项目计划版本（ALPHA 三个、BETA 一个）均已验收。
- 代码检查点 `3f9508627`、`1e3dd8835` 未推送；文档提交未发生，本文不声称文档提交 hash。
- 未触生产 App／DB／正式 vault，未推送；独立飞书客户端已停止，无第二个测试消费者。

## 已解除（P3.2 第 1 轮最小返工，主 Agent 在 P3.2 已授权范围内批准）

- 原阻塞：`tests/superagent-p3-runtime.test.mjs:43` 硬编码 `["capture","knowledge","idea"]`，P3.2 注册 `project` 后该断言失败；属旧断言未同步，非行为回归。
- 处理：仅将预期数组改为 `["capture","knowledge","idea","project"]`，测试其余语义与断言保持不变；未触碰实现或其他文件。
- 结果：返工后五文件合跑 45/45；新增 4 项 Worker 合约测试后 Project 定向 **17/17**、五文件合跑 **49/49**（0 失败、0 跳过）；`node --check` 5 文件、`npm run verify`、`git diff --check` 均通过。
- 此后没有后续 P0／P1 返工。

## 真实接线轮结果（已完成）

- Project Worker 合约、本地真实烟测、probe 与飞书测试客户端接线均已完成并实测。
- 本地真实 Worker（`feishuCalls=0`、`modelCalls=1`、usage／cost=`not_returned`）：OpenCode new `project-451c24e949b7ba1b` v1，manifest `eb26ba480e084bedb1669e8376be957976503923463094b75fdf016dce9a8c22`；Pi revise `project-f237daf1187a31e2` v1→v2，manifest `6368eed4c811b0b89a664b1f67cedde0a56e2a6719c5ded34edc1b371313a708`，v1 哈希未变，`providerRequests=1`、`toolEvents=0`。两者 Result Lane passed、delivery accepted。
- 真实飞书：ALPHA `project-8a5a1b3c61f28bc7` v1／v2／v3，BETA `project-7db58ebce60250b6` v1，想法 C `idea-8c738ac2620a34a8`；四个项目 Task 与想法 Task 全部 completed，Attempt／run done，Result Lane passed，delivery accepted（`may_send=false`、`provider_message_id=null`、`at_least_once`）。独立审计 `ok=true`、6 组检查通过、`factCount=88`。
- 真实 queued：v2 running 时 v3 queued 且无 Task／冻结输入，前序完成后同进程自动 drain，v3 随后完成；最终 `factCount=88`。
- 歧义与未知各一次：factCount 分别 75→75、88→88，无 Task／Worker／索引／Context 变化。

## 其他限制（非阻塞）

- **真实 Host 重启后的 queued 恢复仍 `not_performed`，归 P3.4**；崩溃恢复证据来自确定性进程退出与同一 SQLite 重开，不描述为真实 Host 重启验收。真实飞书 crash 注入本轮未触发。
- 歧义与未知：首轮页面两条消息的回复归属不一致，未知对象用 `P32-UNKNOWN-2015-R2` 单独重发；审计只采用消费者日志中的独立 unknown 事件，根因未确认，不写成已确认代码缺陷。
- delivery `accept` 使用 `provider_message_id=null` 与 `at_least_once`；accepted 不代表已读。
- usage／cost 未返回时记 `not_returned`，不写 0，也不声称已核验 Go 控制台扣费。
- 探针不写项目产物，`resultLane=delegated_to_host`；宿主完成三步与 Result Lane，探针不得冒充结算。
- 其余：无。
