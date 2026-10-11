---
title: BiliNote - 视频音画智能笔记与截图沉淀助手
tags:
  - Skill/Media
  - Agent/Video
  - SpeechToText
  - NoteTaking
date: 2026-10-11
status: canonical
category: Agent Skills
source_url: https://github.com/JefferyHcool/BiliNote
summary: 多平台视频音画智能笔记助手，集成 Fast-Whisper 本地转写、大模型语义提炼、论点关键处自动截取视频高清帧嵌入 Markdown 与时间戳跳转。
---

# BiliNote — 视频音画智能笔记与截图沉淀助手

> **核心哲学**：*“传统视频总结最大的硬伤是‘只见文字，不见画面’——视频中高信息密度的架构图、公式推导、关键代码与现场演示全部丢失。真正的视频知识库，必须实现‘声学转写 + 视觉自动截帧 + 时间戳精准跳转’三位一体。”*

---

## 一、What：它能做什么

`BiliNote`（本地工程部署于 `D:\workSpace\BiliNote-master`，上游开源于 `JefferyHcool/BiliNote`）是一个面向**音视频长内容富媒体结构化沉淀**的专业 AI 笔记助手。它支持 Bilibili、YouTube、抖音链接以及本地上传的音视频文件：

1. **端到端离线/混合转写流水线**：
   - 本地集成 `Fast-Whisper` 高性能语音识别，脱敏且不受外部云端时长限制；
   - 提取带精准起止时间戳（Timestamps）的字幕流；
2. **视觉关键帧智能截取与嵌入（Visual Frame Extraction）**：
   - 区别于普通总结工具，BiliNote 会在大模型定位到的**核心概念、论证转折、板书演示点**，自动调用 FFmpeg 截取该时间戳的高清视频帧；
   - 自动将截图以 Markdown 图片语法嵌入对应章节下方；
3. **可跳转的原片时间锚点（Click-to-Seek）**：
   - 每一段笔记标题与重点句均附带形如 `[04:25](url?t=265)` 的时间超链接，点击可秒级定位原片回放；
4. **多模型与多风格支持**：
   - 原生支持 DeepSeek、Qwen、OpenAI 等大模型后端；
   - 提供学术精读、实操教程、速览导读等多种笔记模板。

---

## 二、Why：为什么强模型时代必收此资产

### 1. 痛点：音视频长内容的“信息遗失与不可回溯”
在 AI 时代，技术分享、学术讲座与大咖访谈越来越多以 1~2 小时视频的形式呈现：
- **纯文字模型处理长视频的缺陷**：模型无法“看见”视频里展示的 PPT 细则与白板草图，导致笔记常常出现“正如画面所展示的那样”等空洞废话；
- **回溯成本高**：文字总结一旦出现歧义，用户无法快速找到原视频第几分第几秒说了这句话。

### 2. 现代 Harness 范式：富媒体时空对齐（Spatio-Temporal Alignment）
BiliNote 给出了多模态知识沉淀的优雅范式：
- **机器做确定性对齐**：音频流提取时间戳，视频流按时间戳抽帧，保证证据链物理存在；
- **模型做逻辑梳理**：大语言模型仅在结构化时间戳文本之上进行语义归纳与标题分层。

---

## 三、How：核心架构与运行接口

### 1. 系统架构分工

```
视频输入 (Bilibili / YouTube / 本地 MP4)
        ↓
[音视频解复用] -> FFmpeg 提取音频流 + 元数据
        ↓
[Fast-Whisper] -> 本地低延迟生成带时间戳字幕 JSON
        ↓
[LLM 语义归纳] -> DeepSeek / Qwen 生成分章节 Markdown 提纲
        ↓
[FFmpeg 精准抽帧] -> 识别核心论点时间戳，秒级抓取高精画面 (PNG/JPG)
        ↓
[交付规范 Markdown] -> 结构化小结 + 论点截图 + 原片时间锚点跳转
```

### 2. 本地快速启动

```bash
# 后端启动 (FastAPI)
cd D:\workSpace\BiliNote-master\backend
python main.py

# 前端桌面/网页端 (React + Tauri / Vite)
cd D:\workSpace\BiliNote-master\BillNote_frontend
pnpm dev
```

---

## 四、管家系统落地与实战转化建议

1. **用于 Syno 个人管家的“视频知识直通收录”**：
   - 当主人在微信/飞书中发送 B站或 YouTube 优质技术视频链接时，Syno 后台触发 BiliNote 核心提取逻辑；
   - 生成的图文笔记直接归档至 `vault/02-Resources/B 站视频知识库/`，自动带上本地图片与跳转链接；
2. **与飞书多维表格无缝同步**：
   - 生成的笔记标题与核心截图通过 `sync-vault-catalog-to-bitable.mjs` 推送至飞书，实现移动端高美感阅读。

---

## 五、关联卡片

- [[MOC - Agent Skills 武器库]]
- [[web-video-presentation - 16比9点击驱动网页伪视频生成器]]
- [[remotion-best-practices - Remotion 纯代码视频构建标准]]
- [[Harness Engineering]]
