---
title: "Seedance实战：AI视频可控编辑"
tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "prompting"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "ai_coding", "ai_video", "ai_creative", "prompting"]
created: "2026-07-08"
source: "https://www.bilibili.com/video/BV1VEooBdEjQ/"
description: "Greg Isenberg对话AI创意专家Sirio，深度测评Seedance 2.0的多输入生成、视频扩展、唇形同步与商业落地。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/AI编程实战/Seedance实战-AI视频可控编辑.md"
source_sha256: "0052e68f419876421c86b4f40477293d8363dcced1fb3b43c10c3bcc521bfeb9"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV1VEooBdEjQ/"
column_url: "https://www.bilibili.com/read/cv48613017/"
column_source: "bilibili_column"
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV1VEooBdEjQ/ingest"
duration: ~22 min
saved: 2026-07-08
updated: 2026-07-08
material_tier: S
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: "Host-Guest canonical (column primary)"
host_name: "Greg Isenberg"
guest_name: "Sirio"
guest_title: "AI创意专家"
speaker_inference: "column_article明确标注Greg Isenberg(主持人)/Sirio(嘉宾)角色"
speaker_confidence: high
author:
  - "[[Sirio]]"
  - "[[Greg Isenberg]]"
concepts:
  - id: multi_input_generation
    zh: 多输入生成
    en: multi-input generation
    one_line: 同时输入多张图片、视频和音频来精准控制AI视频生成
  - id: video_extension
    zh: 视频扩展
    en: video extension
    one_line: 延长视频片尾或填补两个视频片段之间的空白
  - id: lip_sync
    zh: 唇形同步
    en: lip sync
    one_line: 通过提示词控制AI虚拟形象的口型与台词精确匹配
  - id: muscle_movement_prompting
    zh: 肌肉运动提示词
    en: muscle movement prompting
    one_line: 描述具体肌肉运动而非抽象情绪来控制AI角色表情
---

# Seedance实战：AI视频可控编辑

