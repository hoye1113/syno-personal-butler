---
title: "17 · 定时唤醒 Supabase：让免费项目不被暂停 — Loock AI 全栈应用开发"
tags: ["loock_ai", "chatbot", "ai_agent"]
legacy_tags: ["loock_ai", "chatbot", "ai_agent"]
created: "2026-06-09"
source: "https://ai-full-stack.loock.vip/docs/chat-bot-course/08-bonus/17-keep-supabase-alive"
description: "Supabase 免费项目连续 7 天无活动会被自动暂停，用 GitHub Action  定时查询来保活。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Loock AI 全栈应用开发/4-Chat Bot 实战/4-17 17 · 定时唤醒 Supabase - 让免费项目不被暂停.md"
source_sha256: "e934b9eda00f3c4c73884412541470759aaa7a1d9deba8fd11ceb3e457afafa2"
migration_id: "migration-20260720-64e79771"
author:
  - "[[Loock AI]]"
published:
synced: 2026-06-09
---

加更内容

# 17 · 定时唤醒 Supabase：让免费项目不被暂停

Supabase 免费项目连续 7 天无活动会被自动暂停，用 GitHub Actions 定时查询来保活。

## [一、问题背景](#一问题背景)

Supabase 免费版（Free Plan）有一个容易被忽视的限制：**如果一个项目连续 7 天没有任何数据库活动，Supabase 会自动把它暂停（pause）**。

暂停后的表现：

1.  所有 REST API 请求返回错误
2.  数据库连接断开
3.  用户无法登录、聊天记录无法加载
4.  需要手动到 Supabase Dashboard 点击恢复，恢复过程可能需要几分钟

对于课程项目来说，这个问题特别容易出现：

1.  课程学完后，你可能一周都不会打开应用
2.  周末或假期期间，项目完全处于无人使用状态
3.  等你回来想演示或继续开发时，发现整个后端已经挂了

## [二、解决思路](#二解决思路)

核心思路很简单：**用一个定时任务，每周自动对 Supabase 执行一次查询操作，让 Supabase 认为项目仍然活跃。**

Supabase 判断"活跃"的标准是数据库是否有请求进来，所以我们只需要发一个最轻量的 REST API 请求就够了——查一条数据，不需要写入，不消耗什么资源。

最适合做这件事的工具是 **GitHub Actions**，因为：

1.  我们的代码已经托管在 GitHub 上，不需要额外注册任何服务
2.  GitHub Actions 的 `schedule` 触发器天然支持 cron 定时任务
3.  免费额度完全够用（每月 2000 分钟，这个任务每次只跑几秒）

## [三、实现方��](#三实现方案)

### [1\. 创建工作流文件](#1-创建工作流文件)

在仓库中创建 `.github/workflows/keep-supabase-alive.yml`：

```
name: 保持 Supabase 活跃
on:
  schedule:
    # UTC 时间每周一、周四 02:00 执行（对应北京时间 10:00）
    - cron: '0 2 * * 1,4'
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: 查询 Supabase 防止暂停
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
            echo "错误：SUPABASE_URL 或 SUPABASE_ANON_KEY 未在仓库 Secrets 中配置。"
            exit 1
          fi
          echo "正在 ping Supabase，当前时间 $(date -u) ..."
          HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            "${SUPABASE_URL}/rest/v1/sessions?select=id&limit=1" \
            -H "apikey: ${SUPABASE_ANON_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")
          if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
            echo "Supabase 状态正常（HTTP $HTTP_STATUS）"
          elif [ "$HTTP_STATUS" -eq 401 ] || [ "$HTTP_STATUS" -eq 403 ]; then
            echo "警告：Supabase 有响应但认证失败（HTTP $HTTP_STATUS），请检查密钥配置。"
            exit 1
          else
            echo "警告：收到异常响应（HTTP $HTTP_STATUS），Supabase 可能已暂停或无法访问。"
            exit 1
          fi
```

