---
title: "七、Agent 策略与优化 — 前端 Agent 面试题锦集 — Loock AI 全栈应用开发"
tags: ["loock_ai", "frontend_agent_interview", "interview", "ai_agent"]
legacy_tags: ["loock_ai", "frontend_agent_interview", "interview", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs-frontend-agent-interview/interview"
description: "Loock AI 前端 Agent 面试题：七、Agent 策略与优化"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/5-前端 Agent 面试题/5-7 七、Agent 策略与优化.md"
source_sha256: "ef64849996ee50ab291cd1f0e1482cb089500cd88f26437655c29937acfac270"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---


# 七、Agent 策略与优化

### [57\. Agent 和 Workflow 的边界如何定义？](#57-agent-和-workflow-的边界如何定义)

**参考答案：**

Workflow 适合确定性流程；Agent 适合动态决策。

工程上常见做法是“决策层 Agent + 执行层 Workflow”，把可预期步骤沉淀为固定流程。

### [58\. Planner-Executor 模式的价值是什么？](#58-planner-executor-模式的价值是什么)

**参考答案：**

把规划和执行拆开后，可解释性、可测试性、可替换性都会更好。

你可以独立优化 planner 策略，而不破坏 executor 的稳定执行逻辑。

### [59\. 多 Agent 协作什么时候值得引入？](#59-多-agent-协作什么时候值得引入)

**参考答案：**

当任务天然可分工且单 Agent 上下文负担过重时才值得引入。

否则会增加通信成本、状态同步复杂度和故障面。

### [60\. Agent 项目上线后如何持续优化？](#60-agent-项目上线后如何持续优化)

**参考答案：**

建议按四维闭环推进：

-   效果：评测集回归与失败样本复盘
-   成本：token/工具开销优化
-   稳定：错误率与恢复能力提升
-   安全：越权率与人工接管策略优化

### [61\. 生产环境如何优化以减少 Token 数量？](#61-生产环境如何优化以减少-token-数量)

**参考答案：**

优先做“输入减法”，再做“调用减法”，最后做“输出减法”。

**高性价比策略：**

-   上下文裁剪：只保留当前任务相关历史，长会话做滚动摘要
-   检索压缩：RAG 先重排再压缩片段，限制每轮注入证据长度
-   模型路由：简单任务走小模型，复杂任务再升级大模型
-   提示词收敛：移除重复指令，系统提示模板化并复用
-   工具前置过滤：先规则判断，避免不必要的 LLM/tool 调用
-   缓存复用：对稳定问题启用语义缓存与结果缓存
-   输出约束：限定输出格式和最大长度，避免无效冗长回答

**面试可落地回答：**

-   先建立 token 分布基线（输入/输出/检索注入分别统计）
-   对高频路径做 A/B（如摘要窗口、top-k、max\_tokens）
-   以“效果不降”为约束，持续压缩单次运行 token 成本

### [62\. 如何回答“你如何评估 Agent 质量”？](#62-如何回答你如何评估-agent-质量)

**参考答案：**

推荐给出量化指标（对齐 LangSmith Observability）：

**核心指标：**

-   `task_success_rate`: 端到端任务完成率
-   `tool_call_accuracy`: 工具调用正确率
-   `first_token_latency`: 首 token 延迟（P50/P95）
-   `total_tokens`: Token 消耗量（输入 + 输出）
-   `cost_per_run`: 单次运行成本（USD）

**可靠性指标：**

-   `error_rate`: 错误率（按节点/工具聚合）
-   `interrupt_rate`: 人工接管率
-   `resume_success_rate`: 中断恢复成功率
-   `checkpoint_write_latency`: Checkpoint 写入延迟

**安全指标：**

-   `unauthorized_tool_attempts`: 越权工具调用尝试次数
-   `approval_rejection_rate`: 审批拒绝率

**LangSmith 集成示例：**

```
import { LangChainTracer } from "langchain/callbacks";
const tracer = new LangChainTracer({
  projectName: "production-agent",
  metadata: {
    environment: "prod",
    version: "1.0.0"
  }
});
const app = workflow.compile({ callbacks: [tracer] });
```

## 相关笔记

- [[4-6 RAG 全流程]]
- [[4-9 Agent 的记忆系统]]
- [[3-1 Function Calling 与 Structured Output]]
- [[3-6 生产级权限系统的四层防线]]
- [[1-8 人机交互|人机交互（参见 Loock AI 1-8）]]
- [[4-4 Cache 全解与成本控制]]
