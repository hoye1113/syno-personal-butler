# P5 三按钮与阅读偏好生产交接

状态：本地开发与隔离验收完成，未推送、未部署、未重启生产，未创建真实收录 Task，未发送飞书或调用外部模型。

## 本轮提交

- `888824494092b03f20350e2c5b59af6c3b9a07da`：消除已读抖动并稳定未读优先。
- `633e79f0c18dd511eaddd9c9da54ff96c4502cbc`：增加点赞／点踩／收藏、reaction 持久化及下一份日报偏好叠加。
- 分支：`fix/p0-runtime-hardening`。上述提交尚未推送到 `origin/main`。

## 已完成证据

- `corepack pnpm gate`：779 项测试，773 通过、0 失败、6 项平台条件跳过；仓库校验通过（3601 files）；active 文档检查通过。
- 桌面隔离浏览器：点赞→点踩→取消→点赞→收藏全序列通过；最大列表位移 0px，未出现整表 loading；当次顺序不变，刷新后已读沉底。
- 移动端 390×844 暗色：三按钮无横向溢出，底栏完成动画后位于视口内；已读条目编号、来源、标题、摘要与元信息置灰，标签保留语义色。
- 多条已读刷新后顺序为 `[3,4,1,2]`：未读在前，已读组保留日报原顺序；第 1 条保留“已点赞／待收录”，第 2 条保留“已点踩”。
- reaction API 已覆盖匿名 401、跨站／opaque Origin 403、参数 400、未知条目 404、幂等、互斥、取消保留已读及不创建 follow Task。
- 真实 `buildDailyDoc(..., renderOnly:true)` 隔离链验证 reaction 影响下一份日报排名，不回写 Host `preferences.json`，切换反应不累计旧权重。
- active 插件注册表仍为 `2026.11.22.8`；本轮未修改插件版本或 active 绑定。
- 隔离浏览器 `nszz` 与 fixture 服务 `b3r3fzw59` 已停止。

## 下一轮目标与验收标准

### A. 对账、推送与不可变 release

1. 执行前重新核对当前分支、远端 main、生产 release、进程和状态文件，不能沿用旧 PID 作为现状。
2. 经 Owner 明确授权后，以 fast-forward 方式推送本轮两个功能提交；非 fast-forward 停止并报告，不强推。
3. 从干净提交重新运行完整 gate，使用既有发布工具制备不可变 release，记录完整提交 SHA、release 绝对路径与资源哈希。

验收：release 来自上述两个提交的干净祖先链，入口模块图与完整 gate 通过，工作区无未声明文件混入。

### B. 备份与共享状态保护

1. 按既有运维规程备份 launchd 配置和阅读／跟进状态；认证文件与凭据不得复制进仓库或聊天。
2. Host／网站继续共用 `P5_RADAR_STATE_HOME=/Users/hoye/Documents/workspace/syno-personal-butler/.local-data/p5-radar-site/state`。
3. `radar-reactions.json` 使用既有 `P5_RADAR_HOME`，不得另建第二套 home。若文件尚不存在，记录 ENOENT，不从其他环境导入测试反应。
4. `preferences.json` 在网站 reaction 验收前后保持哈希不变；不得用 reaction overlay 覆盖 Host／插件偏好。

验收：备份路径、文件清单和哈希齐全；read／follow 原有 itemId、taskId 与执行状态不丢失、不冲突。

### C. 单实例部署与恢复

1. 只操作既有 Host 与网站服务；Tunnel 配置不变，不因本轮需求启动第二个真实消费者。
2. 按既有单实例规程停止旧实例，确认旧进程退出且无其他消费者后，再激活 release 并启动新实例。
3. 若启动结果或外部副作用未知，先读取状态与日志对账，不盲目 bootstrap、重放任务或重发通知。

验收：Host 与网站各一个新实例，健康检查通过；active 插件仍为 `.8`；共享 stateHome 正确；公网静态资源哈希与新 release 一致。

### D. 登录后的公网功能与安全验收

1. 保留并完成上一轮未闭环项：登录后的阅读、已阅、marked／撤销，以及已认证跨站 `/api/follow` 403。
2. Owner 手动登录，不读取或输出密码、Cookie、认证文件，不构造会话绕过认证。
3. 桌面与移动端分别验证：点赞／点踩互斥并自动已读；取消反应保留已读；三按钮状态、详情已读标识和列表置灰清晰。
4. 当次已读／反应／收藏无整表 loading、无布局抖动、无立即移动；刷新后未读优先、已读稳定沉底，组内原顺序不变。
5. 顶部“本页全部已阅”与撤销仍是不表达偏好的中性入口。
6. 收藏只产生 `marked`，无 taskId 时可取消；不得为普通 UI 验收创建真实收录 Task 或发送飞书。已有 taskId 的条目只能读验执行状态与 disabled，不得覆盖或撤销 Task。
7. 匿名 summary／reaction／follow 为 401；已认证跨站 read／reaction／follow 为 403；非法 reaction 为 400，未知 itemId 为 404。
8. 不为验收手动触发采集或日报。下一份按既有 10:00 调度真实生成后，再以只读证据确认 reaction 已进入排名且未过滤条目。

验收：逐项保存不含凭据的 UI、API 和状态证据；所有生产写操作都能对应到明确验收步骤，未知结果先对账。

### E. 回滚与运维证据

1. 部署失败时切回执行前已核对的上一 release，并按同一单实例规程恢复 Host／网站。
2. 已写入的 reaction 文件不得为回滚而盲目删除，旧代码不读取该文件。read／follow 若已有新 Owner 操作，不得直接用备份覆盖，先对账差异。
3. 将 release、备份、进程、共享状态、公网验收和回滚信息更新到 `/Users/hoye/Documents/workspace/syno-personal-butler-p0-hardening/docs/OPERATIONS.md` 及本文件。

验收：回滚路径可执行且不丢新状态；运维文档与真实生产一致，未把隔离验收冒充生产验收。

## 明确边界

- 本轮“可以执行开发”不包含 push、生产部署、重启、真实收录、外部模型或 vault 写入。
- 上一轮生产匿名边界与资源一致性已验收，但登录后的公网 UI／API 仍未完成，不得记为通过。
- 生产旧基线曾指向 release `/Users/hoye/Documents/workspace/syno-personal-butler-releases/20261125T052937419Z-f5b56a338eb0`；下一轮必须重新对账后才能把它作为回滚目标。
