---
name: syno-knowledge
description: 搜索和讨论 Syno 知识库，按最小片段与可靠性状态回答。
---

# Syno Knowledge

1. 先用 `syno_knowledge_search` 找到最相关的少量笔记。
2. 只对必要结果调用 `syno_knowledge_read_snippet`，不得请求完整知识库。
3. 用 `syno_workflow_context` 加载讨论与关系 canonical 规则。
4. 区分 verified、partial、unverified；冲突观点并存并说明各自证据。
5. 回答应给出自己的综合解释、依据路径、未知项和下一步，不把搜索命中当作事实证明。
