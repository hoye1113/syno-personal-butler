# 知识与飞书 P1 优化交付说明

开发基线：main@46f5062（2026-10-19，Asia/Shanghai）。独立分支：codex/p1-knowledge-feishu。2026-10-19 已按主人授权合并（main@d15adf7）、重启服务；随后按隔离验收结果启用生产发布（main@96064f0，目标见下文「生产启用记录」）。

## 本轮能力

- 知识删除／合并／云端覆盖的语义判定读取真实 Owner 原话及预览，不再用确认关键词决定是否送判。后续消息、Owner、会话、有效期、一次性授权和版本检查仍有效。
- 知识操作回执分别返回本地结果与云端状态；发布 disabled 时明确 Wiki／目录尚未更新，避免模型仅凭本地 Job 完成宣称三端完成。
- 收录失败按持久 nextRetryAt 主动调度；坏分析契约五秒重试一次，第二次仍无效则沿用已有基础方案降级。重启后遵守原期限，六十秒恢复轮询保留作对账。
- knowledge.maintenance 增加相同正文、相同来源候选、内部断链／歧义链接、缺少来源的对象和证据；不自动清理。代码示例与外部 URL 不算内部断链。
- 删除预览列出引用及版本；执行保留原有引用文字并标记已删除。合并引用指向保留笔记；任一引用变化，旧预览失效。受影响普通笔记按新版本重新进入发布队列。
- 旧笔记首次发布走 notes.prepare_publish Job，补齐 note_id 和对应资源清单；不会在搜索或诊断时写笔记。资料不完整时仍拒绝声称同步成功。

## 新增模型工具与 Host 映射

| 模型工具 | Host 执行 | 约束 |
|---|---|---|
| syno_feishu_publishing_check | KnowledgePublisher.check → 官方 SDK 只读 API | 发布模式、缺项、Owner 当前目标状态汇总；最多十个可见 Wiki 空间和一百个表字段，分页截断明确标注；不修改开关，不证明写权限或主人访问权限 |
| syno_knowledge_sync_start | notes.prepare_publish → 已有 onCommitted 发布队列 | 必须带准确 ID/version；开发 disabled 拒绝；受控持久稳定 ID／资源清单，不重复收录 |

保留 capture.*、knowledge.sync_status/retry 和其余工具。本轮不安装另一套飞书消息入口，不增加新 Provider、动态 MCP、终端或任意 OpenAPI 执行工具。

## 本机验收命令

```sh
# 已配置生产凭据的本机运行；仅只读发现，不另建飞书长连接。
node scripts/check-feishu-publishing.mjs

# 在独立的 SYNO_LOCAL_DATA / SYNO_RUNTIME_ROOT 中运行。
# SYNO_EVAL_CREDENTIAL_REPO 指向现有凭据仓目录；不通过命令行传密钥。
node scripts/probe-knowledge-confirmation.mjs --real
node scripts/eval-knowledge-memory.mjs
# 主人审核冻结后，在最终提交上再运行：
node scripts/eval-knowledge-memory.mjs --real
```

真实确认探针启动独立 DSH Web 端口和临时知识夹具，经过真实 Kimi、DSH、认证 Bridge、决策工具与确定性知识变更。它不覆盖真实飞书消息投递、Job Git 合并；结果与 450 次分类回放分别报告。临时笔记和 DSH 子进程结束后清理，报告保留在 .runtime/evals（不提交）。

新增本机入口：GET /api/syno/knowledge/sync/check；POST /probe、/recover（路径前缀相同）。发布 POST 只接受同源 JSON；无 Origin 的本机 CLI 可调用。原有 Loopback、Host、探针 sandbox-only、Job、版本及恢复日志约束继续适用。GET 不能触发写入。

## 隔离发布配置模板

只将主人确认的隔离目标 ID 写入 config/knowledge-publishing.json；不填写密钥。将以下占位值替换后才能切 sandbox，不能直接复制假 ID 开启。

```json
{
  "mode": "sandbox",
  "targetKey": "owner-confirmed-sandbox-v1",
  "sandboxConfirmed": true,
  "wikiSpaceId": "<隔离知识空间 ID>",
  "wikiParentId": "<隔离父节点 token>",
  "appToken": "<测试多维表格 app token，资源 ID>",
  "tableId": "<测试表 ID>",
  "fields": {
    "id": "Note ID", "title": "Title", "summary": "Summary",
    "category": "Category", "localPath": "Local Path", "version": "Version",
    "wiki": "Wiki URL", "status": "Sync Status"
  }
}
```

