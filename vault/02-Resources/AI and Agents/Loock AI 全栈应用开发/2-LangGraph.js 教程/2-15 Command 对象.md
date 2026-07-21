---
title: "Command 对象 — Loock AI 全栈应用开发"
tags: ["loock_ai", "langgraphjs_tutorial", "ai_agent"]
legacy_tags: ["loock_ai", "langgraphjs-tutorial", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/langgraphjs/05-utility-functions/04-command-object"
description: "使用 Command 对象实现节点内的动态路由和状态更新组合"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/2-LangGraph.js 教程/2-15 Command 对象.md"
source_sha256: "a0ed2c747e0190a97d9d4d920e5e544c9754788f743b8c1c505f3553b7bfbdee"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

实用功能

# Command 对象

使用 Command 对象实现节点内的动态路由和状态更新组合

## [📚 学习目标](#-学习目标)

学完这篇文章后，你将能够：

-   理解 `Command` 对象如何替代传统的返回值 + 路由模式
-   在节点内部动态决定跳转目标（`goto`）
-   将状态更新与控制流合并为一个操作
-   在人机交互与子图场景中使用 `resume/graph`

## [前置知识](#前置知识)

在开始学习之前，建议先阅读：

-   [错误处理](./03-error-handling)

你需要了解：

-   传统的 `addConditionalEdges` 路由方式

* * *

## [1 传统模式 vs Command 模式](#1-传统模式-vs-command-模式)

### [传统模式](#传统模式)

你需要：

1.  定义节点函数 `nodeA`。
2.  定义路由函数 `routeLogic`。
3.  在图中注册 `addConditionalEdges('nodeA', routeLogic)`。

这种方式的逻辑分散在两个地方，难以维护。

### [Command 模式](#command-模式)

节点直接返回“更新这个状态，然后去那个节点”。

```
import { Command, END } from '@langchain/langgraph';
const nodeA = (state: { value: number }) => {
  if (state.value > 10) {
    return new Command({
      update: { value: state.value + 1 },
      goto: 'node_b',
    });
  }
  return new Command({
    update: { value: 0 },
    goto: END,
  });
};
```

优点是逻辑内聚，不需要单独定义条件边。

* * *

## [2 组合状态更新与跳转](#2-组合状态更新与跳转)

`Command` 的核心属性：

-   **update**：（可选）状态增量更新
-   **goto**：（可选）指定下一个节点或 `END`

```
// 仅跳转，不更新状态
new Command({ goto: 'next_node' });
// 仅更新状态，不指定跳转
new Command({ update: { key: 'value' } });
```

如果你需要“更新 + 跳转”同时发生，就使用 `Command`。

* * *

## [3 Command 字段速查表](#3-command-字段速查表)

字段

作用

典型场景

`update`

更新增量状态

写回结果、写回进度

`goto`

立即跳转节点/END

节点内路由

`resume`

恢复 interrupt 的断点

审批/编辑/澄清

`graph`

切换子图/工作流

复杂流程拆分

你可以把它理解为：“在一个返回值里同时表达状态怎么变 + 下一步去哪”。

#\_r\_2\_{margin:1.5rem auto 0;}#\_r\_2\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_2\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_2\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_2\_ .error-icon{fill:#a44141;}#\_r\_2\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_2\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_2\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_2\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_2\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_2\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_2\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_2\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_2\_ .marker.cross{stroke:lightgrey;}#\_r\_2\_ svg{font-family:inherit;font-size:16px;}#\_r\_2\_ p{margin:0;}#\_r\_2\_ .label{font-family:inherit;color:#ccc;}#\_r\_2\_ .cluster-label text{fill:#F9FFFE;}#\_r\_2\_ .cluster-label span{color:#F9FFFE;}#\_r\_2\_ .cluster-label span p{background-color:transparent;}#\_r\_2\_ .label text,#\_r\_2\_ span{fill:#ccc;color:#ccc;}#\_r\_2\_ .node rect,#\_r\_2\_ .node circle,#\_r\_2\_ .node ellipse,#\_r\_2\_ .node polygon,#\_r\_2\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_2\_ .rough-node .label text,#\_r\_2\_ .node .label text,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-anchor:middle;}#\_r\_2\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_2\_ .rough-node .label,#\_r\_2\_ .node .label,#\_r\_2\_ .image-shape .label,#\_r\_2\_ .icon-shape .label{text-align:center;}#\_r\_2\_ .node.clickable{cursor:pointer;}#\_r\_2\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_2\_ .arrowheadPath{fill:lightgrey;}#\_r\_2\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_2\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_2\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_2\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_2\_ .cluster text{fill:#F9FFFE;}#\_r\_2\_ .cluster span{color:#F9FFFE;}#\_r\_2\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_2\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_2\_ rect.text{fill:none;stroke-width:0;}#\_r\_2\_ .icon-shape,#\_r\_2\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_2\_ .icon-shape p,#\_r\_2\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_2\_ .icon-shape rect,#\_r\_2\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_2\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_2\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_2\_ :root{--mermaid-font-family:inherit;}

节点执行

生成 Command

update 更新状态

goto 跳转节点

resume 断点恢复

graph 切换子图

* * *

## [4 更复杂的路由示例](#4-更复杂的路由示例)

在一个节点里完成分类与跳转，会让逻辑更集中：

```
import { Annotation, Command } from '@langchain/langgraph';
const State = Annotation.Root({
  input: Annotation<string>(),
  label: Annotation<'question' | 'complaint' | 'other'>({
    default: () => 'other',
  }),
});
const router = async (state: typeof State.State) => {
  const text = state.input.toLowerCase();
  const label = text.includes('退款')
    ? 'complaint'
    : text.includes('?')
      ? 'question'
      : 'other';
  return new Command({
    update: { label },
    goto:
      label === 'complaint'
        ? 'complaint'
        : label === 'question'
          ? 'question'
          : 'fallback',
  });
};
```

这种写法避免了 `addConditionalEdges` 分散逻辑的问题。

* * *

## [5 可测试性与复用](#5-可测试性与复用)

把路由决策抽成纯函数，有利于单测与复用：

```
function determineNextNode(state: { userType: 'premium' | 'basic' | 'guest' }) {
  if (state.userType === 'premium') return 'premium_service';
  if (state.userType === 'basic') return 'basic_service';
  return 'registration_required';
}
function routingNode(state: { userType: 'premium' | 'basic' | 'guest' }) {
  const nextNode = determineNextNode(state);
  return new Command({ update: { routedTo: nextNode }, goto: nextNode });
}
```

* * *

## [6 性能监控与错误恢复](#6-性能监控与错误恢复)

结合错误处理时，可以记录执行耗时与失败原因：

```
function monitoredCommandNode(state: { retryCount?: number }) {
  const startTime = Date.now();
  try {
    const result = expensiveOperation(state);
    const executionTime = Date.now() - startTime;
    return new Command({
      update: { result, performance: { executionTime } },
      goto: 'next_node',
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const retryCount = (state.retryCount ?? 0) + 1;
    return new Command({
      update: {
        error: String(error),
        retryCount,
        performance: { executionTime, failed: true },
      },
      goto: retryCount < 3 ? 'retry_handler' : 'failure_handler',
    });
  }
}
```

* * *

## [7 多代理切换示例](#7-多代理切换示例)

多代理模式中，路由逻辑往往集中在一个节点里。

```
import { Command } from '@langchain/langgraph';
type State = { taskType: 'tech' | 'biz' | 'other' };
const router = async (state: State) => {
  if (state.taskType === 'tech') {
    return new Command({ goto: 'tech_agent' });
  }
  if (state.taskType === 'biz') {
    return new Command({ goto: 'biz_agent' });
  }
  return new Command({ goto: 'general_agent' });
};
```

* * *

## [8 条件执行示例](#8-条件执行示例)

当你需要在节点内基于业务判断直接跳转，Command 很简洁。

```
import { Command } from '@langchain/langgraph';
const validate = async (state: { ok: boolean }) => {
  return new Command({
    goto: state.ok ? 'success' : 'retry',
  });
};
```

* * *

## [9 状态机实现](#9-状态机实现)

把流程看成状态机，可以让审批流更清晰：

```
import { Annotation, Command } from '@langchain/langgraph';
type Step = 'draft' | 'review' | 'approved' | 'rejected';
const State = Annotation.Root({
  step: Annotation<Step>({
    default: () => 'draft',
  }),
});
const next = async (state: typeof State.State) => {
  if (state.step === 'draft') {
    return new Command({ update: { step: 'review' }, goto: 'human_review' });
  }
  if (state.step === 'approved') {
    return new Command({ goto: 'execute' });
  }
  return new Command({ goto: 'end' });
};
```

* * *

## [10 子图与 graph 字段](#10-子图与-graph-字段)

当子流程独立且可复用时，可以用子图拆分，再在需要时切换：

```
import { Command } from '@langchain/langgraph';
const entry = async () => {
  return new Command({
    graph: 'specialist_workflow',
    update: { context: 'switched_to_specialist' },
  });
};
```

建议把 `graph` 用于“清晰的流程切换”，避免跨子图的强耦合。

* * *

## [11 resume 场景补充](#11-resume-场景补充)

在人机交互场景中，`resume` 可以带结构化数据：

```
import { Command } from '@langchain/langgraph';
await app.invoke(new Command({ resume: { approved: true, note: 'OK' } }), {
  configurable: { thread_id: 'thread-1' },
});
```

结构化 `resume` 能让后续节点更容易解析。

* * *

## [12 与错误处理结合](#12-与错误处理结合)

当节点检测到错误时，可以直接跳转到 fallback：

```
import { Command } from '@langchain/langgraph';
const node = async (state: { error?: string }) => {
  if (state.error) {
    return new Command({ goto: 'fallback' });
  }
  return new Command({ goto: 'next' });
};
```

* * *

## [13 调试与监控](#13-调试与监控)

你可以记录 Command 轨迹，帮助追踪执行路径：

```
class CommandTracker {
  private history: Array<{ nodeId: string; goto?: string }> = [];
  track(nodeId: string, command: { goto?: string }) {
    this.history.push({ nodeId, goto: command.goto });
  }
  getPath() {
    return this.history.map(
      (item) => `${item.nodeId} -> ${item.goto ?? 'unknown'}`,
    );
  }
}
```

* * *

## [14 常见问题和解决方案](#14-常见问题和解决方案)

1.  **Command 状态更新不生效**：检查 `update` 键是否与 reducer 对齐。
2.  **goto 跳转到不存在节点**：用常量统一节点名称。
3.  **异步执行顺序混乱**：确保 `await` 完整执行再返回 Command。

示例：

```
const NODES = {
  PROCESS: 'process_node',
  VALIDATE: 'validate_node',
} as const;
return new Command({ goto: NODES.PROCESS });
```

* * *

## [15 实践建议](#15-实践建议)

-   把路由逻辑与业务决策写在同一个节点中，减少分散。
-   为关键路径写结构化日志，方便排查。
-   如果需要复用路由逻辑，再考虑条件边。

* * *

## [💡 练习题](#-练习题)

### [基础练习](#基础练习)

1.  **重构题**：将你的 `shouldContinue` 逻辑合并进 Agent 节点，用 `Command` 完成路由。- 提示：删除 `addConditionalEdges`，在节点内返回 `new Command({ goto: ... })`
    
    点击查看答案
    
    在 Agent 节点里根据 `lastMessage.tool_calls` 直接返回 `new Command({ goto: "tools" | END, update: {...} })`。 这样能把“状态更新 + 路由”放在同一处，减少跨函数跳转。
    
2.  **操作题**：实现"投诉/咨询/其他"三分流路由。- 要求：根据用户输入关键词，动态跳转到不同处理节点
    
    点击查看答案
    
    先标准化输入（小写、去空格），命中“投诉”关键词跳 `complaintNode`，命中“咨询”跳 `faqNode`，否则跳 `otherNode`。 用 `Command({ goto })` 返回目标节点即可，无需额外条件边。
    

### [进阶练习](#进阶练习)

3.  **思考题**：什么时候不该用 Command？- 答案方向：路由逻辑需要在多个节点复用时，条件边更合适
    
    点击查看答案
    
    当路由规则需要跨多个节点复用、统一治理或独立测试时，更适合用 `addConditionalEdges`。 `Command` 更适合“就地决策”；全局路由策略则更适合集中管理。
    
4.  **操作题**：在审批流中用 `resume` 传递结构化结果。- 要求：用户审批后传递 `{ approved: boolean, reason: string, timestamp: number }`
    
    点击查看答案
    
    中断点返回 `interrupt({ ... })`，恢复时使用 `new Command({ resume: { approved, reason, timestamp } })`。 下游节点直接读取该对象并写入审计日志，避免再做字符串解析。
    
5.  **综合题**：实现工单系统的状态机路由。- 要求：用 `Command` 实现 `pending → processing → resolved/rejected` 的完整流转
    
    点击查看答案
    
    推荐在 `ticketRouter` 节点里按当前状态和处理结果返回 `goto`：`pending -> processing`，处理成功走 `resolved`，失败走 `rejected`。 同时在 `update` 中写入 `status/updatedAt/operator`，保证状态机和审计字段同步更新。
    

* * *

## [📚 参考资源](#-参考资源)

### [官方文档](#官方文档)

### [本项目相关内容](#本项目相关内容)

-   [人机交互（Human-in-the-loop）](../08-advanced-features/04-human-in-the-loop)

* * *

## [✅ 总结](#-总结)

**本章要点**：

-   `Command` 提供“节点自治”的控制流能力。
-   `goto` 让节点动态决定下一站。
-   它让复杂图的控制逻辑更内聚。

**下一步**：进入 [常见用例](../06-common-use-cases/01-chatbots)，学习真实业务场景。

## 相关笔记

- [[1-8 人机交互|人机交互（参见 Loock AI 1-8）]]
- [[MOC - LangGraph.js 教程|LangGraph.js 教程 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
