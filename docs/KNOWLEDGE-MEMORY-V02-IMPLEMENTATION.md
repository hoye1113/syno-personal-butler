# 知识与记忆 v0.2 实施记录

基线：`main@1fa9f8e`；开发分支：`codex/knowledge-memory-v02`。Owner 已确认其他 AI 停写，当前会话单独实施。按 Owner 2026-10-18 提供的完整 PRD v0.2 增量改造。

**交付状态：本地实现与自测；尚不具备生产发布资格。** 评测标签按 Owner 最新指示保持草案，完成实现后统一审核。生产 checkout、服务、历史记忆和云端内容没有切换或迁移。

## 已实现范围

| 阶段 | 实现及检查 |
|---|---|
| A 记忆 | 独立 v2 契约及 `ops/memory/` 生命周期；提出、后续确认、纠正候选、版本替换、遗忘 lineage；当前正文清理及 metadata tombstone；独立查询与每轮上下文。个人记忆和旧个人记忆引用排除普通知识检索与发布。 |
| B 知识 | update、move、merge、delete、maintenance；稳定 ID 和内容版本；删除／合并先预览，独立无工具模型只看真实 Owner 消息，Host 绑定一次性授权，执行及合并前复验；移动精确引用、合并保留完整来源正文。 |
| C0 来源 | HTTP、浏览器、分析前和最终写入共享来源校验；验证页拒收，已核实坏笔记按路径＋摘要隔离（正文未改）；默认完整正文＋简要导读；持久图片清单、按摘要复用、隔离附件解析、原位置本地引用、下载失败如实标缺。 |
| C1–C4 发布 | Host 管理 disabled/sandbox/production；默认 disabled；持久 publish-map、单写者锁、每端版本及状态；Wiki 正文、原生图片、目录受管字段；未知效果只读对账，人工冲突展示差异并经后续主人消息确认覆盖，部分失败及限流重试；隔离写权限探针与恢复入口。代码已接通，尚未实际飞书验收。 |
| 执行恢复 | 中间状态写 fsync journal 和原子快照；普通本地成功路径三类提交；真实 Git 子进程在内容合并后强制退出，重启恢复且无重复效果；终态载荷 30 天、已验证终态 journal 90 天，未完成效果保留。 |
| D 评测 | 固定 100 条记忆样本（50 正／50 负）、7 条独立校准、50 条确认对话草案；确定性脚本、95% Wilson 区间、三轮真实 Kimi 语义回放、失败逐例保存。真实渠道与云端整体验收仍待完成。 |

现有 12 个业务工具保留，新增 11 个，共 **23 个业务工具**。聊天面另保留知识三件套、web_search 和 skill。没有新增 knowledge.save、模型/Provider 选择、路径指定或通用执行工具。

## 新工具与执行边界

| 模型工具 | Host 执行 |
|---|---|
| syno_memory_search / get | MemoryStore 只读查询，无空 Job |
| syno_memory_correct | memory.proposals.correct；后续确认才替换 |
| syno_memory_forget | memory.forget；当前可读副本清理 |
| syno_knowledge_update / move | notes.edit / notes.move |
| syno_knowledge_merge / delete | 仅预览；decisions.resolve 经 Host 授权后 notes.merge / notes.delete |
| syno_knowledge_maintenance | 只读维护；含隔离问题证据，不自动修复 |
| syno_knowledge_sync_status / retry | 查询及恢复已登记请求；不新建知识副本 |

`memory.promote/reject` 仅为 Host 操作，晋升不写 vault。`capture.submit/list/get/resume` 名称及异步语义保留。`knowledge.publish.state/probe/authorize` 仅 Host 使用，不暴露为模型工具。

## 验证证据及口径

