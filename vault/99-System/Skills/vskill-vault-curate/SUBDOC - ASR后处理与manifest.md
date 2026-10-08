# SUBDOC - ASR 后处理与 manifest

> **Legacy：Recastory 已冻结，本文件只保留历史核验说明。**

> **父 skill**：[SKILL.md](./SKILL.md) · **vault 收录入口**：[ASR双轴决策](./SUBDOC%20-%20ASR内容分轨与收录决策.md) · **lecture 形态**：[SUBDOC - B站视频转写收录](./SUBDOC%20-%20B站视频转写收录.md)

---

## canonical 路径

| 层级 | 路径 |
|------|------|
| 清单 | `workspace/bilibili/manifest.json` |
| ASR 唯一源 | `workspace/bilibili-retranscribe/<BV>/` |
| 产物 | `audio/*.wav` · `transcript.json` · `article.md` |
| knowledge 旧目录 | 仅中间稿；新 ASR **写入 retranscribe** |

---

## 流水线（闭环）

```
transcript.json
    ↓ _postprocess_articles.py（asr v2）
article.md（### [mm:ss] Speaker N 分段）
    ↓ Pass1 reader-outline（distill/ 或内联）
    ↓ Pass2 SUBDOC 九段 → vault
    ↓ 若 duration ≥45min → Spot check（脚本 + 人工 P0 清零）
vault 笔记 + MOC + manifest（Recastory）
```

**不要**用 distill Phase D 的 IBM mindmap 模板直出 vault。

Spot check 见 [SUBDOC - Spot check（长视频 factual）](./SUBDOC%20-%20Spot%20check（长视频%20factual）.md)；`vault_v2_done` **不替代** spot check。

---

## 后处理参数（`_postprocess_articles.py`）

| 参数 | 默认 | 说明 |
|------|------|------|
| `MERGE_GAP_S` | 2.0 | 同 speaker 间隔 ≤2s 合并 |
| `PAUSE_GAP_S` | 3.0 | 停顿 >3s 或换 speaker 分段 |
| `MAX_PARA_CHARS` | 1400 | 超长段在句边界再切 |
| CJK 清理 | on | 去掉 SenseVoice 误识别中文/韩文标点 |

**验证**：`_validate.py` 全绿后再 postprocess。

---

## manifest 字段

- `asr_status`: `asr_ready` | `asr_legacy_article_only` | `asr_missing`
- `vault_status`: `vault_legacy` | `vault_v2_done` | `vault_v2_pilot` | `vault_pending`
- `priority`: 1=试点 · 2=legacy 批量 · 3=knowledge 已 v2

vault 笔记可选 frontmatter：`spot_check: YYYY-MM-DD`（≥45 min 且 factual 通过）。manifest 未来可同步 `spot_check_done`（**backlog**）。

更新 manifest：运行 `workspace/bilibili/_build_manifest.py`。

---

## 批量顺序（legacy 19）

1. IBM `BV1eWGH6JE6m` — **试点闭环** ✅  
2. 20–30min 单场 × 5 — **vault v2 完成** ✅  
3. 45min+ 对谈 × 5 — **vault v2 完成** ✅  
4. 60–70min 长视频 × 3 — **vault v2 完成** ✅  

**legacy 19 全部 `vault_v2_done`**（2026-07-02）。manifest 见 `workspace/bilibili/manifest.json`。

knowledge 13（已 v2）：**ASR 升级 backlog**，仅 factual 冲突时重跑。
