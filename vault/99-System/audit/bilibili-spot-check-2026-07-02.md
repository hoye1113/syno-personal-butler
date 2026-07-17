# B 站长视频 Spot Check — 2026-07-02

> 方法：[SUBDOC - Spot check（长视频 factual）](../Skills/vskill-vault-curate/SUBDOC%20-%20Spot%20check（长视频%20factual）.md)  
> ASR 源：`Recastory/workspace/bilibili-retranscribe/{BV}/article.md`（v2）

---

## 1. Manus 上下文工程（BV12x1xB8E7b，~61 min）

**结论：通过（P0×1 已修）**

| 核对项 | ASR 依据 | 讲义 | 级别 |
|--------|----------|------|------|
| 讲者 Pe / Lance | `[00:06] Peak from Manus` / LangChain Lance | Peek/Pe + Lance | ✓ |
| ~50 tool calls | Manus blog 引用（Lance 段） | §1 | ✓ |
| rot threshold 128k–200k | `typically maybe around 200k` / `128k` | §6 | ✓ |
| compaction vs summarization | `[14:18]` 长段 | §6 | ✓ |
| 三层 action space | `[19:58]` function / sandbox / packages | §8 | ✓ |
| 重构 5 次（3 月→10 月） | `[28:01]` March launch, October | §9 | ✓ |
| todo 占 1/3 action | `[42:28]` one third | §9 | ✓ |
| atomic tools ~10–20 | `[40:27]` 10 or 20 | §8 | ✓ |
| **context fraud** | ASR 误听 rot | 讲义误写 rot/fraud | **P0→已改 rot** |

---

## 2. Agent 完整教程（BV1PnQfBvEs3，~59 min）

**结论：通过（P0=0）**

| 核对项 | ASR 依据 | 讲义 | 级别 |
|--------|----------|------|------|
| chat vs agent | `question to answer` / `goal to result` | §1、原话 | ✓ |
| Observe-Think-Act | `[03:13]` | §2 | ✓ |
| 10–20× 产出 | `[01:14]` 10 to 20 times | §1 | ✓ |
| agents.md ≤200 行 | `[25:31]` 200 lines | §6 | ✓ |
| 220 条广告 / 3–4h | `[39:13]`–`[40:20]` | §8 | ✓ |
| ~15 skills Meta ads | `[43:55]` 15 different skills | §8 | ✓ |
| 嘉宾名 Remy | ASR `Remy Gaskills` | Remi Gasiglia | P1（ASR 误听，讲义合理） |
| OpenClaw 放第二步 | `[44:51]` learn Claude first | §8、行动启示 | ✓ |

---

## 3. Obsidian 第二大脑（BV1s2Gd6aEF7，~70 min）

**结论：通过（P1×1 已修）**

| 核对项 | ASR 依据 | 讲义 | 级别 |
|--------|----------|------|------|
| vault ~1500 笔记 | `[15:30]` probably 1500 things | §4 | ✓ |
| Tesla 30 万行 C++ | `[19:33]` 300,000 lines | §3 | ✓ |
| thinking mode 禁写稿 | frontmatter 示例 `[12:58]` | §2 | ✓ |
| Interviewer subagent | `[17:52]`–`[18:51]` | §3 | ✓ |
| Tailscale + Termius + mini PC | `[48:46]`–`[49:10]` | §6 | ✓ |
| 手机 2h 写 talk | `[49:10]` Two hours | §6 | ✓ |
| partition mini PC 给朋友 | `[49:10]` partitions | §6 | ✓ |
| Thomas's English Muffin | `[28:50]` nooks and crannies | 关键概念表 | ✓ |
| 女儿 v0 / 75 iter | `[191]` 75 Revs on v0 | §9 | ✓ |
| Grok voice 优于其他 | `[04:37]` way better | §7 | ✓ |
| **Correct 2/3/4** | ASR 误听 Grok 版本 | 讲义误写 | **P1→已改 Grok 2/3/4** |

---

## 后续

- 新增长视频（≥45 min）Pass2 后：`python 99-System/scripts/bilibili-spot-check.py --list-long` 确认 backlog
- 单篇：`-o 99-System/audit/spot-check-<BV>.md` → 对读 → `spot_check` frontmatter
- **待查（0/11）**：本批 4 篇已完成（§8–§11）

---

## 8. OpenAI 上下文工程（BV14nrMBKENb，~58 min）

**结论：通过（P1×1 已修）**

