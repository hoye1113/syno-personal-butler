---
title: "Vault 收录与端云对齐执行契约 v3"
tags: [notes, skills, ai_agent, ingest_contract]
created: 2026-10-10
updated: 2026-10-10
source: vault_initiative - agent_control_plane
description: "定义 Syno 管家高信噪比多源知识收录、主动划线重点排版、双端原图持久化以及本地-Wiki-多维表格三端一体对齐的生产级执行契约。"
---

# Vault 收录与端云对齐执行契约 v3

> **核心原则**：知识库是主人的认知外脑，不是垃圾信息仓库。管家是具备审美品味的“个人认知侍从”，而非机械的信息搬运工。一切收录行为必须以“降低主人的认知负荷、激发深度思考、提供极高信噪比”为唯一准绳。

---

## 一、 五大收录黄金铁律（Golden Rules）

### 1. 高信噪比准入过滤（去 Coding 教程化）
- **硬性拒收**：严禁收录纯代码语法教程、库 API 使用文档、环境配置步骤等大模型已具备的“商品化代码知识”（Commodity Knowledge）。代码实现是大模型最擅长的工具劳务，不具备长期沉淀价值。
- **优先准入**：
  1. **支柱理论与系统架构**：Agent Loop、Harness 上下文工程、分布式可靠性等底层系统思想；
  2. **第一性原理与哲学反思**：技术演进对组织、人类心智、职业生涯的深层影响（如杰文斯悖论、AI 杠杆代差）；
  3. **好问题与深度解答**：不可外包的理解（Karpathy 命题）、数学猜想、前沿边界。

### 2. 主动标明重点与 V4 美感排版（Proactive Highlighting & Aesthetic Typesetting）
- **严禁裸文堆砌**：绝不把纯文本原样丢给用户，绝不把“划线批注”的认知负担推卸给读者。
- **管家主动强调责任**：
  - **核心金句与反常识论点**：必须主动使用 Markdown 加粗（`**重点句子**`）；
  - **关键数字与反差指标**：必须加粗高亮（如 `**11.7倍**`、`**5天烧140亿Token**`）；
  - **分级标题与逻辑条块**：使用清晰的 H2/H3 标题，将散碎长文整理为节奏舒适的段落；
  - **置顶导读引用框**：文章开头必须设立 `> 💡 核心精粹与认知反思` 引用块，提取整篇最具启发性的 3 句话。
- **【硬性排版要求 1】开头精华与后续正文的留白隔离（用户指定）**：
  - 在开头的 `> 💡 核心精粹与认知反思` 引用框与后续正文第一段之间，**必须显式插入 3 行空行**（Markdown 写入多个换行，飞书 Docx 显式生成 3 个独立空行块 `{ block_type: 2, text: { elements: [{ text_run: { content: "" } }] } }`）。
  - **目的**：杜绝精华框与后续正文第一段紧贴粘连，形成明确从容的呼吸感与视觉层级区隔，让读者在进入长文正文前有心智缓冲。
- **【硬性排版要求 2】防嵌套段落文字墙解构规范（Anti-Clustering Protocol）**：
  - 微信公众号/MDNice/秀米等编辑器的外层 `<section>` 和 `<div>` 容器陷阱解析：严禁使用简单闭合正则整体抓取。必须先抓出特定元素（`<pre><code>` 代码块、`<img>` 配图、`<h1-6>` 标题、`<blockquote>` 引用、`<li>` 列表），再将容器闭合标签转为 `\n\n` 切断黏连，保留段落自然呼吸。
- **【硬性排版要求 3】大章节提权与原生分割线节奏（Chapter Elevation & Dividers）**：
  - 识别以汉字序号（`一、` 至 `十、`）开头的一级章节，自动提权为 Heading 1 (`block_type: 3`)，并在其上方自动嵌入原生分割线（`block_type: 22`）；
  - 二级小节（`1.1`、`2.1` 等）提权为 Heading 2 (`block_type: 4`)，形成清晰跳读律动。
- **【硬性排版要求 4】流程图与终端指令转原生代码块（Flowcharts to Code Block）**：
  - 凡文中带有 `▼`、`──►`、`-->` 等流转箭头的 ASCII/Unicode 阶段流程图及终端命令，**严禁作为普通文本折行渲染**，必须统一封装为等宽字体的飞书原生代码块（`block_type: 14`，`style: { language: 1 }`）。
