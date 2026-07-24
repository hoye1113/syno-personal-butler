# Syno 对话上下文管理方案

> 日期：2026-07-23（v3，已纳入执行前审查的 15 项修订：7 阻断 + 5 可选 + 3 FYI，见 §14）
> 状态：v1 已实现并落地。**长期演进（M1 起的可观测性 / 存储治理 / handoff 正名 / 记忆保真等）见 [`CONTEXT-MANAGEMENT-ROADMAP.md`](./CONTEXT-MANAGEMENT-ROADMAP.md)。**
> 前置条件：当前分支 `codex/round3-remediation`，Host 端口 8888

## 1. 问题

`tool-loop-agent.mjs` 每次请求加载**全部** `conversation.messages` 发送给 Provider，无任何截断或压缩。
随着对话增长（尤其是工具调用返回大量结果），上下文最终超过 Provider 的 `contextLength` 配置（100 万 tokens），导致 `PROVIDER_CONTEXT_LIMIT` 错误，对话永久不可用。

**实测数据：** 一个 124 条消息的对话，JSON 8.5MB，约 267 万 tokens，是上限的 2.67 倍。

## 2. 范围

| Runtime | 是否覆盖 | 说明 |
|---|---|---|
| **NativeCognitiveRuntime** + `ToolLoopAgent` | ✅ 本方案 | Syno 默认 runtime，无自管上下文 |
| **HermesCognitiveRuntime**（sidecar） | ❌ 不覆盖 | 独立 Python 进程，自带 3500 行 `context_compressor`，自管上下文 |

本方案只管 Native runtime。判定：`runtime.cognitiveRuntime.name === "native-tool-loop"` 时启用 ContextManager。

## 3. 设计目标

| 目标 | 描述 |
|---|---|
| 对话可用性 | 对话永远不会因为 context 超限而永久卡死 |
| 信息保留 | 压缩时保留关键决策、错误、待办，不丢失"成果" |
| 可恢复性 | 原始消息归档不删除，可审计、可回溯 |
| 知识沉淀 | 压缩前将有价值内容通过**可审批 Job** 写入，过程可清理，成果不丢 |
| 分层递进 | 先轻后重，能用简单手段解决的不上复杂方案 |
| 长期可维护 | 独立模块，不侵入核心 Agent Loop 逻辑 |

## 4. 架构

### 4.1 核心模块

新建 `apps/syno/syno/context-manager.mjs` — 集中管理所有上下文相关逻辑。

```
┌─────────────────────────────────────────────────┐
│                 ContextManager                    │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────┐│
│  │TokenTracker │  │Compressor   │  │Archiver   ││
│  │真实token计数│  │分层压缩管线 │  │归档+持久化││
│  └─────────────┘  └─────────────┘  └───────────┘│
│  ┌─────────────┐  ┌─────────────┐  ┌───────────┐│
│  │ToolTruncator│  │HandoffGen   │  │Deduplicator││
│  │录入时截断   │  │前情提要生成 │  │工具结果去重││
│  └─────────────┘  └─────────────┘  └───────────┘│
└─────────────────────────────────────────────────┘
```

**构造签名（v3 修订 R2/O8）：**

```javascript
constructor({ provider, credentials, tools, conversationStore, options = {} })
//   provider:        Layer3 LLM 摘要用（调主模型）
//   credentials:     读取 contextLength（见下"config 来源"）
//   tools:           ToolRegistry——estimateTokens 必须与 ProviderClient 同参含 tools（R2）
//   conversationStore: Archiver 写 archive/log/summary 用
//   options.thresholds / tailMessages / singleToolLimit / handoffTokenCap / rotateMaxDepth ...
```

**估算一致性（v3 R2）：** ContextManager 的 `estimateForMessages(messages)` 内部调 `estimateTokens(messages, this.tools.list())`——**必须传 tools**，与 `ProviderClient`（`provider-client.mjs:43` 也是 `estimateTokens(messages, tools)`）完全同参。否则 ContextManager 系统性低估（少算 ~15 个工具 schema ≈ 1.5K tokens），自以为还在 85% 走摘要、实际加 tools 已 >97%，ProviderClient 兜底直接抛 PROVIDER_CONTEXT_LIMIT。

**config 来源（v3 修订 O8——取代 v2 的"每次重读 credentials"）：** ContextManager **不**自行重读 credentials。每次 `#run` 由 `ToolLoopAgent` 把本次 bound run 的 **frozen config**（`provider.bindRun()` 返回的冻结对象）透传给 `compress(messages, { runConfig })`。理由：`ProviderClient.bindRun()` 在 run 开始时冻结 config（防 model drift，`provider-client.mjs:29-35`），run 内所有 provider 调用用同一冻结值；ContextManager 若另行 `credentials.load()` 读"最新"值，mid-run 两者会分叉（用户 mid-run 调大 contextLength → ContextManager 低估压缩 → ProviderClient 按旧小预算抛错）。"用户改配置"由下一次 run 的 `bindRun()` 自然生效即可。TokenTracker 仍可用 API 返回的 `usage.prompt_tokens` 作校准（§6.1）。

### 4.2 压缩管线（每个 turn 发送前执行 — v3 Mid-turn）

