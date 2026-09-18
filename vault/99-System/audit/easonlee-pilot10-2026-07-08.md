# Easonlee pilot10 试跑结果（2026-07-08）

> 来源：§二 优先待收录前 10 条（Recastory ASR+专栏已齐，无需重下）

## 结果

| 项 | 值 |
|----|-----|
| 写入 vault | **10** 篇 S 轨 Host-Guest v3.2 |
| manifest | `vault_v2_done` ×10 |
| gap-check | **122/122 绿**（S 91 + A-dialogue 25 + A-lecture 6） |
| B 站总计 | 112 → **122** |

## 批次清单

| BV | vault 路径 |
|----|------------|
| BV11H526yEiB | 行业观点与组织/OpenAI总裁-GPT5.5与下一阶段AI发展.md |
| BV12RVf62Ed2 | 行业观点与组织/Harvey CEO-31岁运营百亿法律AI公司.md |
| BV1467R6LEzm | Agent架构与平台/YC合伙人-YC内部AI代理基础设施.md |
| BV14jrKBcEav | 行业观点与组织/Vercel COO-2026世界级GTM与推广工程师.md |
| BV16BQhBEEgH | Agent架构与平台/Asana CPO-AI时代工作图谱与共享记忆.md |
| BV16JdVBGEyU | 行业观点与组织/黄仁勋-英伟达护城河与计算驱动经济.md |
| BV16wGS6MEEn | 行业观点与组织/Notion CEO-AI原生组织像爵士乐队.md |
| BV17p9yB9Ef3 | 行业观点与组织/Replit CEO-建设者与布道者两种人.md |
| BV17x9yBXEug | 行业观点与组织/Meta前高管-一半产品经理为何陷入困境.md |
| BV18grKBNEJA | 行业观点与组织/ElevenLabs与Lovable CEO-坐上AI火箭.md |

## 脚本修复

- `bilibili-v3-gap-check.py`：`has_s_column` 对 manifest 已有 `column_url` + 专栏 ≥3k 字视为 S 轨（修复 Asana Q&A 格式专栏误判）

## 剩余

- Easonlee §二 待收录：**76** 篇（86 − 10）
- §三 无 column：**9** 篇
