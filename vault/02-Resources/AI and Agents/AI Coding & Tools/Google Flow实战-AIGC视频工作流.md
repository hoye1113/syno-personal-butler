---
title: "Google Flow 实战：AIGC 视频工作流"
tags:
  - ai_agent
  - article
  - content_creation
  - prompting
created: 2026-09-20
source: "https://x.com/CrazyKaomei/status/2093893997223923822"
description: "整理 Google Flow 中 Nano Banana、Veo 3.1、Gemini Omni 与 Storyboard Studio 的图片和视频生产工作流，并区分官方规则与第三方低价订阅风险。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/AI Coding & Tools/Google Flow实战-AIGC视频工作流.md"
source_kind: url
source_reliability: partial
source_verification: partial
source_original_date: "2026-08-30"
factual_status: partial
factual_reviewed: 2026-09-20
verification_scope: article_plus_official_docs
verification_basis:
  - "X article"
  - "Google Flow official page"
  - "Google Flow Help: credits"
  - "Google Flow Help: availability"
  - "Jio official Google Gemini offer and terms"
author:
  - "[[疯狂的烤妹儿]]"
---

# Google Flow 实战：AIGC 视频工作流

> 分类：实战攻略 / 工具工作流与内容生产
>
> 这篇 X 长文的可复用价值在于“怎样用工具完成内容生产”，而不是其中的低价会员噱头。下面把工作流、操作限制和时效性信息拆开记录。

## 先说结论

- Nano Banana 负责图片、封面、海报和视觉资产；Veo 3.1 负责视频生成、首尾帧和延展；Gemini Omni 负责短视频编辑与风格转换；Storyboard Studio 负责剧本到分镜的批量生产。
- 这套工具链适合先做低成本的构图、角色和镜头试验，再把通过筛选的资产用于成片。
- 生成能力只是起点，真正需要人工把关的是选题、脚本、角色一致性、字幕、节奏、连贯性和最终筛选。
- 会员、积分、模型名称和地区限制会变化；正式使用前应以当前 Flow 界面和官方帮助页为准。

## 一、工具分工

### Nano Banana：先做视觉资产

适合生成自媒体封面、产品海报、穿搭和美食种草卡片，也可以在拍摄前预览打光、机位和氛围。多图融合与文字渲染能力适合先建立可复用的角色、产品和场景资产。

### Veo 3.1：把关键画面变成运动

除了文生视频，还可以用首帧和尾帧描述中间运动。纸片翻折、人物转身、镜头推进和物体变形都可以先确定两个关键状态，再让模型补全过渡。

### Gemini Omni：做短视频风格化编辑

适合把短口播、参考图和文字描述组合起来，生成拼贴、贴纸或其他风格的视频。它更像短视频编辑器，而不只是从文字生成新视频。

### Storyboard Studio：把剧本拆成可渲染资产

先输入剧本，再确认角色形象、场景氛围和关键道具，最后批量渲染分镜。这个流程适合海外 AI 短剧和需要保持角色、场景连续性的内容。

## 二、三条可复用工作流

### 1. 批量生图

提示词可以按以下顺序组织：

```text
主体 + 场景 + 时间 + 光线 + 镜头 + 风格 + 用途 + 禁止项
```

示例思路是先写清人物或产品，再补充环境、时间、光线和镜头语言，最后声明画面比例、留白位置、排版用途以及不要出现的变形。一次生成多张后，先筛选构图、文字、角色一致性和可编辑性，再进入视频环节。

### 2. 口播拼贴动画

1. 准备 10 秒以内、尽量不带字幕的口播素材。
2. 找到想要的拼贴风格参考图。
3. 让模型总结参考图的材质、构图、贴纸、纸张和动效语言。
4. 在 Flow 中上传口播视频和风格提示词。
5. 先用低成本模式测试，再决定是否生成高清版本。
6. 把字幕和需要精确控制的文字放到后期剪辑软件中完成。

### 3. 首尾帧转场

