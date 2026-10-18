---
name: syno-capture
description: 收录 URL、文件、Markdown、PDF、转发内容或个人观点，并形成可追溯的收录方案。
---

# Syno Capture

1. 根据上下文识别主人是否要求保存资料。明确要求收录时调用 `syno_capture_submit`，附件使用系统提供的 ID；裸链接、附件、否定或引用不构成收录请求。
2. 主人问进度时调用 `syno_capture_list/get`，按真实状态回答，不重复创建同一来源；received 不代表已保存。
3. canonical 收录契约由 Syno 根据来源和阶段编译；不得自行创造标签、目录、知识状态、执行等级或 MOC。
4. 来源未知的转述只追问一次；仍未知时可以进入 Inbox，但必须保持 `needs_source/unverified`。
5. 有歧义时查询 `syno_decisions_list`，将具体方案与主人对齐，再使用准确 ID、version 和选择调用 `syno_decisions_resolve`；对象不唯一时先澄清。
6. 收录完成必须说明来源、重复/关联、实际路径和未验证事项，并明确 `knowledge_state: captured` 不等于掌握。
