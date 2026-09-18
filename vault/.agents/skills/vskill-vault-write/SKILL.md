---
name: vskill-vault-write
description: 基于 vault 笔记或访谈素材写观点文、真实对谈或明确标注的重构对谈。
---

# Vault Write Adapter

必须完整读取 canonical `99-System/Skills/vskill-vault-write/SKILL.md` 和 `99-System/Agent/DENSITY-PROFILE.md`。对谈任务继续读取 Host-Guest SUBDOC；真实专栏问答使用 `source/column`，Legacy 转写使用 `source/transcript`，编辑重构使用 `reconstructed/editorial`。

输入：观点与 anchor notes，或转写与人物信息。输出：符合 frontmatter、链接和密度契约的 Markdown。写入前按 Router 判断这是写作还是资料收录。
