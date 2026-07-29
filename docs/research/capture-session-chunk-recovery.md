# Capture Session 与持久 Chunk 研究

日期：2026-07-29（Asia/Shanghai）

## 固化行为

- Capture 分析现在可以显式请求 `ephemeralSession=true`：OpenCode 创建临时 Session，不写正式 Binding；成功后删除。
- 删除返回不明确或 abort 状态未知时保留 orphan cleanup 线索，不假装已清理；正式 Session 的 Binding 和历史上下文不受影响。
- 收录正文按 paragraph-v1 切 Chunk。Chunk 的 identity 包含 source hash、chunk hash、位置、Chunk 算法版本、分析契约版本、Prompt 版本、canonical rules digest 和 analysis policy 版本；不包含 fallback model ID。
- Chunk Manifest 只保存 digest、长度、状态、租约、错误和分析结果，不把原始正文复制到 Chunk 元数据。
- `running` 在 Host 重启恢复为 `pending`；相同 identity 的 `completed` Chunk 重用；策略或契约变化会生成新 Manifest，并把旧 Manifest 标为 `invalidated`。

## 仍需 Owner 验收

- 真实 PDF/DOCX、浏览器抓取和部分 Chunk 失败恢复。
- Capture Session 删除异常后的真实 orphan cleanup。
- 不完整 coverage 的 Owner 接受路径尚未开放；当前协调器在 Chunk 未全部完成时只进入 retryable failure，不自动发布完整 Proposal。
