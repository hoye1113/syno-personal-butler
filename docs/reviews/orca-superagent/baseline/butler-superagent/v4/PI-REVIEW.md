# Pi 统一 Worker Runtime 方案审查报告

- 日期：2026-11-18
- 状态：**真实纵向实测已通过；全量回归 41/41；未切换统一生产 Runtime**
- 最终证据：`/Users/hoye/Documents/workspace/butler-superagent/v4/PI-VERIFICATION.md`
- 审查对象：Pi 作为统一 Worker Runtime 的方案、当前实验实现与真实 OpenCode Go 模型测试
- 原始方案：`/Users/hoye/Documents/workspace/plan/butler-pi-worker-vertical-slice.md`
- 历史失败与最终证据：`/Users/hoye/Documents/workspace/butler-superagent/v4/PI-VERIFICATION.md`

## 一、审查结论

**“统一 Pi Runtime + 多隔离 Specialist Worker”的候选架构已完成一次真实纵向实测。初始 CLI 桥接三次失败，改用 OpenCode Server 的无 Session 直接模型接口后通过；但仍未证明长期稳定性，也未切换生产。**

初始复用 OpenCode Go 凭据的 CLI 桥接不成立，最终 Server 直接模型桥接成立：

- Pi Agent Core 已实际运行，并通过自定义 `streamFn` 先测试 OpenCode CLI、后连接 OpenCode Server。
- OpenCode 始终使用现有内部凭据访问固定模型 `opencode-go/deepseek-v4.1-flash`。
- 三次旧 CLI 回答均未满足 `{"go":true}` Worker 决策契约；第四次 Server 调用满足契约并完成完整闭环。
- 第三次旧 CLI 测试仍受 OpenCode Plan Agent 自身规则影响；最终接口不进入 Session 或 Plan Agent。

因此，早期问题应定性为 **CLI 模型桥接边界错误**，不能据此判定 Pi 核心能力失败；最终成功也只证明当前单对象纵向链路，不证明长期生产稳定性。

## 二、目标架构

```text
用户
  → 管家 Root Router
  → autoloop 持久编排内核
  → Domain Specialist
       ├─ 知识 Worker：Pi 实例 + 只读知识权限
       ├─ 收录 Worker：Pi 实例 + 副本收录权限
       ├─ 代码 Worker：Pi 实例 + 隔离 worktree
       └─ 运维 Worker：Pi 实例 + 独立运维权限
  → Result Lane 独立复核
  → 原 Owner 上下文通知
```

多个 Worker 可以共用 Pi 包和 Adapter 代码，但不能共用无边界的 Session、Home、cwd 或权限。

### 责任边界

| 层 | 必须负责 | 不应负责 |
|---|---|---|
| autoloop | 事件、任务、租约、重试、取消、恢复、审批、通知 | 模型推理和工具执行 |
| Root / Specialist | 路由、静态 persona、权限和输出标准 | 直接操纵 Worker 进程 |
| Worker Contract | 关联字段、条件版本、检查点、结果 envelope、幂等和对账 | 依赖某个模型厂商的私有协议 |
| Pi Agent Core | Agent Loop、模型消息、工具调用和运行状态 | 持久事实、生产路由和可信结果判定 |
| Result Lane | 独立重读事实、校验引用/全文、生成可信通知 | 信任 Worker 自报成功 |

核心原则：**Pi 可以统一 Worker 实现，但不能替代管家的 Worker Contract。**

## 三、当前实验实现

### 依赖

- `@earendil-works/pi-agent-core@1.5.2`
- `@earendil-works/pi-ai@1.5.2`
- 安装目录：`/Users/hoye/Documents/workspace/butler-superagent/v4/pi-runtime-lab`
- 安装脚本已禁用；未修改 Syno 生产 vendor。

### 当前调用链

```text
task.capture
  → pi-worker.mjs
  → Pi Agent Core
  → 自定义 streamFn
  → loopback OpenCode Server
  → POST /api/experimental/generate
  → opencode-go/deepseek-v4.1-flash
  → data.text
  → Pi AssistantMessage
  → 校验 {"go":true}
  → 仅校验成功后才允许 captureSource()
```

Pi 初始工具列表为空；真正收录仍由既有确定性收录器负责，Result Lane 的独立复核设计不变。

### 主要文件

- `/Users/hoye/Documents/workspace/butler-superagent/v4/pi-worker.mjs`
- `/Users/hoye/Documents/workspace/butler-superagent/v4/real-pi.mjs`
- `/Users/hoye/Documents/workspace/butler-superagent/v4/plugin-agent.ts`
- `/Users/hoye/Documents/workspace/butler-superagent/v4/harness.mjs`
- `/Users/hoye/Documents/workspace/butler-superagent/package.json`

## 四、真实测试记录

| 轮次 | 已尝试方案 | 确定性结果 | 判定 |
|---|---|---|---|
| 1 | Pi + OpenCode CLI；要求只输出 `{"go":true}` | 模型返回自然语言，JSON 解析失败 | 未通过 |
| 2 | 收紧系统与任务提示，禁止解释和 Markdown | 模型指出 `system:` 只是消息正文；同时发现固定 task_id 导致 OpenCode Session 跨测试复用 | 未通过 |
| 3 | 去掉伪角色标签；按测试世界生成独立 Session | 模型仍以 Plan Agent 会话规则优先为由拒绝固定 JSON | 未通过，停止返工 |
| 4 | 改用 loopback OpenCode Server 的 `/api/experimental/generate`，不进入 Plan Agent | 一次真实调用满足 JSON 契约；收录、独立复核、两条通知及退出后知识查询均通过 | 通过 |

