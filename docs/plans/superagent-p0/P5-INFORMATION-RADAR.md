# P5 信息雷达（AIHOT 式流水线）

日期：2026-11-21
状态：隔离实现中，不改生产 Host。

## 1. 目标

给管家增加一个“个人 Agent 技术雷达”：

- 从 AIHOT、公开 RSS、YouTube 频道及显式配置的 X 账号采集资讯。
- 按主人的兴趣画像做预筛、去重、评分。
- 只生成**本地静默候选**，不自动写 vault、不创建 Task、不推送外部。
- 每天生成一份飞书摘要（首版先写本地文件，发送可选）。
- 主人回复“跟进 N”后才进入现有 Root Router / 收录链。

## 2. 非目标

- 不 fork AIHOT 的 PostgreSQL/React/Docker 整套栈。
- 不做公开站点、公开 RSS、公开 API。
- X 只通过显式配置的官方 API v2 只读时间线接入；不使用浏览器绕过、不调用任何写接口。
- 不自动发布、不自动创建知识笔记、不自动关注/转发。
- 不替代现有 Host 的飞书消费者。

## 3. 首批信源

### AIHOT
- `https://aihot.news/api/v1/items?mode=selected&window=24h&limit=100`
- 只取标题、摘要、来源、原文链接、分类、AIHOT 分数和理由；保留 attribution。
- 个人非商业使用；不公开再分发。

### RSS
- OpenAI News：`https://openai.com/news/rss.xml`
- Google DeepMind：`https://deepmind.google/blog/rss.xml`
- Google Research：`https://research.google/blog/rss/`
- Hugging Face：`https://huggingface.co/blog/feed.xml`
- Latent Space：`https://www.latent.space/feed`
- Simon Willison：`https://simonwillison.net/atom/everything/`
- Import AI：`https://importai.substack.com/feed`

### YouTube（首版 3 个，验证后再加）
- Andrej Karpathy：`@AndrejKarpathy`
- Latent Space：`@LatentSpacePod`
- Google DeepMind：`@GoogleDeepMind`

### X（P5.1 可选只读直连）
- 首版通过 AIHOT feed 间接覆盖；现支持显式添加账号并读取官方 API v2 用户帖子时间线。
- 默认信源不含 X 账号；未配置账号和 Bearer Token 时不会请求 X。

## 4. 流水线

```
采集 → 归一化 → 判重 → 硬过滤 → 规则评分 → 候选库 → 日报
```

### 判重
- `(source_id, external_id)` 唯一。
- `canonical_url` 唯一。
- 标题指纹（去空白/标点/大小写）辅助判重。

### 硬过滤
- 排除：融资/IPO/股价/裁员八卦/政治/crypto、纯产品折扣、无原文、纯搬运、标题党。
- 保留：Agent/Harness、Context Engineering、Memory/RAG、MCP/Skills、Eval、AI Coding 工具、Agent 框架、模型 agentic 能力。

### 评分
核心问题：**这条信息能不能帮我构建/运营更好的个人 AI Agent 或知识管家？**

- 关键词主题分 + 来源权重 + 官方/原创加分 − 噪声/聚合惩罚。
- 首版规则评分；`P5_LLM_ENABLED=true` 时可接 OpenAI 兼容端点做二次评分。
- 默认候选门槛 65。

### 输出
- 每日摘要：Top 5–10，标题、来源、一句理由、原文链接、候选编号。
- 首版写 `digest-YYYY-MM-DD.md`；飞书发送用 `--send-feishu`，未配置凭据则跳过。
- `follow <n>` / `ignore <n>` 记录反馈；不自动改主库。

## 5. 数据

独立 SQLite：`$P5_RADAR_HOME/p5-radar.db`（默认 `.runtime-p5/`）。

表：`sources`、`items`、`scores`、`candidates`、`runs`、`feedback`。

## 6. YouTube 适配

