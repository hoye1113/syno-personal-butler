---
title: "Riley Brown-Fable 5与Paper的智能体原生设计流"
tags: ["ai_agent", "bilibili", "article", "ai_workflow", "ai_coding"]
created: "2026-08-13"
source: "B站图文专栏 - Easonlee的AI笔记"
description: "AI 创作者 Riley Brown 演示 Claude Code 与 Fable 5（通过 Paper MCP 服务器）深度联动的智能体原生设计流。核心方法：AI 智能体不再只生成图片，而是通过 MCP 直接读写专为智能体打造的画布应用 Paper 的画板——从多参考图加速创意迭代、图文分离图层保留编辑弹性、Command+Shift+R 快捷资产替换、Scrape 网页爬取技能抓取品牌风格，到一句口令将设计稿转化为自适应网页并一键部署至 Vercel，打通了从画布设计到线上交付的完整闭环，标志着设计工具从「被人类操作」转向「被智能体操作」。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/行业观点与组织/Riley Brown-Fable 5与Paper的智能体原生设计流.md"
ingest_workflow: bilibili_opus_ingest_v2
source_original_date: 2026-07-27
author: "Riley Brown（AI 创作者）"
uploader: "Easonlee的AI笔记"
source_type: bilibili_opus
source_url: "https://www.bilibili.com/opus/1229541766969950216"
opus_id: "1229541766969950216"
column_id: "cv51806392"
video_url: ""
bv: ""
source_tier: C2
primary_source: column
material_tier: S
source_form: lecture
content_form: dialogue
dialogue_fidelity: reconstructed
question_source: editorial
voice_basis: attributed_paraphrase
factual_status: partial
factual_reviewed: 2026-08-13
verification_scope: column_only
verification_basis:
  - column
unresolved_facts:
  - "BV: opus 页未挂关联视频（cv51806392 为纯图文专栏），无法做 column_plus_original 交叉核验"
---

# Riley Brown-Fable 5与Paper的智能体原生设计流

> Riley Brown 是 AI 创作者。他演示用 Claude Code 与 Fable 5 驱动专为 AI 智能体打造的画布应用 Paper，完成 YouTube 缩略图、Instagram 配图、演示文稿到个人网站的全部设计工作。核心问题：AI 智能体如何不再局限于「生成一张图片」，而是直接在设计画布上创作、迭代并发布？
>
> **核心主张：通过 Paper MCP 服务器，AI 智能体可直接读写原生设计画布，把「生成式资产」与「画板编辑」打通成一条闭环——从多参考图迭代、图文分离编辑、快捷资产替换、品牌风格网页爬取，到一句口令部署为真实网站；设计工具正从「被人类操作」转向「被智能体操作」。**

> 通过 Paper MCP 服务器，Claude Code 将设计写入服务器、读取上下文并执行下一步，然后把信息传递给 Paper 设计文件——AI 智能体不再只是生成图片，而是直接在画布上创作。
> ——Riley Brown

## 开场

Riley 的判断起点：传统的 AI 图像生成只产出孤立图片，而真正的设计工作需要在画板上反复迭代、组合图层、对齐品牌风格、最终上线。Paper 是一款专为 AI 智能体打造的画布类桌面应用（而非 Figma 那种为人手操作设计的工具），它通过 MCP（Model Context Protocol）服务器与 Claude Code 对接，让智能体能直接在画板上绘制、命名框架、读写设计文件。这打通了一条全新的工作流：设计稿不再是图片，而是可被智能体直接操作的结构化画布。

## 01 MCP 让智能体直接控制原生设计画布

**核心判断：AI 智能体通过 MCP 服务器可直接控制设计工具的原生画布（绘制图形、命名框架、读写文件），而非通过 API 间接调用——这打破了以往 API 在界面交互与自动化设计上的壁垒，标志设计工具从「被人类操作」转向「被智能体操作」。**

**编者问：** 为什么说 Paper 让 AI 智能体「直接控制画布」是一个突破？

**Riley Brown：** 这里运行着 Claude Code 和 Fable 5，它控制的不是 Figma，而是一个专为 AI 智能体打造的画布应用 Paper。它的运作机制非常清晰——通过 Paper MCP 服务器进行交互：Claude Code 将设计写入服务器、读取上下文并执行下一步，然后把信息传递给 Paper 设计文件。整个系统基于 HTML 构建，因此运行速度极快且质量极高。