**Host：** Greg Isenberg（科技创作者）  
**Guest：** Sirio（AI创意专家）  
**形态：** 访谈 · Host-Guest canonical v3.2（**专栏主源** · 中文口语化）  
**B 站：** [BV1VEooBdEjQ](https://www.bilibili.com/video/BV1VEooBdEjQ/) · **专栏** [cv48613017](https://www.bilibili.com/read/cv48613017/) · **时长** ~22 min

---

## 开场

Sirio 被 Greg 称为"世界上最伟大的AI创意人才之一"。这期不是泛泛而谈的模型评测，而是一个实操指南——如何用Seedance 2.0建立能赚钱的业务。Sirio演示了从虚拟试穿、多语种广告到AI网红唇形同步的完整工作流，核心判断是：AI视频的下半场不再是拼生成质量，而是拼精准编辑和商业落地。

五章预告：**多输入生成打破单图局限** → **3D资产纹理与视频扩展** → **提示词从抽象描述转向肌肉运动** → **垂直场景模型优于全能模型** → **Adobe的未来在于代理化后期**。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 多输入生成 | multi-input generation | 同时输入多张图片、视频和音频来控制生成结果 |
| 视频扩展 | video extension | 把3秒视频延长到15秒，或填补两段视频之间的空白 |
| 唇形同步 | lip sync | AI虚拟形象的口型精确匹配台词发音 |
| 肌肉运动提示词 | muscle movement prompting | 描述具体的肌肉动作而非抽象情绪词 |
| 3D资产纹理 | 3D asset texturing | 把图片纹理贴到3D渲染的物体表面 |
| A/B测试 | A/B testing | 同一内容换不同版本对比转化效果 |

---

## 01 多输入生成：从"一张图生成视频"到"多素材精准控制"

**Greg：** Seedance 2.0和以前的AI视频工具最大的区别是什么？为什么你说它是"第一个支持多输入生成的AI模型"？

**Sirio：** 以前的AI视频工具通常只能用第一帧或最后一帧作为参考，然后根据这两个输入生成视频。但Seedance 2.0支持同时上传最多两张图片、两个视频，还可以添加一个音频文件。模型会根据你的提示词和想要实现的目标，将所有这些输入结合起来生成最终的视频。

这意味着什么？这里有一个绿幕视频——顺便说一下，它完全是由Seedance生成的。假设我想做些改变：我是一个制作工作室，正在开发这款游戏，我想在社交媒体上放一些演示。我想用两个不同的角色替换视频里的这两个人，同时还想替换背景。传统上，这会花费很长时间，而且成本也非常高。

我们利用的是Seedance的多输入功能。我们会有角色一、角色二，以及一张背景图像。在提示词中通过标记来引用所有这些输入。点击生成，视频大约需要60秒就能生成出来。

**Greg：** 所以它不只是一个视频生成器，更像是一个视频编辑器？

**Sirio：** 我就是这么看待它的。它几乎就像是视频领域的专业工具，用例是无限的。它不只是简单的文生视频，而是通过结合多个输入，生成一个比传统"图像到视频"模型复杂得多的输出。根据我目前的测试，Seedance 2.0的质量是无与伦比的。

> **金句 · Sirio**
> **中文：** Seedance 2.0不仅仅是一个视频生成器，它更像是一个视频编辑器。它几乎就像是视频领域的专业工具，用例是无限的。
> **原文：** Seedance 2.0 is not just a video generator. It's more like a video editor. It's almost like a professional tool for video, and the use cases are unlimited.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 多输入生成 | multi-input generation | 同时输入多张图片、视频和音频来控制生成结果 |
| 绿幕视频 | green screen video | 在绿色背景前拍摄，后期可替换背景的视频 |
| 标记引用 | tag reference | 在提示词中用符号指向特定的输入素材 |

**本章小结**
- Seedance 2.0突破了传统单图生成的限制，支持最多两张图片、两个视频和一个音频同时输入
- 多输入模式让用户可以在保留原始视频运动轨迹的同时，精准替换角色、服装或背景
- 60秒内完成生成，质量在当前测试中无出其右

---

## 02 商业落地：虚拟试穿与多语种广告的一次拍摄无限演化

**Greg：** 能不能展示一个具体的商业用例？比如电商或者广告行业怎么用这个？

**Sirio：** 好的，我来展示一个我自己做的视频。这是一个虚拟试穿视频。当时我在加拿大蒙特利尔录制了自己，气温是零下30度，我穿着短裤。我想，不知道AI能不能让我穿上这套衣服。所以现在我想让AI替换掉画面中的我，实际上是让我穿上这套衣服，然后让一只熊走过去。

你看，当熊走过时，你甚至能看到所有的脚印。我的脸还是原来的样子，衣服也完全匹配。看看靴子，看看图案，还有这里的裤子。如果我们去看源参考图像——它保留了所有细节，比如这个特定的图案，这个深色的剪裁。生成过程不需要超过60秒。

**Greg：** 这在广告A/B测试中太有用了。你想让模特保持完全相同的动作，只是替换掉他们穿的衣服或说的语言。

**Sirio：** 没错。另一个很酷的用例是翻译。我们有一个中文的原始视频，她正在展示眼镜。但如果你的公司在美国运营，你希望她以完全相同的方式移动，因为你正在做A/B测试，你希望所有东西看起来都完全一样，但语言不同，模特也不同。我们用Seedance替换掉那个女人，同时把她说的中文翻译成英文。看看那个眨眼，看看她把手放在眼镜上的方式，动作完全一样。

> **金句 · Sirio**
> **中文：** 你希望她以完全相同的方式移动，因为你正在进行广告A/B测试，你希望所有东西看起来都完全一样，但语言不同，模特也不同。
> **原文：** You want her to move in exactly the same way because you're doing ad A/B testing. You want everything to look identical, but with different language and different model.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 虚拟试穿 | virtual try-on | AI替换视频中人物的服装，保留原始动作 |
| A/B测试 | A/B testing | 同一内容换不同版本对比转化效果 |
| 多语种广告 | multilingual ad | 同一视频素材自动翻译成不同语言版本 |

**本章小结**
- 虚拟试穿场景下，AI保留了面部特征、服装图案和动作细节，连熊走过的脚印都生成了
- 多语种广告可在一个视频素材基础上自动翻译、替换模特，实现极低成本的全球化分发
- "一次拍摄，无限演化"的模式将彻底改变电商A/B测试的效率

---

## 03 视频扩展：填补两段视频之间的空白

**Greg：** 视频扩展功能具体能做什么？我听说它不仅能延长片尾，还能做更复杂的事情。

**Sirio：** 没错。你有一个3秒或10秒的视频，你想把它延长15秒，同时保持一切不变。我们以前做不到这一点。这里有3秒的视频，我们不知道接下来会发生什么。我们可以重现整个场景，然后使用视频扩展功能，它会根据提示词继续实际的故事情节，同时保持高度一致。

还有另一个用例，它实际上可以填充视频的中间部分。刚才展示的是延长视频的最后一部分，接下来我展示另一个用例——它会填补空白。也就是说我们有两个视频，它会找出中间应该放什么，这对我来说太疯狂了。

**Greg：** 如果它能做到这一点，那将是巨大的进步。因为在使用这些模型时，做广告这对我个人来说一直是一个痛点——你只是希望那个视频能再多出三秒，以前做不到。

**Sirio：** 就像你只是希望那个视频能再多出三秒，以前做不到。它从视频剪辑的地方延长了视频，生成了一个完整的、不同的场景，而且与最后一帧完全衔接。还有3D资产纹理的用例——我们有一个包裹，传统3D渲染，包裹上没有品牌。如果我们用一张图片替换那个包裹呢？通过结合源参考和图像参考，你可以开始为所有这些3D资产应用纹理。

> **金句 · Greg Isenberg**
> **中文：** 如果它能做到这一点，那将是巨大的进步——你只是希望那个视频能再多出三秒，以前做不到。
> **原文：** If it can do that, it would be huge. Because you just want the video to be three seconds longer, and you couldn't do that before.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 视频扩展 | video extension | 把3秒视频延长到15秒，或填补两段视频之间的空白 |
| 3D资产纹理 | 3D asset texturing | 把图片纹理贴到3D渲染的物体表面 |
| 场景衔接 | scene continuity | 扩展后的视频与原视频最后一帧自然衔接 |

**本章小结**
- 视频扩展有两种用法：延长片尾和填补两段视频之间的空白
- 填补空白功能对广告制作至关重要，可以先定义关键帧再由AI补全过渡
- 3D资产纹理功能让品牌方用无标签通用模板快速生成不同语种、不同模特的广告

---

## 04 提示词工程：别再说"角色很悲伤"，描述他的肌肉怎么动

**Greg：** 在提示词方面，你是手动写还是用LLM来优化？

**Sirio：** 你当然可以使用LLM。Claude做得非常出色，特别是3.5 Opus版本。我以前用过GPT，但我确实认为Claude在理解视觉模型的提示工程方面做得更好。我喜欢先自己开始写提示词，然后大多数时候我会用Claude来优化它。

但在处理AI网红的表情和情绪时，简单的"悲伤"或"开心"已失效。你必须描述具体的肌肉运动、语调转变和肢体语言。一个人有成千上万种表达悲伤的方式。但通过描述肌肉运动、动作、语调和肢体语言的转变，它能够实现更真实的结果。

**Greg：** 所以引号里的内容就是虚拟形象会说的台词？

**Sirio：** 对。非常简单的自然语言，你只要告诉它你想让它做什么，它就会明白。当然，有一些提示方法可以使它们看起来和感觉更真实，尤其是情感。如何控制情绪？你不能只说"角色很悲伤"或"角色很开心"。你必须描述肌肉运动。这个视频的目标就是让它看起来不像AI。

看看那个眨眼，看看她把手放在眼镜上的方式，动作完全一样。看看相机里的模糊感，比如焦点的切换和运动。看看文字——文字非常准确，它没有改变。

> **金句 · Sirio**
> **中文：** 你不能只说"角色很悲伤"。一个人有成千上万种表达悲伤的方式。你必须描述肌肉运动、动作、语调和肢体语言的转变。
> **原文：** You can't just say "the character is sad." A person has thousands of ways to express sadness. You must describe muscle movements, actions, vocal tone shifts, and body language transitions.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 肌肉运动提示词 | muscle movement prompting | 描述具体肌肉动作而非抽象情绪词 |
| 唇形同步 | lip sync | AI虚拟形象的口型精确匹配台词发音 |
| 情绪控制 | emotion control | 通过物理动作描述精确控制AI角色的情感表达 |

**本章小结**
- 用LLM（推荐Claude）优化提示词效果很好，但核心逻辑需要人来把控
- 情绪控制不能用抽象词汇，必须描述具体的肌肉运动、语调和肢体语言
- 引号内的台词会被AI精确朗读，实现高保真的唇形同步

---

## 05 模型选择与Adobe的未来：垂直场景优于全能模型

**Greg：** Seedance 2.0感觉像是史上最好的视频模型。为什么我们还要使用其他模型？

**Sirio：** 我认为在某个阶段会发生的，就像Nano Banana成为了最好的AI图像编辑模型一样。Seedance对我来说似乎是目前最好的，因为它可以动画化UI界面、标志，可以做很多其他模型无法做到的事情。而且唇形同步非常好。

但其他模型在其他方面也很出色。比如情绪控制，Kling 3在这方面做得非常好。还有一些模型经过微调，使图像看起来更真实。Enhancer V4专门针对说话人视频进行了微调——它可能无法保持极度一致，也没有多输入参考，但它能产生特定的效果。

所以我不认为Seedance 2会取代所有现有的东西，因为它真的取决于你想要实现什么，以及你如何使用模型。有些创意人员非常喜欢某个特定的模型，他们只想坚持使用它，因为这对他们正在做的事情来说已经足够好，而且可能更便宜、更快。价格当然很重要。

**Greg：** 那Adobe呢？他们未来五年会发生什么？

**Sirio：** 我仍然相信Adobe是具有相关性的，特别是对于那些想要更多控制权、想要编辑或剪切帧、想要制作8K高保真视频的创意专业人士。每次我用AI制作东西时，仍然需要编辑，它不会直接产生完美的输出。后期制作阶段依然存在，我相信它将永远存在。

Adobe最理想的方向是专注于专业创意人士真正需要的东西——实现代理功能，让它为你编辑。更多地关注后期制作，而不是实际的生成制作。AI负责生成，人类通过专业软件保留对最终输出的绝对控制权。

> **金句 · Sirio**
> **中文：** AI负责生成，人类通过专业软件保留对最终输出的绝对控制权。后期制作阶段依然存在，我相信它将永远存在。
> **原文：** AI handles generation, and humans retain absolute control over final output through professional software. Post-production will always exist. I believe it always will.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 垂直场景模型 | vertical-specific model | 针对特定用例微调的模型，比全能模型更合适 |
| 代理化后期 | agentic post-production | AI代理自动完成8K修复、调色等后期工序 |
| 工具链 | tool chain | 根据成本、速度和视觉风格组合多个AI模型 |

**本章小结**
- 没有单一模型能通吃所有场景，创作者应根据成本、速度和视觉风格建立自己的工具链
- Seedance在编辑和多输入方面领先，Kling擅长情绪控制和电影感，Enhancer V4专攻说话人视频
- Adobe的未来在于从"创作工具"转向"专业后期中心"，通过代理功能实现AI生成后的精修

---

## 总结：AI视频的下半场是精准编辑，不是生成质量

| 维度 | 要点 |
|------|------|
| 多输入控制 | 同时输入图片、视频、音频，精准替换角色、服装、背景 |
| 商业落地 | 虚拟试穿、多语种广告、A/B测试，极低成本全球化分发 |
| 视频扩展 | 延长片尾或填补两段视频间的空白，对广告制作至关重要 |
| 提示词工程 | 描述肌肉运动而非抽象情绪，引号台词实现唇形同步 |
| 模型选择 | 垂直场景优于全能，建立自己的工具链比追逐单一模型更实际 |

### 对个人的启示
AI视频工具的竞争已从"谁生成得更好"转向"谁编辑得更准"。掌握多输入、视频扩展和唇形同步这些精准控制能力，比记住某个模型的参数更有价值。

### 仍待验证
Seedance目前只有720p，1080p版本发布后可能是真正的游戏改变者。Google V4发布后的对比测试值得期待。

> **金句 · Sirio（封底）**
> **中文：** AI视频的下半场不再是拼生成质量，而是拼如何通过自然语言实现像素级的精准编辑与商业化落地。
> **原文：** The second half of AI video isn't about generation quality anymore. It's about pixel-level precision editing and commercial deployment through natural language.

---

## 附录

- **时间戳**：[04:15] 多输入生成实现视频精准控制 · [10:35] 商业化路径：从3D模板到无限内容流 · [12:10] 视频扩展功能解决广告制作痛点 · [14:42] 提示词工程需从抽象描述转向肌肉运动 · [17:50] 模型选择逻辑：垂直场景优于全能模型 · [19:05] Adobe的未来在于代理化后期制作
- **ingest 路径**：`Recastory/workspace/bilibili-retranscribe/BV1VEooBdEjQ/ingest`
- **专栏路径**：`https://www.bilibili.com/read/cv48613017/`
- **相关阅读**：[[MOC - AI Agent Development]] · [[OpenAI官方-GPT Image2.0演示]]
