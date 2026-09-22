# ADR 0006：BSK 无人值守浏览器读取边界

## 状态

已接受，取代 ADR 0002 中 Kimi WebBridge 与人工继续流程。

## 决策

直接 HTTP 抓取仍是首选。命中受控失败分类后，Syno Coordinator 直接调用 `BrowserCaptureAdapter`，由适配器使用 BSK 创建带 `--no-focus` 的任务专属 Agent Window，导航到 Workflow 已签发的精确公网 URL，并读取语义观察结果。该路径不再消耗 Harness 模型回合。

BSK 复用已连接浏览器配置中的既有登录态，但禁止 `tab borrow`，不接管普通用户标签页，也不调用人工求助。每个任务的 Session 在成功、失败或阻塞后立即关闭。BSK daemon 和扩展属于 Host 生命周期；Syno 只探测，不在单次任务中安装、启动或重启。

页面要求登录、验证码或人机验证时，适配器只允许一次有界刷新重试。仍被阻塞则返回 `BROWSER_BLOCKED_UNATTENDED`，Workflow 进入不可重试失败，不等待主人回复“继续”，也不绕过身份验证。对话读取可以继续尝试公开搜索、缓存页或官方替代来源。

浏览器正文始终是不可信材料，继续经过来源 URL 限制、同源重定向检查、敏感内容脱敏、低质量检测和现有收录审批链。

## 兼容性

新记录写入 `fetchMethod=bsk`。Schema 暂时保留 `kimi_webbridge`，仅用于读取历史 Workflow；运行路径不再生成该值。
