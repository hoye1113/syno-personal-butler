---
title: "Codex实战：用AI颠覆视频剪辑流程"
tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "content_creation"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "content_creation"]
created: "2026-07-06"
source: "B站视频 - Easonlee的AI笔记"
description: "Riley Brown × Codex + Remotion：提示词即动态图形、Claude 团队 3 亿观看案例、品牌资产合成、帧级转向与元叙事发布片——七八个 prompt 出片。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-用AI颠覆视频剪辑流程.md"
source_sha256: "32ddfee808c41efade45e5ee127cd556e4a0af6abd2bd9de2975470dabf6d553"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1ik526cEsp/"
column_url: "https://www.bilibili.com/read/cv49269956/"
source_original_date: "2026-04-25"
host_name: "Host"
guest_name: "Riley Brown"
guest_title: "创作者 / Chorus Skills 作者"
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1ik526cEsp/ingest"
column_source: "Recastory/workspace/bilibili-retranscribe/BV1ik526cEsp/ingest/column_article.md"
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1ik526cEsp/article.md"
speaker: "Riley Brown（视频主讲 / 创作者）"
duration: "27:59"
saved: 2026-07-06
updated: 2026-07-06
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
speaker_inference: "column_monologue_repackaged; video host=Riley Brown"
speaker_confidence: high
asr_version: v2
author:
  - "[[Riley Brown]]"
concepts:
  - id: prompt_to_video
    zh: 提示词即视频
    en: prompt-to-video
    one_line: 用自然语言写 Remotion 代码，实时渲染动态图形
  - id: composition
    zh: 合成
    en: composition
    one_line: Remotion 里一段可独立预览/导出的视频单元
  - id: brand_assets
    zh: 品牌资产
    en: brand assets composition
    one_line: 预存标志、渐变、利萨茹图形，跨片引用保风格一致
  - id: steering
    zh: 转向
    en: steering
    one_line: 截图圈选 + Command+Enter 注入，精修帧与元素
  - id: sequence
    zh: 序列
    en: sequence
    one_line: 时间线上的场景段落，区别于「合成」模板
---

# Codex实战：用AI颠覆视频剪辑流程