```
turn 循环顶部（每次调 provider 前）──→ [TokenTracker] 获取/估算 token 数（含 tools）
            │
            ├── < 60%  → 不压缩，直接发送
            │
            ├── 60-75% → Layer1: 旧工具结果清理
            │             - 替换 ≥N 轮前的工具结果为信息性占位符
            │             - 占位符保留工具名+摘要（非哑占位符）
            │             - 持久化：原 tool 结果移入 archive，conversation.messages 换占位符
            │
            ├── 75-85% → Layer2: 历史轮次裁剪
            │             - 保留最近 tailMessages 条不动（基准 conversation.messages，不含 system）
            │             - 从最老的消息开始裁剪
            │             - 保证 tool_use/tool_result 配对完整（裁剪到配对边界）
            │             - 持久化：被裁消息原样移入 archive（带 archivedAt 批次）
            │
            ├── 85-95% → Layer3: LLM 结构化摘要
            │             - 用当前 Provider 生成 5 段结构化摘要
            │             - 支持迭代更新（已有摘要时增量更新）
            │             - 保留错误记录（不擦除失败尝试）
            │             - LLM 不可用时确定性降级（规则提取）
            │             - 持久化：摘要物化为一条 message 插入活跃上下文（R4，见下）
            │
            └── > 95%  → Layer4: 返回 rotate 信号（不在 Agent 内创建新对话）
                         - HandoffGen 生成前情提要（受 handoffTokenCap 上限，R7）
                         - Agent 捕获信号，终止本次 run
                         - 编排层（ToolLoopExecutor→rotateConversation）创建新对话 + 更新路由（R1/R6）
```

**Mid-turn（v3）：** 压缩检查在 `for (turn = 1; turn <= maxTurns)` 循环**每个 turn 顶部**执行。`maxTurns=8`，单轮内每个工具结果可达 50K chars，只在循环前压一次会让 turn 3-8 累积爆限。

**Layer3 摘要物化（v3 R4——v2 缺失会导致压缩后失忆）：** 摘要不能只存进 `summaries[]` 日志。Layer3 必须把摘要物化为一条 `{ role: "system", content: "[前情摘要]\\n\\n<5段摘要>" }`，插在 system prompt 之后、tail 之前，并写回 `conversation.messages`。否则被压缩的中段历史从活跃上下文彻底消失（archive 不发送），违背 §3"信息保留"。

### 4.3 工具结果截断（录入时执行）

在 `tool-loop-agent.mjs` 的工具结果录入处，立即对大结果做 truncate-middle：

```
原始结果（10000字符）
  ↓
[前40%] ...N chars truncated... [后40%]
  ↓
截断后（~4000字符 + 标记）
```

借鉴 Codex 50/50 split：保留头尾各一半，砍中间（文件读取头部给 imports、尾部给最新代码；命令输出头部是命令、尾部是结果）。

**单位（v3）：** 上限用 tokens（`singleToolLimit: 15000 tokens`），实现时按 `tokens × 3.2` 转 chars 做截断。

### 4.4 存储层变更

`conversation.json` 结构扩展：