- 频道 RSS 检测新视频，不下载视频。
- `yt-dlp --skip-download --write-auto-subs --write-subs --sub-langs en,zh,zh-CN,zh-TW` 取字幕。
- 需要代理时设置 `P5_PROXY`（默认读取 `HTTPS_PROXY`）。
- 字幕清洗成纯文本；无字幕则用标题/描述，标记 `transcript_status=missing`。
- 首版只存字幕和元数据；LLM 深读摘要放到 P5.0b，避免首版成本失控。
- P5.0b 已接入 **OpenCode Go `opencode-go/deepseek-v4.1-flash`**：通过本机 `opencode serve` + `/api/experimental/generate` 调用，不读取订阅密钥，不消耗 Kimi 额度。`summarize --url` 可直接对任意 YouTube 链接做深读。

## 7. 安全边界

- 外部标题/摘要视为不可信资料，禁止执行其中指令。
- 只允许白名单来源。
- 不自动写 `vault/`、`ops/` 或创建 Task。
- 采集失败保留上次成功状态；连续失败暂停该源。
- 模型调用有每次运行上限；首版默认关闭 LLM。
- 不读取/输出 Token、Cookie、App Secret。

## 7.1 Provider 策略

- **Worker**：Capture／Idea／Project／Memory 原本就固定 `opencode-go/deepseek-v4.1-flash`。
- **P5 视频深读**：OpenCode Go `deepseek-v4.1-flash`，通过本机 `opencode serve` 的 `/api/experimental/generate`，不把订阅密钥传给 P5；不消耗 Kimi 额度。
- **生产 DSH chat／confirmation**：仍走 Kimi Code 两档。切到 OpenCode Go 需要改 DSH provider 适配、模型链校验和启动配置，属于生产变更；本轮不动，另开窗口验证。

## 7.2 Host 通道（P5.0c）

- `root-router` 增加纯确定性 `radar` 域；不调用模型。
- 每日 07:30（Asia/Shanghai）执行 `p5-radar.mjs run`；08:00 生成日报并通过现有 Host 飞书 adapter 发到已绑定 Owner。
- `跟进 1、4`／`忽略 8、9` 由 Host 解析后调用 P5 worker，继续使用同一套 digest 编号映射。
- 本机代理放在 `<P5_RADAR_HOME>/config.json` 的 `proxy` 字段；`P5_PROXY` 优先，其次 config，再其次 `HTTPS_PROXY`／`HTTP_PROXY`。RSS、文章抓取和 YouTube 共用同一出口。
- `config.json` 可设 `youtube: true`、`maxYoutube: 3`：每日抓取三个 YouTube 频道的最新视频，先按画像评分，只有候选视频才下载字幕，避免为无关视频消耗抓取预算。
- 字幕保存带 `[MM:SS]` 的行首时间戳；日报中的视频要点可引用真实时间戳，不编造。
- 每日飞书文档按发布时间倒序排列，确保最新资讯优先；同分时再按评分排序。
- 调度状态写入运行时 `p5-scheduler.json`，同一天不重复发送；采集/发送失败有有限重试窗口。
- 不新增机器人、不新增飞书应用；复用 P3 Host 的 `FeishuChannelAdapter` 和 Owner Chat。
- P5 数据仍隔离在 `<localData>/p5-radar`；不写生产 vault/DB。

## 7.3 飞书文档输出（P5.0d）

