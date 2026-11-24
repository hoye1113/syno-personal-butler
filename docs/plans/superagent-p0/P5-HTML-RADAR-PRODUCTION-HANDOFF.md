# P5 HTML 雷达站生产上线交接

## 背景

开发提交：

- `211ed3fa`：真实数据 HTML 雷达站、快照、跨日去重、阅读状态与 HTTP 安全边界。
- `3d26feb5`：日期编号、真实收录 Task／Result Lane、幂等跟进、失败通知与恢复。

最终开发 gate：761 tests，755 pass，6 skipped，0 fail；仓库校验、活跃文档检查和 diff check 通过。真实 P5 内容已通过只读 HTTP 预览和移动端浏览器操作验收。生产 Tunnel、launchd、飞书入口和 Host 均未改动。

## 目标

通过现有 Cloudflare Tunnel 上线 `radar.hoyework.online`，让 HTML 成为唯一新日报正文；飞书只发送日期、新增数和链接；跟进指定条目可完成真实收录并独立复核。

## 前置条件

- Owner 明确批准生产部署、Tunnel 变更、Host 重启及一次真实公开文章跟进验收。
- 创建权限受控的独立认证文件；不得输出、提交或发送密码。
- 确认生产 P5 home、独立网站状态目录、固定 Node 24.21.0 与 pnpm 12.11.2。
- 开工先核对当前 release、Host PID、launchd、cloudflared 和 git diff，保留上一版好状态。

## 步骤

1. 从最终开发提交制备不可变 release，执行 frozen lockfile 安装、完整 gate 和 `--verify-import`。
2. 为 `p5-radar-site.mjs` 配置独立 launchd 服务：绑定 `127.0.0.1:61210`，配置生产 P5 只读内容源、网站状态目录、认证文件和 HTTPS public origin。
3. 先在本机验收登录、真实历史、已阅及撤销，确认网站进程异常退出可由 launchd 恢复。
4. 在现有 cloudflared ingress 增加 `radar.hoyework.online -> http://127.0.0.1:61210`，保留 console 路由；应用配置后验收公网 HTTPS、认证、CSP 和移动端阅读。
5. 为生产 Host 设置 `P5_RADAR_SITE_ORIGIN=https://radar.hoyework.online`，按单消费者规程停止旧 Host、启动新 Host。
6. 在明确批准的外部效果窗口执行一次日报发布验收；不得为测试盲目重放 unknown 投递。
7. 选择一篇正文充足的公开雷达条目，发送带日期的跟进命令，验收 Task 创建、Worker、Result Lane、完成通知和重复命令幂等。
8. 确认后续日报停止创建新 Wiki，旧 Wiki 只保留历史；同步运维文档和观察口径。

## 验收标准

- 公网未登录不能读取 HTML 或 API；登录后移动端可查看真实摘要、要点、原文和带日期跟进命令。
- 已阅跨刷新保留、可撤销；旧 manifest 默认不产生未读债务。
- 网站快照、`daily-doc` 和 `digest` 的 date/index/itemId 完全一致；快照或编号写入失败时没有飞书链接。
- 新日报只包含以前未展示的 itemId；无新增时发送“没有新增”，不补旧内容。
- 飞书短链在快照成功后发送；传输异常记录 unknown，当日不自动重发。
- 跟进创建唯一业务 Task，完成前有处理中状态，完成后有 vault 路径、文件哈希和 Result Lane 证据；重复 itemId 不创建第二个 Task。
- 失败有明确通知和失败状态；失败通知 unknown 不重发。
- Host、网站和 cloudflared 均单实例运行，无 pending／hold／unknown 被隐瞒。

## 回滚

- Host 回滚到上一 release 和上一组环境，恢复旧 Wiki 日报路径。
- 网站 launchd 与 Tunnel hostname 可独立停用，不影响旧 Host。
- 已产生的 HTML 快照、曝光历史、已阅和 Task 事实不删除；回滚后仍可用于对账。
- 任何投递结果不确定时先查状态与证据，不用重发作为回滚或验证手段。
