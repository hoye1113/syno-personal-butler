# 审批即时反馈 + 多格式收录（pdf/md/docx/html）整合方案

> **状态（2026-07-24 核实）**：方案一（审批即时反馈）+ 方案二（docx/html/markdown 收录）的 **Phase 1 已实现并落库**——commit `2dc77b8`（2026-07-22，15 文件 +676，含 5 个测试文件，当时 266/266 绿）。本文档正文为该次实现的**设计/变更说明**，**非待办清单**，勿照着重复实现。唯一未实现的是 **方案三（大文件精华提取，Phase 2）**，见文末。
> 正文为 07-22 设计时的历史快照，已知小漂移（不改正文）：测试数「254→269」实际 2dc77b8 时 266、现 298（M1 又加）；mammoth 写 `^1.11.0`，实际 `package.json` 为 `1.9.1`。Phase 1 收尾待办（端到端验收缺口、两个边界 bug）见 `docs/OUTSTANDING-WORK.md` §3。

---

## Context（为什么做）

两个用户反馈的真实痛点：

1. **审批中心点击「收录/丢弃」看似无反应**——必须手动点刷新才更新。根因不是没刷新：`host.approve`（`agent-host.mjs:67`）同步阻塞执行（`#execute` 跑数十秒），前端 `decide()`（`syno.js:287`）期间零反馈；且 `loadJobs()`（`syno.js:251`）每次都整屏替换成「正在读取任务…」。
2. **pdf/md/docx/html 文件收录报错「缺少内容」或存乱码**。根因不是「没设计」——`intake.mjs` 已支持 url/text/markdown/txt/pdf。真问题是前端 `buildFileIntakePayload`（`syno.js:162`）把任何非 `.pdf` 文件静默归 `txt`，docx 等二进制被 `toString("utf8")` 读成乱码；docx/html 后端无分支。

> 前提纠正：用户建议参考的 afu 项目经探索确认是 **Markdown-only**（无 dependencies、无二进制解析），无可借鉴代码。Syno 基于自身 `intake.mjs` 补全即可。

预期：审批点击即时反馈、列表平滑刷新；新增 docx/html 收录，.md 走正确分支，未知格式明确报错。附带修一个预存 title bug（见下）。

---

## 方案一：审批即时反馈（纯前端，2 文件）

文件：`apps/syno/public/syno.js` + `styles.css`

### 根因证据

- `agent-host.mjs:67-79` `approve()` 末尾 `return this.#execute(...)` —— 同步跑 cognitive-runtime（写文件 + 4 个校验器），可能耗时数十秒。
- `syno.js:287` `decide()`：`await api(POST /jobs/:id/{action})` 期间按钮无任何状态变化，用户以为卡死。
- `syno.js:251` `loadJobs()` 开头 `target.replaceChildren(node("p","syno-empty","正在读取任务…"))` —— 整屏替换，连滚动位置和其他卡片一起消失。

### 实现步骤

1. **`decide(id, action, { actionsEl, card } = {})`**（syno.js:287 改签名）：调用点 `buildAdviceActions`（syno.js:335）传 `{ actionsEl: container, card: container.closest(".syno-job") }`。
2. **`setCardResolving(card, actionsEl, resolving)`**（新增，~syno.js:338）：
   - resolving=true：禁用 `actionsEl` 内所有 button、首按钮文案改「管家正在处理…」、隐藏第二个按钮、`card.classList.add("is-resolving")`。
   - resolving=false：恢复按钮、`classList.remove`，并**重新调用 `buildAdviceActions(actionsEl, actionsEl.__synoJob)` 复位标签**。
3. **`buildAdviceActions` stash job**：`actionsEl.__synoJob = job`（供错误恢复重建按钮——否则出错时按钮卡住）。
4. **`decide` 流程**：`setCardResolving(true)` → `await api(POST)` → 成功 `loadJobs({ silent: true })`（resolving 卡片自然被新状态卡片替换）；`catch` 先 `setCardResolving(false)` 再 `alert`。
5. **`loadJobs({ silent = false } = {})`**（syno.js:251）：
   - `silent=false`（默认，首次加载 + 手动刷新按钮 syno.js:916 + tab 打开 syno.js:86）：保留现有整屏「正在读取任务…」。
   - `silent=true`（仅 decide 用）：**GET 前不动 DOM**，拿到新数据再 `replaceChildren` 重建，保留滚动；GET 失败不清屏（resolving 卡片保留，由 decide catch 兜底）。
6. **CSS**（styles.css ~421）：`.syno-job.is-resolving { opacity: .62; transition: opacity .18s ease; }`（disabled 按钮已有样式 styles.css:1106，无需新增）。

**测试**：无 DOM 测试基建，沿用现状靠手动验证；不为常量标签抽纯函数（无分支逻辑，不值得）。

