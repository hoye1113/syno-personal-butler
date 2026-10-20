# 知识与记忆 v0.2 实施记录

基线：`main@1fa9f8e`；开发分支：`codex/knowledge-memory-v02`。Owner 已确认其他 AI 停写，当前会话单独实施。按 Owner 2026-10-18 提供的完整 PRD v0.2 增量改造。

**当前交付状态（2026-10-20）：v0.2 与 P1 已合入，生产发布已于 2026-10-19 经隔离验收及主人授权启用；标签已审核冻结，最终固定语义评测通过。** 上述基线／分支仅为 2026-10-18 初始实施记录。后续发布、存量回填和最终评测以 [P1 交付说明](KNOWLEDGE-FEISHU-P1.md) 为准；旧个人记忆没有自动激活。

## 已实现范围

| 阶段 | 实现及检查 |
|---|---|
| A 记忆 | 独立 v2 契约及 `ops/memory/` 生命周期；提出、后续确认、纠正候选、版本替换、遗忘 lineage；当前正文清理及 metadata tombstone；独立查询与每轮上下文。个人记忆和旧个人记忆引用排除普通知识检索与发布。 |
| B 知识 | update、move、merge、delete、maintenance；稳定 ID 和内容版本；删除／合并先预览，独立无工具模型只看真实 Owner 消息，Host 绑定一次性授权，执行及合并前复验；移动精确引用、合并保留完整来源正文。 |
| C0 来源 | HTTP、浏览器、分析前和最终写入共享来源校验；验证页拒收，已核实坏笔记按路径＋摘要隔离（正文未改）；默认完整正文＋简要导读；持久图片清单、按摘要复用、隔离附件解析、原位置本地引用、下载失败如实标缺。 |
| C1–C4 发布 | Host 管理 disabled/sandbox/production；默认 disabled；持久 publish-map、单写者锁、每端版本及状态；Wiki 正文、原生图片、目录受管字段；未知效果只读对账，人工冲突展示差异并经后续主人消息确认覆盖，部分失败及限流重试；隔离写权限探针与恢复入口。生产发布已于 2026-10-19 启用，实际创建／更新／删除、原生图片及主人访问已验收；252 条映射状态见 P1 记录。 |
| 执行恢复 | 中间状态写 fsync journal 和原子快照；普通本地成功路径三类提交；真实 Git 子进程在内容合并后强制退出，重启恢复且无重复效果；终态载荷 30 天、已验证终态 journal 90 天，未完成效果保留。 |
| D 评测 | 固定 100 条记忆样本（50 正／50 负）、7 条独立校准、50 条确认对话；标签于 2026-10-19 经主人审核冻结；确定性脚本、95% Wilson 区间、三轮真实 Kimi 语义回放、失败逐例保存。最终 cfd9b53 三轮各 150/150；分类回放不替代完整聊天工具循环与飞书业务验收。 |

v0.2 初次交付为 23 个业务工具；P1 新增 publishing_check 和 sync_start 后，当前共 **25 个业务工具**。聊天面另保留知识三件套、web_search 和 skill。没有新增 knowledge.save、模型/Provider 选择、路径指定或通用执行工具。

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
| syno_feishu_publishing_check | 只读发布配置、目标可见性及各端状态检查 |
| syno_knowledge_sync_start | 已有笔记首次登记稳定 ID／资源清单并发布，不重新收录 |

`memory.promote/reject` 仅为 Host 操作，晋升不写 vault。`capture.submit/list/get/resume` 名称及异步语义保留。`knowledge.publish.state/probe/authorize` 仅 Host 使用，不暴露为模型工具。

## 验证证据及口径

