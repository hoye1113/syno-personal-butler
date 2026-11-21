# 修复 sync_status 被图片回执 token 误拦截

- 日期：2026-11-11
- 状态：已实施并部署（生产健康检查及真实 MoE 数据的本地 MCP 验收通过）
- 类型：下一轮源码修复计划

## 背景

`knowledge.sync_status` 直接返回完整发布映射。图片发布成功后，`targets.images.receipts[*]` 包含飞书图片素材字段 `token`；工具结果序列化层将整个 JSON 交给通用敏感信息扫描器，其中 `credential_assignment` 会把 `token: <8+ 字符>` 当作凭据，导致查询结果每次都被 `REMOTE_TOOL_RESULT_BLOCKED` 替换。这不是临时故障，也不是云端同步失败。

2026-11-11 对 MoE 笔记 `note-artifact-20261111-7c9c71e9` 的本地实测：完整结果仅命中 `credential_assignment`，精确字段为 `targets.images.receipts[0].token`；移除工具输出中的该字段后，同一扫描器返回 `safe=true`。本地映射的 wiki、images、catalog 均为 `succeeded`，版本一致，图片回执数为 1。

## 目标

1. `knowledge.sync_status` 能把同步状态、错误码和图片回执数量安全返回给模型，不发送图片素材 token。
2. 本地发布映射与图片对账仍保留原始回执，不改变持久化契约和重试行为。
3. 不放宽全局敏感信息扫描；真正的凭据形结果仍必须阻断。

## 步骤

1. 先增加失败回归：构造带 `targets.images.receipts[*].token` 的图片已发布记录，通过业务工具与实际序列化接缝调用 `knowledge.sync_status`，确认当前结果被阻断。
2. 在 `knowledge.sync_status` 的工具输出边界生成最小只读 DTO：图片回执只保留非敏感元数据或聚合数量，移除原始 `token`；不改写本地 publish-map，不让 `sync_retry` 依赖精简后的 DTO 执行对账。
3. 增加对照测试：wiki/images/catalog 状态和错误码不丢失；原始 token 不出现在序列化结果；Authorization、访问令牌等真实敏感结果仍被阻断；无图片笔记行为不变。
4. 运行相关测试、全量测试、`npm run verify` 和 `git diff --check`。生产重启及真实管家“查同步”验收另按主人授权执行。

## 验收标准

- 含图片回执的 MoE 笔记调用 `knowledge.sync_status` 不再返回 `REMOTE_TOOL_RESULT_BLOCKED`，模型能读到一个图片回执及三端真实状态。
- 发给远程模型的内容不含原始图片素材 token；本地 publish-map 字节与恢复日志语义不变。
- 现有工具序列化安全测试全部通过，真实凭据仍 fail-closed。

## 非目标

- 不通过删除或改名本地持久化字段规避扫描，不放宽 `credential_assignment`，不修改云端笔记或补发图片。
- 不夹带发布注册对账、MOC 或其它同步链路改造。

## 执行记录（2026-11-11）

- 开发分支：`fix/sync-status-image-receipt-20261111`。
- 源码修改：`packages/syno-core/business-tools.mjs` 新增 `syncStatusForModel()`，仅精简 `knowledge.sync_status` 的对外图片回执，移除 `token`、保留位置与摘要；本地原始记录不变。
- 回归测试：`tests/business-tools.test.mjs` 通过真实 `SynoToolBridge` 复现修复前 `REMOTE_TOOL_RESULT_BLOCKED`，修复后验证三端状态、回执元数据、原始对象不变及 token 不进入响应。
- 相关测试：54/54 通过；`npm run verify` 通过（60,132 files；active docs 8）；`git diff --check` 通过。
- 全量测试：839 项，819 通过、1 失败、19 跳过。唯一失败仍是 `tests/business-tools-transaction.test.mjs:26` 的既有恢复用例，临时目录缺少 `ops/actions/2026/10`；本修复未触及该链路。
- 交付：已 squash 合并到 `main` 并重启生产 Host，健康状态 `ready`。
- 真实 MoE 数据验收：当前 `main` 的业务工具与实际 MCP 序列化器返回 `status=synced`，wiki/images/catalog 均 `succeeded`，回执数为 1，回执字段仅含 `blockId`、`digest`；响应不含原始 token，本地记录保持不变。
- 未执行：远端推送和飞书真实对话中的“查同步”验收。
