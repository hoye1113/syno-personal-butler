# 今日灵感 · 真实验收记录（#11）

验收协议：信号引擎每日 12:30 出卡（2026-09-02 Owner 自 16:00 调整，a880598）→ 微信投递 → 主人 24h 内回「有用/有启发/没用/没启发/一般」走确定性路由回填 → 连续数日证据齐备后封板 #11。

## Day 1 — 2026-09-02（首卡，一次成功）

| 环节 | 证据 | 结果 |
| --- | --- | --- |
| 信号触发 | 运行时日志 04:30:35Z（= 本地 12:30:35）proactive.bundle.created，bundleId proactive-inspiration-f2f8f0205e95c25b | 分钟精度门槛生效：12:30 后首个 60s tick 即触发 |
| 生成 | 卡记录 attempts: 1，created 04:30:55Z（采样到成文约 20s） | cognitiveRuntime 一次成功，无重试 |
| 投递 | 04:31:00Z proactive.bundle.delivered，outboxEventId outbox-20260902043057068-30da7b12 | 首次投递即成功，零重试 |
| 落盘 | ops/content/inspirations/inspiration-20260902-ec387702.md，status delivered，deliveryEventId 与 outbox 事件对齐 | 记录-事件接线正确 |
| 采样 | sampledRefs 4 篇：MOC - AI 时代个人发展与组织、自进化Agent研究综述（2 篇新近收录）+ 搞定 Agent 六大支柱、从 ChatBot 到 Agent（2 篇久未回访） | 2 新近 + 2 回访的混合采样符合设计 |
| 主人确认 | 2026-09-03 10:09 会话口述「可以成功给我发送了」 | 微信侧真实可见 |

同日旁证：08:00 morning bundle 因当日凌晨 token 过期事故（#11 恢复事件）8 次重试后 failed_terminal，属事故期遗留而非灵感链路问题；23:30Z event bundle 正常 delivered，投递链路健康。

## Day 1 反馈 — 2026-09-03 10:52（确定性路由首验）

主人 10:52:13 回复口令「有用」：channel.message.received 后 23ms 即 channel.inspiration.feedback 落账（feedback=useful，精确绑定 inspiration-20260902-ec387702，TTL 窗口内），全程未过模型；卡记录 status → feedback 翻转。

## Day 2 — 2026-09-03（预算饥饿缺陷发现 → B1 修复当日补卡）

12:30 卡未出。12:35 自检实证根因：cadence=balanced 每日预算 2 条被 07:30 孤儿维护提醒 + 08:01 早报耗尽，SignalEngine 预算门整体返回空，灵感信号从未收集、零日志（proactive.json lastEligibleSignals=0）。定性**结构性缺陷**：当日积压 21 条 event 信号每日清晨抢预算，预约日卡必死，非偶发。

修复 `c0111c3`（B1 + L0a）：预约信号脱离事件预算恒 eligible；event 抑制每日记一笔 proactive.signal.budget_suppressed；预约投递不计数；tick 计时观测（completed/failed 带 durationMs，快速空转不记）。双形态回归 719/719、verify 341/8。

13:29 部署重启实证：首拍（初始化后 10s）出卡 proactive-inspiration-278b7a4a3252ec1a，生成 35s，13:29:58 首投即成；同拍 budget_suppressed 记录 21 条 event 抑制（可观测性生效，每日一笔不刷 journal）；卡记录 inspiration-20260903-de933ede status delivered；微信轮询心跳与 channels 正常。

当日 15:03 主人对该卡回「有用」：确定性路由第二次落账成功（feedback=useful，status → feedback），卡记录 updated 07:03:14Z。

## 稳定性 Day 1 — 2026-09-04（12:30 准点出卡，L0b 部署日）

| 环节 | 证据 | 结果 |
| --- | --- | --- |
| 信号触发 | 04:30:46.844Z（本地 12:30:46）proactive.bundle.created，bundleId proactive-inspiration-ad042c0ffb06b400，channel weixin | 12:30 门槛后首拍即触发 |
| 生成+投递 | 04:31:10.351Z proactive.bundle.delivered，outboxEventId outbox-20260904043108721-ae173d6f；proactive.json inspiration {date: 2026-09-04, attempts: 1} | 一次成功，零重试 |
| 预算 | 当日 budget_suppressed 0 笔 | B1 后 event 积压已清，预约信号不受预算门 |
| 部署关系 | 卡于旧代码落定（12:31），L0b+L2（8d13c30）12:38 才部署 | 本日证据归旧代码口径，归因干净 |

旁证（tick.failed ×2，09:12/09:13）：均为 PROCESS_LOCK_TIMEOUT（proactive.json.lock 等 30s 超时），系**部署前旧代码**整 tick 持锁病理——正是 L0b 三段重构要消除的对象；只延迟空转 tick，未影响 12:30 出卡。部署后至 12:44 零失败，tick.completed 分段计时 lockWaitMs 1–5ms、decideMs ~6.6s（reconcile outbox 扫描的既有重量首次可见），无 commit_aborted / composition_lease_expired / writeback_failed。

**机制切换标注（14:34）**：Owner 指令豁免封板闸门，P1（faedbe6）提前部署——反馈路由由 handler 确定性口令拦截切换为 `syno_inspiration_record_feedback` 工具 LLM 路由。本档 09-03 两条反馈证据（10:52、15:03）属**旧机制**；此后反馈证据属**新机制**，解读时注意归因。稳定性计数（出卡准点）不受此切换影响（P1 不触生成/投递路径）。

## 待补证据

- [x] 反馈口令确定性路由（2026-09-03 10:52 首验通过，见上）
- [x] 次日出卡（09-03：缺陷发现 → 修复 → 当日补卡成功，见 Day 2）
- [ ] 连续多日稳定性（自 09-04 重新累计，目标 ≥3 天）：**Day 1/3 ✓（09-04 准点+首试即成）**，待 09-05、09-06