---

## 方案二：多格式收录

### 2A. 前端 kind 精确映射（syno-ui-model.js + syno.js + index.html）

1. **纯函数 `fileKindFromName(name)`**（syno-ui-model.js，导出到 frozen `SynoUiModel`，供 ui-model.test.mjs 覆盖，沿用 adviceButtons 模式）：
   - `.pdf`→pdf、`.md`/`.markdown`→markdown、`.txt`→txt、`.docx`→docx、`.html`/`.htm`→html（大小写不敏感）；未知/空 → `throw "暂不支持该格式：仅支持 PDF、Markdown、TXT、DOCX、HTML"`。
2. **`buildFileIntakePayload(file, requestedKind)`**（syno.js:160）：
   - `kind = requestedKind || uiModel.fileKindFromName(file.name)`（替代 pdf-or-txt 静默映射）。
   - size 上限：`["pdf","docx"].includes(kind) ? 10MB : 1MB`。
   - **返回加 `title: file.name`** —— 修预存 title bug（见「附修」）。
   - 输出 `{ kind, name: file.name, base64, title: file.name }`。
3. **`submitIntake`**（syno.js:183）：`["pdf", "txt"].includes(kind)` → `["pdf", "docx", "txt", "html"].includes(kind)`（不改这行 → docx/html 走 else 把文件当 value 字符串 → 后端报错）。
4. **kind-select change 处理**（syno.js:918）：fileMode 集合同步为 `["pdf","txt","markdown","docx","html"]`。
5. **`submitQuickCapture`**（syno.js:394）：已调 `buildFileIntakePayload(file)` 无 requestedKind，自动受益（修复 QuickCapture 的 docx/html/md 静默送 txt 问题）。
6. **index.html**：
   - `#synoIntakeKind`（563）加 `<option value="docx">DOCX（10 MB 内）</option>` + `<option value="html">HTML（1 MB 内）</option>`（显式选项，size 映射清晰；fileKindFromName 仍兜底自动识别）。
   - `#synoIntakeFile` accept（565）追加 `application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,text/html,.html,.htm`。
   - **`#synoQuickCaptureFile` accept（225）同步追加**（两处保持一致）。

### 2B. 后端 intake 扩展（apps/syno/syno/intake.mjs）

沿用 `pdfExtractor` 的可注入对称模式。顶部 `import mammoth from "mammoth";`。

- **模块级 extractor**（~line 12）：
  - `extractHtmlText(bytes)` = `extractReadableText(bytes.toString("utf8").replace(/^﻿/,""), "text/html")`（同步，复用 source-fetcher.mjs:81）。HTML 方案本质：把本地 HTML 文件当作已下载的网页，用同一套清洗器（去 script/style/svg、块级标签转行、实体解码、空白规整）处理，**0 新依赖**。
  - `async extractDocxText(bytes)`：`const { value } = await mammoth.convertToHtml({ buffer: Buffer.from(bytes), convertImage: mammoth.images.imgElement(async () => ({})) })`（**`{ buffer }` 非 `{ arrayBuffer }`**，convertImage 丢弃图片避免 base64 内联）→ `extractReadableText(String(value||""), "text/html")` → 空 text 抛「DOCX 没有可提取的文本」→ 返回 `{ text }`。
- **构造函数**（line 46）注入 `docxExtractor = extractDocxText, htmlExtractor = extractHtmlText`。
- **`prepare()` 分支**（line 52，与现有 pdf 分支平行）：
  - **markdown**：接受 `payload.value`（粘贴，现有）**或** `payload.base64`（文件，解码 utf8 + 去 BOM + 1MB 上限），sourceType=markdown，artifact `{mime:"text/markdown",bytes}`。
  - **docx**（新）：base64 解码 → **PK magic-byte 校验**（`bytes[0]===0x50&&bytes[1]===0x4b`）→ ≤10MB → `docxExtractor(bytes)` → sourceType=docx，artifact kind **docx**（需扩 enum）、mime=docx mime、bytes，**存原文件到 uploads**（对称 pdf，用户确认），文本包 `<untrusted-docx>` + canonical 前导（与 pdf 同构）。
  - **html**（新）：base64 解码 → ≤1MB → `htmlExtractor(bytes)` → sourceType=html，artifact kind **html**（需扩 enum）、mime=text/html、bytes，**不存原文件**（对称 txt，小文本），文本包 `<untrusted-source>`（复用 url 标记，同一 extractReadableText pipeline）。
- **export**（line 128）加 `extractDocxText`、`extractHtmlText`。

### 2C. 契约扩展（BLOCKER，contracts/artifact.schema.json）

