# scripts 运行入口补齐

## 本次补齐

- 新增 `99-System/scripts/README.md`
  - 汇总脚本职责
  - 写明常用命令
  - 写明 B 站 v3 推荐执行顺序
  - 已由 2026-07-13 文件系统直读方案取代，不再配置 Obsidian MCP 或 token
- 更新 `README.md`
  - 在 `99-System` 小节增加 `scripts/README.md` 入口

## 说明

- 本次没有改动任何现有笔记内容
- 本次没有修改用户全局 PowerShell profile，只提供路径和注入方式

---

## 闭环记录（2026-10-08）

现状复核通过：

- `99-System/scripts/README.md` 在库且保持更新：覆盖脚本职责汇总、常用命令、B 站 v3（Legacy）与新专栏 v2 的执行顺序、环境准备
- 根 `README.md` 的 `99-System` 小节已含 `scripts/README.md` 入口
- 回归验证：`python -m unittest discover -s tests -v` — 57 个测试全部 OK

已闭环，归档至 `03-Archive/issues/`。
