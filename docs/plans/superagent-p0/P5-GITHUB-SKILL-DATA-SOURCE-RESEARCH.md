# P5 GitHub 增长榜与 Skill 库数据源调研

状态：公开数据源调研、隔离实现与真实端点验收已完成；生产调度、部署和发布仍未执行。

调研日期：2026-11-25。实际读取到的上游最新数据日期主要为 2026-11-24（UTC）。

## 背景

目标不是按总 Star 排一个“热门项目榜”，而是找到带真实时间窗口增量的数据源，支持：

- GitHub Star 快速增长项目 Top 10 与项目分析；Top 20 仅是后续可选扩展。
- 增长快的 Agent Skill 库子榜。
- 优先使用免认证、单个公开文件即可取得的数据，第一天即可展示真实增量，同时保存来源快照。

仓内 `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/scripts/radar-trending-skills.mjs` 目前只按 `stargazers_count` 总 Star 排序，不满足增长榜口径。

## 调研结论

推荐采用两个主数据源，加一个交叉核对源：

1. **GitHub 主榜：GitHub Risers，薄包装后直接采用。**
   - 仓库：https://github.com/jammyfu/github-risers
   - 数据：https://github.com/jammyfu/github-risers/blob/main/data/stats.json
   - 榜单：https://github.com/jammyfu/github-risers/blob/main/latest/rankings.md
   - 提供 7、30、365 个完整 UTC 日的真实 Star 增量及日均增量，不是总 Star 排名。
   - `data/stats.json` 当前有 70 个固定跟踪项目及新仓库发现结果。每个项目含 `name`、`stars`、`growth.week.gained`、`growth.week.per_day`、`history_complete`、`category` 等字段。
   - 每个分类已有完整 Top 20，但首轮只取 `category=ai` 的 7 日增长 **Top 10**。只读取一个 JSON，不补抓 GitHub API，不追求全网覆盖；后续增加条数不需要更换数据源。
   - 每日更新、每次运行归档、MIT。项目创建于 2026-10-29，仍很年轻，不能把它当成有 SLA 的稳定公共服务。
   - 接入时保存原始 JSON、上游 `generated_at` 和内容哈希；只消费 `ok=true`、`history_complete=true` 且窗口完整的项目。

2. **Skill 库增长榜：LinklyAI/best-skills，直接读取一个最新 CSV。**
   - 数据仓库：https://github.com/LinklyAI/best-skills
   - 首选数据：https://github.com/LinklyAI/best-skills/blob/main/data/latest/rankings/top-repos.csv
   - 方法说明：https://github.com/LinklyAI/best-skills/blob/main/docs/methodology.md
   - `top-repos.csv` 已直接提供 `repo`、`stars`、`stars_1d`、`pushed_at`、`skills_tracked`、`topics`，共 100 行。首轮只需按 `stars_1d` 降序取 Top 10，**不读取历史目录、不跨日 join、不调用 GitHub API**。
   - 口径必须写成“Best Skills 总 Star Top 100 候选池内，24h Star 增长 Top 10”。该简化会漏掉候选池外的小基数爆发项目，首轮为快速获取明确接受；以后才升级为两日 `raw/github-repos.csv` 全候选池差值。
   - `stars_1d` 缺失的行不进入增长榜，不把总 Star 当增量，也不做外推。
   - 历史增强已验证可行：2026-11-24 全量原始文件有 8,421 个仓库，与前一天有 8,280 个共同仓库，与七天前有 8,066 个共同仓库。该能力只留作后续，不进入首轮验收。
   - 数据与文档采用 CC BY 4.0，可保存、改算和再发布，但页面必须保留 “Best Skills by Linkly AI” 来源链接、CC BY 4.0 链接及“本地按 stars_1d 重新排序”的说明。
   - `trending-7d.csv` 是 **Skill 安装量趋势**，不是仓库 Star 增长，首轮不接入，避免增加口径和数据处理。

3. **OpenGithubs/github-daily-rank：仅留作备用，不进入首轮。**
   - 仓库：https://github.com/OpenGithubs/github-daily-rank
   - 当前 README 和每日 Markdown 提供 Top 10 的总 Star、日增长、上周增长、上月增长与项目描述。
   - 它需要解析 Markdown，且未声明许可证；既然 GitHub Risers 已有更易读取的 JSON，首轮不再增加这个依赖。

## 其他候选与排除理由

