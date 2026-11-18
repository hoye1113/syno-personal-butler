# V3 验证报告：现有飞书应用真实通道闭环

- 日期：2026-11-17
- 结论：**V3 完成。真实 Owner 私聊、多对象完整链路、结果卡片、按钮关闭、重启去重和旧 Runtime 恢复通过。**
- 真实证据：`/Users/hoye/Documents/workspace/butler-superagent/v3/live-evidence.json`
- 未执行：真实 vault、DSH Worker、全量生产流量切换、真实附件上传。

## 真实环境

- 复用当前 Syno 飞书应用与 Owner 绑定；凭据由现有 `FeishuCredentialStore` 内部加载，未读取、复制或输出 Key。
- Worker 使用 OpenCode `v2.0.29` + `opencode-go/deepseek-v4.1-flash`。
- Hub/Worker/检查点/飞书状态均在 `/Users/hoye/Documents/workspace/butler-superagent/v3/state/live-home`，没有迁入旧生产 pending 消息。
- 真实测试前旧监督任务和 Host 停止；V3 启动时 OwnerBound=true。测试结束后 V3 先退出，再恢复旧 LaunchAgent。

## 真实完整链路证据

用户在 Syno 私聊分两轮发送“收录 A / 收录 B”，共四个唯一飞书 messageId。每条都经过：

```text
真实飞书 owner.chat
→ Root Router
→ context.capture.message
→ task.capture
→ task.result
→ Result Lane
→ 真实飞书结果卡片
```

最终状态：

| 项目 | 结果 |
|---|---|
| Root run | 3 个 done；前两条分别路由，后两条合并 |
| capture Object run | 4 个 done |
| Worker run | 4 个 done |
| Result run | 4 个 done |
| 对象 | `capture:A`、`capture:B`，没有重复创建 |
| Worker resume | A 两次同 Session；B 两次同 Session |
| 初始结果卡片 | 4 张，四个不同 provider messageId |
| 最终开放卡片 | 0；Owner 点击“已处理”后全部关闭 |
| 点击导致的新 Root | 0 |
| 最后一次桥接重启后的重复新卡片 | 0 |

卡片关闭后另有四条投递记录，它们复用原来的四个 provider messageId，是 `updateCard` 状态更新，不是重复新消息。所有投递记录显式保存 `userRead:false`，不把 API 成功冒充用户已读。

## 故障与修复证据

1. **首次无回复**：首个 Owner chatId 尚未学习时，出站循环同步返回 null 并持续空转，进程 CPU 99.8%，入站和状态更新被饿死。加入 100ms 等待后，CPU 恢复正常，Hub 状态持续刷新，真实消息随即进入。
2. **卡片 200861**：Card 2.0 不支持旧 `action` 容器。纯文本/追问继续使用 Card 2.0；带“已处理”按钮的通知改用支持的交互卡结构，四张卡片随后真实投递成功。
3. **stale 路由**：后一批 Root 等模型时，先前 A/B 检查点把投影版本从 5 推到 6，Adapter 拒绝旧快照。Root 对非 ask 决定支持一次刷新版本重交，最终由 Adapter 按最新事实重新校验并成功；没有绕过版本检查，也没有重复创建对象。
4. **错误不可见**：投递错误原本只保存在内存。改为立即写入脱敏错误文件并纳入状态快照，实际 200861 因此可定位。
5. **旧 Host 残留**：LaunchAgent bootout 后一个旧 Host 仍残留，已停止；最终恢复前确认 V3 退出，避免双监听。

## 模拟敌意与回归

```bash
npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v0
# 5/5

npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v1
# 12/12，无真实 Claude 调用

npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v2
# 12/12，无真实模型调用

npm --prefix "/Users/hoye/Documents/workspace/butler-superagent" run test:v3
# 1/1
```

合计 **30/30 通过**。V3 测试使用现有真实 `FeishuChannelAdapter`、真实 HTTP Hub 和模拟 Lark transport，覆盖：

- 非 Owner 与群聊不进入 Root。
- B 先于 A 的批量路由仍各走各的对象；重复 messageId 不新增 Root。
- 附件下载失败如实进入问题与结果，不伪造附件已收到。
- 非 Owner 按钮忽略；Owner 首次 answer 生效，重复点击 changed=false。
- 状态重启后来源重放去重；Worker 环境中飞书 Secret 为空。

真实附件上传未执行，不能将上述模拟结果写成真实附件验收。

## 恢复旧 Runtime

恢复后实际检查：

```text
LaunchAgent: running=true, loaded=true, healthOk=true
GET /api/syno/channels:
feishu running=true, available=true, ownerBound=true, lastError=""
```

V3 已停止，旧 Runtime 是当前唯一飞书消费者。没有全量生产切换。

## 下一轮

V4 先进行本地 vault 只读检索，再做副本收录；真实 vault 读写、敏感路径和回退门需要按切片另行确认。计划：`/Users/hoye/Documents/workspace/plan/butler-superagent-autoloop-vertical-slices-v4.md`。