### [2\. 配置 GitHub Secrets](#2-配置-github-secrets)

工作流需要读取 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`，它们需要配置在 GitHub 仓库中：

1.  打开你的 GitHub 仓库页面
2.  进入 **Settings → Secrets and variables → Actions**
3.  点击 **New repository secret**，分别添加：
    -   `SUPABASE_URL`：你的 Supabase 项目 URL（类似 `https://xxxxx.supabase.co`）
    -   `SUPABASE_ANON_KEY`：你的 Supabase 匿名密钥（anon public key）

这两个值可以在 Supabase Dashboard 的 **Settings → API** 页面找到，和你在 `.env` 中配置的值一样。

### [3\. 手动测试](#3-手动测试)

配置完成后，先手动触发一次验证是否正常：

1.  进入 GitHub 仓库的 **Actions** 标签页
2.  左侧选择 **保持 Supabase 活跃** 工作流
3.  点击 **Run workflow** 按钮
4.  等待执行完成，查看日志是否显示"Supabase 状态正常"

## [四、关键设计说明](#四关键设计说明)

### [1\. 为什么每周执行两次？](#1-为什么每周执行两次)

Supabase 的暂停阈值是 **7 天无活动**。每周执行两次（周一和周四），即使某次因为 GitHub 服务波动而跳过，另一次仍然能在 7 天内覆盖，留出了安全余量。

### [2\. 为什么只查询不写入？](#2-为什么只查询不写入)

```
curl "${SUPABASE_URL}/rest/v1/sessions?select=id&limit=1" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}"
```

这段 curl 只做 `SELECT ... LIMIT 1`，原因：

1.  Supabase 判断活跃只看"有没有请求"，不看请求类型
2.  纯读取不改变任何数据，最安全
3.  即使 `sessions` 表是空的，请求本身也会被记录为活动

### [3\. `workflow_dispatch` 的作用](#3-workflow_dispatch-的作用)

```
on:
  workflow_dispatch:
```

这一行让你可以在 GitHub Actions 页面手动触发工作流。配置完 Secrets 后先用它测试一次，省得等到下周才能确认配置是否正确。

### [4\. cron 时区说明](#4-cron-时区说明)

GitHub Actions 的 cron 使用 UTC 时区，`0 2 * * 1,4` 表示 UTC 时间每周一和周四的凌晨 2 点，对应北京时间上午 10 点。你可以根据自己的习惯调整执行时间。

## [五、整体流程](#五整体流程)