- 全仓 `pnpm gate` 包含 Node 测试、repository verification、active docs、`git diff --check`。Windows 专属测试在本机跳过，不能视作已实测 Windows。
- 真实 Git 事务测试验证普通成功路径总计三条提交，以及“内容已合并、终态未提交”后的进程崩溃恢复。同步状态的后续 Host Job 提交独立计数，未把这些提交算进本地三条或隐藏。
- 初始开发期确定性草案集（历史）：Recall@5 50/50，精确率 50/50，无相关场景误召回 0/50；区间分别约 [92.87%,100%]、[92.87%,100%]、[0,7.13%]。这是固定合成／脱敏样本结果，不是泛化保证。p95 是进程内规则回放耗时，不能代表磁盘、收录或云端 p95。
- 初始开发期真实 Kimi 语义回放（历史，非最终发布证据）共 450 次，三轮分别 149/150、148/150、148/150；模型输出中未出现错误批准。五次不一致：M045 两次漏用全局约定、M060 一次无效 JSON、D001 两次确认意图与草案标签不一致。调用错误没有记为通过。SDK 无逐例计费账单，成本记为 unavailable。
- 该 450 次是独立无工具语义回放，**不是飞书 → Host → 云端的完整对话验收**。当时 HEAD 为基线 1fa9f8e，实际运行含未提交实现，之后还有同步决策及资源边界修复，因此这份报告不能称为最终提交的发布验收证据。原始报告保留不改。
- BSK 实际公开页面测试：目标正文存在、未截断、取得 HTML 图片清单、任务自有会话已关闭。未发送飞书消息。
- 迁移只读预演发现 3 条记录：1 条旧 approved 资料收录提案待核查、2 条 rejected（其中一条测试数据）；没有个人事实自动激活。原字节备份／可重入／恢复在隔离副本验证。

## 后续验收与当前状态

- 标签已审核冻结：`tests/eval/fixtures/knowledge-memory-labels-v1.json` 的 `reviewedByOwner=true`、`frozen=true`；审核规则及覆盖限制见 [标签记录](evals/knowledge-memory-v1-label-review.md)。不得按结果改写冻结标签。
- 最终冻结评测：`cfd9b53` 上 450 次，三轮各 150/150、误授权为零、Recall@5 每轮 50/50；报告在 `.runtime/evals/frozen-v1-cfd9b53/`。它不覆盖普通聊天工具循环、实际写入、多候选排序、多预览或合并。
- 发布已启用：生产目标、隔离验收、主人访问确认、创建／更新／删除和存量回填见 [P1 记录](KNOWLEDGE-FEISHU-P1.md)。本地 252 条映射共 756 个目标状态为 succeeded，不代表本次逐篇重新核验云端页面。
- 旧记忆迁移仍按逐条审核处理；Google Flow 旧 approved 为资料收录意图，保持 dormant，不进入 active。
- 当前 f91a40a 自动回归：772 pass／1 fail／19 skipped；唯一失败为沙箱禁止真实钥匙串写入。仓库、文档及差异检查通过。该结果不能写为全量通过，也不证明 Windows 真机行为。
- 完整聊天工具循环、复杂确认组合、真实故障恢复和端到端耗时／成本仍分别报告，不能以分类满分或已配置凭据替代。文档同步不包含新的 Push、合并、发布模式切换或生产重启授权。

## 当前明确限制

- 不支持的 Markdown 图片语法（如引用式图片）和 inline SVG/canvas 明确列为缺项，不宣称完整图文；PDF/DOCX 仍只保证已有文字读取。
- 生产目标已配置；新增或切换目标仍须明确授权。未知创建且没有可唯一定位的远端 ID 时保持 unknown，不自动重新创建；旧版本 unknown 未核对前不会用新版本覆盖映射。
- 本地与云端状态应分别说明；当前 workflowSummary 对已完成收录仍固定返回“云端发布未启用”，已复现并记录于 KNOWN-LIMITATIONS，尚未修源码。后台恢复不补发历史聊天回复。目录只在正文和图片核验后标记完成，个人记忆无发布资格。
- 普通遗忘／删除不擦除历史 Git、聊天、备份或飞书历史；Wiki 节点可能保留，当前正文清空并标记删除。
- 三端发布有多个状态投影 Job，后续提交数和真实端到端 p95 尚未获得生产基线；不能把“本地三条提交”宣传成整个同步流程仅三条。

## 回滚边界

停止新发布后先核对租约及 unknown 效果；保留 publish-map 和已创建远端身份。数据回滚使用已核验备份，不静默丢弃未知字段。回退旧代码前确保它不会重新晋升个人记忆到 vault。故障可关闭云端执行并显示未同步，不能继续报告三端完成。
