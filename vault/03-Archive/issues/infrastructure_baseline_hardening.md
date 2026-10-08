# 基建补强任务摘要

## 背景

本次补强按既定顺序处理 3 个优先项：

1. 已于 2026-07-13 移除 Obsidian MCP；Agent 直接读写 Markdown
2. 增加 Python 项目入口文件，明确最低运行环境
3. 为 `99-System/scripts/vault-audit.py` 补最小回归测试

## 本次改动

- `.mcp.json`
  - 已删除本地配置并保留 gitignore 防误提交；旧 token 需在插件侧撤销
- `skill-collection/maps/obsidian-mcp-setup.md`
  - 同步更新配置示例
  - 旧方案已废弃；不再保留 PowerShell token 注入示例
- `pyproject.toml`
  - 声明 Python `>=3.11`
  - 约定测试目录和命名模式
- `tests/test_vault_audit.py`
  - 增加 frontmatter 解析测试
  - 增加 vault 审计核心行为测试

## 验证

- 计划执行：
  - `python -m py_compile 99-System/scripts/vault-audit.py`
  - `python -m unittest discover -s tests -v`

## 备注

- 当前仓库中已有若干用户正在编辑的笔记文件，本次未触碰
- 本次未引入第三方 Python 依赖，测试继续基于标准库 `unittest`

---

## 闭环记录（2026-10-08）

“计划执行”的验证已实际跑完，全部通过：

- `python -m py_compile 99-System/scripts/vault-audit.py` — OK
- `python -m unittest discover -s tests -v` — 57 个测试全部 OK（含 vault-audit、bilibili trust audit、workflow v2、opus 工作流）

现状复核：

- `.mcp.json` 已删除，且 `.gitignore` 中有防误提交条目
- `pyproject.toml` 已声明 `requires-python = ">=3.11"` 与 unittest 约定
- `skill-collection/maps/obsidian-mcp-setup.md` 已随 skill-collection 清空移除，全库无悬空引用

遗留（用户侧操作，agent 无法代劳）：旧 Obsidian MCP token 需在插件侧撤销。

2026-10-08 复核补充：`.mcp.json` 从未进入 git 历史，仓库侧零残留；仅 Obsidian 的 Local REST API 插件仍处启用状态且 `data.json` 持有 apiKey。该插件默认只监听 localhost，且已无任何 MCP 客户端配置指向它，本机自用场景风险可忽略。

2026-10-08 已清零：经用户确认后删除 `obsidian-local-rest-api` 插件目录（含 apiKey 的 `data.json` 一并移除），并从 `community-plugins.json` 启用列表移除，`.obsidian/` 内无残留引用。MCP 相关痕迹全部清除。

已闭环，归档至 `03-Archive/issues/`。
