---
title: "Agent 任务路由"
tags: [notes, skills, ai_agent]
created: 2026-07-13
source: vault_initiative - agent_control_plane
description: "把用户意图路由到唯一 canonical Skill，避免平台入口复制业务规则。"
---

# Agent 任务路由

| 意图 | 必读 | 不做 |
|---|---|---|
| 收录外部内容 | `vskill-vault-curate/SKILL.md` + Ingest Contract | 不直接开始写正文 |
| B 站 opus/cv 图文专栏 | curate + `B站图文专栏精华收录` | 不扫描空间、不读图片、不转入 ASR |
| 历史 Recastory/ASR 核验 | curate Legacy 索引 | 不用于新收录 |
| 写观点文 | `vskill-vault-write` blade | 不当作资料收录 |
| 写真实或重构对谈 | write dialogue + Host-Guest SUBDOC | 不把 editorial 问题冒充原话 |
| 找反向链 | `vskill-vault-relate` | 不凑链接 |
| 跨笔记讨论 | `vskill-vault-discuss` | 不修改 vault |
| MOC 设计 | `vskill-vault-moc-builder` | 未确认不新建 MOC |

canonical Skill 根目录：`99-System/Skills/`。平台适配层只负责发现和转发，若与 canonical 内容冲突，以 canonical 为准。

## B 站专栏按需加载

1. 用户提供单篇 opus/cv 后读取专栏专项 SUBDOC。
2. 只读取文字正文和页面元数据；图片一律跳过。
3. 先判断 `source_form`，再根据素材等级决定最终 `content_form`。
4. S级真实访谈使用 `source/column`；S级演讲使用明确标注的 `reconstructed/editorial` 对谈。
5. 第三方总结使用“专栏整理”，不冒充讲者原话；真实多人观点保留 roundtable。
6. 收录后建立带关系类型的知识连接，供 relate/discuss 按一跳上下文使用。
7. 不要求 Recastory、transcript、ASR 或 Spot Check。

## 相关阅读

- [[MOC - Agent Theory and Design]]
