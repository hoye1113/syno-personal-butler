---
id: ingest-20260920-google-flow
candidateId: candidate-20260920-google-flow
status: applied
suggestedPath: "vault/02-Resources/AI and Agents/AI Coding & Tools/Google Flow实战-AIGC视频工作流.md"
risk: medium
created: 2026-09-20T08:00:00.000Z
---

# Ingest proposal: Google Flow 实战：AIGC 视频工作流

<!-- syno:json:start -->
```json
{
  "id": "ingest-20260920-google-flow",
  "candidateId": "candidate-20260920-google-flow",
  "status": "applied",
  "suggestedPath": "vault/02-Resources/AI and Agents/AI Coding & Tools/Google Flow实战-AIGC视频工作流.md",
  "suggestedTags": [
    "ai_agent",
    "article",
    "content_creation",
    "prompting"
  ],
  "suggestedLinks": [
    "vault/02-Resources/AI and Agents/AI Coding & Tools/Seedance实战-AI视频可控编辑.md",
    "vault/02-Resources/AI and Agents/AI Coding & Tools/riley-brown-codex-150万粉丝-afde4b36.md",
    "vault/02-Resources/AI and Agents/MOC - AI Coding 与工具.md"
  ],
  "risk": "medium",
  "created": "2026-09-20T08:00:00.000Z",
  "sourceDescriptor": {
    "kind": "url",
    "originalUrl": "https://x.com/CrazyKaomei/status/2093893997223923822",
    "canonicalUrl": "https://x.com/CrazyKaomei/status/2093893997223923822",
    "publisher": "x.com",
    "author": "疯狂的烤妹儿",
  "title": "白嫖谷歌！7 块钱解锁 18 个月 Pro：无限 Nano Banana 生图＋登顶第一的视频模型（附 Flow 速通全攻略）",
    "sourcePublishedAt": "2026-08-30 10:50",
    "observedAt": "2026-09-20",
    "captureChannel": "logged_in_browser",
    "sourceTier": "secondary",
    "reliability": "partial",
    "userSuppliedSource": true,
    "verificationStatus": "partial"
  },
  "sourceType": "x-article",
  "sourceProfile": {
    "primarySource": "x_article",
    "sourceForm": "article",
    "contentForm": "article",
    "voiceBasis": "editorial_summary",
    "factualStatus": "partial",
    "factualReviewed": "2026-09-20",
    "verificationScope": "article_plus_official_docs",
    "verificationBasis": [
      "X article",
      "Google Flow official page",
      "Google Flow Help: credits",
      "Google Flow Help: availability",
      "Jio official Google Gemini offer",
      "Jio official terms"
    ]
  },
  "quality": {
    "status": "accepted",
    "reasons": [
      "长文包含具体工具分工、操作步骤、提示词结构和失败模式，不是只有产品宣传",
      "主题与已有 AI 工具、AI 视频和内容生产知识链相关，可进入现有 MOC",
      "订阅、积分、地区和 Jio 活动已用官方页面交叉核对；第三方低价代开未视为官方事实"
    ]
  },
  "materialTier": "A",
  "duplicateAssessment": {
    "matches": [
      "vault/02-Resources/AI and Agents/AI Coding & Tools/Seedance实战-AI视频可控编辑.md",
      "vault/02-Resources/AI and Agents/AI Coding & Tools/riley-brown-codex-150万粉丝-afde4b36.md",
      "vault/02-Resources/AI and Agents/MOC - AI Coding 与工具.md"
    ],
    "sameSource": false,
    "updateStatus": "new"
  },
  "relations": [
    {
      "type": "extends",
      "target": "vault/02-Resources/AI and Agents/AI Coding & Tools/Seedance实战-AI视频可控编辑.md",
      "reason": "Seedance 笔记强调多输入、视频扩展和精准编辑；本篇补充 Google Flow 的首尾帧、Omni 风格编辑和 Storyboard Studio 工作流。"
    },
    {
      "type": "extends",
      "target": "vault/02-Resources/AI and Agents/AI Coding & Tools/riley-brown-codex-150万粉丝-afde4b36.md",
      "reason": "Riley 笔记关注研究、Skill、包装和复盘系统；本篇提供一组可直接试验的 AI 视频生产工具链和内容场景。"
    },
    {
      "type": "applies_to",
      "target": "vault/02-Resources/AI and Agents/MOC - AI Coding 与工具.md",
      "reason": "本篇属于 AI 视频工具与内容生产工作流，可作为现有工具工作流与内容生产分区的新来源笔记。"
    }
  ],
  "claimCandidates": [
    {
      "statement": "Google Flow 将 Nano Banana、Veo 和 Gemini Omni 放进同一创作工作台，适合把图片、视频生成和视频编辑串成一条工作流。",
      "stability": "product",
      "sourceLocation": "帖子正文；Google Flow 官方页面"
    },
    {
      "statement": "图片工作流的可复用提示词结构是主体、场景、时间、光线、镜头、风格、用途和禁止项。",
      "stability": "practice",
      "sourceLocation": "帖子正文：Nano Banana 实操"
    },
    {
      "statement": "Omni 适合短口播风格转换和拼贴动画，但单次视频编辑长度、中文文字稳定性和积分成本都需要在当前界面确认。",
      "stability": "product",
      "sourceLocation": "帖子正文；Google Flow Help: credits/models"
    },
    {
      "statement": "Veo 的首尾帧控制可以把两张关键画面之间的运动交给模型补全，适合纸雕、变装和过渡镜头。",
      "stability": "feature",
      "sourceLocation": "帖子正文；Google Flow Help: models"
    },
    {
      "statement": "AI 视频生产的实际瓶颈不只是生成能力，还包括选题、脚本、角色资产、筛选和后期质量控制。",
      "stability": "principle",
      "sourceLocation": "帖子正文；与已有内容生产笔记的关系整理"
    }
  ],
  "evidenceCandidates": [
    {
      "claimRef": "Flow 的模型与工作台组成",
      "sourceRef": "https://labs.google/fx/tools/flow",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "官方页面列出 Gemini Omni、Nano Banana 和 Veo 3.1，并将 Flow 定位为图片与视频创作工作台",
      "observedAt": "2026-09-20"
    },
    {
      "claimRef": "积分和额度是动态的",
      "sourceRef": "https://support.google.com/flow/answer/16526234?hl=en",
      "sourceTier": "primary",
      "stance": "limits",
      "excerpt": "官方说明不同模型按 generation 消耗 credits，且模型成本和额度可能调整；当前帮助页列出 Omni 10 秒 720p 为 15 credits、360p 为 7 credits",
      "observedAt": "2026-09-20"
    },
    {
      "claimRef": "地区与 VPN 限制",
      "sourceRef": "https://support.google.com/flow/answer/16353333?hl=en",
      "sourceTier": "primary",
      "stance": "limits",
      "excerpt": "官方要求年满 18 岁、位于支持地区并满足订阅条件，并明确说明 VPN 无法让不支持地区获得访问权限",
      "observedAt": "2026-09-20"
    },
    {
      "claimRef": "Jio 的 18 个月官方活动",
      "sourceRef": "https://www.jio.com/google-gemini-offer/",
      "sourceTier": "primary",
      "stance": "supports",
      "excerpt": "Jio 官方页面说明符合条件的印度 Jio 用户可通过 MyJio 激活 18 个月 Google AI Pro；低价闲鱼代开不是该官方路径",
      "observedAt": "2026-09-20"
    }
  ],
  "canonicalBody": "# Google Flow：AIGC 视频工作流攻略\n\n> 这是一篇 X 长文的整理版，重点保留 Google Flow 的工具分工、可复用工作流和实际限制。帖子中的低价会员信息单独作为待核验事项，不把第三方代开当作官方方案。\n\n## 一、工具分工\n\n- Nano Banana：封面、海报、产品场景融合、穿搭和视觉预案。\n- Veo 3.1：文生视频、首尾帧过渡、视频延展和高质量成片。\n- Gemini Omni：口播风格转换、拼贴动画和上传视频编辑。\n- Storyboard Studio：从剧本拆分角色、场景和分镜，再批量渲染短剧。\n\n## 二、三条可复用工作流\n\n### 1. 批量生图\n\n提示词可以按“主体 + 场景 + 时间 + 光线 + 镜头 + 风格 + 用途 + 禁止项”组织。一次生成多张，先筛选构图、角色一致性和文字质量，再进入后续制作。\n\n### 2. 口播拼贴动画\n\n先准备 10 秒以内、尽量不带字幕的口播素材，再提供拼贴风参考图，让 Omni 反推或执行视觉风格。中文提示词、中文字幕和过长素材都可能降低稳定性，必要时分段并在剪辑软件中补字幕。\n\n### 3. 首尾帧转场\n\n先分别准备起始帧和结束帧，再描述中间运动，例如纸片翻折、镜头推进、人物转身或物体变形。适合用来做产品展示、变装和纸雕动画。\n\n## 三、操作原则\n\n- 先用低分辨率或低成本模式测试构图、动作和节奏，再做最终版本。\n- 把角色、场景和道具做成可重复使用的资产，而不是每条视频临时重做。\n- 不把模型生成结果直接当成成片，字幕、节奏、连贯性和版权仍需要人工检查。\n- 具体模型名称、积分消耗、分辨率和地区限制以 Flow 当前界面及官方帮助页为准。\n\n## 四、会员与地区风险\n\nGoogle AI Pro 的积分、模型和功能会变化。Jio 的 18 个月活动是印度用户的官方合作活动，应该通过 MyJio 等官方入口判断资格；帖子提到的闲鱼低价代开属于第三方路径，不建议提供 Google 密码、验证码或恢复信息。\n\n## 知识连接\n\n- 补充 [[Seedance实战-AI视频可控编辑]]：从 Seedance 的多输入和精准编辑扩展到 Flow 的首尾帧、Omni 和 Storyboard Studio。\n- 补充 [[riley-brown-codex-150万粉丝-afde4b36]]：把内容生产系统的研究、实验和质量门延伸到具体 AI 视频工具链。\n- 应用于 [[MOC - AI Coding 与工具]]：归入 AI 工具工作流与内容生产。\n\n## 来源说明\n\n- 原帖：https://x.com/CrazyKaomei/status/2093893997223923822\n- 官方核验：https://labs.google/fx/tools/flow；https://support.google.com/flow/answer/16526234?hl=en；https://support.google.com/flow/answer/16353333?hl=en；https://www.jio.com/google-gemini-offer/\n- 事实状态：partial。帖子中的工作流按原文整理；产品额度、地区、会员资格和价格按 2026-09-20 读取到的官方页面核对，仍可能随时间变化。",
  "validators": [
    "source_traceability",
    "duplicate",
    "retention",
    "frontmatter",
    "wikilinks",
    "relation_quality",
    "factual_status",
    "numeric_context",
    "constraints_preserved",
    "discussion_readiness"
  ],
  "mocChanges": [
    "vault/02-Resources/AI and Agents/MOC - AI Coding 与工具.md"
  ],
  "checks": {
    "duplicate": true,
    "sourceCompleteness": true,
    "provenance": true,
    "retentionCoverage": true,
    "relationQuality": true,
    "frontmatter": true,
    "wikilinks": true,
    "semanticReview": true,
    "promotion": true
  },
  "unresolved": [
    "帖子中的第三方低价代开与动态产品额度仍需在实际使用时重新核验",
    "本文未保存帖子图片和视频附件，仅保留文字信息与原帖链接"
  ],
  "sourceReport": {
    "workflow": "vault_ingest_v2",
    "sourceId": {
      "url": "https://x.com/CrazyKaomei/status/2093893997223923822"
    },
    "route": {
      "materialTier": "A",
      "sourceForm": "article",
      "contentForm": "article",
      "voiceBasis": "editorial_summary"
    },
    "targetPath": "vault/02-Resources/AI and Agents/AI Coding & Tools/Google Flow实战-AIGC视频工作流.md",
    "sourcesRead": [
      "X article",
      "Google Flow official page",
      "Google Flow Help",
      "Jio official offer and terms"
    ],
    "sourcesSkipped": [
      "post images",
      "embedded videos",
      "unofficial reseller pages"
    ],
    "relatedNotes": [
      "vault/02-Resources/AI and Agents/AI Coding & Tools/Seedance实战-AI视频可控编辑.md",
      "vault/02-Resources/AI and Agents/AI Coding & Tools/riley-brown-codex-150万粉丝-afde4b36.md",
      "vault/02-Resources/AI and Agents/MOC - AI Coding 与工具.md"
    ],
    "mocUpdates": [
      "vault/02-Resources/AI and Agents/MOC - AI Coding 与工具.md"
    ],
    "unresolved": [
    "动态产品规则和第三方代开未完全稳定"
    ],
    "status": "incomplete"
  }
}
```
<!-- syno:json:end -->

## 收录摘要

这篇 X 长文值得保留的部分是 Google Flow 的实际创作路径：Nano Banana 负责图片和视觉资产，Veo 负责首尾帧与视频生成，Gemini Omni 负责短视频风格化编辑，Storyboard Studio 负责从剧本到分镜的批量生产。

帖子里的会员优惠需要拆开看：Jio 与 Google 的 18 个月合作活动有官方来源，但闲鱼低价代开不是官方入口；Google Flow 的积分、模型、地区和分辨率规则也会变化，正式回顾时应以官方页面和当前产品界面为准。
