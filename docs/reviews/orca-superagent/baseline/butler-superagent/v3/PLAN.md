# V3 执行方案：现有飞书应用的真实通道闭环

- 日期：2026-11-17
- 状态：已完成；真实 Owner 私聊四入站、四结果卡片、真实按钮关闭、重启去重和旧 Runtime 恢复均通过
- 验证报告：`/Users/hoye/Documents/workspace/butler-superagent/v3/VERIFICATION.md`
- 真实证据：`/Users/hoye/Documents/workspace/butler-superagent/v3/live-evidence.json`

## 范围

复用现有 Feishu App、Owner 绑定和 `FeishuChannelAdapter`，使用真实 OpenCode CLI + DeepSeek 4.1 Flash 与 V2 多对象 Hub。只开放 Owner 私聊，不连接真实 vault，不切换全量生产流量。

## 权威与安全边界

1. 旧 Runtime 与 V3 不得同时消费。真实桥接共用生产飞书进程锁，但使用独立测试状态文件，不恢复旧生产 pending 消息。
2. 非 Owner、非私聊消息不得进入 Root；Worker 环境不持有飞书 App Secret。
3. 入站以飞书 messageId 作为 Owner 事件 ID；结果以 Hub card id/version 和飞书 messageId 关联。
4. 通知按钮走 Hub `answer`，带 `channel/by/ref` 校验；重复点击不得新增业务任务。
5. 投递只声明 at-least-once 和 provider messageId，不声明用户已读。
6. 旧 Runtime 只能在 V3 停止后恢复。

## 已验收

- 真实 A/B 两轮发送共四条唯一入站，四个任务全部完成；A/B Session 分别复用。
- 四张结果卡片真实投递；Owner 点击后全部关闭，无新增 Root。
- 桥接重启不重复发卡片；卡片关闭后的四条更新复用原 provider messageId。
- 模拟通道覆盖非 Owner/群聊、重复 messageId、乱序、附件失败、按钮重复点击和 Worker 凭据隔离。
- V0/V1/V2/V3 无费用回归共 30/30。

## 限制

真实附件上传/下载未执行；附件失败由现有真实 Adapter + 模拟资源故障覆盖。歧义卡片目前以文本候选呈现，只有“已处理”通知按钮接入 answer，未宣称歧义按钮可直接续接 Root。