| 核对项 | ASR 依据 | 讲义 | 级别 |
|--------|----------|------|------|
| Emory / Micah / Brian | Build Hour 开场 | frontmatter | ✓ |
| Andrej Karpathy art+science | `Andre Carpati` / art and science | §1 | ✓（ASR 误听 Carpati） |
| 300–400 → 3000+ token burst | turn 2→3 `300400 tokens... more than 3000` | §3、原话 | ✓ |
| trim turn 6 / summarize turn 5 | demo 参数口述 | §4 | ✓ |
| 40/80% 阈值 | `40 or 80%` | §4 | ✓ |
| cross-session Sequoia greeting | `Mac OS S Sequoia` internet issue | §5 | ✓ |
| memory guardrails stale | `not authoritative... stale` | §5、原话 | ✓ |
| **F update** | ASR 误听 `F update`（实为 OS update） | 讲义写 F 更新 | **P1→已改 OS 更新** |

---

## 9. Codex 新手教程（BV19MzXBNESV，~53 min）

**结论：通过（P0=0）**

| 核对项 | ASR 依据 | 讲义 | 级别 |
|--------|----------|------|------|
| Derek / Charlie | 开场 onboarding | frontmatter | ✓ |
| GPT-5.1 Codex Max | `G T5.1 codex max` | §1 | ✓ |
| AGENTS.md <100 行 | `less than 100 lines` | §3、原话 | ✓ |
| plans.md living doc + 10+ hr refactor | `[10:36]` engineer case | §3 | ✓ |
| cupcake 7 marble / Context7 | MCP demo 段 | §7 | ✓ |
| review P0/P1 only | `P zero like P1 issues` | §8、原话 | ✓ |
| codex exec + JSON schema | headless + output schema | §8 | ✓ |

---

## 10. DeepMind Harness（BV18hjG6bE6t / A5，~51 min）

**结论：通过（P0×2 已修）**

| 核对项 | ASR 依据 | 讲义 | 级别 |
|--------|----------|------|------|
| Antigravity = agent harness throw line | IO 宣布 + 生态段 | §1 | ✓ |
| coding = general-purpose harness | 原话段 | §1、原话 | ✓ |
| Windsurf deal → Antigravity | `win surf deal` | §4 | ✓ |
| Gemini 3 Flash > Pro (coding) | `three flash... better than any pro` | §4 | **P0→已改 3 Flash（非 3.5 Flash）** |
| harness alpha **~1 month** | `harness today into a month` | 多处写六个月 | **P0→已改约一个月** |
| 350k apps/week AI Studio | `350 thousand... since last week` | §9 | ✓ |
| 100k+ engineers dogfood | `one hundred thousand plus` | §4 | ✓ |
| GameArena ~20% games | `twenty percent... games` | §6 | ✓ |
| HarnessBench | ASR `cartist bench` | 讲义 HarnessBench | P1（ASR 误听，讲义合理） |

---

## 11. WorkOS Skills（BV18bjG6fEi7 / A6，~81 min）

**结论：通过（P1×1 已修）**

| 核对项 | ASR 依据 | 讲义 | 级别 |
|--------|----------|------|------|
| Nick & Zack DX engineers | 开场 + Q&A | frontmatter | ✓ |
| 6–8 months 没手写代码 | `six or eight months` | 先搞懂 | ✓ |
| repo-roast workshop skill | `ripo roast` | 全文 | ✓ |
| description = routing | `not for humans` | §2、原话 | ✓ |
| bang `!` interpolation | JS template 类比段 | §4 | ✓ |
| Next.js installer −30% eval | `thirty percent drop` | §3、§10 | ✓ |
| 60 engineers Slack skills | audience Q&A | §7 | ✓ |
| eval 80–90% with skill | eval framework 段 | §10 | ✓ |
| **$200/month 原话** | ASR 无命中（他期内容） | 误收录原话 | **P1→已删** |

---

## 4. Brex 数据分析师（BV1Mpf9B5Egk，~52 min）

**结论：通过（P1×1 已修）**

| 核对项 | ASR 依据 | 讲义 | 级别 |
|--------|----------|------|------|
| 四步循环 monitoring→impact | `[00:52]`–`[04:23]` | §1 | ✓ |
| Slack incident 解释 metric | `[07:17]`–`[08:07]` | §2 | ✓ |
| 3 seed queries + MCP eval | `[08:54]`–`[13:34]` | §3 | ✓ |
| 2M rows / tight semantic context | `[17:24]`–`[20:17]` | §4 | ✓ |
| healthcare 61% vs AI 73% Series B | `[26:42]` | §5 | ✓ |
| Cursor #1 momentum | `[28:15]`–`[30:30]` | §5 | ✓ |
| data analysis Skill limit 50 | `[32:44]` | §6 | ✓ |
| **11 Labs** | ASR `11 labs` | 讲义误写 | **P1→ElevenLabs** |

