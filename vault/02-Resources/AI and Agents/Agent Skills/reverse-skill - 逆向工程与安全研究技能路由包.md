---
title: reverse-skill - 逆向工程与安全研究技能路由包
tags:
  - Skill/Security
  - ReverseEngineering
  - Agent/Router
  - Toolchain
date: 2026-10-11
status: canonical
category: Agent Skills
source_url: https://github.com/zhaoxuya520/reverse-skill
summary: 面向二进制、APK、前端 JS 加密、抓包与 CTF 任务的逆向工程路由包，44 条路由规则与 scope 授权边界驱动，按需自举本地安全工具链（IDA/Frida/Jadx/Burp）。
---

# reverse-skill — 逆向工程与安全研究技能路由包

> **核心哲学**：*“逆水为舟，破暗而行。当 AI 面对一个剥离符号表的 ELF 二进制、加壳的 APK 或混淆加密的前端 JS 时，不要让模型凭空瞎猜命令；通过确定性规则将任务精准路由到专用方法论，按需自举工具链，并在严格的 scope 授权边界内完成安全审计与复盘。”*

---

## 一、What：它能做什么

`reverse-skill`（`zhaoxuya520/reverse-skill`）是一个面向**逆向工程、授权渗透测试与底层安全研究**的工业级 AI 技能路由包。它为 AI 助手（Claude Code / OpenCode / Cursor / Harness）建立了一套底层的“任务分流与执行中枢”：

1. **44 条结构化路由规则（R0~R45）与 Master Routing**：
   - 自动识别目标工件类型：Android APK / SO 库、Windows PE / DLL、Linux ELF、前端 Webpack/JS 逆向、PCAP 抓包流量、固件 Binwalk、智能合约、CTF 专项题型；
   - 自动将任务指派到对应的方法论模块（如 IDA Pro 反编译、Ghidra 脚本、Frida 动态 Hook、Jadx 静态分析、Burp Suite 联动）；
2. **严格的作战契约与授权门禁（Scope & Case Contract）**：
   - 在开始对目标执行任何实质性动作（ACT）之前，强制检查 `scope.md` 与授权网络配置文件；
   - 未获得授权目标禁止执行破坏性测试，坚守白帽安全边界；
3. **证据链与闭环作战报告体系**：
   - 全流程按照 `Timeline -> Evidence -> Finding -> Attack Path` 归集证据；
   - 最终交付结构化的漏洞分析、加解密逻辑还原报告与防御加固建议。

---

## 二、Why：为什么强模型时代必收此技能

### 1. 痛点：Agent 在底层安全逆向中的“命令幻觉与环境迷航”
强推理模型虽然读过海量的反汇编和安全资料，但在真实的逆向工程实战中极易栽跟头：
- **工具链分散与命令虚构**：面对一个混淆 SO，模型容易虚构不存在的 Frida 脚本参数或错误调用 IDA headless 命令；
- **缺乏步骤纪律**：一上来就试图盲猜 key，而不是按照“静态查壳 -> 反编译核心逻辑 -> 动态 Hook 校验入参”的标准作战工序执行；
- **安全红线风险**：缺乏对测试范围（Scope）的强约束，容易越界扫描。

### 2. 现代 Harness 范式：路由中枢与自进化经验库
`reverse-skill` 实现了卓越的架构分离：
- **路由核心（Router Core）**：由轻量的配置矩阵和跨平台脚本（`master-route.ps1`）驱动，通过了 175 条用例的跨平台 CI 验证；
- **执行解耦**：模型不需要在主 prompt 塞入几千行 IDA/Ghidra/Frida 的手册，仅在路由命中具体场景时，才按需挂载该模块的作战手册（Just-In-Time Context Loading）。

---

## 三、How：核心架构与路由链路

### 1. 核心作战链路

```
用户提交逆向/安全任务
         ↓
  [RULES.md & MASTER-ROUTING] (主路由快路径)
         ↓
  [case-init / scope.md 校验] (授权与网络边界检查；未授权严禁动作)
         ↓
  [激活目标专项 Skill] (Jadx / Frida / IDA / Webpack-deobfuscate)
         ↓
  [调用本地工具链 / MCP / 专用脚本执行]
         ↓
  [结构化证据链汇总] (Evidence -> Finding -> Path)
         ↓
  [交付漏洞/逆向报告与 field-journal 经验归档]
```

### 2. 常见场景覆盖矩阵

| 目标类型 | 命中路由模块 | 推荐工具链 / MCP | 核心交付 |
|---|---|---|---|
| **Android APK** | `mobile-apk-decompile` | jadx, apktool, frida-server | 脱壳、网络请求解密、Hook 脚本 |
| **Linux ELF / 二进制** | `binary-reverse-ida` | IDA, Ghidra, gdb-pwndbg | 符号还原、控制流平坦化还原、漏洞点 |
| **前端混淆 JS** | `web-js-unpack` | ast-grep, babel-deobfuscator | API 签名算法还原、加解密逻辑复现 |
| **网络抓包流量** | `traffic-pcap-analysis` | tshark, Wireshark, Burp MCP | 协议逆向、私有协议反序列化 |
| **CTF / 安全实操** | `ctf-orchestrator` | 沙箱隔离环境 | PoC 构造、Flag 提炼与战后复盘 |

---

## 四、管家系统落地与实战转化建议

1. **补齐底层二进制与前端逆向能力**：
   - 当主人需要分析一个未开源的客户端协议、分析私有 API 数据签名、或审计某个第三方驱动/脚本的安全性时，管家按 `reverse-skill` 的作战规范进行有条不紊的排查；
2. **坚守安全权限红线**：
   - 契合 Syno 管家的 `AGENTS.md` 权限安全规范：所有逆向分析严格限制在本地只读镜像和隔离沙箱内，绝不越界。

---

## 五、关联卡片

- [[MOC - Agent Skills 武器库]]
- [[rea-reverse - 智能体逆向工程与反编译中间件]]
- [[reality-check - 代码诚实度无情审计]]
- [[ponytail - 最懒资深架构师心智]]
- [[Harness Engineering]]
