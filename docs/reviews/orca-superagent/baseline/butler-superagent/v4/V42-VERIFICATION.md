# V4.2 验证报告：副本收录与 DSH 可替换 Worker

- 日期：2026-11-17
- 结论：**本地合成来源到副本 vault 的收录闭环通过；`@deepseek-ai/dsh@0.2.2-rc.3` 真实 SDK 进程作为可替换 Worker 的隔离实验验收通过。**
- 版本边界：这是用户明确授权的 **RC 预发布版**验收，不是稳定版 `0.2.2` 验收；没有覆盖或升级 Syno 生产 vendor。
- 测试：V4 总计 11/11，其中 V4.1 5 项、副本收录 4 项、DSH 版本门与真实替换 2 项；V0～V4 合计 **41/41**。

## 已通过范围

### 副本收录

```text
合成 Owner URL
→ capture:<document_id>
→ 本地合成来源白名单获取
→ 标题/正文/时间质量门与敏感门
→ 副本 vault 原子无覆盖写入
→ source_url 去重
→ Result Lane 独立重读来源与目标全文
→ 校验和 / 精确路径 / 检查点 / 原上下文通知
```

- 副本根为测试 Home 下独立 `capture-copy/vault`，不是正式 vault。
- 仅允许 `https://example.test` 的本地 JSON 合成来源；没有真实 URL 外网请求。
- 写入采用同目录临时文件加原子 hard link；已存在目标不覆盖，临时文件最终清理。
- `document_id` 来自规范化 URL；目标路径固定为 `vault/02-Resources/capture-<document_id>.md`。
- Result Lane 重新读取本地来源并重建预期 Markdown，逐字核对目标全文、frontmatter 来源哈希和结果 SHA-256；失败收录还必须证明目标文件不存在。
- 通知只包含复核后的标题、路径和哈希，不直接信任 Worker 摘要。

### DSH 可替换 Worker

```text
task.capture
→ DSH 0.2.2-rc.3 独立 SDK 进程
→ 显式 profile/Home + read-only 沙箱 + shell 禁用
→ loopback mock 模型返回 {"go":true}
→ 同一个确定性收录器执行写入
→ DSH shutdown 并确认退出
→ Result Lane 独立复核
→ 后续 task.knowledge 继续完成
```

- 实验依赖锁定在 `/Users/hoye/Documents/workspace/butler-superagent/v4/dsh-lab`，profile、Session、工作目录、审计和 trace 均在独立测试 Home。
- DSH 只替换 Worker；Root Router、Object Specialist、Hub 和 Result Lane 不改角色。
- mock 模型仅监听 `127.0.0.1`，使用假 Key；本次模型请求数 `providerRequests = 1`，请求 Host 均为 loopback，无真实模型费用。
- 显式设置 `DSH_TELEMETRY_DISABLED=1`、`allowMarketplaceAdd:false`；profile 禁用 `terminal-bash`、`terminal-pwsh`、`persistent-bash`、`persistent-pwsh`。
- DSH 返回 go 决定后仍由原有确定性收录器写入，Result Lane 继续独立复核；没有用模型自报结果替代事实校验。
- 审计确认 DSH 已退出；随后另一个知识查询完成并返回“持久恢复依赖 Hub 事实日志”，证明 Hub 与知识 Worker 不依赖 DSH 常驻。
- 收录仍只有一份目标 Markdown，每条 Owner 事件只有一条对应通知。

## 用例证据

| 用例 | 结果 |
|---|---|
| 首次收录与重复 URL | 首次写入一份 Markdown；第二次按 `source_url` 去重，文件内容、mtime 和目录 mtime 不变；两条 Owner 事件各收到一条对应通知 |
| 来源与质量门 | 敏感来源、过短正文和不存在来源均失败，无目标文件、无检查点、无正文泄漏 |
| 写入后故障 | `after_link` 故障回滚目标文件和临时文件；通知明确“收录未完成” |
| 写完未回执崩溃 | 原子目标已经存在时强杀 Worker，恢复后仍只有一份完整 Markdown、一条通知，没有临时文件或重复来源获取 |
| DSH 旧版本门 | Syno vendor 的 `0.2.1-alpha.1` 被 `DSH_VERSION_UNSUPPORTED` 拒绝，没有冒充新版验收 |
| 真实 DSH 替换 | rc.3 真实进程完成一次 loopback 模型请求、收录、退出审计和后续知识任务；V4 11/11 通过 |

回归命令与本轮实际结果：

```bash
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v4
# 11/11
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v0
# 5/5
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v1
# 12/12
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v2
# 12/12
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v3
# 1/1
# 合计 41/41
```

## 调试记录

1. 首轮收录去重失败：副本根叫 `capture-vault`，而 `KnowledgeStore` 的逻辑读取路径要求根名为 `vault`。改为独立 `capture-copy/vault`，保留原路径校验后通过。
2. 回滚用例最初把目录 mtime 也要求不变。实际临时文件创建/删除会改变目录 mtime；验收调整为无目标/临时文件且文件集合与内容不变。成功后的重复去重仍严格要求目录和文件 mtime 不变。
3. 崩溃恢复的最终通知可能是首次写入“已收录”，也可能是恢复对账“已存在”；测试接受两种合法终态，同时硬性要求一个文件、一条通知、无临时文件和无第二次 Worker 来源获取。
4. 为避开约 152 MB 的 LibreOffice optional 包而使用 `--omit=optional` 后，DSH 启动分别缺少 `node-addon-require-builtin-darwin-arm64@0.1.9` 和 `@deepseek-ai/node-addon-system-darwin-arm64@0.1.2`。仅在实验目录补装这两个当前平台必需依赖，未恢复 LibreOffice。
5. Worker 曾在 `spawn` 后停住：直接复现得到 `Cannot access 'Rpc' before initialization`。模块顶层 `await` 在后面的 `class Rpc` 初始化前进入 `dshApproval()`，异常后已启动的子进程又使包装层不能退出。将启动入口移到 class 定义之后，并保留失败清理与 turn 错误检查后通过。

## 边界与授权门

- 本验收使用固定 loopback 假模型，只证明真实 DSH SDK 进程、JSON-RPC、profile/Home、退出和 Worker 替换链路；不证明真实外部模型的语义质量。
- 未访问真实 URL、未写正式 vault、未发送私有正文到外部模型、未启动或停止现有 Syno DSH 生产进程。
- 真实 URL 外网获取、正式 vault 写入、私有正文发送外部模型、生产 vendor 升级和生产切换仍需分别确认。
- V5 主动知识、迁移与生产切换未开始。
