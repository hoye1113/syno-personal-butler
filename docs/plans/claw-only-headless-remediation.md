# Claw-only 无界面运行与聊天可靠性修复

## 目标与边界

微信 Claw 是日常唯一入口。Syno Host 仍在 loopback 上运行，以承载健康/readiness、受控 DSH、MCP Bridge、微信轮询、Outbox、Job/Policy/GitGuard；DSH 继续以 `--no-open` 启动，不再作为用户入口。唯一网页例外是 `/maintenance/weixin`：仅 loopback、只含二维码开始、轮询、连接确认，成功或超时后没有任何业务入口。

不迁移或篡改历史 Web 通知、历史灵感档案或未跟踪灵感卡。SSRF 对私网、回环和 `198.18.0.0/15` 的拒绝保持不变；DNS 将公开域名重写到这些地址时，先修复本机 DNS/代理，再由聊天中的“继续”重试。

## 已实施

1. 删除 `apps/syno/public/` 工作台资源，并将 Host 收缩为健康、readiness、Bridge 与微信重绑页；旧工作台及其 topics/inbox/wiki/planner/settings/lark 路由在 Host 层统一 404。
2. 删除 Web/Windows 日常投递 Adapter。`ChannelHub` 默认 `weixin`，无指定目标时只投递 home channel；旧 `homeChannel:web` 只有在微信已绑定时才落盘迁移为 `weixin`，未绑定不会回退到 GUI。
3. 新增 `ChannelContinuationStore`。metadata 仅保存 owner/channel/thread/type/status/expiry/correlation；URL 等内容单独 DPAPI 加密。`open`、`resolve`、`settle` 是唯一的续办 seam。
4. `knowledge.fetch_url` 失败保存 30 分钟 `link_read`。裸“继续”优先恢复同 owner/channel/thread 的 URL，用受控提示重新调用读取工具；不再转到普通模型闲聊或要求用户使用网页。
5. 今日灵感投递成功后写入 owner/channel/thread，并创建 24 小时 `inspiration_feedback`。精确的“有用/没用/一般”在 `ChannelConversationHandler` 直接回执；重复评价只返回既有事实，不覆盖历史。工具接口可接收 `inspirationId`，只允许同 owner 已投递、尚未反馈的卡。
6. DNS 受保护地址错误具有 `SOURCE_URL_RESERVED_ADDRESS` 结构化代码；保留浏览器升级仅用于 401/403/429 或验证码墙，不用浏览器绕过 SSRF。
7. Tool Bridge 对 context bind/release/拒绝记录脱敏 journal 事件，包含 runId、消息关联与原因；用户可见 ACK 仍固定为“已接收，正在处理。”。

## 剩余验收与运行操作

- ~~增加/维护回归~~（2026-09-22 完成，`pnpm test` 740/740 绿）：续办隔离/过期/settle 结案、重复灵感反馈只读事实、显式 ID 跨 24h 回填、X 链接 DNS 保留地址结构化错误且不触发浏览器、Bridge bind/release/拒绝 journal、V2 ACK 固定文本/final 仅模型文本且无 `request-*` 泄漏、runtime 失败开续办接线。回归过程实证修复两处实施缺陷：反馈正则捕获组索引（`match[1]` 才是反馈词）与续办 ACTIVE 集合误含 `resolved`（结案后仍命中）。
- ~~`pnpm test`、`pnpm verify`、`git diff --check`~~（2026-09-22 通过：verify 2226 文件 + 8 文档）。隔离 state 的 headless 冒烟通过：health 200、readiness 503（初始化中）、二维码维护页 200、根路径与 topics/settings 等旧路由 404、Bridge 无认证 401。
- 待主人参与的运行验收：Windows 登录冷启动验证 Host 和 DSH；真实微信验收“读链接→继续”“灵感卡→没用→也没用”“历史卡 ID 明确评价”“微信未绑定”。
- 用 runtime journal 按 runId/消息关联追溯 `SYNO_BRIDGE_CONTEXT_REQUIRED` 和异常 request 列表的实际生产方；在得到复现证据前不猜测根因。