```json
{
  "id": "conversation-xxx",
  "channel": "weixin",
  "ownerId": "local-user",
  "status": "active",
  "messages": [...],
  "archive": [],
  "summaries": [],
  "compactionLog": [],
  "handoffContext": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

| 字段 | 类型 | 描述 |
|---|---|---|
| `messages` | Array | 当前活跃消息（参与上下文构建，含物化的摘要 message） |
| `archive` | Array | 软归档的旧消息（不参与上下文构建，可审计）；**每条带 `archivedAt`**（v3 R5/R9） |
| `summaries` | Array | 历次压缩摘要（日志/迭代用；活跃副本已物化进 messages） |
| `compactionLog` | Array | 压缩记录（原因、前后 token 数、时间） |
| `handoffContext` | string \| null | 跨对话前情提要（新对话继承） |

**现有文件迁移（v3 R3——v2 缺失，老对话压缩即 TypeError）：** 磁盘上的老 conversation（含 835badd2）没有新字段。`ConversationStore.get()` 必须归一化：返回前补 `archive ??= []`、`summaries ??= []`、`compactionLog ??= []`、`handoffContext ??= null`。这样 `archiveMessages` 跑 `conversation.archive.push(...)` 不会崩。（rotate 路径只设 status，不触发该问题；压缩路径必经归一化。）

## 5. 权威分工

| 层 | 角色 | 阈值 |
|---|---|---|
| **ContextManager** | 主管理者 | 60/75/85/95% 分层触发（用 frozen runConfig 的 contextLength） |
| **ProviderClient** | 最后兜底（防 ContextManager 失效） | `contextLength - 1_024` → 上调为 `contextLength × 0.97` |

`provider-client.mjs` 改动：
```javascript
// line 44 原:
if (estimatedTokens > config.contextLength - 1_024) {
// 改为:
if (estimatedTokens > Math.floor(config.contextLength * 0.97)) {
```

**测试（v3 O10——v2 误判）：** `tests/provider-agent.test.mjs:99-100` 的 `estimateTokens(20000 chars)=6506 > 4096` 断言**不需要改**（6506 同时超 3072 和 3973，照过）。改为**新增** 0.97 边界用例：`contextLength=10000`，构造 estimate∈(9700,10000) 应抛 PROVIDER_CONTEXT_LIMIT、<9700 不抛。

## 6. 实现计划

### Phase 1：基础设施（3 个文件）—— 本阶段不接进 agent，系统行为不变

#### 6.1 `context-manager.mjs`（新建）

核心类 `ContextManager`，职责：

```
constructor({ provider, credentials, tools, conversationStore, options })
  - tools: ToolRegistry（estimateTokens 同参含 tools，R2）
  - tailMessages: 10
  - thresholds: { light: 0.60, moderate: 0.75, heavy: 0.85, overflow: 0.95 }
  - singleToolLimit: 15000（tokens，×3.2 转 chars）
  - handoffTokenCap: 50000（v3 R7，HandoffGen 上限）
  - rotateMaxDepth: 2（v3 R7，编排层 rotate 重跑上限，见 §6.6）
```

**TokenTracker（v3 F13）：**
- `trackUsage(responseUsage, conversationId)` — 按 conversationId 存真实 prompt_tokens（避免跨对话 last-write-wins 串台）
- `estimateForMessages(messages)` — **复用** `estimateTokens(messages, this.tools.list())`（R2，含 tools）
- `getTokens(messages, { runConfig, conversationId })` — 返回该对话上次 API 真实 token（若有），否则 estimateForMessages。**阈值判断以 estimateForMessages 为准**（确定性、每轮重算），tracked usage 仅作校准。

**ToolTruncator：**
- `truncateToolResult(content, toolName)` — 录入时截断
- 策略：truncate-middle，头尾各 50%；上限 15000 tokens（≈48000 chars）
- 返回截断后内容 + 截断标记

**Deduplicator：**
- `deduplicate(messages)` — 按内容 hash 去重工具结果
- 相同 hash 只保留最新一条，旧的替换为 `[duplicate of earlier result]`
- 基于 SHA-256 前 16 位

**Compressor（4 层管线）：**
- `compress(messages, { conversationId, runConfig })` — 主入口
  - `messages` = `[system, ...conversation.messages]`（含 system）
  - `runConfig` = 本次 bound run 的冻结 config（O8），从中取 `contextLength`
  - 用 `estimateForMessages` 判断分层（含 tools）
- 返回 `{ messages, action, stats, rotate?, handoff?, archivable?, summary? }`
  - action: "none" | "layer1" | "layer2" | "layer3" | "rotate"
  - `messages`：压缩后的完整活跃消息（含 system + 物化摘要）
  - `archivable`：被移除的原消息数组（供 Archiver 带 archivedAt 入 archive）
  - `summary`：Layer3 生成的摘要文本（供 Archiver 物化进 messages + 追加 summaries[]）
  - rotate 时附带 `handoff`，**不在此创建新对话**

**Archiver（v3 R5——applyCompaction 归此，持久化语义钉死）：**
- `applyCompaction(conversation, compressed)` — 写回存储，契约如下：
  1. `compressed.archivable`（被裁/被替换的原消息）逐条加 `{ archivedAt: now, reason: action }` 后 `conversation.archive.push(...)`
  2. 从 `compressed.messages` 去掉头部 system，**替换** `conversation.messages`（含 Layer1 占位符版本）
  3. 若 `compressed.summary`：把它物化为 `{ role:"system", content:"[前情摘要]\n\n"+summary }` 插入 `conversation.messages` 头部（system 之后），并 `conversation.summaries.push({ at: now, summary, version })`
  4. `conversation.compactionLog.push({ at: now, action, beforeTokens, afterTokens })`
  5. **不自行 save**——由 `#run` 既有 save 调用持久化（applyCompaction 仅突变内存对象）
- `archiveMessages(conversation, messagesToArchive)` / `getArchived(conversation)`

**HandoffGen（v3 R4/R7——确定性降级为主路径 + 大小上限）：**
- `generateHandoff(conversation, { runConfig })` — 提取前情提要
- **超大对话（如 8.5MB）必须用规则提取，不调 LLM**：
  - 提取 user 消息（去掉 assistant/tool，体积大减）
  - 提取 assistant 最后 3 条 content
  - 规则拼装：用户意图、关键决策、当前状态、待办、关键标识符
- **大小上限（R7）：** 规则拼装后若 > `handoffTokenCap`（默认 50000 tokens），只保留最近 N 条 user（倒序截断到 cap 内）+ 末尾 1 条 assistant，确保 handoff 自身不会让新对话 turn1 顶部又触发 Layer4。
- 仅当 trim 后的消息能塞进 LLM 且有余量时才用 LLM 润色（非必需）

**FlushToKnowledge（v3 R6/O11——正则预筛 + LLM 判定 + 走 Job 审批 + 时序节流）：**
- 触发：`compress()` 在 rotate（Layer4）与 layer2/layer3 确定后，经 `#fireExtraction` **fire-and-forget** 异步发起（不阻塞压缩主路径；Layer1 仅清工具结果、无内容离开活跃上下文，不触发）
- 管道：`extractValuable(messages)`（正则预筛中文决策词，快）→ per-对话 content-hash 去重 + `extractMaxPerConversation` 节流 → `#judgeValuable`（LLM 判定 keep/reject；Provider 不可用或解析失败返回空）→ `onExtractValuable` 回调
- 输出：`[{ type: "decision", content, source: "user" }]`（正则预筛当前仅标注 decision）
- **不直接写 vault**——上层 `onExtractValuable` 据此创建 ingest proposal（`ingestService.receive` + `propose`，`kind: "text"`），遵守"知识写入必须创建可审批 Job"
- 时序：整条管道 fire-and-forget、失败被吞，绝不污染压缩结果；同对话按 content hash 去重，避免刷屏审批队列

#### 6.2 `provider-client.mjs`（修改）

变更点：
1. 阈值 `contextLength - 1_024` → `contextLength × 0.97`（§5）
2. `completeWithConfig` 返回值已含 `usage`（line 75 无需改）
3. `estimateTokens` 保持导出供 ContextManager 复用

#### 6.3 `conversation-store.mjs`（修改）

变更点：
1. **`get()` 归一化新字段（R3）：** 返回前补 `archive/summaries/compactionLog/handoffContext` 默认值
2. `create()` 初始化新字段：`archive: [], summaries: [], compactionLog: [], handoffContext: null`
3. 新增 `archiveMessages(id, messagesToArchive)` — 移动消息到 archive（带 archivedAt）
4. 新增 `addSummary(id, summary)` — 追加压缩摘要
5. 新增 `addCompactionLog(id, log)` — 追加压缩记录
6. 新增 `setHandoffContext(id, context)` — 设置前情提要
7. **`prune()` 扩展（v3 O9）：** 归档消息按 `archivedAt` 清理超过 `archivedDays`（默认 30）的条目；`status:"archived"` 的整文件增加独立保留期（默认 90 天）——现有 prune 只处理 completed/failed，archived 直接 continue 永久保留，需补

### Phase 2：Agent Loop 集成（1 个文件）

#### 6.4 `tool-loop-agent.mjs`（修改）

**构造函数扩展（contextManager 可选，向后兼容）：**
```javascript
constructor({ provider, tools, conversations, maxTurns = 8, systemPrompt, contextManager }) {
  // ...
  this.contextManager = contextManager || null;  // 不传则不压缩（向后兼容）
}
```

**#run() 改动 — 压缩移入 turn 循环（Mid-turn）+ applyCompaction 契约：**

```javascript
async #run(request, { conversationId, channel, ownerId, signal }) {
  let conversation = conversationId ? await this.conversations.get(conversationId) : null;
  if (!conversation) conversation = await this.conversations.create({ id: conversationId || undefined, channel, ownerId });
  conversation.status = "active";
  delete conversation.error;
  conversation.messages = repairDanglingToolCalls(conversation.messages);
  const userMessage = { role: "user", content: String(request?.text || request?.message || "") };
  conversation.messages.push(userMessage);
  await this.conversations.save(conversation);

  const provider = typeof this.provider.bindRun === "function" ? await this.provider.bindRun() : this.provider;
  const runConfig = provider.modelId ? { contextLength: /* 见下 */ } : null;  // 见注①

  try {
    for (let turn = 1; turn <= this.maxTurns; turn += 1) {
      if (signal?.aborted) throw Object.assign(new Error("Agent 已取消"), { code: "AGENT_CANCELED" });

      // === Mid-turn 压缩：每 turn 顶部 ===
      let messages = [{ role: "system", content: this.systemPrompt }, ...conversation.messages];
      if (this.contextManager) {
        const compressed = await this.contextManager.compress(messages, { conversationId, runConfig });
        if (compressed.action === "rotate") {
          // R1：返回 rotate 信号，不在 Agent 内创建新对话
          return {
            rotate: true,
            handoff: compressed.handoff,
            fromConversationId: conversationId,
            pendingRequest: request,
            channel, ownerId,
          };
        }
        if (compressed.action !== "none") {
          messages = compressed.messages;
          this.contextManager.applyCompaction(conversation, compressed);  // R5：突变内存对象，不 save
        }
      }

      const completion = await provider.complete(messages, this.tools.list(), { signal });

      // trackUsage（F13：按 conversationId 存）
      if (this.contextManager && completion.usage) {
        this.contextManager.trackUsage(completion.usage, conversationId);
      }

      const assistant = completion.message;
      messages.push(assistant);
      conversation.messages.push(assistant);
      const calls = assistant.tool_calls || [];
      if (!calls.length) {
        conversation.status = "completed";
        conversation.model = completion.model;
        await this.conversations.save(conversation);  // applyCompaction 的突变在此持久化
        return { text: String(assistant.content || ""), conversationId: conversation.id, turns: turn, usage: completion.usage, model: completion.model };
      }

      // 工具结果录入截断
      for (const call of calls) {
        const name = call?.function?.name;
        let result;
        try { result = await this.tools.execute(name, parseArguments(call), { /* 现有 context */ }); }
        catch (error) { /* 现有错误处理 */ result = { ok:false, error:{...} }; }
        if (this.contextManager) {
          result = this.contextManager.truncateToolResultIfNeeded(result, name);
        }
        const toolMessage = { role: "tool", tool_call_id: call.id, content: JSON.stringify(result) };
        messages.push(toolMessage);
        conversation.messages.push(toolMessage);
      }
      await this.conversations.save(conversation);  // applyCompaction 的突变在此持久化
    }
    const error = new Error(`Agent 超过最大 ${this.maxTurns} 轮`); error.code = "AGENT_TURN_LIMIT"; throw error;
  } catch (error) {
    conversation.status = "failed";
    conversation.error = { code: error.code || "AGENT_FAILED", message: error.message };
    await this.conversations.save(conversation);
    throw error;
  }
}
```

> **注① runConfig 来源（O8）：** bound run 对象当前只暴露 `{ modelId, complete }`，不含 contextLength。需让 `ProviderClient.bindRun()` 在返回的冻结对象上**增暴露 `contextLength`**（从冻结 config 透出，不破坏 model-drift 防护），`#run` 据此构造 `runConfig = { contextLength: provider.contextLength }`。这样 ContextManager 与本次 run 用同一个冻结 contextLength，mid-run 不分叉。

**调用方处理 rotate 信号：** `ToolLoopExecutor.submit()` 捕获 `{ rotate: true }` 并转交编排（见 §6.6）。

### Phase 3：路由轮转与编排接线（3 个文件 — v3 R1/R6）

#### 6.5 `conversation-router.mjs`（修改 — v3 R1/R6）

新增两个方法：

**`rotate({ ownerKey, threadKey, newConversationId })`：** 校验 newConversationId 格式后，更新 `state.routes[key]`，记录 `{ conversationId: newConversationId, rotatedFrom: oldId, updatedAt }`。

**`retire(conversationId)` + resolve 跳过 retired（R6 原子退役）：** 新增 `state.retiredIds`（Set 持久化为数组）。`rotate` 时把 `oldId` 加入 `retiredIds`。`resolve()` 若解析到的 conversationId ∈ retiredIds，视为未解析→触发新建（返回新 id）。这样并发消息 B 在窗口内即便 resolve 到旧 X，X 已 retired → B 不会被路由到 267 万 tokens 的旧对话复活。彻底消除"复活"竞态。

```javascript
async rotate({ ownerKey, threadKey = "default", newConversationId }) {
  // 校验 newConversationId → state.routes[key] = { conversationId: newConversationId, rotatedFrom: oldId, updatedAt }
  // state.retiredIds = [...new Set([...(state.retiredIds||[]), oldId])]
}
async retire(conversationId) { /* 单独把 id 加入 retiredIds */ }
// resolve() 内：if (state.retiredIds?.includes(existing)) 视为不存在 → 走新建分支
```

#### 6.6 编排接线（`tool-loop-executor.mjs` + `runtime.mjs` — v3 R1）

**核心修订（R1）：** rotate 的"归档旧 + 创建新 + 更新路由 + 重放请求"放在**编排层**，不在 ToolLoopAgent（保持 Agent 单一职责），也不依赖 host（host 无 rotate 概念，会把 rotate 当普通完成吞掉）。

**`ToolLoopExecutor` 扩展（注入依赖 + 捕获重跑 + 深度计数）：**

```javascript
class ToolLoopExecutor {
  constructor({ runtime, conversations, conversationRouter, rotateMaxDepth = 2 } = {}) {
    if (!runtime) throw new Error("ToolLoopExecutor 缺少 CognitiveRuntime");
    this.runtime = runtime;
    this.conversations = conversations;             // R1：rotateConversation 需要
    this.conversationRouter = conversationRouter;   // R1：rotateConversation 需要
    this.rotateMaxDepth = rotateMaxDepth;           // R7：防 rotate→重跑→再 rotate 死循环
  }

  async submit(job, options = {}) {
    const baseCtx = {
      conversationId: job.conversationId || job.request?.conversationId,
      channel: job.channel, ownerId: job.senderId,
      workspace: options.workspace, onStart: options.onStart, onEvent: options.onEvent,
    };
    let result = await this.runtime.run(job.request, baseCtx);
    let depth = 0;
    // 捕获 rotate 信号 → 轮转 → 用新 conversationId 重跑
    while (result?.rotate && depth < this.rotateMaxDepth) {
      depth += 1;
      const newId = await rotateConversation({
        conversations: this.conversations,
        conversationRouter: this.conversationRouter,
        ownerKey: "local-user", threadKey: "default",
        oldConversationId: result.fromConversationId,
        handoff: result.handoff,
        channel: result.channel, ownerId: result.ownerId,
      });
      result = await this.runtime.run(result.pendingRequest || job.request, { ...baseCtx, conversationId: newId });
    }
    if (result?.rotate) {
      // 超过深度上限：降级确定性兜底，不抛错（保证用户能收到回复）
      return { runId: result.runId, executor: this.runtime.name, text: "（对话已过长，已开启新对话并延续前情。请重新发送您的请求。）", rotateCapped: true };
    }
    return result;
  }
  inspect(runId) { return this.runtime.inspect(runId); }
  cancel(runId) { return this.runtime.cancel(runId); }
}
```

**`rotateConversation`（tool-loop-executor.mjs 导出，v3 R6 原子退役顺序）：**

```javascript
async function rotateConversation({ conversations, conversationRouter, ownerKey, threadKey, oldConversationId, handoff, channel, ownerId }) {
  // 1. 先切路由（R6：缩小并发窗口）+ 退役旧 id（resolve 跳过 retired，彻底防复活）
  const fresh = await conversations.create({ channel, ownerId });  // 新 id
  await conversationRouter.rotate({ ownerKey, threadKey, newConversationId: fresh.id });  // 内部 retire(oldId)

  // 2. 归档旧对话（路由已切，此时并发消息也不会落到旧对话）
  const old = await conversations.get(oldConversationId);
  if (old) { old.status = "archived"; old.rotatedTo = fresh.id; await conversations.save(old); }

  // 3. 新对话注入前情提要（作为首条 user 消息，§7.6）
  fresh.handoffContext = handoff;
  if (handoff) fresh.messages.push({ role: "user", content: handoff });
  await conversations.save(fresh);

  return fresh.id;
}
```

**`runtime.mjs` 接线：**
- `createSynoRuntime` 新建 `contextManager = new ContextManager({ provider, credentials, tools, conversationStore: conversations })`
- `agent = new ToolLoopAgent({ provider, tools, conversations, contextManager })`（仅 native runtime 注入）
- `baseExecutor = new ToolLoopExecutor({ runtime: cognitiveRuntime, conversations, conversationRouter })`（R1 注入）
- `rotateConversation` 由 `tool-loop-executor.mjs` 导出供测试/复用；runtime 仅注入 contextManager/executor 依赖

`runtime.run`（NativeCognitiveRuntime.run）对 rotate 返回值会 `...result` 展开（`cognitive-runtime.mjs:85`），透传 `rotate:true/handoff/fromConversationId/pendingRequest` 到 ToolLoopExecutor——无需改 cognitive-runtime（但 inspect 会显示 completed+rotate，FYI F15，后续可优化为独立 run 状态）。

### Phase 4：FlushToKnowledge 集成（v3 O11）

在 `compress()` 确定 action 后（rotate / layer2 / layer3；Layer1 不触发）：
1. `#fireExtraction` **fire-and-forget** 异步发起提取（不阻塞压缩主路径）
2. 管道：`extractValuable`（正则预筛）→ per-对话 hash 去重 + 节流 → `#judgeValuable`（LLM 判定 keep/reject）→ `onExtractValuable` 回调
3. 编排层（runtime）对每条经 LLM 判定保留的内容 fire-and-forget 调 `ingestService.receive({ kind: "text", value, title })` + `propose()`
4. 同对话按 content hash 去重（`extractMaxPerConversation` 节流），避免刷屏审批队列
5. 走正常收录审批流程，不直接写 vault；整条管道失败被吞，绝不污染压缩结果

### Phase 5：测试（1 个新建 + 1 个微调）

#### 6.7 `tests/context-manager.test.mjs`（新建）

| 测试用例 | 覆盖 |
|---|---|
| TokenTracker estimate **含 tools**（R2） | 不传 tools 时低估、传 tools 时与 ProviderClient 一致 |
| TokenTracker 按 conversationId 存 usage（F13） | 两对话不串台 |
| ToolTruncator truncate-middle | 大结果截断保留头尾 |
| ToolTruncator 小结果不截断 | 小于上限原样保留 |
| Deduplicator 去重相同工具结果 | 相同 hash 只保留最新 |
| Layer1 旧工具结果清理 | ≥N 轮前 tool 结果换占位符，原结果进 archive |
| Layer2 历史裁剪 | 最老消息移除，tail 保留，配对完整 |
| Layer2 tool_use/tool_result 配对 | 裁剪后无孤儿消息 |
| **Layer3 摘要物化为 message（R4）** | 压缩后 conversation.messages 头部含 `[前情摘要]` system message |
| Layer3 摘要迭代更新 | 第二次压缩增量更新 summaries |
| Layer3 LLM 不可用时确定性降级 | 规则提取保底摘要 |
| **applyCompaction 持久化契约（R5）** | archivable 带 archivedAt 入 archive；conversation.messages 换压缩版；compactionLog 记录 |
| **Layer4 返回 rotate 信号（不创建对话）** | compress 返回 rotate:true + handoff |
| **HandoffGen 超大对话用规则提取（R4）** | 8.5MB 对话不调 LLM |
| **HandoffGen 大小上限（R7）** | handoff > handoffTokenCap 时只取最近 N 条 user，截断到 cap 内 |
| **编排层 rotateConversation 更新路由（R1）** | 新对话创建 + 路由指向新 id + 旧对话 status=archived |
| **rotate 重跑 + 深度上限（R7）** | submit 捕获 rotate→重跑；超过 rotateMaxDepth 降级兜底不抛错 |
| **router retire 防复活（R6）** | rotate 后 resolve(旧 id) 触发新建，不返回旧 id |
| **get() 归一化老对话（R3）** | 无新字段的老 conversation 加载后 archive 等字段就绪 |
| 压缩前后 token 数对比 | 每层压缩有效减少 token |
| 防抖：连续无效压缩暂停 | 2 次无效后暂停自动压缩（仅 L1-L3，不阻断 rotate） |
| 向后兼容：无 contextManager | 不传 contextManager 时行为不变 |
| Mid-turn 压缩 | turn 循环内累积触发压缩 |
| 归档消息不参与上下文 | archive 中的消息不在 messages 中 |
| FlushToKnowledge 走 ingest proposal（fire-and-forget + 去重） | 输出供 ingestService.receive，不直接写 vault；同内容不重复提案 |
| **ProviderClient 0.97 边界（O10）** | contextLength=10000，estimate∈(9700,10000) 抛、<9700 不抛 |

#### 6.8 `tests/provider-agent.test.mjs`（微调）

- **不动 line 99-100**（O10）
- 新增 0.97 边界用例（同上）
- 新增 ToolLoopAgent rotate 信号用例（注入 fake contextManager 返回 rotate:true，断言 #run 返回 `{rotate:true, handoff, fromConversationId}` 而非创建对话）

## 7. 关键设计决策

### 7.1 ProviderClient 与 ContextManager 用同一估算 + 同一 frozen config
两者都 import `estimateTokens` 且**都传 tools**（R2）；ContextManager 用本次 run 透传的 frozen `runConfig.contextLength`，ProviderClient 用 `bindRun()` 冻结的同一 config（O8）——mid-run 不分叉。

### 7.2 为什么 rotate 信号而非 Agent 内创建对话
conversationRouter 在编排层解析，不在 ToolLoopAgent 作用域。Agent 内创建新对话会导致路由错乱（用户下条消息仍路由到旧对话）。返回 rotate 信号让 ToolLoopExecutor 统一处理"归档旧 + 创建新 + 更新路由 + 重放请求"。

### 7.3 为什么 Mid-turn 压缩
`maxTurns=8`，单轮内每个工具结果可能 50K chars。只在循环前压一次，turn 3-8 累积的 tool 结果会让 turn 8 的 provider 调用超限。

### 7.4 为什么超大对话用规则提取而非 LLM 摘要
触发 Layer4 的对话本身超限（如 267 万 tokens），HandoffGen 若调 LLM 摘要请求塞不进去。规则提取（取 user 消息 + 末尾 assistant）不需要 LLM，保证兜底可用（对应 Hermes `_build_static_fallback_summary`，作主路径）。

### 7.5 为什么 handoff 有大小上限 + rotate 有深度计数（v3 R7）
handoff 若 > 新对话预算的 60%，新对话 turn1 顶部会再次触发 Layer4 → 再 rotate → 死循环。`handoffTokenCap`（默认 50000）强制截断，`rotateMaxDepth`（默认 2）兜底：超过则降级确定性回复，保证用户总能收到答复。

### 7.6 为什么 router retire 而非仅 rotate（v3 R6）
rotate 返回到编排层之间有并发窗口。仅更新路由，窗口内到达的消息可能 resolve 到旧 id、被 `#run` 的 `status="active"` 复活、加载 267 万 tokens 失败。`retiredIds` + `resolve()` 跳过 retired，让旧 id 在路由层即不可达，彻底防复活。

### 7.7 system prompt 不在 conversation.messages
`tool-loop-agent.mjs:75` 把 system prompt 临时拼到 messages 头部，不持久化。`conversation.messages[0]` 是第一条 user 消息。Layer2"保留最近 tailMessages 条"索引基准是 conversation.messages，**不含 system**——实现时不要把 system 算进 tail。

### 7.8 压缩/新对话的用户可见反馈
rotateConversation 把 handoff 作为新对话首条 **system 消息**（`_syno.kind:"handoff"`，含"已延续前情，开启新对话"提示），避免模型误当请求回应、也防 extractValuable 把前情当真实用户陈述再提取（自污染）。rotate 超深度降级时返回明确兜底文案。无需额外 UI 改动。

### 7.9 为什么保留 archive 而非删除
Manus 原则："所有压缩都应该是可恢复的"。归档消息不参与上下文构建（不占 token），保留在磁盘可审计，超期由 `prune()` 按 archivedAt 清理。

### 7.10 为什么不用独立摘要模型
Hermes 用辅助模型做摘要省主模型 token。Syno 单 Provider 架构，引入第二个模型增加凭据管理复杂度。当前 Provider（deepseek）token 成本低，直接用主模型做摘要。

## 8. 配置参数

| 参数 | 默认值 | 描述 |
|---|---|---|
| `contextLength` | 1,000,000 | 从本次 run 的 frozen config 读取（O8） |
| `singleToolLimit` | 15,000 **tokens** | 单条工具结果上限（×3.2 转 chars） |
| `tailMessages` | 10 | 保留最近 N 条不动（基准 conversation.messages） |
| `thresholds.light` | 0.60 | Layer1 触发 |
| `thresholds.moderate` | 0.75 | Layer2 触发 |
| `thresholds.heavy` | 0.85 | Layer3 触发 |
| `thresholds.overflow` | 0.95 | Layer4 rotate 信号 |
| `providerFallbackRatio` | 0.97 | ProviderClient 兜底阈值 |
| `handoffTokenCap` | 50,000 **tokens**（v3 R7） | HandoffGen 上限，超则截断 |
| `rotateMaxDepth` | 2（v3 R7） | 编排层 rotate 重跑上限 |
| `maxCompactionRetries` | 3 | LLM 摘要最大重试 |
| `antiThrashThreshold` | 2 | 连续无效压缩次数（**仅约束 L1-L3**，O12） |
| `cooldownMs` | 60_000 | 压缩暂停冷却（仅 L1-L3） |
| `archivedDays` | 30（v3 O9） | archive 单条消息保留期（按 archivedAt） |
| `archivedConvDays` | 90（v3 O9） | status=archived 整文件保留期 |

**anti-thrash 与 rotate（v3 O12）：** anti-thrash 只约束 L1-L3 的"无效压缩"。rotate（L4）始终可达——pause 期间若仍 >95%，直接走 rotate 而非撞 ProviderClient 97% 兜底。

## 9. 文件变更清单（v3 修订量）

| 文件 | 操作 | 改动量 |
|---|---|---|
| `apps/syno/syno/context-manager.mjs` | 新建 | ~480行 |
| `apps/syno/syno/tool-loop-agent.mjs` | 修改 | ~90行 |
| `apps/syno/syno/conversation-store.mjs` | 修改 | ~70行（含 get 归一化、archive 保留） |
| `apps/syno/syno/provider-client.mjs` | 微调 | ~8行（阈值 + bindRun 透出 contextLength） |
| `apps/syno/syno/conversation-router.mjs` | 修改 | ~35行（rotate + retire + resolve 跳过 retired） |
| `apps/syno/syno/runtime.mjs` | 修改 | ~40行（注入 contextManager/executor 依赖；rotateConversation 在 tool-loop-executor.mjs） |
| `apps/syno/syno/tool-loop-executor.mjs` | 修改 | ~45行（R1：注入依赖 + 捕获重跑 + 深度计数，v2 误估 15 行） |
| `tests/context-manager.test.mjs` | 新建 | ~400行 |
| `tests/provider-agent.test.mjs` | 微调 | ~25行（新增 0.97 边界 + rotate 信号用例，不动 line 99） |

总计：~1190 行新增/修改。

## 10. 执行顺序

```
Phase 1: context-manager.mjs + conversation-store.mjs(get归一化/create新字段/archive保留) + provider-client.mjs(阈值+bindRun透出)
         ↓ （本阶段不接进 agent，系统行为不变，可独立测试）
Phase 2: tool-loop-agent.mjs 集成（Mid-turn + 录入截断 + trackUsage + applyCompaction 契约 + rotate 信号）
         ↓ （contextManager 已注入但 router/executor 还没接线，rotate 信号会冒泡到 host 被当普通完成——故 Phase 2/3 必须一起上）
Phase 3: conversation-router.mjs(rotate+retire) + tool-loop-executor.mjs(接线) + runtime.mjs(rotateConversation+注入)
         ↓
Phase 4: FlushToKnowledge 走 ingest proposal（同步提取 + 异步提案 + 去重）
         ↓
Phase 5: 测试（context-manager.test.mjs + provider-agent 0.97/rotate 用例）
         ↓
验证: 清理 conversation-835badd2，重启 Host，微信对话验证 rotate + 前情提要 + 并发不复活
```

> **注意：** Phase 2 与 Phase 3 必须一起上线——Phase 2 单独上会让 rotate 信号冒泡到 host 被当普通完成吞掉（用户收到空答）。要么 2+3 同 PR，要么 Phase 2 先不注入 contextManager（保持向后兼容）直到 Phase 3 就绪。

## 11. 风险与缓解

| 风险 | 缓解 |
|---|---|
| LLM 摘要本身超限 | 摘要请求用精简 messages（只传待压缩部分） |
| HandoffGen 对超大对话失败 | **规则提取为主路径 + handoffTokenCap 上限**，不调 LLM（§7.4/7.5） |
| **rotate 死循环（R7）** | handoffTokenCap 截断 + rotateMaxDepth 兜底降级（§7.5） |
| **rotate 并发复活旧对话（R6）** | router retire + resolve 跳过 retired（§7.6） |
| **rotate 信号被 host 吞掉（R1）** | ToolLoopExecutor 注入依赖 + submit 内捕获重跑（§6.6） |
| 压缩后对话断裂感 | tail 10 条 + 物化摘要 + 前情提要 + 模型自然带出反馈（§7.8） |
| 并发写入冲突 | `conversationStore.runExclusive()` 文件锁；rotate 在编排层串行 |
| 路由更新失败 | rotateConversation 先切路由再归档（归档可恢复） |
| Mid-turn 累积爆 | 每 turn 顶部重检压缩（§7.3） |
| 向后兼容 | contextManager 可选，不传时行为与当前完全一致 |
| **老对话缺新字段崩溃（R3）** | get() 归一化（§4.4） |
| **估算缺 tools 致仍超限（R2）** | ContextManager 传 tools 与 ProviderClient 同参（§4.1） |
| 用户改 contextLength | 下次 run 的 bindRun 自然生效（O8） |

## 12. 成功标准

1. `conversation-835badd2`（267 万 tokens）的用户发新消息时，不再报 `PROVIDER_CONTEXT_LIMIT`，而是返回 rotate 信号 → ToolLoopExecutor 捕获 → rotateConversation 创建新对话（含前情提要）+ 路由切换 + 旧对话归档
2. 并发消息在 rotate 窗口内不会被路由到旧对话（retire 生效）
3. 新对话在增长到阈值时，**每个 turn** 自动执行分层压缩（Mid-turn）
4. Layer3 压缩后，摘要物化为活跃 message，模型不"失忆"
5. 压缩后模型回答质量不显著下降（保留关键决策和错误记录）
6. 所有压缩操作记录在 `compactionLog`，被移除消息带 archivedAt 入 archive，可审计可恢复
7. FlushToKnowledge 输出走 ingest proposal（可审批 Job + 去重），不直接写 vault
8. rotate 超深度时降级兜底，用户总能收到回复
9. 现有测试（+ 0.97 边界/rotate 用例）+ 新测试全部通过

## 13. 修订历史

### v2（2026-07-23，12 项）

| # | 级别 | 修订内容 |
|---|---|---|
| 1 | 🔴 | rotate 信号替代 Agent 内创建对话，编排层管路由（§6.5/6.6/7.2） |
| 2 | 🔴 | Mid-turn 压缩，turn 循环顶部重检（§4.2/6.4/7.3） |
| 3 | 🔴 | ProviderClient 阈值上调 0.97，ContextManager 为主（§5/7.1） |
| 4 | 🔴 | HandoffGen 超大对话用规则提取（§6.1/7.4） |
| 5 | 🟡 | contextLength 读 credentials（v3 改为 frozen runConfig，见 O8） |
| 6 | 🟡 | FlushToKnowledge 走 ingest proposal（§6.1/Phase 4） |
| 7 | 🟡 | 单位统一为 tokens（§4.3/8） |
| 8 | 🟡 | 明确范围：只管 Native runtime（§2） |
| 9 | 🟡 | 复用 provider-client 的 estimateTokens（§4.1/7.1） |
| 10 | 🟢 | trackUsage 时机明确（§6.4） |
| 11 | 🟢 | system prompt 不在 messages 的注记（§7.7） |
| 12 | 🟢 | 压缩/新对话用户可见反馈（§7.8） |

### v3（2026-07-23，执行前审查 15 项，见 §14）

## 14. v3 审查修订映射（15 项）

| # | 级别 | 问题 | v3 落点 |
|---|---|---|---|
| R1 | 🔴阻断 | rotate 信号到不了能创建新对话的层（ToolLoopExecutor 无依赖、host 吞信号） | §6.6 ToolLoopExecutor 注入 conversations+conversationRouter，submit 内捕获重跑；§9 改动量 15→45 行 |
| R2 | 🔴阻断 | ContextManager 估算缺 tools，与 ProviderClient 不一致，仍可能超限 | §4.1 构造加 tools，estimateForMessages 传 tools；§6.7 测试 |
| R3 | 🔴阻断 | 现有 conversation 缺新字段，压缩即 TypeError | §4.4 get() 归一化；§6.7 迁移测试 |
| R4 | 🔴阻断 | Layer3 摘要无"重新注入上下文"机制，压缩后失忆 | §4.2/§6.1 摘要物化为 system message 写回 messages；§6.7 测试 |
| R5 | 🔴阻断 | applyCompaction 持久化语义不明（白做/丢数据） | §6.1 Archiver 钉死 4 步契约（archivable 带 archivedAt、替换 messages、物化摘要、写 log） |
| R6 | 🔴阻断 | rotate 并发竞态，旧对话锁外被改/复活 | §6.5 router retire + resolve 跳过 retired；§6.6 rotateConversation 先切路由再归档；§7.6 |
| R7 | 🔴阻断 | handoff 无上限→rotate 死循环 | §6.1 handoffTokenCap；§6.6 rotateMaxDepth + 降级兜底；§7.5 |
| O8 | 🟡 | ProviderClient freeze config，ContextManager 重读 credentials 致 mid-run 分叉 | §4.1/§6.4 用 frozen runConfig（bindRun 透出 contextLength）；§7.1 |
| O9 | 🟡 | archive 保留期无法实现（无 archivedAt、archived 永不 prune） | §4.4 archivedAt；§6.3 prune 扩展 archivedDays/archivedConvDays；§8 |
| O10 | 🟡 | provider-agent:99 断言不需改 | §5/§6.8 不动 line 99，新增 0.97 边界用例 |
| O11 | 🟡 | FlushToKnowledge 时序/节流缺失 | §6.1/Phase 4 同步提取+异步提案+去重 |
| O12 | 🟡 | anti-thrash 与 rotate 关系未界定 | §8 anti-thrash 仅约束 L1-L3，rotate 始终可达 |
| F13 | 🟢 | trackUsage 单例跨对话 last-write-wins | §6.1 按 conversationId 存；阈值以确定性 estimate 为准 |
| F14 | 🟢 | applyCompaction 归属不清 | §6.1 明确归 Archiver |
| F15 | 🟢 | cognitive-runtime 对 rotate 展开会标 completed+undefined | §6.6 FYI，后续可优化为独立 run 状态 |
