---
title: web-video-presentation - 16比9点击驱动网页伪视频生成器
tags:
  - Skill/Creative
  - Frontend/Presentation
  - React
  - VideoEngineering
date: 2026-10-11
status: canonical
category: Agent Skills
source_url: local:skill-collection/creative/web-video-presentation
summary: 把文章或口播稿编译为 Vite + React + TS 16:9 网页伪视频，独占整屏动效推进节拍，无感合成 TTS 音频与字幕，以零重渲染成本录屏生成影视级成片。
---

# web-video-presentation — 16:9 点击驱动网页伪视频生成器

> **核心哲学**：*“做视频最痛苦的不是写脚本，而是改动一个错别字就要重新渲染 40 分钟。为什么一定要用传统剪辑软件？把文章变成 16:9 的 React 网页全屏动效，点击键盘推进节拍，代码即镜头，浏览器录屏即成片！”*

---

## 一、What：它能做什么

`web-video-presentation`（以及本地项目 `SlideNarrator`）是一套将长文或口播稿自动化构建为**电影感横屏网页伪视频**的工程化技能。它彻底打通了从文本到演示成片的全链路：

1. **内容切片与节拍化**：
   - 输入原始文章 `article.md`，一次性产出平台化口播稿 `script.md` 与开发计划 `outline.md`；
   - 确立节奏与信息密度，每一步独占 16:9 全屏舞台；
2. **现代前端工程渲染（Vite + React + TS）**：
   - 自动生成独立网页项目，按章节切分（`<Chapter>.tsx` + `<Chapter>.css`）；
   - 内置“反 AI 动效法则”：避免毫无意义的飞入和花哨弹跳，采用深沉的大字排版、高对比留白与视差动效；
   - 进度条日常隐藏，仅在鼠标悬浮时淡入；
3. **唯一的真相源驱动（Single Source of Truth）**：
   - 章节中的 `narrations.ts` 同时决定步进总数、界面状态与后续 TTS 音频分段，保证代码与音频 100% 绝对对齐，永不漂移；
4. **多端无感音频合成与录屏交付**：
   - 支持 MiniMax (`mmx-cli`)、OpenAI TTS、ElevenLabs 或系统原生 TTS，自动切分导出并对齐字幕；
   - 配合 Playwright 无头录屏或 OBS 捕获，秒级输出 1080p/4K 视频。

---

## 二、Why：为什么强模型时代必收此技能

### 1. 痛点：传统 PPT 的呆板与传统视频制作的高昂成本
- **传统 PPT**：受限于模板与排版工具，充满商务八股文味，动画生硬，无法呈现现代 Web 的流体、代码高亮、着色器和复杂动效；
- **传统剪辑软件（剪映/PR/AE）**：内容与视觉强耦合，一旦用户想换一句解说词，多轨工程就需要重新调整时间线、重新对齐音频并花费漫长时间压制导出。

### 2. 现代 Harness 范式：声明式 UI 即视频引擎
本技能将软件工程中的“声明式 UI（Declarative UI）”思想引入视频生产：
- 视频画面就是 React 组件的状态流（`step === 0`, `step === 1`...）；
- 任何动画都可以被精准编码与版本化（Git 管理）；
- 录屏模式下通过 URL 参数（如 `?auto=1`）即可按照音频时长自动翻页，实现了工业化的视频流水线。

---

## 三、How：核心工作流与两道防漂移硬闸门

### 1. 阶段流水线

```
[Phase 1: 内容编写] -> 产出 script.md (口播) + outline.md (节拍)
        ↓
  [硬闸门 1: Checkpoint Plan] 必须暂停，对齐稿子/主题/开发模式
        ↓
[Phase 2: 网页开发] -> Vite + React 脚手架 -> 第 1 章 Anchor 必须先验收 -> 逐章开发
        ↓
  [硬闸门 2: Checkpoint Audio] 必须暂停，确认是否合成配音与发音人
        ↓
[Phase 3: 音频切片合成] -> narrations.ts 扫描 -> TTS 批量生成 -> SRT 字幕对齐
        ↓
[Phase 4: 录屏与压制成片] -> 浏览器全屏播放 (手动/自动步进) -> FFmpeg 压制 H.264
```

### 2. 核心架构约束

```text
my-video/
├── article.md          # 用户原始文章（不删除，作为信息源）
├── script.md           # 平台化口播稿（决定语言节奏）
├── outline.md          # 视觉开发计划
└── presentation/       # 产出的 Vite + React + TS 项目
    ├── src/chapters/01-intro/
    │   ├── Intro.tsx
    │   ├── Intro.css
    │   └── narrations.ts   # ★ step 数与音频文本的唯一真相源！
    └── scripts/
        ├── extract-narrations.ts
        └── synthesize-audio.sh
```

---

## 四、管家系统落地与实战转化建议

1. **用于教程、产品发布会与技术演示**：
   - 联动本地已有的 `D:\workSpace\SlideNarrator` 项目工程，当主人撰写了技术复盘或项目介绍时，Syno 可直接调用本技能产出 16:9 网页演示项目；
2. **多模态内容资产输出**：
   - 不仅生成可交付的静态文章，还能顺手沉淀出可以直接在行业交流会全屏放映的互动 Slide。

---

## 五、关联卡片

- [[MOC - Agent Skills 武器库]]
- [[yichen-x-slicer - X推文切片与多模态视频引擎]]
- [[archify - 交互式动态架构图生成器]]
- [[Harness Engineering]]
