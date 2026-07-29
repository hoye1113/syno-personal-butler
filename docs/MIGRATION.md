# Syno 数据迁移与回滚

## 迁移边界

- 原始知识库 `D:\workSpace\obsidian_repository` 永久只读，只作为来源和灾难恢复副本。
- Syno 切换后仅写当前仓库的 `vault/`；不进行双向同步，也不把渠道存储当作第二知识事实源。
- `ops/` 保存任务、待决策项、学习证据、输出机会、事件和产物事实；`.runtime/` 只保存可重建缓存。
- `.obsidian/`、缓存、Cookie、Token 和 `%LOCALAPPDATA%\Syno\credentials` 不进入知识迁移。
- 迁移不批量改写旧笔记。结构、标签、MOC 或合并建议必须按现行受控执行规则渐进处理。

## 当前迁移版本

当前仓库状态格式和归档格式均为版本 `1`。没有需要静默执行的数据升级脚本。未来契约版本变化必须提供：输入版本、输出版本、预览、备份要求、幂等测试、失败报告和回滚步骤。

## 首次单向切换

1. 停止 Syno Web 与 Worker，确认没有 `running` Job。
2. 对原始知识库做只读清单：文件数量、相对路径、大小和哈希；不得在来源目录生成辅助文件。
3. 备份当前 Syno 仓库和本机非凭据状态，执行 `pnpm state:archive -- verify <归档目录>`。
4. 将待迁移内容复制到仓库外的暂存目录，排除 `.obsidian/`、缓存、临时文件和凭据。
5. 在暂存副本上运行知识契约与来源审计；不合格项形成待处理清单，不直接污染 `vault/`。
6. 在隔离工作区自动执行把合格的新增笔记导入 `vault/`。覆盖、移动、合并、新 tag 和新 MOC 继续逐项产生可审计差异，整理冲突时暂停澄清。
7. 运行 `python -m pytest vault/tests`、`pnpm test` 和 `pnpm verify`，记录 Git commit 与结果。
8. 将 Syno 配置指向仓库内 `vault/`，保持原始知识库只读；此后不反向写回。

当前已跟踪的 `vault/` 是经过上述边界建立的知识快照；原始 Obsidian 仓库仍是独立只读来源，不属于 Syno 运行目录。

## 本机状态迁移

本机状态只迁移 `%LOCALAPPDATA%\Syno\state`，不迁移 DPAPI Token：

```powershell
pnpm state:archive -- backup D:\Backups\syno-state-YYYYMMDD
pnpm state:archive -- verify D:\Backups\syno-state-YYYYMMDD
```

目标机器或新 Windows 用户应重新录入 Provider 和渠道凭据。即使复制 DPAPI 文件，不同用户上下文通常也无法解密，且不应把该文件放进普通归档。

恢复时必须先停止进程，并确保目标 `state` 目录为空：

```powershell
pnpm state:archive -- restore D:\Backups\syno-state-YYYYMMDD
```

恢复命令先验证版本与 SHA-256 清单，拒绝越界路径、损坏文件和覆盖已有状态。

## 回滚

1. 停止 Web/Worker，保留失败现场、脱敏错误码和当前 Git 状态。
2. 不使用 `git reset --hard`；由 Codex 在独立开发流程选择已验收提交。
3. 将当前 `vault/`、`ops/` 和本机状态另行备份，不删除失败数据。
4. 把非凭据状态恢复到空目录；在原 Windows 用户下重新录入或继续使用 DPAPI 凭据。
5. 运行配置、契约、完整测试和仓库验证，再启动 Web/Worker。
6. 若 Syno 暂停使用，原始知识库仍保持原样，可作为只读参考；不得把两边改动自动合并。

回滚成功的标准是：事实文件可读、未完成 Job 状态可恢复、本地能力可用、Provider/渠道故障不会导致数据回退或换模型。
