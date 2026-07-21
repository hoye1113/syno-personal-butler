---
title: "Codex实战：构建全能AI营销团队"
tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "skills", "content_creation"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "codex", "openai", "skills", "content_creation"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "Riley Brown 用 Codex 超级 App + 7 个 Skills/Plugins 跑通营销全流程：YouTube/Readwise 接地、Excalidraw/Paper 可视化、Remotion 动效、FAL Gen Media 迷你 App、Gmail 品牌合作与 Buffer 自动化。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Codex实战-构建全能AI营销团队.md"
source_sha256: "c4e7db7be3a0fe3c93336a51a33fba74af0c87993a3f1587179034c75338d8e4"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1BLGH6REyX/"
speaker: "Riley Brown（创作者 / 营销，Chorus Skills 作者）"
duration: "49:22"
saved: 2026-07-02
spot_check: 2026-07-02
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV1BLGH6REyX/article.md"
asr_version: v2
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1BLGH6REyX/ingest"
column_url: "https://www.bilibili.com/read/cv49574805/"
source_original_date: "2026-05-18"
host_name: "Host"
guest_name: "Riley Brown"
guest_title: "创作者 / Chorus Skills 作者（约 150 万粉丝）"
speaker_inference: "column_monologue_repackaged"
speaker_confidence: "high"
author:
  - "[[Riley Brown]]"
concepts:
  - id: grounding
    zh: 接地
    en: grounding
    one_line: 把 AI 绑到 YouTube 字幕、Readwise 书签等真实参考，而非裸生成
  - id: skill_layer
    zh: 技能层
    en: skill layer
    one_line: 叠在 Codex 上的可复用指令文件，把 API 与审美偏好写进去
  - id: steering
    zh: 转向
    en: steering
    one_line: 截图标注 + 实时注入提示，人机协作修布局
  - id: mini_app_skill
    zh: 含应用的技能
    en: skill with embedded app
    one_line: 人改界面最后一成，代理调同一 API 批量出图
column_source: "Recastory/workspace/bilibili-retranscribe/BV1BLGH6REyX/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
updated: 2026-07-03
---
# Riley Brown：没有技能层，Codex 只是空壳超级应用