- 全仓 `pnpm gate` 包含 Node 测试、repository verification、active docs、`git diff --check`。Windows 专属测试在本机跳过，不能视作已实测 Windows。
- 真实 Git 事务测试验证普通成功路径总计三条提交，以及“内容已合并、终态未提交”后的进程崩溃恢复。同步状态的后续 Host Job 提交独立计数，未把这些提交算进本地三条或隐藏。
- 确定性草案正式集：Recall@5 50/50，精确率 50/50，无相关场景误召回 0/50；区间分别约 [92.87%,100%]、[92.87%,100%]、[0,7.13%]。这是固定合成／脱敏样本结果，不是泛化保证。p95 是进程内规则回放耗时，不能代表磁盘、收录或云端 p95。
- 真实 Kimi 语义回放共 450 次，三轮分别 149/150、148/150、148/150；模型输出中未出现错误批准。五次不一致：M045 两次漏用全局约定、M060 一次无效 JSON、D001 两次确认意图与草案标签不一致。调用错误没有记为通过。SDK 无逐例计费账单，成本记为 unavailable。
- 该 450 次是独立无工具语义回放，**不是飞书 → Host → 云端的完整对话验收**。当时 HEAD 为基线 1fa9f8e，实际运行含未提交实现，之后还有同步决策及资源边界修复，因此这份报告不能称为最终提交的发布验收证据。原始报告保留不改。
- BSK 实际公开页面测试：目标正文存在、未截断、取得 HTML 图片清单、任务自有会话已关闭。未发送飞书消息。
- 迁移只读预演发现 3 条记录：1 条旧 approved 资料收录提案待核查、2 条 rejected（其中一条测试数据）；没有个人事实自动激活。原字节备份／可重入／恢复在隔离副本验证。

## 审核入口与发布前条件

1. 审核 `tests/eval/fixtures/knowledge-memory-labels-v1.json` 及两个正式 JSONL；目前 reviewedByOwner=false、frozen=false。标签冻结后重跑发布评测，逐例处理漏召回与含糊确认，不能改标签掩盖实现失败。
2. 审核 `.runtime/migrations/memory-v02-dry-run.json` 的逐条迁移映射；清单未审核前不迁移。Google Flow 旧 approved 表达资料收录意图，不激活为个人记忆。已知微信验证页仍等待明确修复决策。
3. 提供并确认隔离 Wiki 父节点、测试表和字段映射；在 sandbox 执行真实创建／更新／上传／清理权限探针，Owner 实际打开测试产物确认访问。消息通道健康不能代替这些探针。
4. 完成 Wiki／目录／图片的同版本核验，以及真实渠道、人工编辑冲突、远端响应丢失、各效果持久化切点、旧版本晚到、限流撤权、耗时和成本验收。当前单元与模拟 SDK 测试不能代替真实飞书接口验证。
5. 发布授权后才配置 production、合并和重启。当前授权不包括推送 main 已领先远端的提交，也不包括当前开发的生产切换。

## 当前明确限制

- 不支持的 Markdown 图片语法（如引用式图片）和 inline SVG/canvas 明确列为缺项，不宣称完整图文；PDF/DOCX 仍只保证已有文字读取。
- 发布目标尚未配置。未知创建且没有可唯一定位的远端 ID 时保持 unknown，不自动重新创建；旧版本 unknown 未核对前不会用新版本覆盖映射。
- 本地保存后立即回执各端状态，后台恢复不补发历史聊天回复。目录只在正文和图片核验后标记完成，个人记忆无发布资格。
- 普通遗忘／删除不擦除历史 Git、聊天、备份或飞书历史；Wiki 节点可能保留，当前正文清空并标记删除。
- 三端发布有多个状态投影 Job，后续提交数和真实端到端 p95 尚未获得生产基线；不能把“本地三条提交”宣传成整个同步流程仅三条。

## 回滚边界

停止新发布后先核对租约及 unknown 效果；保留 publish-map 和已创建远端身份。数据回滚使用已核验备份，不静默丢弃未知字段。回退旧代码前确保它不会重新晋升个人记忆到 vault。故障可关闭云端执行并显示未同步，不能继续报告三端完成。