| 数据源 | 已核验事实 | 结论 |
| --- | --- | --- |
| [skills.sh](https://www.skills.sh/) | Vercel 的 Skill 目录，提供 Trending 24h、Hot、总安装量及 8 周安装序列；不是 GitHub Star 增长 | 作为安装趋势来源，由 Best Skills 聚合即可，不单独抓页面 |
| [Global Skill Radar](https://github.com/parkplanet/global-skill-radar) | MIT，Top 20 Star 榜、连续快照差值、每日 JSON 与中文报告；当前历史从 2026-11-05 起，覆盖比 Best Skills 小 | 备用候选发现源，不与主榜重复建设 |
| [GitHub Trending](https://github.com/trending?since=daily) / [Project-FAB/github-trending](https://github.com/Project-FAB/github-trending) | 官方页面提供 `stars today/this week`；后者保存 JSON。实测当前 daily 16 条、weekly 13 条，不能稳定保证 Top 20；后者未声明许可证 | 仅作候选补充，不作唯一主榜 |
| [EvanLi/Github-Ranking](https://github.com/EvanLi/Github-Ranking) | MIT、每日更新、分语言 Top 100，但按总 Star／Fork 排名 | 不符合增长榜需求 |
| [vitalets/github-trending-repos](https://github.com/vitalets/github-trending-repos) | 每日／每周抓 Trending，通过 GitHub Issue 通知；未声明许可证 | 通知产品，不是首选结构化数据源 |
| [huchenme/github-trending-api](https://github.com/huchenme/github-trending-api) | MIT，但最后代码推送为 2023-01-06 | 不采用陈旧公共服务 |
| [OSS Insight](https://github.com/pingcap/ossinsight) | 实测 trends API 返回空数据并声明自 2026-03-01 起事件采集不足、排名不可用；官方公告 2026-12-04 关闭公共 API | 明确排除，不能作为生产依赖 |
| CaptAPI、Apify 等商业抓取服务 | 可返回 Trending 与窗口增量，但需 Key／额度，仍多为 GitHub Trending 的二次抓取 | 已有足够开源数据，不增加付费依赖 |

## 推荐产品口径

- **GitHub 项目榜**：首轮为“AI 与 Agent 候选池近 7 日 Star 增长 Top 10”。显示窗口增量、日均增量、总 Star、数据日期和来源；不写成“全网绝对榜”。
- **Skill 库榜**：首轮直接读取 Best Skills `top-repos.csv`，按已有 `stars_1d` 取“总 Star Top 100 候选池内 24h 增长 Top 10”。页面必须展示这个覆盖边界。
- **首轮不做**：Top 20、全量历史 CSV 差值、7d Skill 榜、安装量榜、OpenGithubs Markdown 适配和额外候选合并。
- **项目分析**：数字事实与模型分析分开。排名只由上游已有增量决定；模型只基于公开 README、仓库元数据和来源快照解释用途、亮点、维护状态与风险，不参与改写数字。
- **连续在榜**：更新同一仓库的排名、增量和分析版本，不把它当成一篇全新资讯制造未读债务。
- **归因与安全**：上榜不等于安全、质量或值得安装。第三方 `SKILL.md` 和脚本仍是不可信输入，不因进入榜单而自动安装或执行。

## 下一轮实施 Plan（待批准）

### 目标

在现有 P5 HTML 雷达站增加 GitHub Top 10 与 Skill 库 Top 10 的真实数据预览。每天只读取两个免认证公开文件，保留来源快照；优先快速完成，不以 Top 20 或全网覆盖为目标。本轮只新增开发与隔离验收，不切生产调度。

### 步骤

1. 增加两个轻量只读适配器：GitHub Risers `data/stats.json`、Best Skills `data/latest/rankings/top-repos.csv`；保存原始响应、来源时间、URL 和哈希。
2. 定义独立 `repo`／`skill` 榜单快照，不复用资讯的曝光去重规则；同一仓库连续在榜只更新版本。
3. GitHub 榜过滤完整历史，按已有 `growth.week.gained` 取 10；Skill 榜过滤有效 `stars_1d`，按该字段取 10。两者都不额外调用 GitHub API。
4. 对上游缺字段、历史不完整、重复仓库、归档项目和无效增量做确定性校验；失败时保留上一份快照并明确标 stale，不伪造新数据。
5. 接入隔离的 HTML 预览与真实公开 README 项目分析；沿用对象隔离、来源冻结和 Result Lane，不自动创建执行项目或安装 Skill。
6. 用固定 fixture 做单元测试，再做一次公开端点只读 smoke test；最后核验移动端展示、归因、stale 状态和真实条数。

### 验收标准

- GitHub 榜最多 10 个去重项目，排序键是 `growth.week.gained`，不是总 Star；每项带来源日期、窗口、增量和原始快照哈希。
- Skill 榜最多 10 个去重仓库，排序键是上游已有 `stars_1d`；单份 `top-repos.csv` 即可复算，无跨日 join、无 Token、无额外 API。
- 页面明确显示候选池覆盖边界、GitHub Risers 来源及 Best Skills／CC BY 4.0 归因。
- 任一上游格式变化、数据陈旧或历史不完整时，不输出伪精确数字，不覆盖上一份好快照。
- 项目分析中的数字与榜单事实一致；模型失败不影响基础榜单发布。
- 全程无生产配置、Tunnel、Host、飞书发送或真实 vault 写入；生产上线另行走既有交接与批准流程。

## 本轮验证限制

- WebFetch 因域名安全核验不可用，实际证据来自 WebSearch、公开 GitHub API、raw.githubusercontent.com 和公开网页的直接只读响应。
- 已读取真实公开 JSON／CSV 并做条数与差值可行性验证；未修改仓库文件、未运行第三方采集器、未读取任何 Token，也未对上游做长时间稳定性观察。
- GitHub Risers 和 Best Skills 都是社区项目，没有可用性 SLA。保存本地原始快照和明确 stale 降级是接入条件，不是可选优化。