**Host：** Host（观众视角）  
**Guest：** Riley Brown（视频主讲 · Chorus Skills）  
**形态：** Host-Guest canonical v3.2（**专栏主源** · solo 教程重排 · 中文口语化）  
**B 站：** [BV1ik526cEsp](https://www.bilibili.com/video/BV1ik526cEsp/) · **时长** ~28 min · **专栏** [cv49269956](https://www.bilibili.com/read/cv49269956/)

---

## 开场

**Riley Brown** 每周发好几条 AI 工具视频。这期他拿 **OpenAI Codex** 里的 **Remotion 插件**，从零搭一条可发布的动态图形片——不是 After Effects 手 K，是 **打字描述 → AI 写代码 → 本地预览 → 渲染 MP4**。

Claude 团队曾用 Remotion **一个月做 20+ 条功能发布视频**，累计 **3 亿+** 观看，几乎 **每天一条**。Riley 这期用 **七八个 prompt** 跑完从 Hello World 到带配乐、元叙事、社媒数据动画的完整发布片；再花三小时还能更精，但「够发 Twitter」已经成立。

五章预告：**Codex 为何是动效最佳界面** → **Remotion 代码即视频 + 高频发布逻辑** → **项目设置与 Hello World 到双标志动画** → **时间线、资产、截图转向与帧级精修** → **品牌合成、元叙事、Suno 配乐与导出**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 超级应用 | super app | chat + 文档 + 网站 + 视频预览，一窗控电脑 |
| Remotion | Remotion | 用 React/代码渲染动态图形的框架；Codex 可装插件 |
| 合成 | composition | 一段独立视频单元，如「Hello World 合成」 |
| 序列 | sequence | 时间线上的场景段，多段拼成完整片 |
| 资产 | assets | PNG/SVG/MP3 等外部文件，拖进项目文件夹引用 |
| 转向 | steering | 截图标注 + Command+Enter，告诉 AI 改哪根线、哪一帧 |
| 品牌资产 | brand assets | 专用合成，存标志、渐变、利萨茹曲线等可复用视觉 |
| 渲染 | render | 导出 H264 MP4，可上传社媒 |

---

## 01 Codex 超级应用：动效就该在这做 [02:15]

**Host：** 你开头说 Codex 比 Claude Code 更适合做视频——差在哪？

**Riley Brown：** Codex 就是 OpenAI 的 **超级应用**。非纯技术人员控模型的最佳界面；真正难、复杂的任务，我越来越只在 Codex 里干。它是 OpenAI 版 Claude Code 桌面，但 **好用得多**。

Claude 桌面把 **Code** 和 **Cowork** 拆开——要表格、文档、演示文稿得切 Cowork；Code 模块只管编码。Codex **不拆**：你要演示文稿，直接要；要文档，侧边栏开；要网站、要 **动态图形视频**，同一窗口。侧边栏能开视频预览，跟开浏览器一样。还有 **插件**——最酷的内置之一就是 **Remotion**：在 Codex 里 **直接生成动态图形**，还能用新图像模型做素材，再塞进「只打字就能做」的视频里。

有 ChatGPT 订阅就能开 Codex。左边输入提示，右边出视频——我屏幕上那几个就是几个 prompt 的结果。

> **金句 · Riley Brown**
> **中文：** Codex 是你能在电脑上创建的几乎一切东西的代理界面——视频只是其中之一。
> **原文：** You can basically do anything in Codex, or create anything you might want to create on your computer.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 插件 | plugin | Codex 内可下载的能力包，Remotion 即其一 |
| 协作与编码合一 | unified cowork + code | 不必为「写文档」和「写代码」切 App |
| 本地预览 | localhost preview | 代理跑完后浏览器开 Remotion 小应用 |

**本章小结**

- 选 Codex 做动效，因 **预览栏即交付**，插件生态含 Remotion
- 对比 Claude 桌面：**任务类型不分仓**，动效与文档同 harness
- 订阅 ChatGPT 即可上手，非工程师友好

---

## 02 Remotion：提示词即视频，Claude 靠它日更 [04:02]

**Host：** Remotion 到底是什么？凭什么跟 After Effects 比？

**Riley Brown：** Remotion 就是 **用代码做动态图形**。AI 写代码很强——你用 **英语打字描述**，AI 写底层代码，**视频就渲染出来**。Codex 里装 Remotion 插件，选 GPT-4o，生成代码，右侧实时预览，点一下 **导出**。

跟 After Effects、Premiere、模板软件比，看个人喜好：**提示词界面** vs **要学很久的手动界面**。AI 在进步，提示词会越来越省事；**专家级动画** 我仍建议 AE。但有个硬案例：**Claude 用 Remotion 一个月做了约 20 个发布视频**——功能上线那些小动画全是 Remotion。仅这类视频 **3 亿+ 观看**，他们 **几乎每天发一条**。Remotion 让你 **极快出片**；Claude Code 能做，这期我们在 **Codex** 里做。

> **金句 · Riley Brown**
> **中文：** 一个月二十条、三亿次观看——传统剪辑软件很难跟上这种高频标准化产出。
> **原文：** They made over 300 million views just from posting these Remotion videos for all their feature releases — basically one every day.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 代码即视频 | code-as-video | 动效本质是 React/TS，AI 生成可 diff 可版本管理 |
| 高频发布 | high-frequency release | 模板化合成 + prompt，日更社媒营销 |
| 学习曲线 | learning curve | AE 手动 K 帧 vs 自然语言描述时间线 |

**本章小结**

- Remotion 核心：**AI 写代码 → 浏览器预览 → 可选渲染 MP4**
- Claude 团队案例证明 **发布视频** 场景 ROI 极高
- 专家精修仍可用 AE；Remotion 赢在 **速度与迭代**

---

## 03 从 Hello World 到双标志动画：项目与合成 [04:02–13:10]

**Host：** 从零怎么搭？给观众最短路径。

**Riley Brown：** 谷歌搜「下载 Codex」装桌面版 → **插件** 里搜 Remotion 下载 → 确认。建议 **新建项目**：我们会做很多视频，要一个文件夹、多个聊天。**桌面建 `Remotion Project` 文件夹**，Codex 里 Open，项目就挂上了。

新聊天，先测最简单的：**白底黑字 Hello World**，跑 Remotion。代理干活约 **两分钟**，找 **localhost 链接**——Remotion 插件像本地小 App，输入什么右边就更新。播放可能只是循环静态字，正常。

然后：**让 Hello World 抖起来，改成 Hello from Riley**。编程都从枯燥的 Hello World 开始——先让东西 **存在**，再变好。我关过侧边栏，点一下能再开；51 秒加载完，字变了，会抖了。

接下来讲 **合成（Composition）**：我们有了一个 Hello World 合成。再要一个：**Codex 标志 + Remotion 标志**，我从谷歌图下载 PNG，拖进代理建的 `Hello World Video` 文件夹——`Codex.png`、`Remotion.png`。提示：**深灰底、Instrument Sans、文案「AI 驱动的视频动态图形」、两标志间动画光束**。新合成出现在列表，时间线不同。跑完 **两标志互射光束**，像连上了。

改细节：**去掉光束**——别只说「去掉线」，AI 会问哪条。我用 **CleanShot Pro 截屏圈线**，粘贴进对话，省长期时间。再要：**场景延长两秒；标志动画离场——Codex 左、Remotion 右；文字滑到中央变成「完整指南」**。

**Host：** 渲染每次都要等吗？

**Riley Brown：** 可以点完整 **渲染** 看 MP4，但迭代阶段我说 **「现在什么都别渲染」**——我们要改很多遍，别每次都 export。AI 也能自己决定何时渲染；你也可以手动点，设 H264 等，像 Premiere 导出。

> **金句 · Riley Brown**
> **中文：** 先 Hello World 再放飞——不存在的东西没法改好。
> **原文：** You just need to get something to exist first, and then you can make it better.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 项目文件夹 | project folder | 多聊天共享资产与合成，Finder 可直接拖 PNG |
| 工件摘要 | artifacts summary | 跑完先看产品/进度/工件/来源，再开 localhost |
| 截图标注 | annotated screenshot | 比纯文字「那条线」精准一个数量级 |

**本章小结**

- 流程：**建项目 → 装 Remotion 插件 → Hello World 验通 → 叠合成**
- **资产** 是外部 PNG；光束、文字、背景是 **代码**
- 迭代期 **关渲染**，用预览栏改，最后再 export

---

## 04 时间线、帧级精修与 Command+Enter 转向 [13:10–16:45]

**Host：** 怎么做到「4 秒 17 帧」这种精度？

**Riley Brown：** 时间线里一段叫 **场景**（后文会改口叫 **序列**）。30fps——时间码里 **4:17 是 4 秒第 17 帧**，不是小数。我可以写：**在 4:17 这一帧，「AI 驱动的动态图形」不要淡出再淡入，要字母重排成「完整指南」**；只要 Codex→Remotion 的小球连线，不要大光束。

**Command + Enter** 不是等它跑完再排队——是 **直接 steer 当前会话**，把编辑并进正在跑的任务。约 **两分钟** 完成：小球回来了，「完整指南」用退格式动画出现。再说 **多停两秒**——刚才结尾太赶。

词汇再巩固：**资产面板** 验证 PNG 已进场景；**合成列表** 切换不同段落。快速模式贵一倍，我愿意为 AI 测试付费——一分零二秒这种速度我能接受。

> **金句 · Riley Brown**
> **中文：** 规范描述 + 截图，比猜 AI 懂不懂「那条线」省太多时间。
> **原文：** I like to be more specific — long term it saves a ton of time. Screenshot, mark the line, paste it in.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 帧引用 | frame reference | 如 4:17，30fps 下的精确编辑锚点 |
| 快速模式 | fast mode | 更高价、更低延迟，适合 demo 迭代 |
| 注入编辑 | inject edit (Cmd+Enter) | 会话中途追加指令，不新开轮次 |

**本章小结**

- 精修靠 **帧号 + 具体动画语义**（删字重打 vs 交叉淡化）
- **截图转向** 是 Remotion×Codex 的 killer 交互，不是重写长 prompt
- Cmd+Enter 让长 demo 不必等完全 idle 再改

---

## 05 品牌资产、元叙事发布片、Suno 与导出 [16:45–27:59]

**Host：** 怎么保证多条视频视觉一致？最后那条「电视里的视频」怎么做的？

**Riley Brown：** 建 **「品牌资产」合成**：深灰/蓝渐变、各色图形、利萨茹曲线背景——全是 **代码**，不是 PNG。以后 prompt 里写 **「用品牌资产里的红色图形」**，新片背景就能对齐。还可以让代理 **加 iPhone 模型**、**加音乐**——时间线绿条表示音轨。

接下来做 **元叙事**：截 Codex UI 当参考，写 **场景一/二/三**——**不要直接用截图，只作参考**。场景一：文字输入 Codex 框「为 Remotion 和 Codex 集成做发布视频」；场景二：Codex 标志 + 加载动画；场景三：**把我们现在做的这条视频 export，放进最终场景电视屏幕里**，显示已渲染完成—— **视频关于制作这条视频**。

全屏模式很爽，侧栏可关。加载时我去 **Suno**：「轻松放克发布视频器乐」→ 下载 MP3 → 拖进项目文件夹 → **「75% 音量铺全片」**。代理加了 **三个序列**（对，叫序列不是场景），绿线证明音轨在位。

再加 **四段序列**：社媒三平台、大量点赞心形、收入上涨、观看 **0→100 万**；倒数第二 **「今天发布你的视频」** 标志再飞走，中央 **OpenAI Codex** 收束。我圈小箭头：**变绿直线、换真实 YouTube/TikTok/Instagram 图标**——再拖 PNG 进文件夹。最后一镜要 **流畅**：标志和「今天发布你的视频」 **同序列一起晃、一起飞出**，再切 **OpenAI Codex** 字，不要图标突变。

**导出**：点 **渲染**，H264，看进度条——变成可拖 Twitter 的真实文件。整片 **七八个 prompt**；再花三小时能更完美，现在已经 **相当能发**。

> **金句 · Riley Brown**
> **中文：** 我们真把刚做的片 export 塞进电视画面——几分钟走完脚本、配乐、特效全流程。
> **原文：** It actually exported the video we made and put it in here — that's awesome.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 元叙事 | meta-narrative | 发布片展示「用 Codex 做发布片」的过程 |
| 画中画 | picture-in-picture | 已渲染 MP4 作为场景内屏幕内容 |
| 品牌一致性 | brand consistency | 引用命名合成而非每次重描述渐变 |
| Suno 资产 | Suno audio asset | 外部 MP3 作时间线音轨，音量百分比控制 |

**本章小结**

- **品牌资产合成** = 跨项目视觉 SSOT，prompt 按名引用
- **元叙事 + 多序列** 把教程片升级成可发的 product video
- Suno + 社媒数据动画 + 最终 H264 **一条 harness 闭环**

---

## 总结：提示词即动态图形，七八个 prompt 够发片

| 维度 | 要点 |
|------|------|
| 界面 | Codex 超级应用 + Remotion 插件，预览栏即动效工作台 |
| 范式 | 代码即视频；Claude 20 条/月、3 亿观看验证发布场景 |
| 上手 | 项目文件夹 + Hello World → 合成 → 资产拖入 |
| 精修 | 帧号 + 截图转向 + Cmd+Enter，迭代期少渲染 |
| 规模化 | 品牌资产合成保风格；序列拼元叙事发布片 |
| 交付 | Suno 配乐 + H264 导出，社媒直发 |

> **金句 · Riley Brown（封底）**
> **中文：** 模型写代码，你写意图——Remotion 把 After Effects 式产出压到几个 prompt。
> **原文：** All you have to do is type in English — the AI writes the code, and the video renders.

### 对个人的启示

- 动效不必先学 AE：**Remotion 插件 + 截图转向** 够做发布级 B-roll
- 建 **品牌资产合成** 再量产，比每条重描述渐变省事
- 迭代时 **关渲染**，最后一条 H264 再上传

### 对团队/产品的启示

- **高频功能发布**（Claude 案例）适合 Remotion 模板化 + Codex 对话
- 元叙事片（电视内嵌已导出视频）是 SaaS 营销的可复制结构
- 与 [[Every增长主管-Codex成为知识工作的OS]] 同 harness：Codex 是知识/创意工作的桌面 OS

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 02:15 | Codex 超级应用与 Remotion 插件 |
| 04:02 | Remotion 代码即视频逻辑 |
| 05:30 | Claude 团队高频 Remotion 发布（3 亿+ 观看） |
| 13:10 | 品牌资产与视觉一致性 |
| 16:45 | 元叙事、帧级编辑、Suno 配乐与导出 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1ik526cEsp/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1ik526cEsp/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv49269956/
- **B 站**：https://www.bilibili.com/video/BV1ik526cEsp/
- **时长**：27:59（1679 s）

### 相关阅读

- [[Codex实战-演示开发一个手机App]] — 同系列 Riley Brown Codex 实战（App vibe coding）
- [[Every增长主管-Codex成为知识工作的OS]] — Codex 作知识工作 OS 的团队视角
- [[Codex实战-构建全能AI营销团队]] — 同一创作者：Skills 栈含 Remotion 营销工作流
- [[Codex负责人-现场演示Codex]] — OpenAI 官方 knowledge work + Agent 演示
- [[OpenAI官方-Codex新手教程]] — CLI / AGENTS.md 系统入门
- [[季白羽-Codex 与 Remotion 纸片分层动画流水线]] — 同为 Codex + Remotion 视频工作流；本篇偏帧级转场与竞品拆解，那篇偏纸片分层的图层/遮挡/配音流水线

### 收录说明

- **视频**：[BV1ik526cEsp](https://www.bilibili.com/video/BV1ik526cEsp/)（B 站 *Easonlee的AI笔记*）
- **主讲**：Riley Brown（视频 Host / 创作者；Chorus Skills）
- **原始发布**：2026-04-25
- **版本**：canonical Host-Guest v3.2（2026-07-06；专栏 S 级主源）
