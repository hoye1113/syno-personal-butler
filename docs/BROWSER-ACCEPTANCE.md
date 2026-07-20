# Syno Web 浏览器验收记录

## 验收基线

- 日期：2026-07-18（Asia/Shanghai）
- Git 基线：`620b8d6`
- 浏览器：Playwright Chromium 150（Windows 10 user agent）
- 服务地址：`http://127.0.0.1:4318`
- 隔离数据与运行时：`C:\tmp\syno-ui-audit-20260718`
- 未读取或修改真实 `%LOCALAPPDATA%\Syno`、真实 Token 和原始 Obsidian 仓库

## 验收结果

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| 桌面 Today 工作台 | 通过 | 1440×1000；主导航、审批、主动重点、纸片守护者、Capture 和周历完整呈现 |
| 移动端主界面 | 通过 | 390×844；五入口底部导航、Today、Capture 和纵向周历按结构重排 |
| 移动端设置入口 | 通过 | “连接设置”在窄屏可见，并能由真实点击打开 Provider/渠道设置 |
| 关闭抽屉语义 | 通过 | `hidden=true`、`inert=true`、`aria-hidden=true`；可访问性快照不再暴露抽屉内容 |
| 打开抽屉语义 | 通过 | `role=dialog`、`aria-modal=true`、标题关联；初始焦点进入关闭按钮 |
| 键盘焦点 | 通过 | `Shift+Tab` 从首项循环到末项，`Tab` 回到首项；Escape 关闭并恢复到触发按钮 |
| Provider 密钥显示 | 通过 | Token 输入框为空，页面不回显已保存密钥；本隔离环境显示“尚未配置” |
| 减少动画 | 通过 | 模拟 `prefers-reduced-motion: reduce` 后媒体查询命中，守护者 `animation-name: none`、`transform: none`，抽屉过渡压缩为 `0.000001s` |
| 控制台 | 通过 | 完整流程 0 error、0 warning |
| 主动偏好 | 通过 | 隔离状态中将通知节奏改为 active、每日复习改为 7、启用紧凑显示；保存后立即回读并生效 |
| 学习原始证据 | 通过 | Learn 使用至少 20 字的内联原始输出，不再接受仅填写 Artifact 引用冒充学习证据 |
| 创作生命周期 | 通过 | Create 可列出机会并使用卡片内原文/反馈输入推进状态，不使用阻断式 prompt |
| 响应式闭环入口 | 通过 | 390×844 下 Learn、Create、Settings 仍在五入口导航和全屏抽屉内可访问；控制台 0 error、0 warning |

针对上述行为的静态回归位于 `tests/ui-shell.test.mjs`。本轮修复还补上了移动端此前不可达的 Provider/渠道设置入口。

## 截图索引

- [桌面完整工作台](../output/playwright/syno-desktop-2026-07-18.png)
- [移动端完整工作台](../output/playwright/syno-mobile-main-2026-07-18.png)
- [移动端 Provider 与渠道设置](../output/playwright/syno-mobile-settings-2026-07-18.png)
- [桌面 Create 闭环](../output/playwright/syno-create-2026-07-18.png)
- [移动端 Create 闭环](../output/playwright/syno-mobile-create-2026-07-18.png)

## 尚未覆盖

以下项目需要真实凭据、外部账号或设备，不计入本次隔离浏览器验收：

- token-cloud 真实工具调用、超时、离线和恢复探针；
- 微信扫码、Owner 映射、重复投递与恢复；
- 飞书扫码、日历授权、重复/乱序事件与恢复。

这些项目继续保留在全局 Goal，不以本记录替代真实外部验收。

## 2026-07-20 增量复验

