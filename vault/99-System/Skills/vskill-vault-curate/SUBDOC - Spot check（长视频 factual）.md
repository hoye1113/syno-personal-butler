# SUBDOC - Spot check（长视频 factual）

> **Legacy：新图文专栏收录不运行 Spot Check；本文件只用于历史 ASR 笔记核验。**



> **父 skill**：[SKILL.md](./SKILL.md) · **收录模板**：[SUBDOC - B站视频转写收录.md](./SUBDOC%20-%20B站视频转写收录.md) · **ASR 源**：[SUBDOC - ASR后处理与manifest.md](./SUBDOC%20-%20ASR后处理与manifest.md)



---



## 定位（质量门第二层）



| 层 | 检查什么 | 工具 |

|----|----------|------|

| 1 | 结构 / 九段 / 小结 / tag / 反向链 | Pass2 + B站 SUBDOC 质量门 |

| **2** | **factual**（人名、数字、立场、原话） | **本 SUBDOC + 脚本** |

| 3 | manifest / MOC 同步 | Recastory `_build_manifest.py` |



`vault_v2_done` = 层 1；**≥45 min 还必须层 2 通过**（`spot_check` 日期登记）。



---



## 何时跑



| 条件 | 动作 |

|------|------|

| `duration` **≥45:00** 且 Pass2 刚落盘 | **必跑** |

| 用户反馈 factual 错误 | 单篇重查 |

| 批量完成后 | `--list-long` 看 backlog |



**不查**：文风、分话题粒度、合理归纳（讲义比 ASR 干净是正常的）。



---



## P0 / P1



| 级别 | 类型 | 处理 |

|------|------|------|

| **P0** | 人名/公司/产品错、数字错、立场反了、原话伪造 | **必须改 vault** |

| **P1** | ASR 噪声写入讲义（如 fraud→rot）、版本号 ASR 误听 | **建议改 vault** |

| **P1** | 嘉宾名 ASR 误听、讲义用正确拼写 | 报告注明即可 |

| **P2** | 风格 | 忽略 |



**脚本「ASR 未命中」≠ P0**——可能是讲义归纳；要对读 `### [mm:ss]` 段再判。



---



## 半自动流程（稳定版）



```

① python 99-System/scripts/bilibili-spot-check.py --list-long

   → 看待查清单



② python .../bilibili-spot-check.py "<笔记>" -o 99-System/audit/spot-check-<BV>.md

   → 工作表（锚点 + wikilink + 原话）



③ agent/人工：按工作表对读 ASR，P0/P1 清零



④ vault frontmatter 加 spot_check: YYYY-MM-DD

   合并结论进 99-System/audit/bilibili-spot-check-{date}.md

```



### 环境



- `RECASTORY_WORKSPACE`：含 `bilibili-retranscribe/` 的目录；未设则自动探测常见路径。



### 命令



```powershell

# 待查 backlog（≥45 min）

python 99-System/scripts/bilibili-spot-check.py --list-long



# 单篇工作表

python 99-System/scripts/bilibili-spot-check.py `

  "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/Manus创始人-深度干货-上下文工程的最佳实践.md" `

  -o 99-System/audit/spot-check-BV12x1xB8E7b.md

```



---



## Agent 检查清单



```

- [ ] ASR 文件存在，asr_version v2

- [ ] 分话题每节人工读过至少 1 段 ASR

- [ ] 原话 ≥3 条在 ASR 有英文片段命中

- [ ] wikilink 无死链（脚本会列 ⚠）

- [ ] P0 = 0

- [ ] frontmatter spot_check 已填

```



---



## 进度

- 2026-07-02：完成首批 11 篇，见 [bilibili-spot-check-2026-07-02.md](../../audit/bilibili-spot-check-2026-07-02.md)。
- 2026-07-13：可信度审计新增 6 篇无时间戳 ASR 四锚点对读；当前 gap check 尚有 9 篇长视频待查。

---

## 不必现在做（backlog）

- manifest 同步 `spot_check_done` 字段
- 脚本自动判 P0（误判率高，保持半自动）


