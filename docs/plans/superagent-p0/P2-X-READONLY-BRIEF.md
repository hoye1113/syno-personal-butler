# P2 P5.1 X 只读直连实施任务书

## 背景

P5 已有统一 `source → collect → store → score → daily-doc` 链，信源类型为 `aihot`、`rss`、`youtube`。本次只增加 X 官方 API v2 的用户帖子时间线只读适配器，复用现有采集、去重、评分、存储与日报，不新建框架、不新增依赖。

当前环境无法实时访问 X 官方文档，因此实现依据既定 API v2 合约做离线适配与 mock 验收；不得声称已实时核验文档或已连接真实 X。

## 目标

支持显式配置一个 X 账号信源：

```text
source.kind = "x"
source.config = { "userId": "数字用户 ID", "username": "可选显示名" }
GET https://api.x.com/2/users/:id/tweets
  ?max_results=5..100
  &tweet.fields=created_at,lang
Authorization: Bearer <P5_X_BEARER_TOKEN>
```

将帖子转换为现有 Radar item，经原链路入库、评分和日报。只允许读取时间线，不发帖、评论、点赞、关注或调用写接口。

## 必须阅读

- `AGENTS.md`
- `experiments/superagent-p0/p5-radar/sources.mjs`
- `experiments/superagent-p0/p5-radar/collect.mjs`
- `experiments/superagent-p0/p5-radar/store.mjs`
- `experiments/superagent-p0/p5-radar.mjs`
- `tests/p5-radar.test.mjs`
- `tests/p5-radar-host.test.mjs`
- `docs/plans/superagent-p0/P5-INFORMATION-RADAR.md`

## 验收标准

1. `fetchSource` 支持 `kind="x"`，只请求官方 `GET /2/users/:id/tweets`，保留现有 proxy/timeout 行为；`max_results` 默认 20，只接受 5–100 的整数。
2. 响应 fixture 正确映射 `externalId`、帖子 URL、正文摘要、发布时间、语言、作者与必要的非密钥 raw 元数据；无 `data` 且 `meta.result_count=0` 是合法空结果，API 错误响应不得冒充空成功。
3. Bearer Token 只从 `process.env.P5_X_BEARER_TOKEN` 读取；不得写入 source config、SQLite、日志、错误、仓库或子进程 argv。网络失败时错误文本也不能包含 token。若沿用 curl，认证头必须经 stdin 等不外显通道传入。
4. 未配置 token 时仅该 X 信源 fail-closed 并给出不含密钥的错误，不影响其他信源；默认 `DEFAULT_SOURCES` 不添加任何 X 账号。
5. 提供最小 CLI 将账号添加到由 `P5_RADAR_HOME` 指定的独立数据目录；命令只写该目录的 SQLite，不读取/输出 token。重复 ID 不得静默成功。更新 help 与 P5 文档，明确默认未启用、只读和真实验收边界。
6. 新增离线测试：解析/空结果/API 错误、缺 token、URL 与参数边界、认证头不出现在 argv/错误/DB、真实 `collectSources` 注入 X 适配器后入库去重，以及 CLI 在临时 HOME 添加账号。不得访问真实 X 或生产配置。
7. 相关测试及全量 `corepack pnpm run gate` 通过，`git diff --check` 通过。

## 实现约束

- 优先在现有 `sources.mjs`、CLI 和测试中做最小修改；不修改既有插件快照来冒充新版本。
- 不调用真实模型，不联网，不读取 `.env`、凭据库、生产数据库、生产配置或私有 vault 正文。
- 不修改 `/Users/hoye/Documents/workspace/syno-personal-butler-prod`，不重启服务，不 Push，不创建 Git commit；主 Agent 审查验收后统一提交。
- 只修改本任务必要文件。发现无关问题只报告，不顺手扩展。
