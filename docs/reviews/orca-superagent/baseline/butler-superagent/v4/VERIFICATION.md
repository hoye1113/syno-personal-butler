# V4.1 验证报告：本地知识只读闭环

- 日期：2026-11-17
- 结论：**V4.1 完成。合成 vault 的 document_id 路由、本地只读检索、独立引用复核、安全拒读、重启恢复和通知去重全部通过。**
- 测试：V4.1 5/5；V0～V4.1 合计 35/35。
- 未执行：真实 vault、真实模型、DSH、副本收录、生产飞书切换。

## 实现与信任边界

- `document_id = doc-<SHA-256(logical path) 前 24 位>`，对象上下文为 `knowledge:<document_id>`。
- 复用 `/Users/hoye/Documents/workspace/syno-personal-butler/packages/syno-core/knowledge-store.mjs` 的 realpath 越界检查、失效知识排除和敏感检测；未修改 Syno 仓库。
- 搜索索引只写独立 Hub Home 的 `knowledge-index.json`，不写 vault。
- Worker 提交候选引用；`/Users/hoye/Documents/workspace/butler-superagent/v4/result-agent.mjs` 独立重读并核对文档 ID、路径、全文 SHA-256、offset/end 和逐字片段。
- Result Lane 只接受能由引用精确重建的答案；拒读通知由 Result Lane 生成固定安全文案，不转发 Worker 自报正文。
- 引用失败不保存检查点、不投递原答案；拒读也不保存检查点。

## 实际命令与结果

```bash
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v4
# 5/5

npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v0
# 5/5

npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v1
# 12/12，无真实 Claude 调用

npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v2
# 12/12，无真实模型调用

npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v3
# 1/1，模拟 Lark transport，未启动第二个真实消费者
```

## V4.1 用例证据

| 用例 | 结果 |
|---|---|
| 公开文档完整链路 | `owner.chat → knowledge:<document_id> → task.knowledge → task.result → notice` 完成；通知只有一条 |
| 引用一致 | 测试独立读取合成 Markdown，逐字核对 `markdown.slice(offset,end) === excerpt`，并核对路径与 SHA-256 |
| 重放 | 相同 Owner event 返回 duplicate，Root 不增加，通知不增加 |
| 敏感拒读 | `privacy: private` 文档没有正文、引用或检查点，只收到固定安全通知 |
| 路径穿越/符号链接 | 越界 ID 和指向 vault 外的 symlink 都不可检索；非法路径问题被 Root 拒绝 |
| 权限 | 文件 mode 000 时安全拒读，不泄露 EACCES 或正文；测试后恢复 mode 600 |
| 伪造引用 | Worker 篡改 excerpt 后 Result Lane 隔离结果；原答案未投递，检查点为空 |
| 重启 | Worker 强杀后结果恢复；Hub 重开和 Worker 再重启后通知仍只有一条 |
| vault 零写入 | 每个用例前后比较文件/目录/symlink 路径、文件内容 SHA-256、大小、mtime 和 symlink target，全部一致；权限用例排除测试主动 chmod 的 mode 差异 |

## 调试记录

首轮 2/5 通过，三项失败均为测试误从 `owner.state()` 读取不存在的顶层 `events`。改为通过 Owner `why(runId)` 读取 Hub 事实中的 `task.result` 后，5/5 通过；不是业务链路失败。

随后收紧 Result Lane：拒读不再转发 Worker 文案，正常答案必须与引用重建文本完全一致。再次运行 V4.1 与全量回归，35/35 通过。

## 限制

- 仅支持显式 `查询 <document_id>：<检索词>` 的确定性检索，不宣称自然语言检索质量或真实模型回答能力。
- 24 位哈希前缀在本片目录内检测冲突；真实 vault 接入前仍需单独确认正文是否允许发送到外部模型。
- 真实附件、真实 vault 权限 ACL、副本收录与 DSH 均不在本片证据范围内。
