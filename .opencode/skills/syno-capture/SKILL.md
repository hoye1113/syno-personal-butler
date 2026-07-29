---
name: syno-capture
description: 收录 URL、文件、Markdown、PDF、转发内容或个人观点，并形成可追溯的收录方案。
---

# Syno Capture

1. 明确的收录意图调用 `syno_capture_start`；它会立即返回 Artifact 与持久 Workflow，后续阶段由 Syno 推进，不要自行串联内部步骤。
2. 用 `syno_capture_status` 或 `syno_capture_list_pending`回答进度；不要重复创建同一来源。
3. canonical 收录契约由 Syno 根据来源和阶段编译；不得自行创造标签、目录、知识状态、审批等级或 MOC。
4. 来源未知的转述只追问一次；仍未知时可以进入 Inbox，但必须保持 `needs_source/unverified`。
5. Proposal、失败、确认和完成回执由 Syno 推送。主人说“确认、修改、拒绝”时由渠道确定性处理，不得由模型调用工具批准。
6. 收录完成必须说明来源、重复/关联、实际路径和未验证事项，并明确 `knowledge_state: captured` 不等于掌握。
