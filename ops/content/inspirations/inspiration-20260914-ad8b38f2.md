---
id: inspiration-20260914-ad8b38f2
date: 2026-09-14
sampledRefs: ["vault/02-Resources/AI and Agents/Agent Design & Patterns/拾语隅-给Hermes装个状态灯.md", "vault/02-Resources/AI and Agents/Agent Design & Patterns/一个业务 Agent 到底长啥样 - 沐洒.md", "vault/01-Areas/AI Agent Development/04-Context Engineering/4-5 Just-In-Time Context.md", "vault/01-Areas/AI Agent Development/04-Context Engineering/4-6 RAG 全流程.md"]
status: generated
attempts: 1
created: 2026-09-14T04:30:51.616Z
---

# 今日灵感 2026-09-14

<!-- syno:json:start -->
```json
{
  "id": "inspiration-20260914-ad8b38f2",
  "date": "2026-09-14",
  "sampledRefs": [
    "vault/02-Resources/AI and Agents/Agent Design & Patterns/拾语隅-给Hermes装个状态灯.md",
    "vault/02-Resources/AI and Agents/Agent Design & Patterns/一个业务 Agent 到底长啥样 - 沐洒.md",
    "vault/01-Areas/AI Agent Development/04-Context Engineering/4-5 Just-In-Time Context.md",
    "vault/01-Areas/AI Agent Development/04-Context Engineering/4-6 RAG 全流程.md"
  ],
  "text": "串联出一个原则：这四篇是同一件事的三层——按需暴露，而非预先塞满。第 1 篇的痛点是「不知道它在不在干活」，作者用菜单栏状态灯解决，并留下一句「技术已不是门槛，想法才是」。第 3 篇把这个直觉升成工程问题：上下文不是越早塞越好，JIT 与全量预填充是两条路。第 4 篇补上另一半——那些存在却不在训练数据与记忆里的信息（内部 SDK 文档、上季 ARR）必须检索按需取来。第 2 篇给出验收标准：业务 Agent 要可拆解、可流动、可验收，而非一句长提示词或一个聊天页。合起来：状态灯是「按需暴露状态」的产品版，RAG 是知识版，二者共同决定 Agent 能否被验收——能被看见，才谈得上被信任。",
  "status": "generated",
  "attempts": 1,
  "created": "2026-09-14T04:30:51.616Z"
}
```
<!-- syno:json:end -->
