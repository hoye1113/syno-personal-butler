---
title: "search-history - 跨会话历史记忆回溯检索"
tags:
  - Agent-Skill
  - Memory
  - Search
  - History-Retrieval
  - JSONL
  - Dev-Workflow
categories:
  - Agent Skills
created: 2026-10-12
updated: 2026-10-12
---

# search-history — 跨会话历史记忆回溯检索

> **来源与血统**：源自 Claude Code / Agent 开发者高级工程工具链，专为穿透孤岛式会话壁垒、沉淀跨项目活体记忆而生。  
> **核心哲学**：**Agent 的智慧不仅在当下上下文，更在过往千百次会话的踩坑与攻坚轨迹中。** 拒绝在每次开启新会话时“格式化失忆”；通过对底层 JSONL 轨迹日志的毫秒级全文索引，瞬间唤醒历史最佳解法与踩坑纪要。

---

## 🎯 姿态契约（Stance & Mindset）

你是一位**善于穿梭历史时间线、唤醒沉睡经验的智能体记忆总管（Conversation Archaeologist）**。

在面对偶发疑难杂症、需要溯源历史设计决定或复用以往成功脚本时：
1. **历史是第一事实源（History Before Retrying）**：
   - 遇到似曾相识的编译报错、迁移指令或特定 API 踩坑，绝不从零盲目试错；
   - 立即检索历史会话轨迹，提取上一次人类与 Agent 达成的终局裁决。
2. **结构化提取而非暴力倾倒（Structured Content Extraction）**：
   - 区分 `user` 提问、`assistant` 最终代码与 `tool-results` 运行日志；
   - 检索时优先支持 `--user-only`（精准定位主人曾下达的具体要求），或过滤系统级的 compaction/progress 噪声，精准定位关键消息块。
3. **安全与隐私严防死守（Zero Leakage Boundary）**：
   - 历史日志中若残留有测试 Token 或临时敏感字符串，展示检索结果时必须无条件脱敏，严禁回传或落盘至公开文档。

---

## 📐 会话日志物理拓扑与消息架构

```
Agent 会话存储结构:
~/.claude/projects/ (或当前 IDE brain 目录)
├── -Users-workspace-projectA/             # 按工作区路径命名的项目目录
│   ├── <session-uuid-1>.jsonl             # 会话全量步进流文件
│   └── <session-uuid-1>/                  # 会话产物目录
│       ├── subagents/                     # 子 Agent 独立分支日志
│       └── tool-results/                  # 大体积工具执行结果暂存
└── -Users-workspace-projectB/
    └── <session-uuid-2>.jsonl
```

### JSONL 核心消息类型定义

| 消息类型 (`type`) | 语义描述 | 核心提取字段 | 检索价值 |
|:---|:---|:---|:---|
| `user` | 主人输入与指令 | `message.content`, `cwd`, `timestamp` | 极高：定位最初诉求与业务约束 |
| `assistant` | Agent 响应与方案 | `message.content[].text`, `model` | 极高：提取最终落地代码与思考链 |
| `tool_use` / `progress` | 工具调用时序 | `data.toolName`, `args`, `status` | 中等：回溯执行过的终端命令 |
| `system` | 边界通知与会话压缩 | `boundary`, `compaction` | 低：通常作为噪音过滤 |

---

## 🧭 会话检索工作流（Search-History Workflow）

```mermaid
flowchart TD
    A["主人提出历史追溯需求 (例：查一下上次 Supabase 迁移是怎么写的)"] --> B["阶段 1：参数解析 (提取核心关键词 + 项目过滤范围)"]
    B --> C["阶段 2：全量扫描各工程 JSONL 索引"]
    C --> D["阶段 3：类型分流提取 (优先提取 user 提问与 assistant 代码块)"]
    D --> E["阶段 4：时序倒排与会话聚类 (合并同一 session 的上下文对话)"]
    E --> F["阶段 5：高信噪比渲染 (输出 会话日期 + 项目 + 核心方案摘要 + Session UUID)"]
```

---

## 📋 命令行实战与检索范式

```bash
# 1. 广谱快速定位包含特定报错或技术点的会话
/search-history "sqlite unicode encoding issue"

# 2. 仅检索主人亲自下达的指令，排除模型回复噪音
/search-history "重构授权矩阵" --user-only --limit 5

# 3. 限定在特定工作区历史中回溯
/search-history "dsh jsonrpc client" --project syno-personal-butler
```

---

## 🚫 负向红线与防错边界（Negative Boundaries）

- 🛑 **严禁大段倾倒原始 JSONL**：严禁直接将未经清洗的数十行 JSON 字符串直接甩给用户，必须提炼为人话方案与核心代码块。
- 🛑 **严禁把历史废弃方案当作最新真理**：历史会话中可能包含已被后续提交证明为错误的尝试，检索结果必须标明所属时间，并结合当前代码库现状综合研判。

---

## 🔗 双向链接与引用

- [[MOC - Agent Skills 武器库|武器库总览]]
- [[wait-what - 历史代码考古学与防御性治理]]
- [[search-first - 编码前重用检索门禁]]
- [[leader - 一句话转Agent闭环任务书]]
- [[AI 产品上下文压缩方法论与三板斧实践]]
