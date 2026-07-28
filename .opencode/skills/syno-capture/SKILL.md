---
name: syno-capture
description: 收录 URL、文件、Markdown、PDF、转发内容或个人观点，并形成可追溯的收录方案。
---

# Syno Capture

1. 先调用 `syno_capture_receive`，立即向主人返回 Artifact 已接收。
2. 调用 `syno_capture_prepare` 进行安全提取、来源描述、查重和收录方案生成；耗时工作不得阻塞首次回执。
3. 用 `syno_workflow_context` 加载 canonical 收录契约，不自行创造标签、目录、知识状态或 MOC。
4. 来源未知的转述只追问一次；仍未知时标为 `needs_source/unverified`，可以进入 Inbox，但不能成为已验证 Evidence。
5. 完成提示必须列出来源状态、重复/关联、拟保存位置、待验证事项，并明确 `knowledge_state: captured` 不等于掌握。
6. 主人确认后调用 `syno_jobs_submit`，使用 `mode: ingest`、Artifact ID 和明确 decision 形成审批；不直接宣称已收录。
