# 单仓知识库迁移验收（2026-09-18）

## 范围

- 迁移分支：`chore/merge-knowledge-into-monorepo`
- 代码迁移提交：`640b2ae`
- 运行规则提交：`2dfca47`
- 外部知识仓当前固化提交：`a0ecd9f`、`cf223b3`、`12ac919`
- Host 在冻结期间已停止；三个 WebBridge 诊断 JSON 保持未跟踪，未纳入提交。

## 数据与配置

- 从 `D:\workSpace\syno-knowledge` 复制 `vault/`、`ops/`，排除 `.git`、缓存和 quarantine 临时内容；逐文件 SHA-256 校验 1,870 个文件，缺失 0、差异 0。
- `ops/artifacts/quarantine/.gitkeep` 保留，quarantine 内容继续由 `.gitignore` 忽略。
- 用户级 `SYNO_KNOWLEDGE_ROOT` 已移除；planner `vaultRoot` 已指向 `D:\workSpace\syno-personal-butler`。
- 回滚材料：`D:\workSpace\syno-knowledge-backup-20260918\syno-knowledge-1a6892f.bundle` 与同目录工作树快照。
- 外部知识仓保留为冻结回滚副本，迁移期间无新增写入。

## 验证

- `pnpm run verify`：通过；Repository verification 2,218 files，active documentation 8 files。
- `pnpm test`：758 pass，0 fail，0 cancelled，0 skipped。
- `python vault/99-System/scripts/agent-contract-check.py vault`：通过，0 errors，0 warnings。
- Vault 全库审计（临时副本）：通过；579 files，332 unmatched wikilinks，63 orphan，25 no-frontmatter，20 incomplete frontmatter，0 bad tags，0 bad filenames。上述存量告警未因迁移增加。
- B 站 v2 校验：83/83 实际知识笔记通过；审计 trace 未纳入专项范围。
- 来源 ID 扫描：83 opus、182 BV、148 cv 字段 ID，重复 0。
- `git diff --check`：迁移分支工作树与文档变更通过。全量导入历史正文仍保留知识仓既有尾随空白，未为迁移清洗正文。

## 未完成项

- `bilibili-v3-gap-check.py` 仍依赖外部 `D:\workSpace\Recastory\workspace\bilibili\manifest.json`；该文件当前不存在，因此只记录为环境验证限制，不修改知识内容。
- Host 尚未在单仓 `main` 上重启；合入主分支后需完成 8888 健康、知识搜索、Job 状态和今日灵感读写冒烟，再提交真实运行记录。
