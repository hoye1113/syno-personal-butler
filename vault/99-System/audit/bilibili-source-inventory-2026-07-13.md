---
title: "B站素材结构全量统计"
tags: [notes, bilibili, ai_agent]
created: 2026-07-13
source: "${RECASTORY_WORKSPACE}"
description: "Recastory B站素材的只读发现结果，供收录路由和路径漂移审计使用。"
---

# B站素材结构全量统计

## 摘要

- 条目：249
- complete / partial / insufficient：226 / 7 / 16
- 有专栏：185
- 有 Speaker 标签：19
- 简介含时间戳：203
- 已映射 vault：122
- 警告：44

## 路径结论

`article.md` 可能位于 BV 根目录，enrich 文件通常位于 `ingest/`。收录前必须动态发现，不能拼接固定路径。

## 异常条目

- `BV12qTu6WETP` (complete)：manifest workspace path differs from discovered BV directory
- `BV14AjN6eEcg` (complete)：manifest workspace path differs from discovered BV directory
- `BV152jP6LEEA` (insufficient)：missing transcript
- `BV17Pd2BaE7Q` (insufficient)：missing transcript
- `BV189Ty68EFp` (insufficient)：missing transcript
- `BV18bjG6fEi7` (insufficient)：manifest entry has no discovered BV directory
- `BV18cdPBeEf3` (insufficient)：missing transcript
- `BV18hjG6bE6t` (complete)：manifest workspace path differs from discovered BV directory
- `BV198Mh6aEtz` (partial)：missing metadata；missing description
- `BV1BJMh6uEtH` (partial)：missing metadata；missing description
- `BV1EwK96AEyU` (complete)：manifest workspace path differs from discovered BV directory
- `BV1HGjN6tE6V` (insufficient)：missing transcript
- `BV1HXMh62Eo6` (partial)：missing metadata；missing description
- `BV1JvjP6XE1k` (complete)：manifest workspace path differs from discovered BV directory
- `BV1LFjV6BEpe` (insufficient)：missing transcript；manifest workspace path differs from discovered BV directory
- `BV1MFjN6iEFU` (complete)：manifest workspace path differs from discovered BV directory
- `BV1SWTz6yEBA` (insufficient)：missing transcript
- `BV1UajG6oEvj` (complete)：manifest workspace path differs from discovered BV directory
- `BV1ZWTL64Erg` (insufficient)：missing transcript；manifest workspace path differs from discovered BV directory
- `BV1cVMh65EUK` (partial)：missing metadata；missing description
- `BV1cVjN6oEwx` (complete)：manifest workspace path differs from discovered BV directory
- `BV1ixKX6oEzK` (insufficient)：missing transcript；manifest workspace path differs from discovered BV directory
- `BV1o4TL6sExw` (insufficient)：missing transcript；manifest workspace path differs from discovered BV directory
- `BV1oHjN6nE6g` (insufficient)：missing transcript
- `BV1opMh6TEgL` (partial)：missing metadata；missing description
- `BV1opjN6SEnb` (insufficient)：missing transcript
- `BV1qnMh6BEWW` (partial)：missing metadata；missing description
- `BV1rLjN6xEc6` (insufficient)：missing transcript
- `BV1v4Mh6eEMV` (partial)：missing metadata；missing description
- `BV1vs7R6xETw` (insufficient)：missing transcript；missing metadata；missing description
- `BV1wELA6QEiD` (insufficient)：missing transcript

## 相关阅读

- [[MOC - Agent Theory and Design]]
