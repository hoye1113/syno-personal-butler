---
title: "OpenAI官方：Codex新手教程"
tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "mcp", "harness_engineering"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "mcp", "harness_engineering"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "OpenAI Derek 与 Charlie 官方 onboarding：Codex CLI/IDE 安装、AGENTS.md、config.toml 沙箱与审批、prompt 技巧、MCP/Context7、Codex Exec 结构化输出与 Agents SDK 多 Agent 编排。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenAI官方-Codex新手教程.md"
source_sha256: "4acb63d0d486f4f437a414810b02221ac5059c017f78e512c58de0d705c2520f"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV19MzXBNESV/"
duration: 52:54
saved: 2026-07-02
updated: 2026-07-03
material_tier: A
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV19MzXBNESV/ingest"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV19MzXBNESV/article.md"
curate_method: "vskill-vault-curate v3-ingest（讲义 v3）"
spot_check: 2026-07-02
speakers: "Derek、Charlie（OpenAI Customer Onboarding）"
asr_version: v2
---

# OpenAI 官方：Codex 新手教程

## 先搞懂这一期

**这是什么节目？**  
OpenAI 客户 onboarding 团队的 **~53 分钟 Getting Started with Codex** 官方课（Derek + Charlie）。不是营销片，是 **CLI + VS Code 扩展** 手把手：clone agents.md 开源站、改 Hero、接 MCP、跑 review。

**这期在回答哪三个问题？**

1. **Codex 有哪些面、怎么装、怎么登录？** CLI / IDE / Cloud / SDK 各干什么？  
2. **AGENTS.md + config.toml 怎么让 Agent 每次进门就懂项目？**  
3. **从 prompt 到 MCP 到 headless `codex exec`，怎么嵌进 SDLC？**

**用一条线串起来：**

Codex = OpenAI **coding agent**（GPT-5.1 Codex Max 等在 Codex harness 里训）；面：**CLI**（轻量终端 + headless SDK）、**IDE 扩展**（任意 VS Code 系）、**Cloud**（关笔记本并行 async，如 PR review）。  
客户用法：**PR 开 Codex Cloud review**、**Slack @Codex 读整 thread 出 PR**、**SDK 自有容器结构化输出**。  
安装：`brew` / `npm` 装 CLI（更新频，顶栏提示新版本）；VS Code 搜官方 OpenAI Codex 扩展，**开 auto-update**。  
登录：`codex login` / IDE splash → SSO；`/status` 看 model、sandbox、approval、剩余 context。  
**AGENTS.md**：每次 session 零记忆 → 根目录 / 子目录 / `~/.codex` 全局 **AGENTS.md** 自动加载；`/init` 生成；**<100 行**、解锁 **test / lint 反馈环**、踩坑写回 agents.md；大任务指到 `plans.md` / `frontend.md` 做 **progressive discovery**。  
**config.toml**：默认 model、reasoning effort、sandbox、approval policy、profiles（如 `codex -p fast`）、MCP、终端完成 **notification**。  
Prompt：**@ 文件锚定**、小任务起步、verification steps、debug 贴 **full stack trace**、open-ended「下一步建什么」。  
IDE 技巧：TODO → Implement with Codex、**截图改 UI**、`codex resume` 续 session、生成 **mermaid 序列图**。  
MCP：`codex mcp add`；demo **cupcake MCP** + **Context7** 拉最新 OpenAI Responses API 做 agents.md 生成器。  
进阶：**codex exec** + JSON schema 结构化 code quality 报告；Agents SDK 里 Codex 当 MCP tool 多 Agent handoff；自托管 PR review / autofix CI / issue auto-label。

---

## 背景：这期在 AI Agent 大图里的位置

