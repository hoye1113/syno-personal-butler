# 管家同步、图片与收录收尾修复计划

- 日期：2026-11-05
- 状态：待启动
- 核查基线：`main@668f42b565699b7bbbeb958cd46812f97bcce840`

## 背景

管家反馈的三类问题均有项目内缺口：

1. 已登记笔记的本地更新依赖 `queueMicrotask` 触发发布注册，锁超时、进程退出或资源不完整都会中断本次注册；现有 `recover()` 又会跳过旧版本三端 `synced` 的映射，不对账本地当前版本与路径。
2. 浏览器已经取得 HTML，且资源解析已经支持微信 `data-src`；但正文提取降级到 VOM/a11y 文本时丢失图片 Markdown，图片下载也未携带微信 CDN 常用的 Referer。另有 `resourceDiscoveryComplete=false` 被覆盖的问题。
3. 收录方案收集 `mocChanges`，但 `IngestService.apply()` 不执行；正文 wikilink 没有纳入有效性和 `link_status` 核验。`post-ingest-candidates` 只记录输出与证据候选，不是收尾工作流。

旧的同步死锁修复 `91a43e3c7` 和浏览器正文修复 `b4044ab6a` 已在当前分支，不能替代本轮缺口修复。

## 目标

1. 已登记笔记发生编辑、移动、修链或补图后，即使当次注册失败，也能自动发现源版本／路径漂移并补登；资源不完整必须明确阻塞，不能静默保留旧版 `synced` 外观。
2. 微信公开文章走浏览器 VOM 回退时仍保留可定位的正文图片，正常下载、本地化并发布；外部平台仍拒绝资源时如实保留失败状态。
3. 新收录在受控 Job 内完成可确定的 MOC 挂载和互链核验，不再依赖对话记忆；歧义操作仍暂停，不自动猜写。

## 步骤

### A. 发布注册与源漂移对账（P0）

涉及：

- `packages/syno-core/knowledge-publisher.mjs`
- `tests/knowledge-publisher.test.mjs`
- 必要时补 `runtime.onCommitted` 链路测试

1. 在 `recover()` 的旧版 `synced` 短路之前读取当前源，比较 `sourceVersion`、`resourceVersion`、`sourcePath`；漂移时先 `queue(currentNote)`，再按最新映射决定是否 `run()`。
2. 将“登记当前源版本”与“允许远端发布”分开：已有映射的新版本即使资源不完整，也更新源版本、路径和 `expectedVersion`，保留远端身份与旧 `appliedVersion`，目标进入 `blocked/SOURCE_RESOURCE_INCOMPLETE`，不得发生远端写。
3. 保留现有未知远端效果、人工编辑冲突及 wiki/catalog 创建唯一性保护；不靠单纯延长 30 秒锁等待掩盖问题，也不在持有知识写锁的 `onCommitted` 内嵌套同步发布。

### B. 浏览器图片资源闭环（P0）

> 已于 2026-11-09 在 `fix/browser-image-resource-pipeline-20261109` 分支实施；执行记录见 `docs/plans/fix-browser-image-resource-pipeline.md`。A、C 未实施。

涉及：

- `packages/syno-core/browser-capture-adapter.mjs`
- `packages/syno-core/source-resources.mjs`
- `packages/syno-core/source-fetcher.mjs`
- `packages/syno-core/ingest-service.mjs`
- 对应测试文件

1. 仅在选择 VOM 回退时，将正文 `image "..."` 占位与 HTML 已发现的 `body_image` 按可确认顺序恢复为 `![alt](source)`；装饰图、`inline:` 资源不参与。数量或位置无法可靠对应时不猜，保留未匹配占位并标记资源发现不完整。
2. 对 `mmbiz.qpic.cn` 图片请求仅增加固定 `Referer: https://mp.weixin.qq.com/`，直连与代理路径一致；不带 Cookie、完整文章 URL或浏览器凭据，不放宽 SSRF、DNS、重定向、MIME 和魔数校验。
3. `applyBrowserSnapshot()` 保留适配器返回的 `resourceDiscoveryComplete === false`，不得仅因 resources 是数组就改成完整。
4. 先用真实公开文章复测 HTML 截断；只有确认 2 MB 上限仍截断所需资源时，才调整上限并补边界测试。
5. 若复现入口是“聊天读取后由模型整理成文本再收录”，再补资源元数据绑定；不预设扩展浏览器动作白名单。

### C. 收录集成收尾（P1）

涉及：

- `apps/syno/syno/workflow-context-compiler.mjs`
- `contracts/ingest-proposal.schema.json`
- `packages/syno-core/ingest-service.mjs`
- `packages/syno-core/knowledge-links.mjs`（复用，不另造解析器）
- 对应收录、契约和链接测试

1. 在写入前复用现有 wikilink 解析，将链接分类为 resolved／missing／ambiguous；有效出站链接与 `link_status` 保持一致，问题进入 `unverifiedIssues`，并纳入 `completionStatus`。
2. 将 `mocChanges` 收紧为可执行的最小契约：已存在 MOC、明确 `targetPath/notePath`、幂等追加、`expectedVersion` 匹配。新 MOC、歧义目标、结构调整仍留人工决策。
3. 在 `IngestService.apply()` 同一受控事务内执行合法 MOC 追加，并把 MOC 路径纳入 `changedPaths`、validator 和 GitGuard；不在 `onCommitted` 后旁路改库。
4. `mocChanges: []` 必须能区分“无适用 MOC”和“未处理”；无法确认时保留 incomplete，而不是静默完成。
5. `OBJECT_VERSION_CHANGED` 不复用旧参数盲重试；如补恢复入口，应重新读取目标、刷新版本和关系预览后再执行。

## 验收标准

1. 发布回归：
   - 旧版三端 synced、本地新版本且资源完整，模拟注册未执行后，`recover()` 自动补登并追平。
   - 仅路径变化时更新 `sourcePath`，只刷新 catalog。
   - 新版资源不完整时 `expectedVersion` 推进、目标 blocked、远端零写入；资源补齐后可恢复。
   - 现有 stale、unknown、远端人工编辑冲突测试不回归。
2. 图片回归：
   - 微信式 HTML 的 `data-src` 在 VOM 回退后仍生成同位置 Markdown 和一致资源清单。
   - 占位与图片无法可靠对应时不猜位置，资源发现标为不完整。
   - 直连和代理请求均带限定 Referer；CDN 仍失败时 `downloadStatus=failed`，不得伪报完整图文。
   - HTML 截断的不完整标志一直保留到收录与完成状态。
   - 使用一篇真实公开微信文章完成“正文图片 → 本地下载 → 飞书原生图片”端到端验收。
3. 收录回归：
   - 合法 `mocChanges` 实际更新 MOC 且进入同一 Job diff；版本冲突零写入。
   - 有效短名链接使 `link_status=connected`；长标题对 slug 文件、死链和歧义短名被如实报告。
   - 无 MOC／未处理 MOC 的完成状态可区分，降级收录仍保留集成缺项。
4. 运行相关测试及 `npm test`、`npm run verify`；任何环境性失败单独报告，不称全量通过。

## 非目标

- 不承诺绕过验证码、登录、图片过期、删除或额外签名校验。
- 不自动猜测歧义 MOC、目录或关系，不恢复已删除的主动推送子系统。
- 本轮最小修复不覆盖“首次收录尚无 publish-map 且进程在 microtask 前崩溃”的全量持久 outbox；如验收要求覆盖该场景，另列后续计划。
- 不自动提交、推送、合并或重启生产服务，均按主人后续授权执行。