配置 MCP 的方式很轻量：你只需在 AI 工具（Claude 桌面端、Codex、Cursor 等）中新建对话，输入「我想设置 MCP 服务器来控制我的 paper.design」，粘贴文档链接，AI 就会自动配置好连接。测试时把 Paper 窗口和 Claude Code 并排打开、在画板上输入 Hello，然后让 Claude Code 识别当前画板并创建一个图形验证控制权——它会成功接管、为框架命名（比如「来自 Claude Code 的问候」）并在画布上直接绘制文字与图形。至此，AI 智能体与设计画布的连接就打通了。

## 02 多参考图机制加速创意概念迭代

**核心判断：多图参考机制让 AI 更精准捕捉构图与光影，配合具体提示词可瞬间生成多种版式——以过往设计或他人作品为基础快速批量生成变体，把早期设计概念的探索效率提升一个量级。**

**编者问：** 在画布上，AI 如何加速设计概念的迭代？

**Riley Brown：** 多参考图机制是关键。制作 YouTube 缩略图时，我可以把一张高质量模板和自己的照片拖入画布并排摆放，Shift 键同时选中，输入「把中间的人换成这个人、文字改为 fable VS GPT 5.6」，就能快速生成新缩略图。

如果想参考其他博主的高质量缩略图，我会在 Claude Code 里输入指令，让它找出某位博主表现最好的 12 张缩略图并导入到 Paper 的同一个框架中——这里它调用的是一个专门的 YouTube 缩略图抓取技能（Claude Code 默认做不到，但加载该技能即可实现）。有了参考图库后，选中想要的宽高比图片、用图像编辑功能按住 Shift 把多张图片和图标设为参考，输入「文字改成某句、替换为指定图标、换掉人物」，就能批量生成变体。生成图形后若色调偏暗（比如我照片背后有光效），可以追加提示词「保持白色背景、去掉人物周围光效」继续微调。这就是以过往设计或他人作品为基础、快速迭代直到找到满意方案的方式。

## 03 图文分离图层保留编辑弹性

**核心判断：智能体生成的文案与背景是相互独立的图层，既可由口令让 AI 修改、也可随时手动调整——这让生成式资产保留了编辑弹性，而非一次性「烤死」的图片，极大提升了迭代效率。**

**编者问：** 生成的内容还能再编辑吗？

**Riley Brown：** 可以，这也是这种工作流最棒的地方之一。以制作 Instagram 配图为例，我们可以在 Paper 中重现一张社交媒体配图，并添加可直接编辑的文字图层：指示 AI 直接使用照片、加入原图的黑色渐变效果，同时添加可编辑的白色文字覆盖层。

为了精确控制 AI 使用哪张图片资源，我可以复制对应资产的链接并发送给 Claude，从而精确指定素材；然后继续修改样式——改变文字颜色、微调布局、多做几个版本。最关键的是：所有的文本都是可编辑的，而不是作为图片的一部分被固定下来，这让迭代效率变得极高。手动去调整这些细节其实非常繁琐，而通过图层化生成，文本层和背景层相互独立，随时可改。

## 04 快捷替换命令打通画板生成流

**核心判断：利用 Command+Shift+R 快捷键，能瞬间将画板中的旧图层替换为新生成的资产版本——这条指令打通了「生成式资产」与「画板拼接」之间的效率瓶颈，让资产替换像换贴纸一样轻。**

**编者问：** 生成的新资产如何快速替换到已有画板里？

**Riley Brown：** 如果想替换配图中的背景，可以直接点击图片进行编辑、生成新背景的变体，然后复制该图、选中目标位置、按下 Command+Shift+R 即可一键替换。比如我点击替换后，它就把背景改成了品牌蓝色——就是这么直接。

这个快捷替换命令打通了「生成式资产」与「画板拼接」之间的效率瓶颈：你不必每次都重新生成整张图、再手动拖到画板上对齐，而是先生成新资产、再用快捷键把画板里指定的旧图层瞬间换掉。在保持画板整体结构不变的前提下，单点替换某个图层，让迭代像换贴纸一样轻。

## 05 网页爬取技能赋能品牌风格抓取

**核心判断：AI 通过名为 Scrape 的网页爬取技能（基于 Firecrawl API）实时学习特定网站的设计规范与真实数据，结合已有画布资产构建排版合理、视觉水准高的幻灯片——让「参考某品牌风格」从抽象描述变成精确的样式抓取与套用。**

**编者问：** 如何让设计稿对齐某个品牌的视觉风格？

**Riley Brown：** 制作演示文稿和落地页时，我会把 Fable 的思考度（Effort）调高至 High。抠除照片背景后用 Frame（框架）功能把一组照片框起来，这样就只需复制并提供一个框架链接即可。把框架链接发给 Claude，要求它设计一份 6 张幻灯片的演示文稿用于赞助商推广，并明确「视觉上借鉴 Perplexity 的品牌设计风格、保持简单留白、不需要页脚和副标题」。

