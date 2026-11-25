# P5 GitHub／Skill 增长榜生产接线 Plan

状态：生产接线、当日网站日报恢复与移动端验收已于 2026-11-25 完成；下一自然日只读观察已安排在 2026-11-26 10:15（cc-connect timer `1bc6400f`）。

## 背景

增长榜已在现有 HTML 雷达站完成两个真实公开榜单：GitHub Risers AI 候选池 7 日增长 Top 10，以及 Best Skills 总 Star Top 100 候选池内 24h 增长 Top 10。采集、原始响应、分板原子快照、stale、认证 API、移动端视图和元数据分析均已有隔离证据。

现有网站上线的通用前提、认证、Tunnel 与回滚规程继续遵循：
`/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/plans/superagent-p0/P5-HTML-RADAR-PRODUCTION-HANDOFF.md`。

## 目标

在 Owner 单独批准后，把当前已验收代码接入既有生产 P5 home 和每日流程，让网站在 10:00 日报前获得当日增长榜；任何增长来源失败都不得阻断原资讯日报，也不得覆盖最近好快照。

## 前置条件

- Owner 明确批准提交／合并、不可变 release、生产快照写入、Host 配置变更和必要重启。
- 开工先审查本回合完整 diff，核对当前生产 release、Host 单消费者状态及已有上线交接；保留上一版好状态。
- 确认生产 P5 home 与网站读取的是同一快照目录，已阅／跟进仍使用独立 `P5_RADAR_STATE_HOME`。
- 不读取或输出凭据；真实 vault、飞书和生产投递不在本 Plan 的功能测试输入中。

## 步骤

1. 将增长榜代码与既有 HTML 雷达站拆成可回溯提交，运行完整 gate 后按既有流程合并并制备不可变 release。
2. 在既有 Host 的日报采集之后、10:00 发送之前增加一次 `p5-radar-growth.mjs` 调用，显式传生产 `P5_RADAR_HOME`；不得启动第二个 Host 或消费者。
3. 把增长采集设为非阻断步骤：记录两个板块各自结果，单源或双源失败仍继续既有资讯日报；不得把进程退出码直接变成整日日报失败。
4. 在批准的生产变更窗口先执行一次真实采集，核对两个快照、原始响应、哈希、来源日期和条数；再只读验收受认证保护的 `/api/growth`。
5. 通过现有 HTTPS 网站验收移动端两个榜单、详情、覆盖口径、MIT／CC BY 4.0 归因，以及无已阅／旧跟进命令；不点击安装或执行第三方 Skill。
6. 人为使用非生产 fixture 验证单源失败和最近好快照 stale；生产不做故障注入，不覆盖好快照。
7. 观察下一个自然调度日，记录来源成功、快照日期、stale 和日报是否独立成功；更新运维文档。

## 验收标准

- 10:00 前每个来源同日只采集一次，重复执行复用好快照；显式 force 仅用于人工批准的排障。
- GitHub 排序使用完整 7 日 `growth.week.gained`，Skill 使用有效 `stars_1d`，两者最多各 10 条，均不把总 Star 当增量。
- 任一上游失败不影响另一来源和既有资讯日报；网站回退最近好快照并明确 stale。
- 未登录仍不能读取增长 API；页面保留真实覆盖边界、来源及许可证链接，不出现资讯已阅债务或旧数字跟进命令。
- 生产只运行元数据分析；未深读 README、未运行外部模型的标注不得移除。模型深读若以后需要，另行立项和批准。
- Host、网站和 Tunnel 保持既有单实例约束，无生产配置或数据被测试覆盖。

## 回滚

- 从 Host 移除增长采集步骤并回滚到上一 release，原资讯日报继续运行。
- 保留已经生成的原始响应和榜单快照用于对账，不删除、不伪造。
- 网站可暂时隐藏增长导航；回滚不得改动已阅、跟进、Task、Result Lane 或投递事实。

## 生产执行记录（2026-11-25）

### 提交、release 与服务

