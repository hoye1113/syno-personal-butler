# P5 桌面阅读与网站跟进生产更新交接

状态：两个功能提交已推送 main，不可变 release、共享 stateHome 和单实例 Host／网站已上线；匿名公网边界已验收。需要登录的公网 UI、已阅、marked／撤销及已认证跨站写保护仍待 Owner 在隔离浏览器手动登录后完成，不能宣称本轮全部验收通过。

## 本地完成证据

- 第一阶段提交 `ba541f94`：暗色对比度、已阅可读性、桌面详情内部滚动、操作栏和可访问的全屏阅读。
- 第二阶段为本文件所在提交：`marked` 网站意向、认证 `/api/follow`、列表即时状态、Host 共用 stateHome、确定性接续命令与跨进程写入保护。
- 完整 `corepack pnpm gate`：776 tests，770 pass，6 skipped，0 fail；仓库校验 3601 files、活跃文档检查 7 files 和 diff check 通过。
- 隔离浏览器覆盖 800×900、1280×900、1920×1000 桌面视口与 iPhone 390×844。末尾正文和操作栏完整可见；暗色默认、hover、disabled、全屏 Tab 循环、Esc、深链和移动返回均有实际断言。
- 网站点击只写 `marked`，不创建 Task、不发送飞书。已有 taskId 后，网站只展示现有执行状态，不能撤销或覆盖。

## 目标

在既有 `https://radar.hoyework.online` 和单实例 Host 上发布本更新，同时完整保留旧 Task 映射、已阅状态和 Result Lane 事实，让管家能够接续网站里的待处理标记。

## 前置条件

- Owner 明确批准提交推送、不可变 release、生产配置变更、状态迁移和必要的 Host／网站重启。
- 开工核对当前 main、完整 diff、生产 release、Host／网站／Tunnel 单实例、active Task、delivery unknown 和 handover hold；存在未知结果先对账。
- 不读取或输出密码、Token、Cookie、生产 `.env` 或私有正文。真实收录验收若需外部模型和 vault 写入，必须包含在本次明确授权中，否则只做无 Task 的网站标记验收。

## 步骤

1. 精确推送两个功能提交，从最终提交制备不可变 release，再次运行完整 gate 和 import 验证，保留当前生产 release 与配置备份。
2. 在批准的变更窗口停止写入入口，分别备份 Host 旧 `P5_RADAR_HOME/radar-follow-state.json` 与网站 `P5_RADAR_STATE_HOME/radar-follow-state.json`。不得直接覆盖任一文件。
3. 按 itemId 合并两份 follow-state：已有 taskId 的 pending／running／captured／failed 记录优先并原样保留；无 taskId 的 marked 作为独立意向加入；同 itemId 冲突时保留 Task 事实并记录对账差异。原子写入共享 stateHome，复核旧 Task 数量和 taskId 全量保留。
4. 为生产 Host 和网站设置完全相同的 `P5_RADAR_STATE_HOME`，继续让 `P5_RADAR_HOME` 只指向日报内容源。不得迁移或覆盖 `radar-read-state.json`，不得启动第二个 Host。
5. 从同一 release 启动网站和既有 Host，核对 PID、锁、恢复日志和 follow-state 路径。纯 marked 不得进入崩溃恢复执行；只有带 taskId、sourcePath 的 pending／running 才允许既有恢复链接续。
6. 公网验收暗色与桌面完整阅读、移动端详情、已阅即时状态、跟进标记、撤销、刷新持久化及匿名／跨站写保护。无 Task 标记测试完成后可撤销，不发送飞书。
7. 若本次授权包含真实收录，选择一条公开条目执行「处理网站跟进」，确认单条接续、Task 唯一、running、captured、Result Lane 和网站回显；多条先选择，只有明确「全部」才逐条创建。失败或 unknown 不自动重跑。
8. 更新运维记录和回滚证据，观察下一自然日日报与跟进状态是否独立正常。

## 验收标准

