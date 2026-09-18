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