这里 AI 会通过名为 Scrape 的网页爬取技能，利用 Firecrawl API 抓取指定网站的样式并应用到当前演示文稿中。它会按照 Perplexity 的配色和字体，结合我们提供的个人网站信息，把页面内容和数据同步更新到幻灯片中——完整构建整套幻灯片，甚至自动调整图片位置、为最后一张设计不同颜色的背景。让「参考某品牌风格」从一句抽象描述，变成了对真实站点设计规范的精确抓取与套用。

## 06 设计稿一键发布部署为真实网站

**核心判断：仅需一句口令，Claude Code 即可将设计稿转化为针对网页端与移动端优化的自适应网页、并一键部署至 Vercel——这彻底打通了从画布设计到线上生产交付的界限。**

**编者问：** 设计稿能直接变成上线网站吗？

**Riley Brown：** 这是最后一环。我只需一条提示词：「创建一个针对网页端和移动端优化的落地页，最上方展示 Riley Brown 和一句简介，下方嵌入这套可切换的幻灯片，接着把该网站部署到 Vercel 并提供访问链接。」

它从我个人网站上获取相关信息，创建了一个自适应网站，并成功部署在 riley-sponsor-site.vercel.app 上——效果与我们在 Paper 中制作的完全一致。事实上，比起我现有的网站，我更喜欢这一个，所以我可能会改用它。今天我们聊了如何生成图形——从 YouTube 缩略图、Instagram 配图，到演示文稿、再到可上线的网站——你只需让 Fable 帮你设计图形，它就会自动放到 Paper 的画布上，还能把这些演示文稿嵌入网页。这就是搭建起来极其轻松的完整闭环。

## 限制与边界

- **工具版本与产品名为专栏所述**：文中 Fable 5、Paper（paper.design）、Command+Shift+R、Scrape/Firecrawl API、Vercel 部署等操作与产品形态，为专栏（2026-07-27）口径，工具的具体功能、快捷键、计费方式（Paper 订阅额度消耗）会随版本变化，落地以官方最新文档为准。
- **「智能体原生设计」是工作流演示非通用方法论**：本篇是 Riley Brown 个人工作流的实战演示，其有效性依赖 Paper 这一类原生支持 MCP 的画布工具；在 Figma 等为人手设计的工具上不完全适用，属早期实践而非成熟可复用的设计规范。
- **未涉及失败模式与边界**：演示以成功案例为主，未覆盖生成质量不稳定、MCP 连接异常、抓取技能受限等实际工程中的失败情形；作者自述使用 Fable 仅四五天、对 Paper 仍是新手。
- **「彻底改变设计」为创作者主观判断**：专栏标题与作者表述带有产品推广与个人热情色彩，本期视频据作者声明未获 Claude 或 Paper 赞助。
- **源限制**：`column_only` 核验——opus 页（cv51806392）未挂关联视频 BV，无法做 `column_plus_original` 交叉核验；正文忠实于专栏整理稿，产品功能与计费细节未独立核验。

## 知识连接

- **支持** [[MOC - Harness Engineering]]：harness（Claude Code）通过 Paper MCP 服务器直接驱动原生设计画布、读写设计文件，是 harness 与应用深度结合形成飞轮的具体范例。
- **补充** [[Matthew Berman-最佳 Vibe Coding 工作流]]：同为 AI 工作流的实战演示——Riley Brown 展示智能体原生设计闭环，与 Vibe Coding 工作流互为补充，都是「人用自然语言指挥 AI 产出成品」的范式。

## 来源说明

- 主源：B站图文专栏（column），opus `1229541766969950216` / `cv51806392`，发布于 2026-07-27；opus 页未挂关联视频 BV。
- 读取：专栏文字正文与页面元数据；图片、ASR、Recastory、transcript 全部跳过；删除「重点速览」重复段；省略产品下载/配置的操作步骤细节与「嘉宾B」的零散附和，聚焦每一步背后的方法论判断。
- 声音：单人讲座/演示（Riley Brown），按 Skill 路由重构为编辑式对谈（reconstructed / editorial）：提问为编者问，回答以 Riley Brown 归属呈现（attributed_paraphrase），忠实于专栏整理稿的演示流程与主张。
- `verification_scope: column_only`：笔记忠实于专栏，外部事实未独立核验；C2 源无 BV 映射，故 `factual_status: partial`。