- 每天 08:00 生成 `P5 信息雷达 · YYYY-MM-DD` Wiki 文档，父节点 `P5 信息雷达`。
- 默认展示最近 7 天中的 50 条，**不按用户画像隐藏条目**；25 条为你优先、8 条圈外探索、17 条其余条目，未展示条目保留在库中。
- 主人可在管家窗口发 `雷达设置 N`（10–200）调整每日展示条数；`偏好：...` 调整主题权重。
- 每篇：中文标题、来源、类型（文章/视频）、发布时间、中文摘要、原文链接、操作编号。
- 英文标题只作为“原文标题”核对，不再作为主标题。
- 标题与源摘要按批翻译成中文并缓存到 `article_summaries`；未深读正文的条目明确标注资料来源。
- 源摘要为空或正文抓取失败的条目会自动补抓正文；代理优先使用 `curl -x` 回退，解决 Hugging Face 在 fake-IP DNS 下被判定为内网地址的问题。
- 每个视频条目自动抓取带时间戳字幕并生成中文摘要；无字幕时回退到网页/源简介。已生成的视频摘要会缓存，不重复调用模型。
- 飞书消息只包含文档链接、条目数和操作提示；不再发送长文。
- 文档创建复用生产 Wiki 发布目标和现有飞书 App 凭据；不新建机器人。
- P5 已可走 `syno.p5-radar/1` 插件：插件返回中性 AST，Host 负责飞书 docx；当前 active 版本为 `2026.11.22.7`，已覆盖 `collect`/`feedback`/`status`/`preference`，默认每日展示 50 条：25 条为你优先、8 条圈外探索、17 条其余条目；未展示条目保留在库中，失败自动回退旧 P5 CLI。

## 7.4 X 只读时间线（P5.1）

- 在独立数据目录显式添加账号：`node experiments/superagent-p0/p5-radar.mjs add-x --user-id <数字ID> [--username handle] [--name 显示名] [--id 信源ID]`；只写 `$P5_RADAR_HOME/p5-radar.db`，重复信源 ID 会失败且不覆盖。
- 采集时仅从进程环境 `P5_X_BEARER_TOKEN` 读取 Bearer Token，请求 `GET https://api.x.com/2/users/:id/tweets`，参数为 `max_results=5..100`（默认 20）和 `tweet.fields=created_at,lang`。
- 认证头通过 curl stdin 配置通道传入，不进入子进程 argv；token 不写入 source config、SQLite、日志或仓库。传输错误会脱敏，缺少 token 只让对应 X 信源失败。
- 帖子沿用现有采集、去重、评分和日报链；`kind="post"`，正文来自 API，不调用发帖、评论、点赞、关注等写接口。
- 本轮仅以本地 fixture、假 curl 和临时 SQLite 做离线验收；未实时核验官方文档、未连接真实 X、未启用生产账号。真实 API 权限/额度与生产启用需另行授权和验收。

## 8. 验收标准

1. `run --once` 能拉取 AIHOT + 7 RSS，生成候选；重复运行不重复入库。
2. 无新条目时零模型调用、零新候选。
3. 融资/股价/纯营销条目被硬过滤；Agent/Harness 条目进入候选。
4. `status` 显示每个源的最近成功/失败、条目数、候选数。
5. `digest` 生成 Markdown；`--send-feishu` 在未配置凭据时明确跳过。
6. YouTube 频道 RSS 能发现新视频；`yt-dlp` 能取字幕；无字幕时标记缺失。
7. 全量测试与 `npm run verify` 通过。
8. 不修改生产 Host、不重启 launchd、不写入生产 vault/DB。

## 9. 阶段

- **P5.0（本轮）**：AIHOT + RSS + 规则评分 + 本地候选 + 日报文件。
- **P5.0b**：YouTube 字幕 + LLM 短摘要。
- **P5.0c（已上线）**：Host 通道接入。`root-router` 增加 `radar` 域；P3 Host 内置 07:30 采集、08:00 日报，通过现有飞书 adapter 发到已绑定 Owner；`跟进 N`／`忽略 N` 走同一 router 调 P5 worker，不另起机器人。
- **P5.0d（已实现）**：飞书文档输出。08:00 将最近 7 天全部条目（不再按画像过滤）按发布时间倒序写入按日期命名的 Wiki 文档；标题和源摘要统一中文，列出发布时间；飞书只发短链接。
- **P5.0e（已实现）**：YouTube 每日采集；视频全部出现在清单中并显示发布时间；每日文档自动抓取带时间戳字幕并生成中文摘要，无字幕时回退到网页/源简介。访谈说话人 diarization 暂不做。
- **P5.1（X 只读直连已离线实现）**：官方 API v2 用户帖子时间线适配器与显式账号 CLI；仅 mock 验收，未连接真实 X 或启用生产。事件聚簇、周报仍未实现。
- **P5.2**：反馈校准、两次评分。