前三轮均在进入 `captureSource()` 之前失败，没有生成 `task.result`。第四轮才完成完整链路。没有降低断言，也没有把自然语言回答冒充成功。

### 已证明

- 当前 Pi 包可以加载并执行 Agent Loop。
- 自定义 `streamFn` 可以经 loopback OpenCode Server 调用直接模型接口。
- OpenCode 可以使用现有内部凭据获得固定模型的真实文本回答，且本次满足结构化 Worker 契约。
- 非契约回答会被 Worker 拒绝，不会直接进入收录阶段。
- Pi 收录结果已通过 Result Lane 复核和通知；Pi/OpenCode Server 退出后知识 Worker 继续运行。

### 未证明

- Pi 在长期重复运行中持续稳定满足管家结构化 Worker 契约。
- Pi 比 DSH 更稳定或更适合生产。
- 多 Specialist 并发、取消、超时、崩溃恢复和资源开销。
- Go 控制台实际扣费渠道。

## 五、主要问题与风险

### 【已解除】真实 Worker 完整闭环

- 初始三轮 CLI 桥接均没有 `task.result`。
- 改用 `/api/experimental/generate` 后，第四次实测已完成收录、Result Lane 复核和两条通知，见 `/Users/hoye/Documents/workspace/butler-superagent/v4/PI-VERIFICATION.md`。
- 该证据仅代表当前 Server 桥接实现；早期 CLI 桥接仍未通过。

### 【已解除】CLI 桥接形成双层 Agent，系统规则互相干扰

- 初始三轮证据：模型以 Plan 模式规则为由拒绝输出契约。
- 最终 Server 桥接直接调用一次性模型生成，不进入 Plan Agent，真实 JSON 契约已通过。

### 【已解除】失败运行缺少完整结构化审计

- 初始实现只在成功后写入 `pi-audit.jsonl`。
- 最终 Server 桥接已在成功和失败路径都写入脱敏审计，并记录 OpenAPI、请求数和 Server 退出状态。

### 【P1】当前桥接是实验实现，不是长期凭据规范

- 当前通过完整环境启动既有 OpenCode Server，由 CLI/Server/Store 内部使用认证。
- 未读取、导出、打印或保存 Key，这是现有安全边界。
- 但长期方案仍需明确环境变量最小化、子进程清理、Session 生命周期和失败恢复，不能直接把实验 bridge 提升为生产标准。

### 【P2】当前桥接不是实时流式转发

- 当前先收集 OpenCode 完整文本，再向 Pi 发放文本事件。
- 对单次 go 决策足够，但不证明长回答流式、取消和断线恢复能力。
- 本轮不扩展该能力，留待独立稳定性与恢复测试。

## 六、回归与现场状态

- Pi 改动前基线与最终 Server 桥接实测后的当前代码均为 V0～V4 **41/41**。
- 三次旧 CLI 失败与第四次 Server 成功均保留记录。
- 未访问真实 URL，未写正式 vault，未发送真实私有正文，未切换生产。
- 首次误用旧 `@mariozechner/*` 命名空间时中断了安装；`/Users/hoye/Documents/workspace/butler-superagent/v4/pi-lab` 残留未删除。

## 七、可选路径审查

| 路径 | 优点 | 代价/风险 | 建议 |
|---|---|---|---|
| A. OpenCode Server/SDK 直接消息桥接 | 凭据继续由 OpenCode 内部管理；已消除双层 Agent | 当前为非流式实验桥接，长期清理与恢复仍待验证 | **已完成单次纵向实测** |
| B. Pi 原生 `opencode-go` provider | Pi 直接管理模型协议，结构最干净 | 需要安全的凭据注入；不得自行导出 OpenCode Key | 有合规凭据路径时可选 |
| C. 保留 OpenCode/DSH，停止 Pi | 改动最少，保留已验证基线 | 无法获得统一 Pi Runtime 的潜在维护收益 | 若 A 不可行则合理 |
| D. 继续调整提示词 | 改动看似最小 | 偶然通过不能证明稳定；已触发三轮返工上限 | **不建议** |

## 八、推荐裁决

A 路径已完成实测：运行中 OpenCode Server 的 `/openapi.json` 已核对，Pi `streamFn` 已改用 `/api/experimental/generate`，一次真实收录与后续知识查询通过，Server 正常退出，全量回归 41/41。证据见 `/Users/hoye/Documents/workspace/butler-superagent/v4/PI-VERIFICATION.md`。

这把 Pi 从“未知候选”推进为“已跑通单对象纵向链路的候选 Worker Runtime”。是否进一步统一多个 Specialist，仍需重复运行、并发、取消、恢复与资源开销测试；本轮不自动扩大范围。

## 九、后续边界

1. 本轮只证明单对象、单次真实调用的完整纵向链路，不宣称 Pi 比 DSH 长期更稳定。
2. 多 Specialist 并发、取消、超时、崩溃恢复和资源开销应另开测试，不自动扩大本轮范围。
3. 旧命名空间安装残留与生产替换均需后续明确授权，不在本轮处理。