`ingest-service.apply()`（line 190）写 artifact 记录 `schema:"artifact"` → `validateContractRecord`（markdown-record.mjs）校验 enum。`artifact.schema.json:9` kind enum **不含 docx/html** —— 不加则 approve 时 apply() 晚期抛错（用户白等数十秒后失败）。enum 加 `"docx"`、`"html"`（`additionalProperties:true`，向后兼容）。`size` 上限 10485760 与 10MB 一致。

```json
"kind": { "enum": ["url","wechat","text","markdown","txt","pdf","image","voice","file","bilibili-opus","github-doc","docx","html"] }
```

### 2D. 依赖（根 package.json + pnpm-lock）

- 根 `package.json` `dependencies` 加 `"mammoth": "^1.11.0"`（纯 JS、jszip、无原生编译）。**不加 turndown**（html 复用 extractReadableText）；**不加 OCR**（扫描 PDF 保持现有报错，列未来）。
- `pnpm install` 刷新根 `pnpm-lock.yaml`。
- ⚠️ **双 lockfile 陷阱**：根 `pnpm-lock.yaml` 是真源；`apps/syno/package-lock.json`（stale 199B）和 dep-less `apps/syno/package.json` 是 workspace 残留，勿被误导——mammoth 只加根。

### 附修：预存 title bug（影响所有文件 kind 含现有 pdf）

`ingest-service.mjs:13` `titleFromPrepared` 只读 `payload.value`（文件上传时空）→ 文件收录标题恒为「待整理收录」。由 2A-2 的 `title: file.name` 修复（微信路径已设 title，weixin-message-handler.mjs:19）。修复后 readArtifact 在审批卡片显示真实文件名标题。

---

## 测试清单（共 15 例新增）

**`tests/ui-model.test.mjs`（fileKindFromName，6 例）**：pdf（含大小写）、md/markdown、txt、docx、html/htm、未知(.epub/空/无扩展)抛 `/暂不支持/`。

**`tests/intake.test.mjs`（沿用 pdfExtractor 注入模式，9 例）**：
1. docx happy（注入 fake docxExtractor→{text}）：sourceType=docx、attachment endsWith .docx、text 含 `<untrusted-docx>\n\nHello`、mime 正确、原文件写入 uploads。
2. docx 非 PK magic-byte → 抛错。
3. docx 超 10MB → 抛错。
4. **docx extractor 注入契约**：fake 内 `Buffer.isBuffer(arg)` 为真。
5. html happy（注入 htmlExtractor→"Clean text"）：sourceType=html、text 含 `<untrusted-source>\n\nClean text`、mime=text/html、**uploads 不留文件**。
6. html 默认 extractor 集成（真实 extractReadableText）：`<main>Hi<script>attack()</script><p>World</p></main>` → content=`Hi\nWorld`。
7. html 超 1MB → 抛错。
8. markdown 文件（base64）：sourceType=markdown、content 正确、mime=text/markdown；粘贴(value)路径仍工作且无 artifact 字段。
9. markdown 空（base64 空 / value 空白）→ 抛错；未知 kind（epub）→ `/不支持的收录类型/`。

**`tests/schemas.test.mjs`**：artifact kind=docx / kind=html 通过校验。

现有 intake/ui-model 测试不受影响（txt 分支未改）。

---

## 提交结构（Phase 1，精确路径分提交，本地不 push）

1. `feat(approval): 即时反馈 + 平滑刷新审批列表` — syno.js + styles.css（方案一）。
2. `feat(intake): docx/html/markdown 文件收录 + kind 精确映射 + title 修复` — intake.mjs + syno.js + syno-ui-model.js + index.html + artifact.schema.json + 根 package.json + pnpm-lock.yaml + 3 测试文件（方案二，可按需拆「契约+依赖」与「前后端」两提交）。

---

## 方案三：大文件 / 长文本精华提取（V2 能力设计，Phase 2 实现）

### 问题

现行 intake 把完整文本塞进 `prepared.content`，再由 cognitive-runtime 全文喂给 LLM。当正文超过数万字（如 15 万字 PDF），会导致：
- LLM 上下文被大量原文淹没，生成的 vault note / 关系说明质量下降；
- 审批卡片（ApprovalAdvisor）的 reason 被长文本撑爆；
- API token 成本和延迟暴涨。

### 设计思路：Skill 模板式精华提取

借鉴现有 Skill（canonical vault note Skill）的模板化方式，对超阈值文档走**精华提取 + 索引源文件**路径。

**触发阈值**（可配置）：`prepared.content` 文本 > **3 万字**（约 200KB UTF-8）。

**处理时机**：在 `ingest.propose()` 阶段（异步，不阻塞 approve），调 Provider 生成精华摘要。这是自然的切入点——propose 本来就是异步执行（用户提交后看到「赛诺正在异步查重并形成收录方案」），增加一次 LLM 总结不突兀。