- Git 基线：`2e1dfd0`；`9837366` 与 `2e1dfd0` 只调整渠道媒体、SDK 日志和 Windows CLI 发现，但仍按最新服务状态完成浏览器复验
- 服务地址：`http://127.0.0.1:4317`
- 桌面：1280×720，`scrollWidth=1265 <= innerWidth=1280`，飞书日历显示已连接到「Hoye」，Provider password 输入值为空，0 error/0 warning。
- 移动：390×844，`scrollWidth=375 <= innerWidth=390`，“连接设置”可达并打开设置 dialog，0 error/0 warning。
- 键盘：Escape 关闭设置 dialog，并将焦点恢复到“连接设置”触发按钮。
- 减少动画：最新 CSS 仍包含 `prefers-reduced-motion` 规则；动态静态化行为由既有真实仿真与 `tests/ui-shell.test.mjs` 持续覆盖。
- 安全：本轮使用真实本地配置，仅核对 password 字段为空和脱敏状态文本；没有截图、读取或记录 Token、App Secret、设备码。
- 重启恢复：不注入 `LARK_CLI_PATH` 手工重启服务后，页面恢复显示 `Hoye · Hoye`，API 为 `connected/valid`、lark-cli 1.0.72；微信与飞书消息 Worker 同时保持 Owner 已绑定运行态。

## 2026-07-20 封板复验

- 代码基线：`bc5937b`（包含微信真实运行记录；渠道修复提交 `e02f62b`、`2dde18d` 均为其祖先）。
- 桌面：1280×720，`scrollWidth=1280`、`bodyScrollWidth=1280`，无横向溢出；Today、审批、设置与五个知识闭环入口可达。
- 安全：真实配置下 Token 输入框值为空，仅显示“Token 已加密保存”；未读取、截图或记录 Token。
- 键盘：设置抽屉初始焦点进入关闭按钮；Escape 关闭后焦点恢复到“设置”触发按钮。
- 移动：390×844，`scrollWidth=390`、`bodyScrollWidth=390`；Today、Capture、Knowledge、Learn、Create 与“连接设置”均可达。
- 控制台：桌面和移动流程合计 0 error、0 warning。
- 减少动画：两处 `prefers-reduced-motion: reduce` 规则仍存在，`tests/ui-shell.test.mjs` 持续验证静态化行为。

## 2026-07-20 Web 收敛复验

- 固定点：`1c4e782`；验收对象为本轮尚未提交的 Web 收敛与 Windows 服务差异。
- 隔离方式：`SYNO_WEB_ONLY=true`、端口 `4318`、状态根位于仓库忽略的 `.runtime/ui-final`；未读取真实凭据，也未竞争微信/飞书连接。
- 桌面：1280×720，`scrollWidth=1280`；首屏只突出一个行动、待处理/最近收录/今日进展，旧目录配置和周历进入二级折叠入口。
- 设置：首层只显示 AI、微信、飞书、开机自动运行、数据与备份五行；Provider URL、Model ID、上下文长度和 Token 均在高级设置内，Token 未回显。
- 移动：390×844，`scrollWidth=390`；首屏只保留审批与连接设置，五入口底部导航完整可达。
- 可访问性：快速文件收录使用原生按钮；设置 dialog 初始焦点进入关闭按钮，Escape 与焦点恢复由既有回归持续覆盖。
- 控制台：全新 Playwright 会话的桌面设置与移动流程均为 0 error、0 warning。
- 知识筛选：真实点击 Knowledge 的“筛选”后，标签、来源、稳定性、开始日期、结束日期与清除入口按需出现；默认搜索界面保持简洁。
- 设置分层：真实点击“数据与备份”前不显示保留策略；进入后仍需点击“高级设置”才出现保留策略、诊断与工作区入口，目录字段继续由内层折叠控制。
- 运行状态：真实本机服务返回 `product=syno-personal-butler`、协议版本与仓库指纹；设置页只呈现“已开启/未开启”，不暴露任务或进程细节。

### 本轮截图

- [桌面 Today 决策中心](../output/playwright/syno-desktop-converged-2026-07-20.png)
- [桌面五行设置](../output/playwright/syno-settings-converged-2026-07-20.png)
- [移动 Today 决策中心](../output/playwright/syno-mobile-converged-2026-07-20.png)
