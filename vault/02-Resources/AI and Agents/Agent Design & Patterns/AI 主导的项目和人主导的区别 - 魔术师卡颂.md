---
title: "AI 主导的项目和人主导的区别"
tags: ["ai_agent", "ai_coding", "article", "wechat", "harness_engineering"]
legacy_tags: ["ai_agent", "ai_coding", "article", "wechat", "harness_engineering"]
created: "2026-07-02"
source: "https://mp.weixin.qq.com/s/ZzYrfK5v_iBRWcQCLfMSEw"
description: "魔术师卡颂：AI 主导项目宜 monorepo + 统一 CLI 流程；各端差异收敛到工具层，写 web 与写 iOS 对 Agent 无本质差别"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/Agent Design & Patterns/AI 主导的项目和人主导的区别 - 魔术师卡颂.md"
source_sha256: "c6edb8a9ac798131f3356c6cf43e87391a691c53183d440c690995b944aa9e5d"
migration_id: "migration-20260720-64e79771"
author:
  - "[[魔术师卡颂]]"
date: 2026-06-03
---

# AI 主导的项目和人主导的有啥区别？

> 作者：@魔术师卡颂（同系列 Harness / AI Native 文风）| 2026-06-03

---

## 场景

管理后台 + Web + 小程序 + iOS + 安卓。

**人主导**：多半是**多个独立仓库、各自一套脚本**——Web 一个 Vite 项目，自有 dev / build / test。

**AI 主导**：核心差别不是「用不用 AI」，而是**项目形态怎么为 Agent 收敛**。

---

## 两个反直觉结论

### 1. 多端 → monorepo，而不是各端各建

AI 能跨端开发时，**不必按端拆团队、拆仓库**。  
把各端收进 **monorepo** 往往更高效——Agent 在同一规范下切换产物即可。

### 2. 各端不必各有 dev / build / test 命令

人主导时，工程师偏好导致 Web / 小程序 / 原生各搞一套 npm script。  
AI 主导时，**统一走一份流程文档 + 同一套 CLI**；端差异下沉到 CLI 内部实现，而不是暴露给 Agent 多套入口。

和 [[AI框架与 Harness 的关系 - 魔术师卡颂]] 里「中间路由宜薄、底层约束宜厚」一致：**端差异不该占 Agent 上下文，该进基建**。

---

## 统一流程长什么样

开发任意页面，大体同一套：

1. 读取 env  
2. 按需从 seed 恢复数据库  
3. 处理登录态等前置校验  
4. 注册操控前端的工具  
5. 前端环境初始化  
6. 用工具打开路由对应页面  

**Web 个人页示例**：准备登录态、DB 个人数据、注册 Playwright、预填 localStorage → Playwright 打开页面。

换小程序 / iOS，**步骤骨架相同**，只是第 4、6 步调用的工具不同（Playwright vs 开发者工具等）。

→ Agent 做开发 / 走查 / 测试时：**一份流程 + 一套 CLI**，差异在 CLI 里。这正是 [[想锻炼 AI 能力 - AI Native CLI - 魔术师卡颂]] 说的「面向 Agent 的 CLI」在项目层的落地。

---

## UI 侧同样收敛

| 环节 | AI 主导做法 |
|------|-------------|
| **UI 开发** | 输入设计图（甚至跳过 Figma→各端代码），Agent 识图在各端实现 |
| **UI 走查** | 各端前端工具截图（Web Playwright、小程序开发者工具…）→ 与设计图比对 |

---

## 本质区别

> **AI 把各端当作同一套规范下的不同产物**——写 Web 和写 iOS，对 Agent 没本质差别。

人需要不同端工程师，**偏好**造成各端规范分裂。  
这种差别会向上传导，变成**项目架构**差别：多仓库、多脚本、多流程 vs monorepo + 统一 Harness。

和 [[所谓的agent开发到底是个啥岗位]] 里「蜂群最小节点要业务+技术+AI 协作」同向：少按端切人，多按**结果与系统**切。

---

## 相关阅读

- [[想锻炼 AI 能力 - AI Native CLI - 魔术师卡颂]] — CLI 层：结构化 stdout、hint、权限
- [[AI框架与 Harness 的关系 - 魔术师卡颂]] — 三层 Harness；统一 CLI 属于路由 + 基建
- [[如何为项目定制 Harness 环境 - 魔术师卡颂]] — 加厚测试 / lint / 流程文档等基建
- [[PlanetScale-Agent时代的基础设施]] — small sharp tools；Agent 时代接口设计
- [[MOC - Harness Engineering]] — 横切入口