---

## 5. Boris Tokenmaxxing（BV1NuGU6yE1b，~57 min）

**结论：通过（P0=0）**

| 核对项 | ASR 依据 | 讲义 | 级别 |
|--------|----------|------|------|
| 80x YoY / $4B→$45B ARR | `[01:33]` | 先搞懂 | ✓ |
| 8 flights + 5 hotels | `[07:57]`–`[08:37]` | §2、§8 | ✓ |
| token maxing not large percent | `[11:13]` | §3、原话 | ✓ |
| HBR computers productivity | `[15:07]`–`[18:06]` | §3 | ✓ |
| +250% code / psychological safety | `[12:29]`–`[13:32]` | §3 | ✓ |
| Auto mode second Claude | `[31:28]`–`[32:13]` | §6 | ✓ |
| YC ~50% 100% AI code | `[22:19]`–`[22:32]` | §4 | ✓ |
| Jack Clark 2028 self-improve | `[207]`–`[211]` | §8 | ✓ |
| LeCun vs Brockman world model | `[223]` | §8 | ✓ |
| Seven Powers switching cost ↓ | `[37:44]`–`[39:02]` | §7 | ✓ |

---

## 6. Codex 营销团队（BV1BLGH6REyX，~49 min）

**结论：通过（P1×1 已修）**

| 核对项 | ASR 依据 | 讲义 | 级别 |
|--------|----------|------|------|
| 95% marketing in Codex | `[00:00]` | 先搞懂、原话 | ✓ |
| `/` skill `@` plugin | `[03:30]`–`[04:41]` | §2 | ✓ |
| YouTube researcher grounding | `[06:16]`–`[08:45]` | §3 | ✓ |
| Readwise CLI + 8am automation | `[09:56]`–`[15:09]` | §4 | ✓ |
| subagent parallel | `[16:57]`–`[17:23]` | §5 | ✓ |
| FAL mini app human+agent | `[30:06]`–`[32:45]` | §6 | ✓ |
| brand deal Gmail table | `[36:55]`–`[38:46]` | §7 | ✓ |
| **xeno、hys** | ASR 随机 subagent 名 | 讲义误写 | **P1→多个 subagent** |

---

## 7. Composer 2 训练（BV1iH7R6tEfJ，~45 min）

**结论：通过（P1×3 已修）**

| 核对项 | ASR 依据 | 讲义 | 级别 |
|--------|----------|------|------|
| Kimi 2.5 base / ~3B active MoE | `[05:05]`–`[05:49]` | 先搞懂、§2 | ✓ |
| mid-training + RL dual axis | `[05:49]`–`[07:20]` | §2 | ✓ |
| async pipeline staleness | `[10:19]`–`[13:31]` | §3 | ✓ |
| inference ≈ 1/3 training FLOPs | `[13:31]` | §3 | ✓ |
| 4 global clusters + delta sync | `[14:16]`–`[17:40]` | §4 | ✓ |
| 100k VM burst | `[38:00]` | §5 | ✓ |
| fake env reward hack | `[00:00]`–`[00:29]` | §5 | ✓ |
| MoE router replay | `[21:50]`–`[23:21]` | §6 | ✓ |
| sim RL bootstrap / online cherry | `[24:53]`–`[27:34]` | §7 | ✓ |
| self-summarize in RL loop | `[28:57]`–`[29:48]` | §7 | ✓ |
| **ARL** | ASR 误听 RL | 讲义误写 | **P1→RL** |
| **RL env .vendor** | 标点噪声 | 讲义误写 | **P1→RL env vendor** |
| **delta _ship** | 标题噪声 | 讲义误写 | **P1→delta 推送** |

---

## 工作流稳定性（2026-07-02）

| 组件 | 状态 |
|------|------|
| 闭环文档（ASR→Pass2→Spot check） | ✅ SUBDOC 三件套 + INDEX |
| 脚本 `bilibili-spot-check.py` | ✅ v2：`--list-long`、`-o`、wikilink、knowledge ASR 回退 |
| **≥45 min spot check** | ✅ **11/11**（2026-07-02） |
| manifest `spot_check_done` | backlog（非阻塞） |
| 全自动 P0 判定 | **不做**（误判率高，保持半自动） |