| 你可能已有的认识 | 这期补上的那一块 |
|----------------|-----------------|
| Codex = ChatGPT 写代码 | **多 surface + Cloud 并行** + **headless exec** |
| README 给 AI 看就行 | **AGENTS.md** 专给 agent loop；plans.md 做大任务 living doc |
| MCP 可选装饰 | Context7 / 自建 doc MCP = **克服 knowledge cutoff** |
| Code review 另一工具 | Codex review **只报 P0 / P1**，噪声低才有人用 |

---

## 分话题讲

### 1. Codex 产品面与模型（~00:07–03:38）

| Surface | 能力 |
|---------|------|
| **CLI** | 日常交互 + **`codex exec` headless** 进 CI/CD |
| **IDE 扩展** | 任意 VS Code 系；local / **cloud** 任务；chat / agent / full access 模式 |
| **Cloud** | 笔记本合上并行跑 code review；mobile 触发 |
| **SDK** | 自有容器 programmatic 调用 + **structured output** |

**模型：** GPT-5.1 Codex Max 等，在 **Linux/macOS/Windows + bash/PowerShell** 环境训，遵守 sandbox；擅长 **auto-compact** 长跑 refactor（Windows 支持与长跑任务是两大 feature request 已落地）。

**客户工作流示例：**

- PR 打开 → Codex Cloud review → merge 前抓 critical bug  
- Slack **@Codex** → 读整 thread → 出 PR  
- SDK → 结构化 JSON 进自有 pipeline  

**SDLC 七阶段：** OpenAI 发布《AI engineering team》指南——planning/design 到 documentation/maintenance，Codex 可加速全程。

**和你何干：**  
同一 harness 贯穿 STLC——今天入门，明天可挂 review / autofix。

---

### 2. 安装、登录、跟练仓库（~03:38–07:15）

**安装 CLI（推荐 npm / brew，更新最快）：**

```bash
# brew 或 npm 安装（官方推荐，团队每周多次发版）
# 备选：GitHub 下 binary（CLI 开源）
# 会话顶栏会提示有新版本
```

**IDE 扩展：**

1. VS Code → Extensions → 搜 **OpenAI Codex**（认准 OpenAI 官方）  
2. **开启 auto-update**  
3. 可选 pre-release / release candidate

**登录（Work + ChatGPT Enterprise SSO）：**

```bash
codex login    # 浏览器 SSO；CLI 与 IDE 共享会话
```