- main 已依次接收 `6499018e6`（增长榜）、`40ae65f4b`（非阻断调度）、`847b4ecc0`（Origin 诊断）、`41fee1491`（同源空 Origin 登录修复）和 `a735322d3`（日报 AST 插件对齐）。
- 当前不可变 release：`/Users/hoye/Documents/workspace/syno-personal-butler-releases/20261125T023235128Z-a735322d3bc6`，完整提交为 `a735322d3bc68126ad1dd5aabea9c219d740502b`；prepare gate 为 772 tests／766 pass／6 skipped／0 fail。
- Host 保持单消费者 PID `9157`／generation 18；网站 `com.syno.butler.radar` PID `45921`；Tunnel `com.agentconnect.tunnel` PID `8915`。生产状态 frozen=false，active Task、pending Decision、queued／unknown delivery、handover pending／hold 均为 0。
- 网站为 `https://radar.hoyework.online`，监听 `127.0.0.1:61210`。认证文件、网站状态和日志均独立于 P5 业务 home；访问密码未写入仓库、日志或聊天。

### 增长采集与公网验收

- 生产快照为 `radar-growth-github-2026-11-25.json` 和 `radar-growth-skill-2026-11-25.json`，各 10 条，均为 `analysis=metadata`；Scheduler 记录 `lastGrowthStatus=ok`、`lastGrowthDate=2026-11-25`、`lastGrowthAt=2026-11-25T01:54:26.938Z`。
- 原始响应独立哈希复核匹配：GitHub Risers 为 `3fd5fbe4099e80fe52098cb5a7e0de181072e79a1027082809460b67308064b2`；Best Skills 为 `1422fe12e2f1ec8055c0f7e1c77fc2f74f1f955ab2eb316e735c74834db22b28`。
- 公网匿名 `/api/growth?board=github` 返回 401，`/login` 返回 200。生产浏览器曾实际发送 `Origin: null`；最终仅登录请求在 `Sec-Fetch-Site: same-origin` 时兼容，跨站登录与其他写接口仍拒绝，回归测试先红后绿。
- iPhone 390×844 视口实测 GitHub／Skill 两榜各 10 条、全屏项目详情、窗口增量、总 Star、来源日期、覆盖口径和 MIT／CC BY 4.0 链接。页面明确未深读 README、未运行外部模型、不代表质量或安全审计；无资讯已阅／数字跟进控件，未安装或执行第三方 Skill。

### 当日资讯日报故障与恢复

- 10:00 首次旧插件运行超过 10 分钟，错误尾部的字幕日志属于 stderr 证据，不是 stdout 协议污染。后续旧插件返回的 AST 缺少 `details`，与当前 Host 的网站发布校验不兼容，因此拒绝发布。
- 修复前当天没有 `radar-day`、`daily-doc` 或 `digest` manifest，也没有进入飞书发送步骤；不存在 delivery unknown，未盲目重发。
- 新版 `2026.11.22.8` 从不可变 release 加载。真实 AST dry-run 为 45 条／45 details／509 blocks，编号逐项一致；随后通过受控 `activatePluginVersion` 激活，sha256 为 `ef600ac8cc9dd9cc9af8842cbb8bfbe087f8f9aed9b3bdf70b3221d38331a843`，健康与完整性检查通过。
- 既有 Scheduler 于 `2026-11-25T02:42:19.891Z` 完成当天日报，记录 `lastDigestDelivery=accepted` 且无 `lastDigestError`；Host 日志有 `p5-digest-sent`、`date=2026-11-25`、`chars=117`。
- `radar-day-2026-11-25.json`、`daily-doc-2026-11-25.json`、`digest-2026-11-25.json` 均为 45 条，网站／doc／digest 的 itemId 与 index 逐项一致，链接为 `https://radar.hoyework.online/?date=2026-11-25`。这次恢复复用既有重试状态，没有创建第二个 Host。

### 回滚与后续观察

- 配置备份：`/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/production-backups/20261125T015206Z-40ae65f4`；插件注册表备份：`/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/production-backups/20261125T0235Z-a735322d/p5-active-before.json`。
- 原资讯 Host 回滚点保留为 `/Users/hoye/Documents/workspace/syno-personal-butler-releases/20261124T020946751Z-e852ea3ddb22`；active 插件 previous 保留 `2026.11.22.7`。不得在新网站 Host 下单独回滚旧插件，否则会重新引入 AST 不兼容；代码、插件与 `P5_RADAR_SITE_ORIGIN` 必须作为同一回滚组核对。
- 已生成的原始响应、增长快照、日报 manifest 和投递事实全部保留，不删除、不伪造。
- 下一自然日观察 timer `1bc6400f` 将于 2026-11-26 10:15 只读核对增长与资讯日报是否独立成功、stale、重试、单实例及 unknown／hold；不触发采集、不补跑、不发送、不重启、不提交。
