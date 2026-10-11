---
title: yichen-x-slicer - X推文切片与多模态视频引擎
tags:
  - Skill/Productivity
  - ContentAutomation
  - Playwright
  - VideoEngineering
date: 2026-10-11
status: canonical
category: Agent Skills
source_url: local:skill-collection/productivity/yichen-skills/yichen-x-slicer
summary: 将公开 X/Twitter 推文与 Thread 自动化切片为 1080×1440 3:4 琥珀色美学长图与带原生音画的高清 MP4，实现海外一手资讯向移动端内容的高清工业化转化。
---

# yichen-x-slicer — X推文切片与多模态视频引擎

> **核心哲学**：*“海外一手信源（X/Twitter）是 AI 时代最有价值的认知金矿。但截几张糊图发国内平台不仅没人看，还丢失了原视频与上下文。通过 Playwright 精准抓取 + 3:4 琥珀色排版 + FFmpeg 原生音画装配，把一条推文工业化重塑为移动端顶流内容！”*

---

## 一、What：它能做什么

`yichen-x-slicer`（逸尘 X 切片）是一个面向**社交媒体内容工业化出海/汉化**的多模态切片引擎。只需传入一个公开的 X 推文或 Thread 链接，脚本即可自动化输出高规格视听资产：

1. **移动端黄金比例图集（1080×1440 3:4）**：
   - 自动截取作者头像、身份认证、核心正文、多图与数据快照（阅读/点赞/收藏）；
   - 支持高颜值视觉预设（默认 `sunset` 落日琥珀版、`editorial` 杂志版等）；
   - 严格保证文字不被裁剪或强行缩小，长文自动跨页分帧排版；
2. **完整保留原生视频与原生音频（Native Video & Audio Preserved）**：
   - 绝不把视频截成死气沉沉的静态封面！
   - 若原推包含原生视频，自动下载并嵌入至 3:4 画布的核心媒体舞台，且严格保留视频的原生音轨；
3. **同作者 Thread 自动链式解析**：
   - 自动追踪同一作者的连续回复链条，排除无关路人评论和引用的嵌套干扰；
4. **全自动 MP4 视频与打包交付**：
   - 通过 FFmpeg 渲染符合平台推荐码率的 H.264 30fps MP4；
   - 自动打包为无损 ZIP 和 QA 质检报告（`qa-report.json`）。

---

## 二、Why：为什么强模型时代必收此技能

### 1. 痛点：新媒体分发的“低质截图与繁琐拼接”
自媒体创作者每天在 X 上挖掘到大量重磅发布（如新模型测评、开源黑科技演示）。传统的处理方式是：
- 手动截手机屏：分辨率差、充满杂乱系统状态栏、字体参差不齐；
- 碰到视频推文手足无措：不得不录屏、传进剪映、手动居中、剪裁黑边，处理一条耗时半小时。

### 2. 现代 Harness 范式：纯代码流水线与严格交付契约
本技能展示了极致严谨的自动化交付契约（Delivery Contract）：
- **无头浏览器精准控制**：通过 Playwright 抹除无关 DOM，注入设计系统的 CSS Tokens；
- **声画严格对齐**：视频页精确计算过渡帧（4-frame page transition），非视频页保持绝对静音，防止音画错乱；
- **全流程 QA 校验**：每一帧图片宽高必须严格为 1080×1440，MD5 校验无误才报告完成。

---

## 三、How：核心 CLI 指令与运行契约

### 1. 快速使用指令

```bash
# 基本运行：生成默认 sunset 风格的 3:4 图片集、ZIP 和 MP4 视频
node scripts/yichen_x_slicer.mjs \
  --url "https://x.com/username/status/1234567890" \
  --output "d:/workSpace/outputs/x-slice-output"

# 切换视觉风格（如杂志社风格 editorial）
node scripts/yichen_x_slicer.mjs \
  --url "https://x.com/username/status/1234567890" \
  --template editorial \
  --output "d:/workSpace/outputs/x-slice-output"

# 仅生成高清图片，不压制视频
node scripts/yichen_x_slicer.mjs \
  --url "https://x.com/username/status/1234567890" \
  --images-only \
  --output "d:/workSpace/outputs/x-slice-output"

# 纯数据桥接模式：仅抽取结构化 Markdown 与原生媒体，不渲染画面
node scripts/yichen_x_slicer.mjs \
  --url "https://x.com/username/status/1234567890" \
  --source-only \
  --output "d:/workSpace/outputs/x-slice-output"
```

### 2. 交付与质检契约

在宣告任务完成前，必须满足以下标准：
1. `qa-report.json` 中 0 处失败；
2. 输出的全部 PNG 尺寸均为 1080×1440；
3. 原生视频帧与音频流严格匹配，解码无黑帧与爆音；
4. 排除所有其他用户的无关回复和嵌套 Quote，仅呈现作者主线。

---

## 四、管家系统落地与实战转化建议

1. **用于海外一手资讯收录与分发**：
   - 当主人在 X 上看到极具价值的 AI 论文、产品发布或研究 Thread 时，直接将链接甩给管家；
   - 管家在后台拉起 `yichen-x-slicer`，秒级生成 3:4 图文与短视频，既可存入 `vault/` 归档，也可直接一键发到小红书或微信朋友圈；
2. **配合管家图床与媒体流**：
   - 与管家现有的 `media/` 媒体管道打通，提供端到端的资讯搬运与高美感重构能力。

---

## 五、关联卡片

- [[MOC - Agent Skills 武器库]]
- [[web-video-presentation - 16比9点击驱动网页伪视频生成器]]
- [[geo-content-optimizer - 生成式引擎引用优化]]
- [[Harness Engineering]]
