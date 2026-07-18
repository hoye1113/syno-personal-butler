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