- **云端原生样式映射**：在生成飞书 Docx 时，Markdown 的加粗语法必须转换为飞书原生的 `text_element_style: { bold: true }`，使手机端和 PC 端在飞书 App 内打开时直接呈现视觉重点。

### 3. 双层立体收录结构（Dual-Layer Architecture）
- **表层（10 秒快速决策）**：
  - 本地 Markdown Frontmatter 元数据（`description`、`tags`、`domain`、`topic`）；
  - 置顶导读金句引用框；
  - 飞书多维表格大盘的“核心要点摘要”字段（提炼 300 字核心洞见，方便移动端滑屏秒懂）。
- **深层（深度研读与长期事实源）**：
  - 保持 **100% 完整正文推演脉络**，严禁只保留一段干瘪的 200 字 AI 摘要；
  - 完整保留作者的案例、生动隐喻、推导过程与结尾深度总结（理解不可外包，必须保留认知底料）。

### 4. 图片双端原生落盘协议（Dual-End Native Image Display）
- **绝不跳过图片**：图表、架构图、手稿与数据曲线是高价值长文不可分割的知识载体。
- **本地落盘防防盗链**：
  - 使用专用 Referer 头（如微信公众号需要 `Referer: https://mp.weixin.qq.com`）下载高清原图字节；
  - 抓取请求头必须使用完整桌面 Chrome User-Agent（`Mozilla/5.0 ... Chrome/128.0.0.0 Safari/537.36`），杜绝获取残缺页面；
  - 存入本地统一附件仓：`vault/99-System/Attachments/<Source-Type>/<slug>/`；
  - 本地 Markdown 使用相对路径引用（如 `![配图](../../../99-System/Attachments/...)`），断网离线永久可用，彻底免疫微信文章删除或 CDN 403 失效。
- **飞书云文档原生图片块嵌入（Docx Image Protocol Guardrails）**：
  - 绝不插入裸外部图片 URL（外链在飞书端会被防盗链阻断而裂开）；
  - 遵循飞书官方 Docx 原生多媒体协议：
    1. 在 Docx 正文对应行创建空图片块（`block_type: 27, image: {}`）；
    2. 调用飞书 Drive `media.uploadAll`（`parent_type: "docx_image"`）上传本地下载的图片字节；
    3. **【踩坑警示】Token 层级硬约束**：Lark SDK 的 `uploadRes.file_token` 位于返回对象的根部，**绝不能写成 `uploadRes.data.file_token`**（否则为 `undefined` 导致飞书文档图片陷入永久转圈无法呈现）；
    4. 调用 Docx `documentBlock.patch`，以 `replace_image: { token: file_token }` 回填激活图片块；
    5. **双向扩展名容错与回源热备**：加载图片时对 `.png` 与 `.jpg` 实施双向降级回退；若本地附件缺失，自动携带完整 UA 回源 fetch 补充写入；
    6. **区块批量清理限制**：`batchDelete` 单次上限为 50 个区块，更新重写文档时必须循环分批执行（每批 <= 50）。
  - **最终效果**：在飞书手机 App / PC 端直接呈现原生高清图片流，支持双指缩放、双击查看原图。

### 5. 端云三位一体对齐机制（Three-Way Convergence）
任何正式收录入库的知识，必须确保三端 100% 对应闭环：
1. **端侧（Vault Markdown）**：本仓库 `vault/` 目录下的 Markdown 规范文件（长期知识唯一事实源）；
2. **云侧（Feishu Wiki 目录树）**：挂载于飞书知识库 Wiki（Space ID: `7694918217688534004`）对应的 13 大标准分类节点下；
3. **大盘（Feishu Bitable Catalog）**：在全景多维表格大盘（Table 2 ID: `tblnyAKG4iUEMgMv`）登记记录，关联本地路径与在线 Wiki 直达链接。

---

## 二、 飞书收录表（Table 1 Intake）自动化处理标准流

当主人在飞书移动端向“收录表”（Table 1: `tblpP77HG2RIA0aG`）录入链接或想法时，管家按以下确定性状态机处理：

```text
PREFLIGHT -> FETCH_SOURCE -> FILTER_CHECK -> EXTRACT_BLOCKS
          -> DOWNLOAD_IMAGES -> PROACTIVE_HIGHLIGHT -> BUILD_MARKDOWN
          -> CREATE_WIKI_DOCX -> SYNC_BITABLE_CATALOG -> UPDATE_INTAKE_STATUS
```

