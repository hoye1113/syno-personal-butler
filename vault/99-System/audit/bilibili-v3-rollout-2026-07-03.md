---
title: "B站 v3 rollout 进度"
created: 2026-07-03
updated: 2026-07-03
tags: [audit, bilibili]
---

# B站 v3 rollout（2026-07-03）

> 工作流：`99-System/Skills/vskill-vault-curate/SUBDOC - B站视频 v3 工作流.md`

## 汇总

| 层 | 总数 | 状态 |
|----|------|------|
| **vault md**（1 BV = 1 文件） | **32** | ✓ |
| **S 级 canonical**（对谈 + 附录） | **15/15** | ✓ 2026-07-03 合并完成 |
| **`- 对谈稿.md` 孤儿** | **0** | ✓ 已删除 |
| **A 级** | 17 | **12 dialogue-asr + 5 lecture** ✓ |

## S 级 canonical 清单（15）

| BV | 讲义 | canonical |
|----|------|-----------|
| BV12qTu6WETP | Codex负责人-现场演示Codex | ✓ |
| BV1NuGU6yE1b | Claude Code负责人 Boris Cherny | ✓ |
| BV1eWGH6JE6m | IBM团队-Harness工程详解 | ✓ |
| BV1MFjN6iEFU | LCA-60分钟变成AI-Native | ✓ |
| BV1LFjV6BEpe | Cursor-128个Agent团队协作 | ✓ |
| BV1s2Gd6aEF7 | Claude Code实战-结合Obsidian | ✓ |
| BV18hjG6bE6t | DeepMind-模型将吞噬Harness | ✓ |
| BV1MQVf6SEST | Cursor副总裁 | ✓ |
| BV1iH7R6tEfJ | Cursor负责人-Composer | ✓ |
| BV14AjN6eEcg | YC论文俱乐部 | ✓ |
| BV1BLGH6REyX | Codex实战-构建全能AI营销团队 | ✓ |
| BV1i9E366EAr | Alchemy CPO | ✓ |
| BV1dZLS66E3m | Taven创始人-OpenClaw | ✓ |
| BV18LV66aEG9 | OpenClaw实战-K8S | ✓ |
| BV1JvjP6XE1k | Snorkel-小模型RL | ✓ |

## A 级（17）

**12 篇 A-dialogue**（canonical-asr）+ **5 篇 A-lecture**（九段讲义）。详见 `bilibili-a-tier-v3-rewrite-2026-07-03.md`。

**2026-07-03 重跑**：`bilibili-partial-enrich-run.py --run --force` × 17 → 仍全部 `partial`（UP 评论无 cv 链；非 vault 阻塞）。

## 工具链对齐（2026-07-03）

- `bilibili-vault-v3-batch.py`：跳过 canonical S；禁用对谈稿 callout
- Skills INDEX / curate / write / v3 SUBDOC：S→**canonical 单篇**
- 新增 `bilibili-partial-enrich-run.py`

## 待办（非阻塞）

| 优先级 | 项 | 状态 |
|--------|-----|------|
| ~~P0~~ | Inbox 清空 + MOC 公众号计数 | ✓ 2026-07-03 |
| ~~P1~~ | gap-check 扩展（S / A-dialogue / A-lecture） | ✓ |
| ~~P3~~ | A-lecture 5 篇加深 | ✓ 2026-07-03 |
| ~~—~~ | **无专栏 ASR 收录 SOP + agent 入口** | ✓ 2026-07-06 · `SUBDOC - ASR内容分轨与收录决策.md` v1.2 |
| P2 | 专栏回补 → 升 S | 17 partial，手补 cv |
| — | 新增 BV | 见 SUBDOC Phase 5 SOP |

## 执行口令

```bash
python 99-System/scripts/bilibili-canonical-merge.py --all-s --apply
python 99-System/scripts/bilibili-canonical-merge.py --fix-wikilinks --apply
python 99-System/scripts/bilibili-v3-gap-check.py
python 99-System/scripts/bilibili-vault-v3-batch.py --a-tier-only --dry-run
python 99-System/scripts/bilibili-partial-enrich-run.py --list
```