- 合并前后所有旧 taskId 均可追溯，Host 与网站读取同一状态文件；并发写入不会丢失其他 itemId。
- 网站点击后详情和列表立即显示「待管家处理」，无 taskId；重复点击幂等，撤销只适用于纯 marked。
- 管家单条接续复用现有 Task／Result Lane，多条不选择时不创建 Task，明确全部时每个 itemId 都有独立 Context 和 Task。
- 桌面 800／1280／1920 与移动端正文完整可读，暗色按钮默认、hover、focus、disabled 对比清晰，全屏可通过 Esc 退出。
- Host、网站和 Tunnel 保持单实例，无新增 unknown／hold 被隐瞒，无生产数据被测试覆盖。

## 2026-11-25 生产执行证据

- main 已从 `739b3c231dba4dfda78f2e8078f7921ab42630e2` 推送到 `f5b56a338eb042ebb1cc826f730d4f5393704f17`。
- 新 release 为 `/Users/hoye/Documents/workspace/syno-personal-butler-releases/20261125T052937419Z-f5b56a338eb0`，`current` 已原子指向该目录。prepare 再次运行完整 gate：776 tests、770 pass、6 skipped、0 fail，仓库 3601 files 与活跃文档 7 files 校验通过。
- 旧 Host PID `9157` 与旧网站 PID `91294` 均确认退出后才 bootstrap。新 Host PID `54603`、generation `19`，新网站 PID `54606`；Tunnel 保持 PID `8915`，未重启。Host frozen=false，active Task、pending Decision、queued／unknown delivery、handover pending／hold 均为 0，adapter running／available=true，active 插件保持 `2026.11.22.8`。
- 实际网站 stateHome 是 `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p5-radar-site/state`，Host 已增加完全相同的 `P5_RADAR_STATE_HOME`；`P5_RADAR_HOME` 仍只指向日报内容源。
- 停机后复核 P5 home 与实际网站 stateHome 的 follow-state 均为 ENOENT，锁文件不存在。因此共享状态以 `{schema:1,items:{}}` 原子初始化，合并 itemId／taskId／冲突均为 0；没有旧 Task 映射可合并，也没有创建新 Task。未写入或覆盖 `radar-read-state.json`。
- plist 备份、迁移事实与 SHA-256 保存在 `/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/launchd-backups/20261125T053505Z-f5b56a338eb0`。
- 公网匿名 `GET /api/summary` 与 `POST /api/follow` 均返回 401；`Origin:null` 且 `Sec-Fetch-Site:cross-site` 的登录写请求返回 403。公网 `styles.css` 与 release 文件 SHA-256 均为 `cc739a1bb632db73512780bff8724e4c5439cb4ef96a8e5d2430c1c6479c87d3`。
- 隔离 Agent Window 到达生产登录页但没有现成登录态，且未读取密码、Cookie 或认证文件。故桌面／移动端暗色阅读、全屏 Esc、已阅即时状态、marked／撤销、刷新持久化及已认证跨站 `/api/follow` 403 仍未做生产点击验收；这些项目只有隔离 fixture 证据，不得记为生产通过。
- 从 active release 只读调用 `resolveRadarMarkedFollows` 与 `recoverableRadarFollows`，共享状态分别返回 0 marked、0 selected、0 recoverable；未触发外部模型、飞书或 vault 收录。

## 回滚

- 本次成组回滚的上一 release 是 `/Users/hoye/Documents/workspace/syno-personal-butler-releases/20261125T023235128Z-a735322d3bc6`，plist 来源为上述 `20261125T053505Z-f5b56a338eb0` 备份；先停止两个写入进程并另存当前共享 follow-state，再恢复代码、配置和与旧 Host 兼容的 Task 映射，不得直接丢弃上线后新增事实。
- 有 active 收录或结果未知时先对账，不在执行中直接切换状态文件。
- Host、网站、release、stateHome 配置和 follow-state 必须作为一组回滚。旧 Host 只读取 P5 home，因此切回旧代码前须从已合并状态恢复其 Task 映射，不能让 Host 回到另一份过期文件。
- 保留迁移前备份、合并后的 marked／Task／Result Lane 事实和差异记录，不删除、不伪造。
- 回滚不得通过重发飞书、重跑模型或撤销已收录正文制造“恢复成功”的假象。