1. **`FETCH_SOURCE`**：
   - 识别链接类型（微信公众号 / B站专栏 / 网页长文）；
   - 使用带反爬伪装头的客户端完整拉取文章 HTML DOM。
2. **`FILTER_CHECK`（准入审核）**：
   - 检查是否属于纯代码/语法教程，若属于纯工具教程，标记并在摘要中说明，建议归入备忘或提示主人；若属于高信噪比理论/反思，全流程放行。
3. **`DOWNLOAD_IMAGES`**：
   - 抓取文中全部配图，使用专用 Referer 逐张下载落盘至 `vault/99-System/Attachments/`。
4. **`PROACTIVE_HIGHLIGHT`（主动标重点）**：
   - 保留原作者的 `<strong>`/`<b>` 加粗标签；
   - 主动提炼首尾段落中的核心命题、反常识洞见与关键数据并施加加粗（`**...**`）；
   - 生成置顶导读引用框。
5. **`BUILD_MARKDOWN`**：
   - 组装规范 YAML Frontmatter；
   - 写入本地 Markdown 目标目录；
   - 图片使用相对路径指向本地附件。
6. **`CREATE_WIKI_DOCX`**：
   - 在 Wiki 对应分类下新建 Docx 页面；
   - 批量写入文本排版块（文字元素映射为带 `bold: true` 的富文本）；
   - 逐张上传原图并绑定 Docx 原生图片块（Block 27）；
   - 授权主人 OpenID 完整访问权限。
7. **`SYNC_BITABLE_CATALOG`**：
   - 在全景多维表格 Table 2 登记，填入笔记名称、领域、专题、要点摘要、完整正文、标签及 Wiki 链接。
8. **`UPDATE_INTAKE_STATUS`**：
   - 将收录表（Table 1）对应记录状态变更为“已入库”，并回填本地路径与管家精炼摘要。

---

## 三、 飞书 Wiki 13 大全景分类映射基准

收录时按文章属性确定性归类至以下 13 个分类节点之一：

| 标识 Key | 分类全称 | 核心收录范畴 |
| :--- | :--- | :--- |
| `01_theory` | 01 - AI Agent 支柱理论 | 认知校准、Agent Loop、工具系统、上下文工程、Multi-Agent |
| `02_super_agent` | 02 - Super Agent 实战体系 | 工具执行与容错、Prompt 管道、Token 预算、持久记忆、技能编排 |
| `03_architecture` | 03 - 顶级架构与工程长文 | Anthropic、Cognition、Loop Engineering 等团队顶级架构解析 |
| `04_design_patterns`| 04 - Agent 设计模式与生产实践 | 生产级智能体设计模式、管理学隐喻、测评落地、实战避坑 |
| `05_harness` | 05 - Harness 工程与系统可靠性 | 自我改进 Agent、企业级运行框架、大规模运行反思、Harness 架构 |
| `06_organization` | 06 - AI 原生组织与产品思考 | AI 原生产品范式、组织演进、杰文斯悖论、1% 杠杆鸿沟、大基建周期 |
| `07_frontier` | 07 - 前沿科学与物理智能 | 测试时算力、脑机接口、具身智能、生物智能启发、科学 3.0 |
| `08_eval` | 08 - AI 评估基准与安全测试 | 模型评估对齐、安全基准、人类品味与终极壁垒 |
| `09_coding_tools` | 09 - AI 编程范式与开发工具 | Claude Code、Codex 创造内幕与人机协同编程新范式（仅限深度思想长文） |
| `10_philosophy` | 10 - 哲学与元认知 | Karpathy“外包思考无法外包理解”、哥德尔不完备定理、心智进化、人何以自处 |
| `11_authors` | 11 - 核心人物与作者档案 | 核心思想者、领军研究员与创业者档案 |
| `12_navigation` | 12 - 知识索引与全局导航 | MOC 知识地图与全库索引路由器 |
| `13_archive` | 13 - 系统规范与工程归档 | Syno 执行契约与历史规范归档 |

---

## 四、 验收与报告标准

一次成功的收录任务必须向主人提供以下**确定性验收凭据**：
1. **本地 Markdown 路径**：包含完整 Frontmatter 与相对附件链接；
2. **本地附件仓路径**：确认配图完整下载，无损坏、无 0 字节文件；
3. **飞书 Wiki 在线直达链接**：确认可在手机/PC 打开，图文混排排版优美，加粗重点清晰可见；
4. **多维表格记录 ID**：确认已在大盘关联登记，并填入高质量核心摘要。