1. 准备起始帧和结束帧，尽量固定角色、产品或场景的关键特征。
2. 选择支持首尾帧的 Veo 模型。
3. 分别放入首帧与尾帧。
4. 用动作语言描述两帧之间的运动，不只写“自然过渡”。
5. 先验证运动方向、节奏和主体连续性，再做最终分辨率输出。

### 4. 剧本到短剧分镜

把流程拆成“剧本解析 -> 角色与场景资产 -> 分镜确认 -> 批量图生视频 -> 人工筛选”。角色和道具先固定，能减少每个镜头重新抽卡导致的不一致。

## 三、操作原则

- 英文提示词通常更稳；中文可以先用于构思，再让模型整理成英文提示词。
- 中文字幕容易变形，字幕最好在剪辑阶段添加。
- Omni 的单次编辑长度有限，长内容需要分段后再拼接。
- 先验证构图和动作，再消耗更高分辨率或更多积分。
- 把通过筛选的角色、场景和道具保存成资产库，后续内容复用同一套视觉约束。
- 最终成片仍需人工检查节奏、连贯性、版权和平台发布要求。

## 四、会员、积分与地区信息

帖子提到的“7 元 18 个月 Pro”主要是第三方代开叙述，不是 Google 官方购买路径。Jio 与 Google 的 18 个月合作活动本身有官方来源，但只面向符合印度地区、年龄、套餐等条件的 Jio 用户，应通过 MyJio 或 Jio 官方页面判断资格。

截至 2026-09-20，Google Flow 官方页面显示：Google AI Pro 提供额外的月度 Flow credits，另有每日额度；官方帮助页当前列出 Gemini Omni 10 秒 720p 和 360p 的不同消耗，并提醒模型成本会变化。不要把帖子发布时的“无限”“4K”或具体积分数字当成永久规则。

Google 官方还要求用户年满 18 岁并位于支持地区，并明确说明 VPN 不能让不支持地区获得访问权限。不要向第三方提供 Google 密码、验证码、恢复邮箱或付款信息。

## 五、复用清单

- [ ] 先明确视频要解决的内容问题和受众，而不是先抽卡。
- [ ] 建立角色、产品、场景和道具资产。
- [ ] 用低成本模式验证构图、动作和节奏。
- [ ] 用英文提示词补足镜头、光线和动作细节。
- [ ] 分离生成、字幕、剪辑和发布检查。
- [ ] 记录有效提示词、失败样例和最终筛选标准，形成下一轮可复用的 SOP。

## 知识连接

- **补充** [[Seedance实战-AI视频可控编辑]]：Seedance 笔记强调多输入、视频扩展和精准编辑；本篇补充 Flow 的首尾帧、Omni 编辑和 Storyboard Studio。
- **补充** [[riley-brown-codex-150万粉丝-afde4b36]]：Riley 笔记关注研究、实验和质量门；本篇把这些原则落到具体的 AI 视频工具链。
- **应用于** [[MOC - AI Coding 与工具]]：归入现有“工具工作流与内容生产”分区，后续同类“教你用工具完成具体场景”的帖子沿用这一入口。

## 来源说明

- 原帖：[疯狂的烤妹儿：白嫖谷歌！7 块钱解锁 18 个月 Pro](https://x.com/CrazyKaomei/status/2093893997223923822)，发布于 2026-08-30。
- 官方核验：[Google Flow](https://labs.google/fx/tools/flow)、[Flow 积分说明](https://support.google.com/flow/answer/16526234?hl=en)、[Flow 地区与入门要求](https://support.google.com/flow/answer/16353333?hl=en)、[Jio Google Gemini 活动](https://www.jio.com/google-gemini-offer/)、[Jio 活动条款](https://www.jio.com/jcms/en-in/jio-google-gemini-terms-and-conditions/)。
- 读取范围：读取 X 长文正文与可见嵌入内容，未保存帖子图片和视频附件；官方页面只用于核验产品、额度、地区和活动边界。
- 事实状态：`partial`。工作流按原帖整理；产品规则、价格、额度、地区和会员资格均具有时效性。