**Host：** Host（观众视角）  
**Guest：** Riley Brown（创作者 / Chorus Skills）  
**形态：** Host-Guest 对谈稿 v3.2（solo 教程重排 · 中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `BV1BLGH6REyX/ingest/column_article.md`  
**B 站：** [BV1BLGH6REyX](https://www.bilibili.com/video/BV1BLGH6REyX/)

---

## 开场：为什么现在聊这个

创作者 **Riley Brown** 约 **150 万**粉丝，目标明年年底冲到 **1000 万**。他有一天在笔记本上干活，突然意识到：**95% 的内容和营销任务，已经在 Codex 里完成了**——不是靠裸聊，是靠叠在 Codex 上的 **7 套 Skills 和插件栈**。

这期不是 OpenAI 发布会，是一个人讲自己每天怎么跑通：从 YouTube 字幕接地、Readwise 第二大脑选题，到 Excalidraw/Paper 可视化、Remotion 动效、FAL 迷你应用，再到 Gmail 筛品牌合作。Skills 可在 [chorus.com/skills](https://chorus.com/skills) 一键装进 Codex 或 Claude Code。

**Host：** 你开头说 95% 营销都在 Codex——对没用过的人，Codex 到底是什么？跟 Claude Desktop 差在哪？

**Riley：** Codex 是 OpenAI 的超级应用，把 chat、cowork、code **揉进一个窗口**。我选它，是因为不用再切三个 App。

左侧是代理聊天，中间是对话，右侧是**动态预览**——你要表格就现 spreadsheet，要网页就现浏览器，要幻灯片就现 deck。代理对你电脑有完整控制权：能增删改本地文件。还有**电脑使用**和**浏览器使用**：你能看见鼠标在屏幕上动，它真在点你的浏览器。超级应用在「控电脑」这条线上越来越狠，这是我每天打开 Codex 而不是只开 ChatGPT 的原因。

模型本身不知道你的品味。你得靠 **Skills**——给代理的指令文件——把特定工具的 API 和你的审美绑在一起。没有这层，Codex 再强也只是空壳。我昨天意识到 **95% 营销任务**已经在这完成，靠的就是技能层，不是单靠模型变聪明。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 超级应用 | super app | chat + 文档 + 表格 + 浏览器 + 本地文件，一窗搞定 |
| 技能 | skill | 斜杠 `/` 调用的指令文件，教代理怎么干某类活 |
| 插件 | plugin | 艾特 `@` 调用的能力包，把多个技能捆在一起 |
| 接地 | grounding | 把 AI 绑到 YouTube 字幕、书签等真实参考，别裸生成 |
| 子代理 | sub-agent | 主代理分出去的小代理，并行干活提速 |
| 转向 | steering | 截图标注 + 实时改提示，人机协作修视觉 |
| 技能堆叠 | skill stacking | 多个技能/插件串成一条工作流 |
| 含应用的技能 | skill with embedded app | 代理调 API，人也用同一界面微调 |
| 自动化 | automation | 测通一次后，定时重复跑 |

---

## 01 斜杠调技能，艾特调插件

**Host：** 你说模型不懂品味——那 `/` 和 `@` 到底怎么分？日常最先装哪几个？

**Riley：** 两个命令记牢就行。**斜杠 `/`** 调 **Skill**，比如 `/youtuberesearcher`、`/Excalidraw`、Remotion 最佳实践。**艾特 `@`** 调 **Plugin**——电脑使用、Gmail、日历、Vercel 都是插件。

插件是能力的集合，技能是指令文件。我常把应用部署到 Vercel：点 Vercel 插件，里面挂着 1、2、3 好几项技能。输入 `@Vercel`，代理通常能猜你要哪项；输入 `/Vercel` 再点名沙盒技能，就直接进沙盒环境，不用绕弯子。

Codex 界面我天天用，左上是一排功能按钮，中间是对话，右边是预览。你让它做 App，右边就是浏览器预览；让它做表格或 PPT，右边就切到对应视图——这就是我说「超级应用」的原因，任务一变，预览跟着变。代理还能选模型，对你电脑上的文件想改就改、想删就删。电脑使用和浏览器使用越来越顺：鼠标在屏幕上动你能看见，它真在控浏览器。

左上角「插件」图标管 Skills 和 Plugins。自动化跟技能配套——我 Gmail + 日历筛品牌邮件，测通后设成每天自动生成联系人表，**发邮件给自己**。就算没开 Codex，收件箱里也有同样表格，早上扫一眼就能决策。这就是 cron：到点自己跑。

Claude cowork 或 Claude Code 的用户别慌——**Skills 文件两边通用**，chorus.com/skills 描述里一键装。视频里七套是插件和技能混着用，逻辑永远一样：**先跑通一件事 → 说「请固化成某某 Skill」→ 测几轮 → 「每天 X 点执行」**。我粉丝从 150 万往 1000 万冲，靠的就是这套可重复栈，不是每天重新发明 prompt。

还有个细节：选模型在对话里就能换。代理出错时我会换更强模型重跑，但更多时候是 Skill 写得不清楚——改 Skill 比改 prompt 一劳永逸。Vercel 那类插件把部署、沙盒、环境变量捆在一起，@ 一下它自己挑子技能，省得你记十几个名字。

我保证你看完能带走至少一项能影响业务的技能——七套都会在视频描述链到 chorus.com/skills，点 Excalidraw、YouTube 研究员就能装。别纠结先学哪个：你若做视频，从 YouTube 研究员开始；若刷 Twitter 收藏多，从 Readwise 开始；若接品牌邮件多，先装 Gmail 插件。语法就两条：`/` 技能，`@` 插件。

再补一句什么是「插件图标」里能看见的东西：每个 Plugin 展开是一组 Skill，像 Vercel 里沙盒、部署分开列；Skill 则是单个 md 指令，写清输入输出、调哪些 API、失败怎么办。你第一次用 Codex 可能会慌——它真能删文件——所以我建议先在沙盒或副本目录试 Skill，满意再接到真收件箱、真日历。

这期我按营销链路讲七套，但核心就一句：**Codex 是操作系统，Skill 是你的个人工作流**。没有 Skill，它不知道「Riley 说研究 YouTube」该拉字幕；有了 Skill，同一句话每天可重复、可定时、可堆叠。Claude Desktop 也能聊天，缺的是这一层可复用指令栈——这是我从 150 万往 1000 万冲时最省时间的杠杆。

最后提醒自动化菜单：每个 cron 任务都能点进去看上次运行结果、改时间、暂停。品牌邮件那条我设成「发给自己的邮件」——就算出差只看手机邮箱，也能批会议时段。别小看这一步，它把 Codex 从「打开才干活」变成「后台一直替你跑」。

> **金句 · Riley**
> **中文：** 模型不知道你的流程——「研究 YouTube」该拉字幕、比钩子，这得写进 Skill。
> **原文：** The model doesn't automatically know that when Riley says 'research YouTube,' the right move is Supadata transcripts, compare hooks, and synthesize patterns — that knowledge has to live somewhere, and that's skills.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 技能 | skill | `/` 调用的指令文件，定义步骤和输出格式 |
| 插件 | plugin | `@` 调用的捆绑包，如 Gmail、Calendar、Vercel |
| 电脑使用 | computer use | 代理操控整台电脑，不限于浏览器 |
| 浏览器使用 | browser use | 代理在浏览器里点选、导航，鼠标可见 |
| 自动化 | automation | 定时任务，如每天 8 点跑 Readwise 汇总 |

**本章小结**

- Codex = 超级 App：预览栏即交付物，代理能控本地文件和浏览器
- `/` = Skill，`@` = Plugin；先跑通再固化，再加定时自动化
- 没有技能层，模型不知道你的业务逻辑和审美

---

## 02 接地才出你的味：YouTube 字幕 + Readwise

**Host：** 裸写 prompt 出不来你的风格——「接地」具体怎么做？能现场走一遍吗？

**Riley：** ChatGPT 裸写脚本，用的是训练数据里「什么叫好内容」——跟你的领域、你的钩子没关系。**接地**就是把代理绑到一个有高质量范例的地方。我最常用 YouTube。

**YouTube 研究员**：`/youtuberesearcher`，我说「按 Theo（T3.gg）风格写 intro」，贴大纲。它去 YouTube 拉字幕，扫最新 10 条找最贴的，吐五个 hook。Theo 那种经典开头它真能写出来——「几个月前它是我要代码帮助才打开的东西，现在是我处理几乎所有事的地方：研究、文档、内容规划、邮件、脚本、缩略图、发布，全在这里。」我愣了一下，这太像他了。

Codex 能多线程。Command+N 开新聊，让 Cleo Abram 短视频字幕给五个选题，两个任务并行，蓝点告诉你哪个先完。学概念也行：「用 Karpathy 在 LLM 视频里的口气解释 Skills 和 Plugins。」回复真的像他——「Codex 是围在语言模型外的小操作系统；中心能读能写能推理，但它不知道 Riley 说『研究 YouTube』该用 Supadata 拉字幕、比钩子——这些知识得住在 Skill 里。」

字幕靠 **Supadata** API，YouTube、Instagram、TikTok、X 都能抽，谷歌搜一下就能接。技能本身很简单：任何创作任务都能绑 YouTube 字幕，即时拉数据。

**Readwise CLI** 是第二大脑那条线。很多人以为 Readwise 只存 Kindle 高亮——我主要在 Twitter 收藏 AI 讨论，Chrome/Arc 扩展一键保存，还能备注「下条视频用」。`/readwise CLI`：「根据上周收藏提 **30 个**短视频概念，找共性。」跑完有「每个初创公司都需要内容团队」「Codex 正在成为专业消费者工作空间」这类点子，全基于我存的推文。缺链接我就说「必须带原始 URL，请更新 Skill」——它当场改文件，以后每次输出都带链。

**组合提示**更强：Readwise 看收藏，YouTube 研究员看我频道历史，两技能一起跑，30 个点子更贴我。满意了：「每天早上 **8 点**，把过去三天收藏整理成文档，一周七天。」自动化叫「早晨 Readwise 简短想法」，菜单里能点。这就是我建 Skills 的路：**先有用 → 固化 → 定时**。我可能会每天用 Readwise 想选题——你试一次就知道差别。

有人问我 API 会不会太难——Supadata、Readwise CLI 都是「通行密码」，Skill 里写清楚步骤，你只管下指令。编辑 Skill 更简单：直接说「从今往后输出必须怎样」，它改 md 文件，下次自动生效。比如 Readwise 输出缺链接，我一句话就修了，不用碰代码。接地不是一次性配置，是越用越贴你频道和书签库。

Readwise 那条「每个初创公司都需要内容团队」点子还引了两条推文——一条说搜索社交流量难直接变现，要建立权威品牌。这就是接地威力：不是 GPT 编造的行业观察，是我真收藏过的讨论串。YouTube 接地则保证 hook 像某个具体创作者，而不是「平均 YouTube 腔」。两项技能一叠，选题从「像谁」到「说什么」都有锚点。

自动集成 Readwise 通常一天同步一次；若要立刻入库，用浏览器扩展点一下就行，还能加备注「下条视频用」。这种「第二大脑」不是摆设——代理读的是你真实保存的高价值片段，不是全网平均观点。我建议创作者至少试一周：每天 8 点自动化 + 手动 `/readwise CLI` 补一次，对比裸 ChatGPT 写脚本的差别，体感会非常明显。

> **金句 · Riley**
> **中文：** 接地之后，Theo 的钩子我都能想象他真会那么说——那是他的声音，不是 GPT 的平均味。
> **原文：** It's interesting — I can really imagine him saying this; that's his voice. That's why I love this skill.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 接地 | grounding | 绑到 YouTube 字幕、书签等真实参考 |
| 第二大脑 | second brain | Readwise 存的推文/高亮，代理可读 |
| 命令行接口 | CLI | Readwise CLI 让代理检索你所有收藏 |
| 组合提示 | combo prompt | 多个 Skill 同时跑，输出交叉综合 |
| 外部工具接口 | API | 如 Supadata，从平台拉字幕的通行密码 |

**本章小结**

- 裸 prompt 出平庸内容；YouTube 字幕 + Readwise 书签才是「你的品味」
- Skill 可迭代：「以后必须带原始链接」→ 当场改 Skill 文件
- 测通 → 固化 → 每天 8 点自动化，是建工作流的标准三步

---

## 03 子代理并行，转向修掉视觉最后一成

**Host：** 接地解决文案——图表、动画、B-roll 你怎么在 Codex 里搞？出错怎么收？

**Riley：** 第三个是 **Excalidraw 图表**。我所有内容几乎都用它：`/Excalidraw`，用我口吻解释 Skills vs Plugins，叠 YouTube 研究员找声音素材、Readwise 当第二大脑。步骤多，我说「用**子代理**跑 YouTube 和 Readwise」——主代理分叉 Xeno、Hygens 并行，**大约 10 分 50 秒**全完。子代理在后台跑真的省时间，比串行快一截。

输出是 Excalidraw 共享 URL，右键浏览器打开，点「替换我的内容」。技能文件夹里有 md、脚本、参考、示例——文档像演示文稿，直观。我偏好少字多图，文字后期自己加。全屏、关侧边栏，直接改节点，给视频做大纲特别顺。

要更交互，用 **Paper**——像 Figma，给 AI 代理做的 HTML 画布，内置 MCP 连 Codex。`/Paper` 做 Skills/Plugins 动画解释器：第一段静止，后面每块动起来。它实时更新，你能看见幻灯片一条条长出来，Skills 和 Plugins 绕 Codex 技术栈展开，动画幅度可以后调。

出错别忍——我默认开**转向**，截屏圈重叠，回 Codex：「修重叠，每行单独放，别挤两列。」它实时改排版，宽间距，整洁多了。Paper 上还能改字，比如把标题改成 Banana 试效果。导出 PNG 进下载文件夹，放大很清晰。我用来做 Instagram 构思、品牌规划、登录页十个方案、引流磁铁、缩略图——跟 Excalidraw 类似，但更「网站感」，设计完可以说「把这个变成真网站」，Codex 照做。

第五个是 **Remotion** 和 **Hyperframes**，`@Remotion` 引用，得手动启用。Hyperframes 物理感稍好，Remotion 我更熟、更专业。两个提示词做手机边框 + 群聊 demo 动画——像 Premiere 时间线，能滚到第 8 秒说「放大手机」，改完立刻预览。我还加：0 秒左侧飞入、第 10 秒渐变变红、离场 360 度转、聊天消息「砰」地弹出——默认动画偏呆，得你指挥。

近期一条 **12 万**播放的视频开头就用这个：Codex 七个功能各一段 overlay，观众一眼看懂大纲。模板能复用：「除了那七个技能，再建一个叫『技能大纲』的合成，风格模仿虚线组件，再加三个变体。」它建多场景合成，第一个像原版，第二个按类别分，第三个绕圈排——文字多了就截图说「太挤，修」。注释功能也行，选中一块标「修复」，注释进上下文。

渲染完拖进 Premiere。Hyperframes 和 Remotion 底层我还没完全摸清，两个都试，看哪个顺手。描述里我有 Remotion 详细教程链接。

做视频的人常忽略一点：这些图形不是替代剪辑，是**降低 B-roll 门槛**。以前动效要找专人或学 After Effects，现在在 Codex 里描述时间线，截图改帧，渲染导出——专业动态图形变成营销工作流里的一环。Excalidraw 偏「提纲」，Paper 偏「动效说明书」，Remotion 偏「可播的成片素材」，三层叠起来，一条视频从脚本到视觉大纲到片头叠加层都能在一个工作台里跑。

Excalidraw 默认文字可能偏多——下载技能后你可以说「更新技能，少字多图」或「每块下面加两三行说明」，完全随你。Paper 更重，有时希望在当前浏览器开画布，它会在 Codex 外开——重量在那儿，但实时**转向**值得。Remotion 右边界面像本地小 App，点渲染就落盘，这种「预览即交付」跟 Codex 超级 App 哲学一致。子代理那 **10 分 50 秒** 对我这种常同时跑三四个任务的人，是日常标配。

> **金句 · Riley**
> **中文：** 它出错了你就得转向——截图圈出来，别等它自己悟。
> **原文：** When you see it mess up, you have to steer it — screenshot, inject the prompt, make it fit.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 子代理 | sub-agent | 主代理并行派出的小代理，提速多源检索 |
| 转向 | steering | 截图/注释 + 实时提示，修布局重叠 |
| 动效合成 | composition | Remotion 里多场景模板，可复用改文案 |
| 屏幕叠加 | screen overlay / B-roll | 片头大纲、手机 demo 等视频内图形 |
| 渲染 | render | 导出成视频文件，进剪辑软件 |

**本章小结**

- Excalidraw 适合思维导图式提纲；Paper 适合 Figma 级动画 explainer
- 子代理并行把「拉 YouTube + 读 Readwise + 画图」从串行变并行
- Remotion/Hyperframes：时间线级精修靠截图 + 转向，不是重写 prompt

---

## 04 迷你应用双入口，邮件堆栈你只点批准

**Host：** 你说 Gen Media 和 Gmail 是最后两块——「含应用的 Skill」和「技能堆叠」什么意思？

**Riley：** 第六个是我还在深挖的 **Gen Media**。老观众知道我写过 FAL 图像 App——第一个版本 **40 分钟**跑完，遍历 FAL 所有图像/视频 API。本地数据库存图，写「莱利骑着老虎」就生成；切 FAL 模式能选任意模型，图像转视频、Topaz 放大都行。

关键区别：**我 vibe 出来的 App，代理也能用**。我说「为 YouTube 缩略图生成四张 Riley 照片进网格」——我不碰界面，代理自选 GPT 图像还是 FAL API，结果进同一网格。我控 App，代理也控 App。**市场上巨大的机会，就是「含应用的 Skill」**。

Gen Media 教代理调 FAL，同时给人界面。代理出图给链接，我打开网格，拖一张：「加白字『天哪』、背景压暗、电影感。」**代理干前 90% 素材堆砌，我收最后 10% 审美**——价值在这最后一笔。App 里有**元素**库：我的照片、YouTube 上抓的 Matt Wolfe 缩略图。我说「生成 Matt Wolfe 风格的 Riley」，代理查数据库插参考，我也能手动搜「Matt Wolfe」插进去。逻辑复杂，但方向清楚：**人机共享同一控制台**。

第七个是 **品牌合作经理**，自主性稍低但省时间。搜收件箱、滤低价和重复、研究品牌、调 YouTube 研究员看频道，输出优先级表——Hyper Agent、Airwallex、Minimax、HubSpot、Cursor、Canva、Opus 高优先级排上面，不太熟的中等。我并行开窗口：「跑品牌合作研究员，整理过去一周表格。」

Gmail 插件演示：「总结过去 **72 小时**赞助邮件，查日历，建议下周通话时段，我批准再约。」跑完大约 **七分钟**，文档列「品牌赞助外联」——空闲时间和建议 slot 清清楚楚。我说「就这些时段安排」，它照做。我大部分时间原来耗在滤垃圾邮件上，代理记得我的偏好，知道我要什么。

自动化：联系人表每天自动生成，**发邮件给自己**——没开 Codex 也能看。Bonus **Buffer**：`/Buffer`，查研究记录、记忆、聊天记录，筛五个值得做的选题灌进 Buffer。Buffer 是我社媒排期器，新 API 已授权 Codex——有视频它能建草稿，但我最爱**存创意**：每天清理，把想法付诸创作或删掉。Codex 把杂事「卸载」到 Buffer，想法不蒸发。

以上 Skills 全在 chorus.com/skills，持续更新，Codex 和 Claude Code 都能一键装。

**技能堆叠**是关键词：品牌合作经理不是孤立 Skill，它内部调 YouTube 研究员、Gmail 插件、日历插件——像搭乐高。你筛邮件最耗的是记偏好、查档、对档期，堆叠后变成「批不批」决策。Gen Media 加 Buffer 则是把「创作」和「排期」闭环：代理在 Codex 里研究、出图、记记忆，Buffer 技能再把记忆转成可排期草稿。我理想的一天：早上 Readwise 自动化给选题，白天 Paper/Remotion 出视觉，代理筛邮件约会议，晚上 Buffer 收点子——**95% 在 Codex 里转，我只做审美把关和批准**。

FAL App 里基本模式只用 GPT 图像，FAL 模式能换任意托管模型——代理挑哪条路由你看不见，但结果进同一网格，这很重要：人跟代理不抢界面，抢的是同一资产池。品牌表我还能问「帮我回复这几家吗？」——它给概览，我批文案再发。行政从「翻收件箱两小时」缩成「看表十分钟」。Buffer 那条看似小，却解决「Codex 里想了十个点子，下班全忘」——记忆检索 + 排期接口，把创作流最后一公里接上。

> **金句 · Riley**
> **中文：** 我不喜欢 AI 包办到底——它出一大堆选项，最后一笔审美必须我来。
> **原文：** I don't like relying on AI for everything — I want tons of options, and I do the last 10% until I'm fully happy. That's where the value is.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 含应用的技能 | skill with embedded app | 代理调 API + 人类用 UI 微调同一资产 |
| 技能堆叠 | skill stacking | Gmail + Calendar + YouTube 研究员串成品牌筛单 |
| 元素 | elements | 缩略图参考库，如自己的照片、他人风格样本 |
| 氛围编程 | vibe coding | 一个提示词搭出能跑的 FAL 图像 App |
| 内容排期 | content scheduling | Buffer API 把记忆里的点子变成可发布草稿 |

**本章小结**

- Gen Media：人改 grid 最后一成，代理批量出图，共享同一 FAL API
- 品牌邮件 = 技能堆叠 + 自动化：筛收件箱 → 优先级表 → 日历约会议 → 你点批准
- Buffer 把 Codex 记忆「卸载」成排期草稿，防想法蒸发

---

## 总结：95% 在 Codex，价值在最后 10%

| 维度 | 要点 |
|------|------|
| 定位 | Codex 是营销超级 App，不是纯代码助手；预览栏即交付 |
| 语法 | `/` Skill 写流程，`@` Plugin 接 Gmail/日历/Remotion；先跑通再自动化 |
| 接地 | YouTube 字幕 + Readwise 第二大脑，比裸 prompt 更接近你的钩子 |
| 视觉 | Excalidraw/Paper + 子代理并行；出错靠转向截图修 |
| 动效 | Remotion/Hyperframes 时间线精修，渲染进 Premiere |
| 双入口 | Gen Media 迷你 App：代理批量、人类收 10% 审美 |
| 行政 | Gmail 堆栈筛品牌合作，Buffer 防选题丢失 |

> **金句 · Riley（封底）**
> **中文：** 模型是操作系统，Skill 才是你的个人工作流——没有它，Codex 不知道 Riley 是谁。
> **原文：** Think of Codex as a small operating system around the language model — it doesn't know your workflows until skills tell it what to do when you say 'research YouTube.'

### 对个人的启示

- 从 **一个 Skill 一件事** 开始（YouTube 研究员或 Readwise），满意了再叠自动化
- 视觉和动效别追求一次完美——**转向 + 截图** 比重写长 prompt 快
- 最后一成审美留给自己：AI 出选项，你点批准

### 对团队/产品的启示

- 「含应用的 Skill」是新品类：API + UI 双入口，人跟代理共用同一资产池
- 技能堆叠（Gmail + 日历 + 研究员）把行政从小时缩到「批不批」
- chorus.com/skills 一键分发，Codex 与 Claude Code 共用同一套 Skills 文件

---

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 05:15 | 技能是 AI 代理的指令灵魂 |
| 07:30 | 建立基于 YouTube 的内容接地 |
| 11:45 | 联动 Readwise 构建第二大脑自动化 |
| 16:20 | 视觉资产的交互式生成与微调 |
| 23:10 | 视频 B-roll 与动态图形的自动化生产 |
| 30:45 | 迷你应用：AI 与人类共享的控制台 |
| 38:20 | 智能邮件过滤与品牌合作管理 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV1BLGH6REyX/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV1BLGH6REyX/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv49574805/
- **B 站**：https://www.bilibili.com/video/BV1BLGH6REyX/
- **时长**：49:22

### 相关阅读

- [[Codex负责人-现场演示Codex]] — OpenAI 官方 knowledge work + 并行 Agent 演示  
- [[OpenAI官方-Codex新手教程]] — CLI / AGENTS.md / MCP 系统入门  
- [[WorkOS-创建和使用Skills方法论]] — Skills 创建与组织方法论  
- [[Claude Code实战-结合Obsidian打造第二大脑]] — 另一套「第二大脑 + Agent」路径  
- [[MOC - Agent Theory and Design]] — Agent 理论横切索引  

---

### 收录说明

- **视频**：[BV1BLGH6REyX](https://www.bilibili.com/video/BV1BLGH6REyX/)（B 站 *Easonlee的AI笔记*）  
- **讲者**：Riley Brown（创作者；Chorus Skills）  
- **时长**：~49:22  
- **转写**：Recastory `bilibili-retranscribe/BV1BLGH6REyX/`（FunASR SenseVoice + cam++，**asr v2 后处理** 38 段）  
- **Skills 入口**：chorus.com/skills（视频中提及）  
- **版本**：canonical Host-Guest v3.2（2026-07-03；原讲义已合并）

