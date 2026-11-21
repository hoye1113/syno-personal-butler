# P3.3 Decision Lane + Memory Specialist 阻塞记录

当前无阻塞项。

## 第 1／2 轮返工（历史记录，已关闭）

- 第 1 轮 P1：completed confirmation／proposal 投递前通过幂等 complete 补齐并核对业务效果；recalled memory 在 Worker 运行期间被纠正／遗忘／撤销／替代时，`completeProposal` 在写候选和 finalizeTask 前拒绝。
- 第 2 轮 P1：只修烟测脚本。`memory-worker-smoke.mjs` 的 messageId 改为按 48 字符上限有界生成（截断 label 片段、保留 worker／时间戳／序号，并在生成处断言最终 ID），新增 `--check-message-ids` 确定性自检，两种 Worker 最长 ID 均为 48。
- 两轮之后未新增 P0／P1；确定性测试 28/28、六文件合跑 77/77 通过。

## 第 3 轮真实执行（主 Agent，已完成）

- 真实 Pi Memory 烟测：`ok=true`、`modelCalls=1`、`providerRequests=1`、`feishuCalls=0`、`toolEvents=0`、Result Lane passed、pending v1、delivery accepted、`providerMessageId=null`；usage／cost=`not_returned`。证据为 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-memory-worker-smoke/pi-2026-11-19T15-51-22-774Z/result.json`。
- 真实飞书 Decision Lane 与 Memory 全链路：13 Task／13 Attempt／13 原生 run 全部完成，13 条 verification 全为 `host_result_lane` passed，13 条 delivery 全 accepted；7 个 Decision、6 条 `memory_apply`、4 个 Memory index、10 个版本文件与 SQLite 一致。审计 `/Users/hoye/Documents/workspace/syno-p0-real-test/p3-decision-memory-real-audit.json` 为 `ok=true`。
- 最终 `npm run gate`：931 tests，912 pass，19 skipped，0 fail，0 cancelled，0 todo；Repository 5159 files；active docs 8 files；`git diff --check` 通过。
- 测试客户端已正常停止（`running=false`、`available=false`、`stoppedAt=2026-11-19T16:18:04.390Z`），无第二个测试消费者，bsk `zwnx` 已停止；确定性内核 `d04a815cc` 与真实接线 `00d631dc3` 已提交，正式文档尚未提交，未推送；未触生产 App／DB／正式 vault。

## 第 2 轮明确未做（历史记录，第 3 轮处理结果）

- 已补执行：`real-worker-probe.mjs --memory-request` 与 `memory-worker-smoke.mjs` 的真实 Pi 模型调用。
- 已补执行：`real-feishu-client.mjs` 真机 Idea 多候选 Decision、`选择`、`记忆候选`、`确认`、`纠正记忆`、`遗忘记忆` 流程。
- 已补执行：全量 gate。
- 仍未做：`SYNO_P3_MEMORY_TEST_CRASH_AFTER_WORKER=1` 未触发；真实 Host／生产进程重启、生产 App／DB／正式 vault 未验证（只用独立测试路径与临时目录）。
- 按要求：第 2 轮未提交／未推送；后续确定性内核与真实接线已由主 Agent 提交，正式文档尚未提交，未推送。

## 第 3 轮剩余未覆盖（不是阻塞）

- 真实 Host 重启后的 queued 恢复仍 `not_performed`，归 P3.4。
- 真实客户端 crash 注入未触发；进程恢复证据只来自确定性测试，不写成已完成。
- `accepted` 不代表已读；普通发送仍 `at_least_once`、`provider_message_id=null`。
- usage／cost 未返回记 `not_returned`，不等于 0，也未核验 Go 控制台扣费。
- proposal 在 Result Lane 前仍没有 Decision／Task 超时 API；“timeout” 继续由既有 Decision TTL 回归覆盖，Worker 中断按无证据不自动重跑处理。如需要独立的 proposal 超时终态，需先定义终态语义。

## 需主 Agent／后续复核的点

第 2 轮提出的以下点在真实执行后仍然适用：

- `real-feishu-client.mjs` 的 DB 为 `runtime/p3-decision-memory.db`，Memory 根为 `runtime/p3-memory-artifacts`，与旧 `p3-project.db` 测试数据分离。
- Memory proposal 的 delivery 通知在极窄并发下可能读到已被确认后的状态，因此文本按发送时 index 状态显示，不强行断言 pending；pending 保证由 `completeProposal` 的 Result Lane 与 Decision 创建顺序承担。
- `memory-worker-smoke.mjs` 假定 `idea-worker-contract` 模型标签与 Memory 固定模型一致；若后续调整模型链，需要同步复核。
- R1 completed 对账崩溃窗口与 mid-flight correction／forget 均用确定性测试模拟，未触发真实 Host 进程重启或真实模型并发窗口；客户端对账分支仍以静态断言与运行态单测为主，未专门构造真实飞书对账失败场景。
- 新增或改名烟测 label 后应重跑 `node experiments/superagent-p0/memory-worker-smoke.mjs --check-message-ids`。
