# P5 桌面阅读与网站跟进生产更新交接

状态：本地实现与隔离验收完成，等待 Owner 单独批准推送、release、生产状态迁移和服务重启。当前未修改生产。

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

## 回滚

- 有 active 收录或结果未知时先对账，不在执行中直接切换状态文件。
- Host、网站、release、stateHome 配置和 follow-state 必须作为一组回滚。旧 Host 只读取 P5 home，因此切回旧代码前须从已合并状态恢复其 Task 映射，不能让 Host 回到另一份过期文件。
- 保留迁移前备份、合并后的 marked／Task／Result Lane 事实和差异记录，不删除、不伪造。
- 回滚不得通过重发飞书、重跑模型或撤销已收录正文制造“恢复成功”的假象。
