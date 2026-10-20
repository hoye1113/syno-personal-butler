# Syno 已知限制

更新日期：2026-10-20（Asia/Shanghai）。检查基线：`main@f91a40a`。本页描述当前限制；旧运行时、双渠道及旧工作台验收只作历史追溯，不能覆盖当前能力。

## 当前验证状态

- 本机 `GET /api/syno/health` 与 `/readiness` 均返回 ready，存储、Harness 和渠道组件就绪；飞书运行且已绑定 Owner。当前在线不代替登录冷启动或长时间稳定性验收。
- 生产发布已于 2026-10-19 经隔离验收和主人授权启用。2026-10-20 本地 252 条发布映射的 Wiki／图片／目录共 756 个目标均为 succeeded，无 pending 或 blocked；本次未逐篇重新读取云端页面，也不表示全库所有文件均有发布资格。目标、访问确认与回填记录见 [P1 交付说明](KNOWLEDGE-FEISHU-P1.md)。
- 标签已于 2026-10-19 经主人审核冻结；`cfd9b53` 上三轮真实 Kimi 语义评测各 150/150，误授权为零。该评测只证明固定样本上的检索／分类及确认判定，不覆盖普通聊天工具循环、真实业务写入、多候选排序、多预览、合并或飞书发布。
- 本轮 Node 全量测试 792 项：772 通过、1 失败、19 跳过。唯一失败为真实 macOS 钥匙串测试被当前沙箱拒绝写入（`SECRET_KEYCHAIN_UNAVAILABLE`，`Operation not permitted`），不能称全量通过。Repository verification（2766 files）、active docs（8 files）及 `git diff --check` 通过。Windows 专属跳过项不构成当前真机验收。

## 已确认未修复问题

- `packages/syno-core/business-tools.mjs` 的 `workflowSummary()` 对 committed／reported 收录固定返回“本地已保存；云端发布未启用”。已用隔离假服务复现 `capture.get` 同时返回该文案与 `sync.mode=production/status=synced`。`capture.list`、`work.overview` 等复用摘要的入口也受此文案影响。应以 `knowledge.sync_status` 或返回的 `sync` 字段区分云端状态；此处只记录问题，本轮文档同步没有修源码。

## 产品入口与范围

- 飞书是唯一日常渠道，只接受绑定 Owner 的私聊；不读取个人聊天历史，不支持群聊授权。微信栈已于 2026-10-16 物理删除。
- 8888 是白名单控制 API，根路径和旧工作台业务页面返回 404；代码里保留的旧 route handler、服务或日历适配器，不等于当前对用户开放的能力。3088 是需启动令牌认证的受控 DSH Web，便利入口仍见 [Mac 部署计划](plans/mac-deployment-remaining-work.md)。
- 学习、复习、项目管理、今日灵感及主动推送已删除；排期只记录时间，不主动提醒。没有聊天回复崩溃补发；后台收录、发布恢复及其请求结果回执仍保留。
- 自然语言业务由模型调用受控工具，只有 `/new` 和 `/stop` 是确定性控制口令。Provider 故障时本地事实仍保留，但不能保证自然语言收录、待办和决策会绕过模型继续处理。
- 管家运行时不能修改项目源码、执行终端或控制系统。源码开发和服务安装／重启属于主人授权的独立开发／运维流程。自动提交仅限声明的 `vault/**`、`ops/**`，永不自动 Push。

## 来源、图片与知识维护

- URL、Bilibili、PDF 和附件受大小、MIME、SSRF、来源质量与隔离规则约束。验证页、失效链接和不完整正文不能伪报为已读原文或发布完成。
- 聊天图片以原生 image 内容块直达 Kimi，单图原始字节上限 3MB；只有明确收录才通过无工具 capture sidecar 转写，失败时如实回报。飞书下载上限 25MB 不代表所有收录格式都支持 25MB：PDF／DOCX 上限 10MB，文本／HTML 等上限 1MB。
- PDF／DOCX 当前只保证已提取文字；不支持的图片语法、inline SVG／canvas、扫描 PDF OCR 和浏览器缺失资源不能视作完整图文。
- 知识搜索是本地词项检索和确定性排序；固定记忆 Recall@5 满分不证明任意问题、全库语义检索或长期多轮记忆都满分。
- 维护工具只报告问题，不自动清理；知识删除与合并须绑定具体目标版本的预览，并等待后续真实 Owner 消息确认。

## 记忆与发布边界

- 个人记忆只在 `ops/memory/` 生效；候选须后续确认，纠正生效前旧事实仍有效。普通遗忘清理当前正文及可读载荷，不擦除 Git、聊天、备份或云端历史。
- 旧记忆仅生成迁移清单，不自动激活。Google Flow 旧 approved 记录实际是资料收录意图，保持 dormant。
- 只有 Wiki、图片、目录都核验到当前对应版本才称同步完成。云端人工编辑会阻断覆盖；未知远端效果先只读对账，无法唯一定位时保持 unknown，不盲目重建。
- 本地三类提交不包含发布状态的后续 Job；真实端到端耗时和逐例成本仍缺完整基线。2026-10-20 有一次长 chat turn 达到 180 秒 `HARNESS_TURN_TIMEOUT`，本地更新已经完成，不能据聊天超时推断业务未执行。

## 平台、恢复与历史债务

- 支持 Windows 与 macOS Apple Silicon；其它平台未适配。Windows 使用 DPAPI，macOS 使用登录钥匙串主密钥加 AES-256-GCM 信封，不可直接跨用户／机器移植凭据。
- 生产不设置 `SYNO_KNOWLEDGE_ROOT`；唯一物理事实源为本仓 `vault/` 与 `ops/`。外部知识仓、冻结副本和旧路径 junction 已清理，知识回滚依靠本仓 Git 历史与核验备份。
- DSH 根必须构建后使用；默认子模块与可选外部 checkout 可能有版本差异，需按实际根检查 closure。历史 bootable 或旧版本探针不证明当前生产可运行；本轮没有重新构建或切换运行时。
- macOS 登录冷启动、长会话 compaction、真实故障及恢复矩阵仍需按各自证据验收。当前 ready、历史 Windows 验收与冻结分类评测互不替代。
- `ProviderClient`、`ConversationStore`、`ConversationRouter`、`ContextManager`、`ToolLoopAgent` 仍有 legacy 本地调用方；R6 真实矩阵未完成前保留，不是 Harness 故障回退路径。
- 状态归档只包含本机 state，不含 credentials，也不替代 `vault/`、`ops/` 和代码配置的 Git／系统备份。数据契约破坏性升级须显式迁移，禁止静默改格式。
- 项目无 TypeScript、typecheck、lint 或独立应用 build 脚本；JS 行为由 Node 测试验证，Harness 构建独立进行。

历史记录见 [最终验收](FINAL-ACCEPTANCE.md)、[Provider 历史验收](PROVIDER-ACCEPTANCE.md)、[R6 证据](../ops/acceptance/pr-10-r6-seal/README.md) 及各执行计划；这些记录不代表当前版本已经全面封板。
