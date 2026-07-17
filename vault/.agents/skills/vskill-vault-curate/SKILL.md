---
name: vskill-vault-curate
description: 收录 URL、PDF、截图、粘贴或单篇 B站 opus/cv；S级专栏默认编译为可串联的对谈式第二大脑上下文。
---

# Vault Curate Adapter

必须完整读取 canonical `99-System/Skills/vskill-vault-curate/SKILL.md` 和 `99-System/Agent/INGEST-CONTRACT.md` 后执行。

B站 opus/cv 必须先读 `99-System/Skills/vskill-vault-curate/SUBDOC - B站图文专栏精华收录.md`，使用 `bilibili_opus_ingest_v2`。图片与 Recastory/ASR 跳过；历史核验才读取 Legacy 索引。

输入：外部来源及可选主题提示。输出：canonical Markdown 笔记；B站专栏使用 v2 报告。完成前运行适用校验和语义自检；失败时报告 incomplete。
