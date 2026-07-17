---
name: vskill-vault-relate
description: 为新笔记或孤岛笔记检索并解释语义相关的反向链候选。
---

# Vault Relate Adapter

必须完整读取 canonical `99-System/Skills/vskill-vault-relate/SKILL.md`。输入为目标笔记；输出 top 5 候选、关系类型、两端章节及理由。只选正文会真正引用的 1–3 个链接；无可靠候选则标 orphan。