#\_r\_1\_{margin:1.5rem auto 0;}#\_r\_1\_{font-family:inherit;font-size:16px;fill:#ccc;}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#\_r\_1\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#\_r\_1\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#\_r\_1\_ .error-icon{fill:#a44141;}#\_r\_1\_ .error-text{fill:#ddd;stroke:#ddd;}#\_r\_1\_ .edge-thickness-normal{stroke-width:1px;}#\_r\_1\_ .edge-thickness-thick{stroke-width:3.5px;}#\_r\_1\_ .edge-pattern-solid{stroke-dasharray:0;}#\_r\_1\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#\_r\_1\_ .edge-pattern-dashed{stroke-dasharray:3;}#\_r\_1\_ .edge-pattern-dotted{stroke-dasharray:2;}#\_r\_1\_ .marker{fill:lightgrey;stroke:lightgrey;}#\_r\_1\_ .marker.cross{stroke:lightgrey;}#\_r\_1\_ svg{font-family:inherit;font-size:16px;}#\_r\_1\_ p{margin:0;}#\_r\_1\_ .label{font-family:inherit;color:#ccc;}#\_r\_1\_ .cluster-label text{fill:#F9FFFE;}#\_r\_1\_ .cluster-label span{color:#F9FFFE;}#\_r\_1\_ .cluster-label span p{background-color:transparent;}#\_r\_1\_ .label text,#\_r\_1\_ span{fill:#ccc;color:#ccc;}#\_r\_1\_ .node rect,#\_r\_1\_ .node circle,#\_r\_1\_ .node ellipse,#\_r\_1\_ .node polygon,#\_r\_1\_ .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}#\_r\_1\_ .rough-node .label text,#\_r\_1\_ .node .label text,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-anchor:middle;}#\_r\_1\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#\_r\_1\_ .rough-node .label,#\_r\_1\_ .node .label,#\_r\_1\_ .image-shape .label,#\_r\_1\_ .icon-shape .label{text-align:center;}#\_r\_1\_ .node.clickable{cursor:pointer;}#\_r\_1\_ .root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}#\_r\_1\_ .arrowheadPath{fill:lightgrey;}#\_r\_1\_ .edgePath .path{stroke:lightgrey;stroke-width:2.0px;}#\_r\_1\_ .flowchart-link{stroke:lightgrey;fill:none;}#\_r\_1\_ .edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}#\_r\_1\_ .cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}#\_r\_1\_ .cluster text{fill:#F9FFFE;}#\_r\_1\_ .cluster span{color:#F9FFFE;}#\_r\_1\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:inherit;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}#\_r\_1\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}#\_r\_1\_ rect.text{fill:none;stroke-width:0;}#\_r\_1\_ .icon-shape,#\_r\_1\_ .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}#\_r\_1\_ .icon-shape p,#\_r\_1\_ .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}#\_r\_1\_ .icon-shape rect,#\_r\_1\_ .image-shape rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}#\_r\_1\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#\_r\_1\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#\_r\_1\_ :root{--mermaid-font-family:inherit;}

2xx

401/403

其他

GitHub Actions  
每周一、周四定时触发

curl 查询  
Supabase REST API

HTTP 状态码

正常：Supabase 活跃

密钥配置有误

Supabase 可能已暂停

## [六、常见问题](#六常见问题)

### [1\. 我的项目已经被暂停了怎么办？](#1-我的项目已经被暂停了怎么办)

到 Supabase Dashboard 打开你的项目，点击 **Restore project** 按钮，等待几分钟即可恢复。恢复后再确保 GitHub Actions 的 Secrets 已配好，后续就不会再被暂停了。

### [2\. 这个定时任务会消耗我的免费额度吗？](#2-这个定时任务会消耗我的免费额度吗)

几乎不会。每次执行只跑几秒，每月消耗不到 1 分钟的 GitHub Actions 时间。Supabase 那边也只是多了一次 `SELECT LIMIT 1` 请求，完全在免费额度内。

### [3\. 如果我升级到 Supabase Pro 还需要这个吗？](#3-如果我升级到-supabase-pro-还需要这个吗)

Pro 项目不会因为不活跃而被暂停，所以升级后可以移除这个工作流。但对于学习项目来说，免费版 + 定时保活是最经济的选择。

### [4\. 为什么不直接用 Supabase 自带的方案？](#4-为什么不直接用-supabase-自带的方案)

Supabase 官方没有为免费项目提供"保持活跃"的功能。暂停策略是 Free Plan 的限制，官方建议要么升级付费版，要么自己保持项目活跃。GitHub Actions 定时查询就是最简单的自保方案。

## [七、总结](#七总结)

这一节解决的是一个"不影响开发但影响上线后稳定性"的运维问题：

1.  Supabase 免费项目 7 天无活动会自动暂停
2.  用 GitHub Actions 定时执行一次轻量查询即可保活
3.  每周两次执行，留出安全余量
4.  配置只需要两个 GitHub Secrets，一次设置长期生效

## 相关笔记

- [[3-6 生产级权限系统的四层防线]]
- [[MOC - Chat Bot 实战|Chat Bot 实战 章节索引]]
- [[MOC - Loock AI 全栈课程|Loock AI 全栈课程总索引]]
- [[AI Agent Development|sanyuan 系统课程]]
