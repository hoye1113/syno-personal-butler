# Easonlee 专栏/视频收录筛查（2026-07-08）

> **UP**：[Easonlee的AI笔记](https://space.bilibili.com/3546559488723681)（mid `3546559488723681`）
> **专栏**：[upload/opus](https://space.bilibili.com/3546559488723681/upload/opus) · **视频**：[upload/video](https://space.bilibili.com/3546559488723681/upload/video)
> **方法**：kimi-webbridge 抓专栏页 DOM + Recastory manifest / vault BV 交叉比对（B站 list API 当日限流，视频全量用 2026-07-03 缓存 + manifest 增量）

## 总览

| 维度 | 数量 | 说明 |
|------|------|------|
| UP 视频（缓存列表） | 500 | `_easonlee_bv_list.txt` |
| Recastory manifest（Easonlee 批次） | 190 | `easonlee_channel_2026` + `_new` |
| **vault 已收录** | **90** | BV 命中 `B站视频知识库` |
| manifest 有 ASR、vault 未收录 | **85** | Recastory 已有 `article.md`，差 vault 写作 |
| 其中含专栏 URL（S 轨候选） | **76** | 可直接走 v3 / 对谈稿 |
| 有 ASR 无 column_url | 9 | A-dialogue / A-lecture 看形态 |
| 无 UP 评论专栏链接（跳过 ASR） | 15 | `skipped_no_link` |
| UP 视频未进 manifest | 316 | 多数无专栏链（见下） |
| 专栏 opus（DOM 已抓页） | 20 | 分页抓取；API 404 限流 |
| manifest 中唯一专栏链 | 153 | opus + cv |

### 结论（一句话）

**76 篇「视频+专栏+ASR」已在 Recastory，尚未写入 vault；另有 316 条 UP 视频未进 manifest（其中约 284 条无专栏链可跳过，0 条有专栏待拉 ASR）。**

---

## 一、已收录（vault 有 BV）

共 **90** 篇（manifest Easonlee 批次内）。

## 二、优先待收录：Recastory 已有 ASR + 专栏，vault 未写

下列条目 **无需重下视频/ASR**，可直接按 S / A-dialogue 轨写 vault 笔记：

| # | BV | 标题 | 专栏 |
|---|-----|------|------|
| 1 | [BV19qLA6BEHx](https://www.bilibili.com/video/BV19qLA6BEHx/) | 从零开始构建 AlphaGo – Eric Jang | ✓ |
| 2 | [BV1ArFCz5EjX](https://www.bilibili.com/video/BV1ArFCz5EjX/) | Lex Fridman播客：2026年AI 现状与展望 | ✓ |
| 3 | [BV1AwXCBxEBk](https://www.bilibili.com/video/BV1AwXCBxEBk/) | 杨植麟GTC演讲：Kimi K2.5的 研发内幕 | ✓ |
| 4 | [BV1CoLA6REyB](https://www.bilibili.com/video/BV1CoLA6REyB/) | 杨立昆：继续对LLM开炮，世界模型才是未来 | ✓ |
| 5 | [BV1De7R6JELZ](https://www.bilibili.com/video/BV1De7R6JELZ/) | Every CEO：全员AI后 员工数翻了3倍 | ✓ |
| 6 | [BV1Dj93BUEXU](https://www.bilibili.com/video/BV1Dj93BUEXU/) | OpenClaw实战：Every团队演示使用Case | ✓ |
| 7 | [BV1E4DtBKEUN](https://www.bilibili.com/video/BV1E4DtBKEUN/) | Mistral首席科学家：微调比闭源模型 更具竞争优势 | ✓ |
| 8 | [BV1EJjN6XETy](https://www.bilibili.com/video/BV1EJjN6XETy/) | Dan Koe：把多重兴趣 变成一人公司 | ✓ |
| 9 | [BV1EfGd6WEzK](https://www.bilibili.com/video/BV1EfGd6WEzK/) | Alex Wang：加入Meta 10个月 幕后故事 | ✓ |
| 10 | [BV1F8Ju6VEbp](https://www.bilibili.com/video/BV1F8Ju6VEbp/) | Nebius联创：AI基建无泡沫 全栈交付是关键 | ✓ |
| 11 | [BV1FNDbBgEkn](https://www.bilibili.com/video/BV1FNDbBgEkn/) | AI创业思路：23 个让我彻夜 难眠的AI趋势 | ✓ |
| 12 | [BV1FX536qEFS](https://www.bilibili.com/video/BV1FX536qEFS/) | Speechify CEO：从100位CEO 学到的经验 | ✓ |
| 13 | [BV1FZQ8B2EJn](https://www.bilibili.com/video/BV1FZQ8B2EJn/) | OpenAI首席科学家：超越代码的 强化学习 | ✓ |
| 14 | [BV1G2Gn61E9b](https://www.bilibili.com/video/BV1G2Gn61E9b/) | C++之父：贝尔实验室往事 AI代码的局限性 | ✓ |
| 15 | [BV1GzPyzuEMe](https://www.bilibili.com/video/BV1GzPyzuEMe/) | 写作技巧：2026年最值得学习的技能（AI无法取代） | ✓ |
| 16 | [BV1H1FCzrEEF](https://www.bilibili.com/video/BV1H1FCzrEEF/) | OpenAI官方博客：AI在各行业 落地现状 | ✓ |
| 17 | [BV1Jo7R6eEGi](https://www.bilibili.com/video/BV1Jo7R6eEGi/) | Every CEO：AI越强大 工作也越多 | ✓ |
| 18 | [BV1KMGU6LEqd](https://www.bilibili.com/video/BV1KMGU6LEqd/) | 两场关于通用人工智能（AGI）的对赌：Google I/O 亮点解析 | ✓ |
| 19 | [BV1KXDtBEEbV](https://www.bilibili.com/video/BV1KXDtBEEbV/) | Polsia CEO：1个人用AI Agent，1个月百万美金ARR | ✓ |
| 20 | [BV1LvZTBREby](https://www.bilibili.com/video/BV1LvZTBREby/) | 马斯克：xAI内部复盘 与规划 | ✓ |
| 21 | [BV1NK5m61ErG](https://www.bilibili.com/video/BV1NK5m61ErG/) | Codex实战：AI编程2026 新手教程 | ✓ |
| 22 | [BV1NscRzUEia](https://www.bilibili.com/video/BV1NscRzUEia/) | OpenClaw实战：养虾指南！ 打造你的数字员工 | ✓ |
| 23 | [BV1QvrCBkEgE](https://www.bilibili.com/video/BV1QvrCBkEgE/) | 【免费文稿】马斯克2026最新访谈：信息量极大，奇点临近，AGI 2026到来 | ✓ |
| 24 | [BV1R25A6BEfX](https://www.bilibili.com/video/BV1R25A6BEfX/) | 黄仁勋最新访谈：从生成到代理计算 需求再翻千倍 | ✓ |
| 25 | [BV1RnEL6UEdh](https://www.bilibili.com/video/BV1RnEL6UEdh/) | Emergent CEO：9个月 1亿美元ARR | ✓ |
| 26 | [BV1RrLz6rEH2](https://www.bilibili.com/video/BV1RrLz6rEH2/) | 走进 Abridge：正在监听 1 亿次医生诊疗的 AI —— Abridge 的 Janie Lee  | ✓ |
| 27 | [BV1SsE368Ea8](https://www.bilibili.com/video/BV1SsE368Ea8/) | Leyora CEO：法律Agent 1亿ARR | ✓ |
| 28 | [BV1T6Gd6qEyS](https://www.bilibili.com/video/BV1T6Gd6qEyS/) | AI创业思路：9个最大的 AI创业点子 | ✓ |
| 29 | [BV1ToE56KE7E](https://www.bilibili.com/video/BV1ToE56KE7E/) | a16z前合伙人：关于AI今年 最理性的简介 | ✓ |
| 30 | [BV1VEooBdEjQ](https://www.bilibili.com/video/BV1VEooBdEjQ/) | Seedance实战：AI视频 转向可控编辑 | ✓ |
| 31 | [BV1VRdABBEnK](https://www.bilibili.com/video/BV1VRdABBEnK/) | OpenClaw实战：从零开始完成 OpenClaw全套配置 | ✓ |
| 32 | [BV1Va9yBmEaK](https://www.bilibili.com/video/BV1Va9yBmEaK/) | 新模型解读：GPT5.5登场 DeepSeek V4发布 | ✓ |
| 33 | [BV1WPo4B9EyZ](https://www.bilibili.com/video/BV1WPo4B9EyZ/) | Sam Altman：AI海啸已来 社会如何准备 | ✓ |
| 34 | [BV1WhoEBPEau](https://www.bilibili.com/video/BV1WhoEBPEau/) | OpenAI官方：重磅！GPT Image2.0现场演示 | ✓ |
| 35 | [BV1X1XdBCEqH](https://www.bilibili.com/video/BV1X1XdBCEqH/) | Granola联创：AI时代的笔记 软件应该这样 | ✓ |
| 36 | [BV1YX9CB5ETB](https://www.bilibili.com/video/BV1YX9CB5ETB/) | Claude Design实战：1小时从创意 到高保真原型 | ✓ |
| 37 | [BV1Ye9yBjELt](https://www.bilibili.com/video/BV1Ye9yBjELt/) | 谷歌云CEO：TPU比NVIDIA 的核心优势 | ✓ |
| 38 | [BV1YfE36TEyz](https://www.bilibili.com/video/BV1YfE36TEyz/) | Chatbase CEO：如何117天 实现百万ARR | ✓ |
| 39 | [BV1aQdHBpEMB](https://www.bilibili.com/video/BV1aQdHBpEMB/) | Hearth AI创始人：像艺术家一样去创作 | ✓ |
| 40 | [BV1aTrKBTEAD](https://www.bilibili.com/video/BV1aTrKBTEAD/) | Roadrunner创始人：从CPO到CEO | ✓ |
| 41 | [BV1bq7R67EqG](https://www.bilibili.com/video/BV1bq7R67EqG/) | Seeed CEO：物理AI的未来 不是人形机器人 | ✓ |
| 42 | [BV1bv7R6UEfy](https://www.bilibili.com/video/BV1bv7R6UEfy/) | Neuralink联创：脑机接口是 AI的终极形态 | ✓ |
| 43 | [BV1c8RmB6E6C](https://www.bilibili.com/video/BV1c8RmB6E6C/) | OpenAI总裁：AI 即将迎来 爆发式增长 | ✓ |
| 44 | [BV1dJEL6JEeR](https://www.bilibili.com/video/BV1dJEL6JEeR/) | Hermes实战：新手配置 真实使用案例 | ✓ |
| 45 | [BV1db7V6rEpr](https://www.bilibili.com/video/BV1db7V6rEpr/) | 李飞飞：10年后 只有两种工作 | ✓ |
| 46 | [BV1dg5t6gEJ8](https://www.bilibili.com/video/BV1dg5t6gEJ8/) | Brex CEO：他打造了首位 全职 AI CEO | ✓ |
| 47 | [BV1eS9CBjESZ](https://www.bilibili.com/video/BV1eS9CBjESZ/) | Stripe设计主管：如何用AI设计 我们的新网站 | ✓ |
| 48 | [BV1fqAHz7EG6](https://www.bilibili.com/video/BV1fqAHz7EG6/) | 陶哲轩：当最强大脑 遇上宇宙终极难题 | ✓ |
| 49 | [BV1g5V66AEUL](https://www.bilibili.com/video/BV1g5V66AEUL/) | Arise首席：AI新交互方式 无限画布！ | ✓ |
| 50 | [BV1gDE56gE7B](https://www.bilibili.com/video/BV1gDE56gE7B/) | xAI研究员：xAI从零构建 视频模型的内幕 | ✓ |
| 51 | [BV1gE93BEEUq](https://www.bilibili.com/video/BV1gE93BEEUq/) | AI App实战：现场演示6个AI工具 共同开发一个App | ✓ |
| 52 | [BV1hoGm6XEdD](https://www.bilibili.com/video/BV1hoGm6XEdD/) | 芯片设计的深度解读 – Reiner Pope | ✓ |
| 53 | [BV1jrjP6UEe3](https://www.bilibili.com/video/BV1jrjP6UEe3/) | Brex CEO：打造全公司
m共用的AI型CEO | ✓ |
| 54 | [BV1kTo4BQE43](https://www.bilibili.com/video/BV1kTo4BQE43/) | Logical CEO：用好LLM的关键方法论 | ✓ |
| 55 | [BV1ka9CBZEGN](https://www.bilibili.com/video/BV1ka9CBZEGN/) | 无内容Tibo：5分钟搞懂硅基 | ✓ |
| 56 | [BV1mG6nBKECW](https://www.bilibili.com/video/BV1mG6nBKECW/) | 深度访谈：ClawdBot创始人：一个人顶一个团队，从0到现在的产品 | ✓ |
| 57 | [BV1mx93BkEPg](https://www.bilibili.com/video/BV1mx93BkEPg/) | Semianalysis CEO：AI 训练算力：空间瓶颈 | ✓ |
| 58 | [BV1nnGU6TEeN](https://www.bilibili.com/video/BV1nnGU6TEeN/) | Cerebras 630 亿美元 IPO 背后的故事：对话创始人兼 CEO Andrew Feldman | ✓ |
| 59 | [BV1oGDbBeEjv](https://www.bilibili.com/video/BV1oGDbBeEjv/) | DeepMind播客：AlphaGo 10周年：AI的转折点 | ✓ |
| 60 | [BV1pYDiBPEQA](https://www.bilibili.com/video/BV1pYDiBPEQA/) | Claude深度功能：Claude代码的 Claude强制19种测试统计准确性失效 | ✓ |
| 61 | [BV1qEdaBdEYi](https://www.bilibili.com/video/BV1qEdaBdEYi/) | a16z创始人：程序员末日将 Pi与OpenClaw | ✓ |
| 62 | [BV1qhDtBYEMK](https://www.bilibili.com/video/BV1qhDtBYEMK/) | Uber CTO：未来在机器人 物流系统 | ✓ |
| 63 | [BV1qiE56SE4c](https://www.bilibili.com/video/BV1qiE56SE4c/) | 一人公司：一个人做出5个APP 全部使用AI工具 | ✓ |
| 64 | [BV1rEEh6KEVF](https://www.bilibili.com/video/BV1rEEh6KEVF/) | Giga创始人：为什么拒绝孙正义 去做创业 | ✓ |
| 65 | [BV1rdAVzAEdS](https://www.bilibili.com/video/BV1rdAVzAEdS/) | OpenClaw教程：实战 完整指南 | ✓ |
| 66 | [BV1rh526BEjY](https://www.bilibili.com/video/BV1rh526BEjY/) | Postgres之父：LLM 不会 取代关系数据库 | ✓ |
| 67 | [BV1sM9yBPE6N](https://www.bilibili.com/video/BV1sM9yBPE6N/) | GPT Image2深度体验：AI生图领域新突破 | ✓ |
| 68 | [BV1tF5m6UEGf](https://www.bilibili.com/video/BV1tF5m6UEGf/) | AI编程工具：2026年 趋势与Vibe Code | ✓ |
| 69 | [BV1tSDtBnE2k](https://www.bilibili.com/video/BV1tSDtBnE2k/) | arc创始人：只有Scaling Law能到达AGI | ✓ |
| 70 | [BV1tw9yBMEUK](https://www.bilibili.com/video/BV1tw9yBMEUK/) | Snap CEO：面对增长还是 失败的选择 | ✓ |
| 71 | [BV1u3Lz6AEb3](https://www.bilibili.com/video/BV1u3Lz6AEb3/) | 多模融合（多模态对齐和组合）：对话 Amy Boyd & Nitya Narasimhan, 微软 | ✓ |
| 72 | [BV1ug7Q6uEhX](https://www.bilibili.com/video/BV1ug7Q6uEhX/) | Orgo创始人：独自构建AI 事业：一人公司 | ✓ |
| 73 | [BV1wwDbBGEsA](https://www.bilibili.com/video/BV1wwDbBGEsA/) | 深度讨论LLM 推动AGI 基础模型不断推进 | ✓ |
| 74 | [BV1wxDnB9Eo9](https://www.bilibili.com/video/BV1wxDnB9Eo9/) | OpenAI总裁：AI要让每个人都受益 是AGI之路 | ✓ |
| 75 | [BV1yAo4BsEed](https://www.bilibili.com/video/BV1yAo4BsEed/) | 前Paypal高管：PM 已经死透 枪毙了所有产品经理 | ✓ |
| 76 | [BV1ynJu6EEpC](https://www.bilibili.com/video/BV1ynJu6EEpC/) | Ulta总裁：AI Agnet革命 美丽行业实践 | ✓ |

## 三、有 ASR 但无 column_url（vault 未收录）

| BV | 标题 | enrich |
|----|------|--------|
| [BV1HcifBWEAE](https://www.bilibili.com/video/BV1HcifBWEAE/) | 她将自己的一生变成了训练数据——为了一个AI宝宝 | ok |
| [BV1KQPyzcEwj](https://www.bilibili.com/video/BV1KQPyzcEwj/) | a16z合伙人：如何成为一名 伟大的创始人? | ok |
| [BV1TyTi6eEni](https://www.bilibili.com/video/BV1TyTi6eEni/) | Hermes实战：打造你的24小时数字员工 | ok |
| [BV1a9zXBeEKc](https://www.bilibili.com/video/BV1a9zXBeEKc/) | OpenAI首席研究员：人才大战！OpenAI如何做研究？ | ok |
| [BV1iUZBBjEUo](https://www.bilibili.com/video/BV1iUZBBjEUo/) | 马斯克：天才工程师：AI需要一个人开挂 | ok |
| [BV1paf9BTEBk](https://www.bilibili.com/video/BV1paf9BTEBk/) | OpenClaw现场演示如何使用 | ok |
| [BV1qeitB8EAk](https://www.bilibili.com/video/BV1qeitB8EAk/) | 飞飞飞：深度探讨空间世界生成模型 | ok |
| [BV1rQf8BKEdA](https://www.bilibili.com/video/BV1rQf8BKEdA/) | Every团队：AI如何重塑工作流 | ok |
| [BV1sFibBkEcT](https://www.bilibili.com/video/BV1sFibBkEcT/) | Lovable创始人：Lovable是如何1个人实现2亿美元ARR的 | ok |

## 四、manifest 内跳过（无专栏链接）

共 **15** 条：`asr_status=skipped_no_link`，不符合「专栏主源」收录条件。

## 五、UP 全量视频 vs manifest

- 缓存 UP 列表 **500** 条，其中 **316** 条不在 manifest。
- 2026-07-03 专栏探测（468 条当时未入库）：`no_column_skip` **299** · `todo_full_pipeline` **169**（后者已批量进 manifest）。
- 当前仍不在 manifest 的 **316** 条中，探测状态：`no_column_skip` **284** · 仍有专栏待流水线 **0**。

**未进 manifest 且有专栏的条目**需：`python -m tools.ingest "https://www.bilibili.com/video/<BV>/" -o workspace/bilibili-retranscribe/<BV>`（enrich → 下载 → ASR）。

## 六、专栏 opus 页（`/upload/opus`）

WebBridge DOM 抓取 **20** 个 opus id（分页；标题 DOM 噪声大，以 manifest 标题为准）。

**opus 页有、manifest 未登记 column 链**：20 个（可能对应尚未 enrich 的视频）。

| opus id | 链接 |
|---------|------|
| `1222491144375500806` | [opus](https://www.bilibili.com/opus/1222491144375500806) |
| `1222346069005828103` | [opus](https://www.bilibili.com/opus/1222346069005828103) |
| `1222120059228389384` | [opus](https://www.bilibili.com/opus/1222120059228389384) |
| `1221903592888205347` | [opus](https://www.bilibili.com/opus/1221903592888205347) |
| `1221006820893523977` | [opus](https://www.bilibili.com/opus/1221006820893523977) |
| `1220790337315799046` | [opus](https://www.bilibili.com/opus/1220790337315799046) |
| `1220682108464267319` | [opus](https://www.bilibili.com/opus/1220682108464267319) |
| `1220635718514114561` | [opus](https://www.bilibili.com/opus/1220635718514114561) |
| `1220419260720873510` | [opus](https://www.bilibili.com/opus/1220419260720873510) |
| `1220311027565985864` | [opus](https://www.bilibili.com/opus/1220311027565985864) |
| `1219939938135441409` | [opus](https://www.bilibili.com/opus/1219939938135441409) |
| `1219893556755300358` | [opus](https://www.bilibili.com/opus/1219893556755300358) |
| `1219677081828327449` | [opus](https://www.bilibili.com/opus/1219677081828327449) |
| `1219568852929609729` | [opus](https://www.bilibili.com/opus/1219568852929609729) |
| `1219522467304833040` | [opus](https://www.bilibili.com/opus/1219522467304833040) |
| `1219306000953114633` | [opus](https://www.bilibili.com/opus/1219306000953114633) |
| `1219197763480190980` | [opus](https://www.bilibili.com/opus/1219197763480190980) |
| `1219151382080126980` | [opus](https://www.bilibili.com/opus/1219151382080126980) |
| `1219004283795537944` | [opus](https://www.bilibili.com/opus/1219004283795537944) |
| `1218232456674541606` | [opus](https://www.bilibili.com/opus/1218232456674541606) |

## 七、建议执行顺序

1. **§二 76 篇** → vault v3 / 对谈稿（Recastory ASR+专栏已齐）
2. **§三 9 篇** → 按形态 A-dialogue / A-lecture 收录（ASR 已有）
3. **未 manifest + 有专栏** → Recastory 完整 ingest 流水线
4. **无专栏链接** → 跳过（除非人工升优）

## 数据源

- `${RECASTORY_WORKSPACE}\bilibili\manifest.json`
- `${RECASTORY_WORKSPACE}\bilibili\easonlee_opus_dom.json`
- `${RECASTORY_WORKSPACE}\bilibili\easonlee_column_probe.json`
- vault BV 扫描：`02-Resources/AI and Agents/B站视频知识库/`