**跟练仓库 [agents.md 微站](https://agents.md/)：**

```bash
git clone <agents.md repo>
cd agents-md
npm install
npm run dev    # 本地跑通后再全程在同一 repo 上改 Hero、加按钮
```

**CLI 常用 slash 命令：**

| 命令 | 作用 |
|------|------|
| `/status` | 当前 model、目录、sandbox、approval policy、**剩余 context**、session ID |
| `/init` | 在当前目录 **自动生成 AGENTS.md** |
| `/models` | 切换 reasoning effort（low / medium / high） |

**和你何干：**  
官方刻意用 **agents.md 站** 教 AGENTS.md——meta 但好用。

---

### 3. AGENTS.md：每次 session 的 TL;DR（~07:15–12:33）

Coding agent **不跨 session 记忆** → AGENTS.md 在启动目录 **自动注入**。

**三层级：**

| 位置 | 用途 |
|------|------|
| `~/.codex/AGENTS.md` | **全局**：Context7 规则、个人偏好 |
| repo 根 | 项目 overview，通常在此启动 Codex |
| **子目录** | 进目录加载该服务上下文（微服务 monorepo） |

**推荐段落：**

- Project overview + structure（文件去哪找）  
- **Build / test 命令**（给 agent 反馈环）  
- 常用 CLI（如 `gh`）  
- 已接 **MCP 列表**  
- Feature **端到端 workflow**  
- 指向 task-specific md（progressive discovery）

**最佳实践：**

1. **短而聚焦**——OpenAI 内部 AGENTS.md **大多 <100 行**  
2. **解锁 agent loop**：lint / test / compile 反馈 → agent 独跑更远  
3. **踩坑写回**：Codex 找 test 命令找了很久 → **把那行命令写进 AGENTS.md**  
4. **大任务指 plans.md**：checklist living doc；工程师 **10+ 小时 refactor** 成功案例

**Progressive discovery 示例：**

```markdown
## Task-specific documentation
- Large refactors → read plans.md
- Frontend work → read frontend.md
- Architecture changes → read architecture.md
```

Codex 读 AGENTS.md 知道有这些文件，**按需再读**，不一次塞满 context。

**和你何干：**  
AGENTS.md = harness **静态 context 层**，与 [[2026 年 Agent 最重要的工程概念 Harness Engineering]] docs-as-truth 同族。

---

### 4. config.toml：默认行为与安全（~12:33–15:10）

CLI 用 **Rust 编写**，配置在 **config.toml**（`~/.codex/`）：

| 配置项 | 说明 |
|--------|------|
| default model | 会话默认模型 |
| reasoning effort | 推理深度 |
| **sandbox mode** | 默认 **workspace-write**（只写当前目录） |
| **approval policy** | 默认 **on-request**（需 escalated 权限才问你） |
| web search | 默认 **off**，可 toml 或 flag 打开 |
| **profiles** | 例：`codex -p fast` → 最快 model + 最低 reasoning |
| MCP servers | cupcake、Context7 等 |
| terminal notifications | 后台跑完 **响铃**（Charlie 个人偏好） |

**approval + sandbox 组合：** 可改更严或更松；团队统一 toml + AGENTS.md = 新人行为一致。

**和你何干：**  
安全默认值 + 项目 AGENTS.md = 可预期的 agent 行为。

---

### 5. Prompt 最佳实践（~15:10–17:17）

1. **`@file` 锚定**——防 agent 从错误目录开始逛（跑偏主因）  
2. **小任务起步**；熟了再变大——也可让 Codex **纯 research 拆 task**  
3. **Verification steps**——prompt 或 AGENTS.md 写 `run tests` / `run lint`  
4. Debug：**整段 stack trace** 粘贴  
5. Open-ended：`What would you consider building next?`——CLI 会给 **suggested next steps**

**Starter tasks：**

- explain codebase / write README  
- fix bug（贴 stack trace）  
- expand test coverage（问 edge cases）  
- cross-file refactor（抽 generic component）  
- **写文档**（工程师不爱写，Codex 擅长）

**IDE demo：** chat mode 问 `Can you tell me about this project?` → 可读 **git history**（谁改了什么）——Codex 当 repo historian。

**和你何干：**  
Prompt 是 **ultimate context**，recurring 验证应 **沉到 AGENTS.md**。

---

### 6. CLI / IDE 技巧（~17:17–28:19）

**@ 文件：**

- CLI：直接 `@path/to/file`  
- IDE：**Cmd+Shift+C**（Charlie 自绑）→ 选中行加入 context

**Hero 按钮 live demo（agent mode）：**

```
Can you implement hero buttons to:
- download the repo
- link to GitHub
- copy the markdown of the site
```

IDE 显示 **file pills** 可点进跟随；agent 改 hero 组件 → 浏览器可见 Download / GitHub / Copy markdown。

**TODO → Implement with Codex：** 代码里写 TODO → 右键 **Implement with Codex** → 侧栏跑 task。

**截图改 UI（~24:03）：**

- 截 agents.md 页 setup commands 的 inline code chips  
- Prompt：`Can you make the inline code chips orange?`  
- CLI 粘贴截图或 IDE **+ Add image** → Codex 定位 CSS/组件改色

**Session 管理：**

```bash
codex resume              # 列出历史 session，续聊
codex resume <session-id> # 直达特定 session（免 scroll）
```

IDE：搜索历史 task 继续。**Session = mini project 容器**（frontend 一条、tests 一条）。

**其他：**

- IDE：`Provide me a clean mermaid sequence diagram for this codebase`  
- Web search（默认 off）：config 设 `web_search=true` 或 session flag → 例：加 Next.js 15 最新 news footer  
- **Custom prompts：** `~/.codex/prompts/add-test.md` → CLI 里 `@add-test` 对 changed files 生成单元测试（改 prompts 后需 **quit 重启 codex**）

**和你何干：**  
UI 改动用截图比「左边第三个按钮」可靠；session 续聊保 context。

---

### 7. MCP：Cupcake → Context7（~28:19–35:28）

Codex 支持 **stdio + HTTP** MCP。常见：Figma、Jira/Linear、**Context7**、Datadog。

**注册 MCP：**

```bash
codex mcp add <name> <params...>   # 写入 config.toml；也可直接编辑 toml
```

**Cupcake MCP demo：**

```
Add a section at the bottom of the agents.md page
that fetches Rachel's cupcake order.
```

→ 调用 `cupcake MCP search` → 页脚显示：**Rachel ordered 7 marble cupcakes for pickup**

**Context7 + Responses API demo（IDE，GPT-5.1 Codex mini, medium）：**

```
Implement an input on the agents.md page where people can
generate their own AGENTS.md file using a small prompt,
calling OpenAI's Responses API —
use Context7 for the latest API spec.
```

→ Context7 拉最新 doc → 读 repo → **~300 行** 三文件 diff → 页上 AGENTS.md 生成器 input。

**Global AGENTS.md 规则（免每次指定 Context7）：**

```markdown
When implementing features with external libraries or APIs,
always search Context7 for relevant documentation first.
```

**和你何干：**  
MCP = harness **动态 context**；doc MCP 解决 **训练 cutoff**。

---

### 8. Code Review 与进阶编排（~35:28–45:02）

**Review 入口：**

| 方式 | 命令/操作 |
|------|-----------|
| CLI | `codex review` — 对 base branch / uncommitted / 指定 commit + **custom instructions** |
| IDE | slash **code review** → review uncommitted / against branch |
| 指南外置 | `code_review_guidelines.md` 在 AGENTS.md 里引用，避免 AGENTS.md 过长 |

**噪声控制：** 模型训成只 surface **P0 / P1**（偶发 P2/P3）；太吵会被 ignore——「不修就 production 炸」级别才报。

**Headless 结构化输出（~39:31）：**

```bash
codex exec \
  --output-schema codex_output_schema.json \
  "Analyze this codebase for code quality issues"
```

- schema = OpenAI structured output JSON（files analyzed、issues array、severity、line numbers、score 0–100）  
- 输出 valid JSON → 可 jq / 进 DB / CI pipeline  
- 用途：security triage、test coverage spot、refactor automation、release changelog

**Agents SDK 多 Agent（~41:46）：**

- Codex 作 **MCP tool** 被 frontend agent / PM agent / backend agent 调用  
- 各 agent 自有 context + MCP；**handoff** 彼此  
- Agents SDK 自动 **traces**（谁 handoff 给谁、给了 Codex 什么 context）

**自托管模式：**

| 模式 | 说明 |
|------|------|
| On-prem PR review | 同 Codex Cloud，跑自有容器 + structured output |
| **Autofix CI** | 测试失败 → Codex checkout branch → 开 fix PR → merge |
| Issue auto-label | Codex 开源 repo 在用——新 issue 创建时自动 categorization |

**和你何干：**  
从 **交互式 codex** 到 **pipeline 里 silent exec** 是团队规模化分界线。

---

## 关键概念（读完应能解释）

| 中文 | 英文 | 白话 |
|------|------|------|
| 三端产品面 | Codex CLI / IDE / Cloud | 本地终端、VS Code 侧栏、云端并行容器 |
| 代理说明书 | AGENTS.md | 每 session 自动加载的项目 Agent 说明书 |
| 大任务清单 | plans.md | 大任务 checklist living doc，可 progressive discovery |
| 配置文件 | config.toml | CLI 默认 model、sandbox、approval、MCP |
| 沙盒与审批 | Approval policy / Sandbox | 何时问权限、能写哪些路径 |
| 无头执行 | codex exec | Headless 模式 + 结构化 JSON 输出 |
| 最新文档 MCP | Context7 MCP | 拉最新第三方库文档，克服训练截止 |
| 会话恢复 | codex resume | 恢复带完整 context 的旧 session |
| 渐进发现 | Progressive discovery | AGENTS.md 指向子文档，按需读取 |

---

## 值得记住的原话

> **"Coding agents don't retain any context between sessions… AGENTS.md ensures instructions are always loaded automatically."**  
> Agent 不记上次 session——AGENTS.md 保证说明每次自动加载。

> **"Keep it brief… Most of OpenAI's AGENTS.md files are less than 100 lines."**  
> 保持简短——OpenAI 内部 AGENTS.md 大多不到 100 行。

> **"Give the agent feedback from tools like lint, tests… it accelerates how much the agent can do."**  
> 给 lint / test 反馈环，Agent 能独跑更远。

> **"Anchor it with @ mention… a lot of times it goes off the rails because it starts in the wrong part of the codebase."**  
> 用 @ 文件锚定——跑偏常因从错误目录开始。

> **"Code review can't be too noisy… trained to focus on P0/P1."**  
> Review 不能吵——模型被训成只抓 P0 / P1。

> **"Codex exec… structured output… build into CI/CD pipeline."**  
> Headless exec + 结构化输出，可塞进流水线。

---

## 小结

**这期最核心的判断：** Codex 入门 = **AGENTS.md（项目记忆）+ config.toml（安全默认）+ 验证环**；熟练后接 **MCP 动态 doc** 与 **`codex exec` 结构化流水线**，Cloud / Slack 把同 harness 扩到 async 协作。

**要点：**
- `/init` 生成 AGENTS.md，踩坑写回，大任务用 plans.md。  
- Prompt 要 @ 锚定 + verification；UI 用截图。  
- Review 要 quiet；exec + schema 才适合 CI。

**和 vault 的关系：** Codex 官方入门锚点，接 [[Codex负责人-现场演示Codex]]、[[Codex实战-构建全能AI营销团队]]、[[MOC - Harness Engineering]]。

---

## 行动启示

1. **Repo 根放 AGENTS.md**（<100 行）+ build / test 命令 + 指向 frontend.md / plans.md。  
2. **团队 config.toml** 统一 sandbox；个人 global AGENTS.md 放 Context7 规则。  
3. **新功能先 research 拆 task**，再 agent mode 实现，结尾跑 review uncommitted。  
4. **~/.codex/prompts/** 沉淀 add-test 等重复 prompt。  
5. **试点 codex exec + JSON schema** 做安全 triage 或 changelog 自动化。

---

## 相关阅读

- [[Codex负责人-现场演示Codex]] — 负责人级 knowledge work 与并行 demo  
- [[Codex实战-构建全能AI营销团队]] — 创作者侧 Skills 栈  
- [[2026 年 Agent 最重要的工程概念 Harness Engineering]] — OpenAI harness 实验叙事  
- [[IBM团队-Harness工程详解]] — verify / guardrails 第一性原理  
- [[MOC - Agent Theory and Design]] — Agent 理论横切索引  

---

## 来源

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV19MzXBNESV/ingest`
- **video_description**：`{ingest}/video_description.md`
- **视频**：[BV19MzXBNESV](https://www.bilibili.com/video/BV19MzXBNESV/)（B 站 *Easonlee的AI笔记*）  
- **讲者**：Derek、Charlie（OpenAI Customer Onboarding / Engineer）  
- **时长**：~52:54  
- **转写**：Recastory `bilibili-retranscribe/BV19MzXBNESV/`（FunASR SenseVoice + cam++，**asr v2** 52 段）  
- **跟练仓库**：[agents.md](https://agents.md/) 开源微站  
- **文档**：developers.openai.com/codex、OpenAI Cookbook  
- **版本**：v3 读者向讲义加深（2026-07-03）