**精华 Skill 模板**（Provider 按此格式输出）：

```markdown
# 《{标题}》精华摘要

> 来源：{sourceUrl 或 attachment 名} ｜ 总字数：{N} 万 ｜ 页数：{N}

## 核心论点（3–5 条）
- ...

## 章节骨架
- 第一章：...
- 第二章：...

## 关键术语与概念
- 术语 1：一句话定义
- 术语 2：一句话定义

## 可行动点（如有）
- ...

## 与个人目标的潜在关联
- 与 AI Agent Development 的 {Goal 名} 相关：...
```

**数据流变化**（在现有 `prepare()` 返回结构上扩展）：

| 字段 | 含义 | 变化 |
|---|---|---|
| `prepared.content` | 精华摘要 | 改为精华（之前是完整正文）|
| `prepared.fullText` | 完整原文 | **新增**，保留原始全文，供 RAG/搜索二次召回 |
| `prepared.attachment` | 原文件路径 | 保留（已有 pdf/docx 的 uploads 持久化）|
| `prepared.largeDocDigest` | true | **新增**标记，下游识别是否走精华路径 |
| `candidate.summary` | 精华前 280 字 | 不变（自然被精华填满）|

**对下游的影响**：
- ApprovalAdvisor.readArtifact：`body = prepared.content`（精华），审批卡片看到摘要而非全文 → 审批压力小。
- cognitive-runtime：写 vault note 时用 `prepared.content`（精华）为依据，结构更清晰。
- 未来 RAG：如果启用，可从 `prepared.fullText` 或附件做全文召回。

### 不在 Phase 1 实现的理由

- 需要设计并固化 Large Document Digest Skill 模板（与 vault-note Skill 对等的新 Skill）。
- intake.mjs 需新增 `this.provider` 依赖（propose 阶段调 LLM），改变当前 propose 的纯确定性设计。
- 需要新增 `prepared.fullText` 字段并确认对所有下游（ApprovalAdvisor / cognitive-runtime / today-service）无破坏。
- 需要单独的阈值配置、测试、回退路径。

范围比「加 docx/html」大一个量级，建议作为独立 V2 能力规划，避免本次改动失控。

---

## 总体路线图（分阶段）

| 阶段 | 内容 | 依赖 | 测试 |
|---|---|---|---|
| **Phase 1** | 方案一（审批即时反馈）+ 方案二（多格式收录 + title 修复 + 契约扩展） | 新增 mammoth | +15 例，254→269 |
| **Phase 2** | 方案三（大文件精华提取 + Skill 模板）| Phase 1 的 docx/html 基建 | 待定 |

Phase 1 是 Phase 2 的必要前置——没有 docx/html 的 intake 分支，大文件策略没有格式入口可挂。

---

## 验证

- `pnpm install --frozen-lockfile` —— lockfile 一致。
- `node --test apps/syno/tests/*.test.mjs tests/*.test.mjs` —— 254 → ~269（+15）。
- `node scripts/verify-repository.mjs` —— 通过（⚠️ verify **不**校验 lockfile/依赖新鲜度，漏 pnpm install 它抓不到，手动 gate）。
- 端到端手动：审批点「收录/丢弃」→ 按钮即变「管家正在处理…」+卡片置灰+不清屏，数十秒后完成移除；失败恢复按钮+alert。收录分别上传 .md/.docx/.html/.pdf/未知(.epub) → 前四者成功 approve 写入 vault 且卡片标题为真实文件名；未知前端即报「暂不支持」。

---

## 风险与约束

- **mammoth ESM/体积**：CJS，Node 22 `import mammoth from "mammoth"` default interop（区别于 pdf-parse 的 named import）；纯 JS 无原生编译。实测 `pnpm install` 后 verify 仍过；ESM 失败则 `createRequire` 兜底。
- **不可信内容隔离**：docx/html 与 url/pdf 同为 prompt-injection 向量，必须 `<untrusted-*>` 包裹 + canonical 前导；mammoth「不做 sanitise」的风险由 extractReadableText 剥离全部标签 + 固定实体白名单中和（属性/onerror 丢弃）。
- **不改后端执行语义**：方案一不把 approve 改异步（更大的 host/store/worker 改造），仅前端反馈；异步化列二期。
- **artifact enum 扩展是 BLOCKER**，不可遗漏。
- **并发刷新竞态**：decide 进行中用户点手动刷新会清屏（显式操作，可接受）；可选禁用 refresh 按钮——flag，不强制。
- **微信第二入口**：`weixin-message-handler.mjs` 只白名单 pdf/txt mime，是共享 kind 分类的第二个 intake 入口。本次**不**扩展微信附件支持 docx/html，标记为后续可选。
