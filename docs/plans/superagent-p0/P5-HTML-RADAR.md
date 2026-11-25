# P5 HTML 雷达站

状态：完整开发与隔离验收版本。未修改生产 Tunnel、launchd、飞书入口或 active 插件绑定。

## 数据与业务边界

- 日报仍由 P5 一次排序，HTML、飞书编号和链接共用同一份 AST，不在浏览器重新排序。
- `daily-doc-YYYY-MM-DD.json` 是曝光历史。条目展示过一次后，不再进入后续日期的今日新增；是否已阅不影响去重。
- 同日重生成排除自身历史，保留原日期编号。新条目不足设置上限时不补旧内容。
- `radar-day-YYYY-MM-DD.json` 保存标题、来源、摘要、要点、理由、URL 和日期编号的完整快照。
- 旧日报只有 manifest，网站通过只读 SQLite 连接补齐真实摘要；不生成 mock 内容，也不回写生产数据库。迁移条目标为 legacy，默认不产生未读债务，Owner 显式恢复未读后才计入未读。
- `radar-read-state.json` 只保存阅读状态。已阅可撤销，不改变偏好，不等于飞书送达或收录。
- `radar-follow-state.json` 区分网站意向与真实执行：`marked` 只表示待管家处理且没有 taskId；`pending`、`running`、`captured`、`failed` 保存 itemId 与真实 Task 的映射。只有无 taskId 的 `marked` 可从网站撤销，Host 与网站必须共用 `P5_RADAR_STATE_HOME`。
- `radar-reactions.json` 位于 `P5_RADAR_HOME`，独立保存当前 `like`／`dislike`。重复反应幂等，点赞与点踩互斥，取消反应不撤销已读；该文件不创建 Task，也不写 `radar-follow-state.json`。
- 生成下一份日报时，reaction 只读叠加到内存偏好：点赞提高对应主题与来源权重，点踩降低权重。切换反应按当前文件重新计算，不累计旧权重，不回写 Host／插件共用的 `preferences.json`，也不过滤掉低偏好条目。

## 飞书命令

```text
跟进 2026-11-24 1
处理网站跟进
处理网站跟进 2
处理网站跟进 全部
忽略 2026-11-24 8
```

日期、编号和 itemId 必须同时匹配指定日报。兼容命令「跟进 1」只解析最新日报，历史页面始终复制带日期的命令。

跟进会先冻结真实正文或字幕，再创建原生 capture Task。Worker 使用动态 `source-url`，Result Lane 独立复核完整来源、文件哈希、Worker 和模型后才结算业务 Task。重复 itemId 复用原 Task；失败或投递 unknown 不自动重跑模型或重发结果。

网站“收藏”只写入 `marked`，不创建 Task、不发送飞书。管家收到「处理网站跟进」后，一条标记直接接续现有收录链，多条先返回日期和编号等待选择；只有明确「全部」才逐条创建独立 Task。Task 创建后沿用 Result Lane 写回执行状态，网站标记接口不得覆盖或撤销 Task。实际收录后的正向反馈仍走现有 `follow` 链，不在收藏时重复加权。

设置 `P5_RADAR_SITE_ORIGIN` 后，HTML 是唯一新日报正文。快照或编号文件写入失败时本次调度失败并进入既有重试，不发送链接，也不退回新 Wiki。未设置时保留旧 Wiki 路径，便于开发期兼容；生产切换需要另行部署验收。

## 本地开发

```bash
P5_RADAR_HOME=/absolute/path/to/p5-radar \
P5_RADAR_STATE_HOME=/absolute/path/to/isolated-site-state \
P5_RADAR_DB=/absolute/path/to/p5-radar/p5-radar.db \
P5_RADAR_ALLOW_INSECURE=1 \
P5_RADAR_SITE_PORT=61210 \
pnpm p5:site
```

`P5_RADAR_ALLOW_INSECURE=1` 只允许显式本地开发，服务器始终绑定 `127.0.0.1`。开发预览使用独立 `P5_RADAR_STATE_HOME`，避免把已阅测试写进生产目录。

公网模式必须配置：

```text
P5_RADAR_AUTH_FILE=/absolute/path/to/auth.json
P5_RADAR_SITE_ORIGIN=https://radar.example.com
```

认证文件只接受本机权限受控的 JSON：`{"password":"..."}`。密码不得写入仓库、命令输出或飞书。登录 Cookie 为 HttpOnly、SameSite=Lax，HTTPS 公网源带 Secure；所有写 API 要求同源 Origin，CSP 禁止内联脚本和第三方连接。

## 界面与 API

- 移动优先：今日新增、全屏详情、底部点赞／点踩／收藏、复制手动命令、返回列表。
- 桌面增强：阅读清单与详情双栏，详情内部滚动，操作栏不遮挡正文；全屏阅读支持 Esc、焦点恢复与焦点约束。
- 视图：今日新增、全部未读、已阅、已跟进、已忽略、指定日期历史。
- 搜索标题、中文标题、来源和日期；筛选不重编号。
- 点赞与点踩互斥并自动标为已读，再点当前反应只取消偏好，保留已读。顶部“本页全部已阅”和“撤销本页已阅”保留为不表达偏好的中性批量入口。
- 收藏复用 `marked`；无 taskId 时可取消，有 taskId 后显示真实执行状态并禁用，不得由网站覆盖或撤销 Task。网站不提供批量收藏或忽略，管家批量收录只接受明确「全部」。
- 已读、反应和收藏当次只更新本地状态与视觉反馈，不整表刷新、不立即移动条目；加载指示器固定在清单标题区。重新加载时由服务端稳定分区为未读在前、已读在后，两组内部保留日报原编号与排名。
- 已读条目的编号、来源、标题、摘要和元信息置灰，标签保留语义色；详情显示独立“已读”标识，点赞／点踩／收藏按钮同步显示当前状态。
- 浅色纸面与低光深色模式，使用本地字体、OKLCH、44px 触控目标，并尊重 reduced-motion。

```text
GET  /api/summary
GET  /api/items?view=today|all|unread|read|followed|ignored&date=YYYY-MM-DD&q=...
POST /api/read {"itemIds":[1],"read":true}
POST /api/reaction {"itemId":1,"reaction":"like"|"dislike"|null}
POST /api/follow {"itemId":1,"marked":true}
```

## 验证

```bash
node --test tests/p5-radar-*.test.mjs tests/p5-plugin-contract.test.mjs
pnpm gate
```

本轮三按钮与 reaction 变更尚未部署。生产更新需另行固定不可变 release、备份并核对共享 stateHome、按单实例规程重启，再完成登录后的公网 UI／API 验收；不得因部署自动重跑收录 Task 或重发不确定结果。
