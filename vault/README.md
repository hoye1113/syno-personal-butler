# AI Agent 时代 Obsidian Markdown 知识库

采用 PARA、MOC、双向链接和可验证收录工作流。Markdown 是唯一事实源；Obsidian 负责阅读和编辑，Agent 直接通过文件系统工作，不依赖 Obsidian MCP。Agent 入口见 [AGENTS.md](AGENTS.md)，详细协议见 [99-System/Agent](99-System/Agent/PROJECT.md)。

## 目录结构

### 00-Inbox
收集箱。新内容先放这里，定期整理到对应领域（按 [AGENTS.md §9](AGENTS.md) 维护原则，每周清空，≤ 10 个文件）。

### 01-Areas（领域）
长期关注的主题，持续维护，没有截止日期。

- **AI Agent Development** — AI Agent 开发知识（[[MOC - AI Agent Development|课程总索引]]）
  - 01-Cognitive Calibration — 认知校准（基础概念）
  - 02-Agent Loop — Agent 循环机制
  - 03-Tool System — 工具系统
  - 04-Context Engineering — 上下文工程
  - 05-Memory / 06-Multi-Agent / 07-Harness Engineering — 章节名占位（待 P1/P2 扩展）
- **Workflow and Skill Management** — 工作流与技能管理
- **AI Tools and Products** — AI 工具与产品评测（**P2 阶段可能迁至 Resources**）
- **Programming and Engineering** — 编程与工程实践（踩坑经验、技术方案）

### 02-Resources（资源）
参考资料、Prompts、文章摘录等。**按主题分（不按来源）**——见 [AGENTS.md §2](AGENTS.md)。

- **AI and Agents** — Agent 理论与实践主目录
  - **Agent Theory and Design**（公众号 + B 站视频）→ [[MOC - Agent Theory and Design]]
  - **Harness Engineering**（横切主题）→ [[MOC - Harness Engineering]]
  - **AI 时代个人发展与组织**（横切主题）→ [[MOC - AI 时代个人发展与组织]]
  - **Loock AI 全栈应用开发**（148 篇，6 章节 MOC）→ [[MOC - Loock AI 全栈课程]]
  - **B 站视频知识库**（1 BV = 1 canonical 文件）→ 新收录见 [图文专栏精华 SUBDOC](99-System/Skills/vskill-vault-curate/SUBDOC%20-%20B站图文专栏精华收录.md)
  - **播客转录**（1 篇）
- **Prompts** — Copilot 自定义提示词模板（13 个 Prompt + 1 [[MOC - Prompt 工程]]）
- **哲学与自我认知** — 与 AI 时代相关的自我认知（[[MOC - AI 时代个人发展与组织]] 在此）

### 03-Archive（归档）
已完成或不再活跃的项目和文件（按 [AGENTS.md §9](AGENTS.md) 维护原则）。

### 99-System（系统）
模板、配置、审计等系统文件。
- **AGENTS.md** — 长期主义规范（vault 根）
- **Attachments/** — 课程图、manifest、文章图（**不删，有真资源**）
- **scripts/vault-audit.py** — 自动校验脚本
- **scripts/README.md** — 脚本总入口（运行顺序、常用命令、环境准备）
- **audit-report.md** — 最近一次审计报告（季度更新）

## 维护原则

1. **Inbox → Areas / Resources**：新内容先放 Inbox，1-2 天内整理（按 §9）
2. **按主题归类**：不按来源分类（按 §2）
3. **季度审计**：跑 `python 99-System/scripts/vault-audit.py` 检查一致性（按 §9）
4. **命名规范**：见 [AGENTS.md §6](AGENTS.md)
5. **frontmatter 必填**：见 [AGENTS.md §3](AGENTS.md)
6. **反向链硬规则**：见 [AGENTS.md §7](AGENTS.md)
7. **MOC 触发条件**：同主题 ≥ 3 篇时建 MOC（按 §5）

## 收录流程（详见 [AGENTS.md §8](AGENTS.md)）

```
1. 收素材（URL / 截图 / 复制粘贴）
2. 抓内容（webfetch / WebBridge / 复制）
3. 选位置：Inbox / Areas / Resources
4. 写 frontmatter：按 §3 必填模板
5. 打 tag：从 §4 字典选
6. 找反向链：agent 自动 top 5 → 人工选 1-3 个
7. 更新 MOC：如有相关 MOC，把新笔记加入
```

**B站图文专栏 v2**：用户提供单篇 opus/cv 后，Agent 查重来源，只读取文字与页面元数据，建立 Pass 1、声音归属和对谈规划。S级真实问答使用 `source/column`，演讲使用“编者问”重构；正文以类型化知识关系接入 vault，最后运行 `bilibili-opus-validate.py`。图片、Recastory 与 ASR 全部跳过。

## 参考

- **PARA 方法**：Projects, Areas, Resources, Archive
- **信息流向**：Inbox → Areas/Resources → Archive
- **长期主义规范**：[AGENTS.md](AGENTS.md)
- **最近一次审计**：[99-System/audit-report.md](99-System/audit-report.md)
- **自动审计**：`python 99-System/scripts/vault-audit.py`

---

**变更记录**：
- 2026-07-13：Markdown 成为唯一事实源；Agent 控制面与 B站双轴收录 v2。
- 2026-07-13：B站默认收录改为用户提供图文专栏；ASR/Recastory 冻结为 Legacy。
- 2026-07-13：专栏协议升级为 `bilibili_opus_ingest_v2`；S级默认对谈出版并增加类型化知识关系。
- 2026-07-06：B 站 canonical 与 ASR 三轨初版。
- 2026-06-11 v2：基于 AGENTS.md v1 重写——目录树反映实际规范，新增 §2 主题视角
- 2026-06-11 v1：基于 PARA + 领域细分初版