这些受管字段使用文本字段；人工字段不在映射中，不由 Syno 覆盖。Wiki 父节点须位于声明的空间，应用必须被授予对应 Wiki／Docx／图片／多维表权限。只读空间为空不证明租户没有空间，也不证明写权限，只说明本应用当前没有列出可见项。

配置后：只读检查 → POST /probe（创建、更新、上传原生图片、清空 Wiki 当前正文、删除测试目录记录）→ 主人打开产物确认可访问 → 使用专用测试笔记逐项演练部分失败、人工冲突、结果未知、限流及重启恢复。Wiki 测试节点保留删除标记，历史不擦除。生产启用与服务切换另按主人授权执行。

## 生产启用记录（2026-10-19）

主人授权后完成合并、重启与生产发布启用：

- 生产目标：Wiki 父节点「云端发布」（space `7694918217688534004` / node `V2NKwFbcliaPXNkLQ29czIjinHd`，仅该子树授权应用「可管理 + 子页面」）；目录「Syno 知识目录」（`IVtqbE8ocaEY93sqQ1bciWE5ncg` / `tblFswdcuKmNR8e7`，8 个文本字段，应用「可编辑」）。
- 只读检查：`mode=production`、缺项为空、父节点空间匹配、字段全部 type 1、缺失/不兼容为空。
- 写能力：受控发布链路（创建 → 更新 → 删除，含原生图片）全部 `synced`；更新复用同一 Wiki 节点与同一目录记录（去重）；删除后目录记录删除、Wiki 保留删除标记。产品内置 `/probe` 按设计只允许 sandbox，生产写能力改用同一发布链路的受控脚本验证。
- 运行态：`/api/syno/knowledge/sync/check` 返回 `production`；`readiness=ready`；重启后运行日志 0 错误。
- 主人确认：2026-10-19 已打开父节点、测试节点与目录三个链接并确认可访问。
- 回滚：`config/knowledge-publishing.json` 改回 `mode: "disabled"` 并重启；本地知识不受影响，云端内容仅作镜像。

### 存量回填 Phase 1（2026-10-19）

- 只读盘点：vault 319 篇有效笔记；旧表 244 条（240 唯一路径）；旧树 246 个文档节点。
- 路径匹配 240 篇；其中 205 篇复用现有 Wiki 节点登记发布映射，35 篇无链接暂记 pending。
- 新目录回填 240 条记录：182 条 synced、58 条 pending（23 篇含图片待核验、35 篇尚无 Wiki 节点）。
- 未修改任何既有 Wiki 正文；旧树 42 个孤儿节点保持历史；无链接笔记与图片核验留待 Phase 2。
- 运行态：`registeredNotes=240`；目标状态 662 succeeded / 58 pending；0 错误。旧笔记首次同步仍需 `notes.prepare_publish` 补齐资源清单。

## 开源调研与取舍

- [官方 DSH](https://github.com/deepseek-ai/DeepSeek-Harness)：沿用现有插件注册／工具桥接边界，复用其会话与模型调度。
- [官方 Lark CLI](https://github.com/larksuite/cli)：参考按业务动作提供工具、结构化输出和独立权限诊断。本仓已使用官方 Node SDK 1.64.0，当前需求没有必要再安装一个 CLI 或另一套凭据存储。
- [官方 Lark OpenAPI MCP](https://github.com/larksuite/lark-openapi-mcp)：参考工具面选择；通用 OpenAPI 写工具无法直接替代 Syno 的 Owner、Job、版本、去重与发布映射，因此不加载动态 MCP。
- [社区 dsh-feishu-bot](https://github.com/icanotcode/dsh-feishu-bot)：可参考 Cordis 飞书入口和工具组织。其 README 标注若干会话、去重及媒体限制，不直接替换已有的 Syno 飞书通道。

没有引入新依赖，没有执行开源仓库安装脚本；公开仓库信息是设计参考，并不视作已通过 Syno 的生产安全和恢复验收。

## 待主人审核与真实验收

标签逐类清单见 [记忆与确认标签审核清单](evals/knowledge-memory-v1-label-review.md)。2026-10-19 主人已授权冻结，reviewedByOwner/frozen 已置 true。正式模型评测以冻结摘要及对应提交为准；飞书真实发布、多候选和多预览验收另列，不把本数据集通过视作完整产品发布通过。

Google Flow 旧记录保持现状，不自动激活；微信坏笔记保持隔离，不静默删除正文。云端目标已于 2026-10-19 确认并启用（「云端发布」+「Syno 知识目录」）；回滚为改回 `disabled` 并重启。
