---
title: "OpenClaw实战：从本地到K8S部署"
tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "skills", "mcp"]
legacy_tags: ["ai_agent", "video_transcript", "bilibili", "harness_engineering", "skills", "mcp"]
created: "2026-06-09"
source: "B站视频 - Easonlee的AI笔记"
description: "Red Hat 工程师 Sally Ann O'Malley：OpenClaw 容器化反驳「安全噩梦」、Podman Secrets 双层引用、K8s 规模化模型评估、团队 baseline 镜像愿景与现场 demo。"
knowledge_state: captured
link_status: connected
source_path: "02-Resources/AI and Agents/B站视频知识库/Agent架构与平台/OpenClaw实战-从本地到K8S部署.md"
source_sha256: "e2dbef6e8f384d0d6f0ff97b588570fd690b2019721e425f8daeb5ac830a4233"
migration_id: "migration-20260720-64e79771"
source_url: "https://www.bilibili.com/video/BV18LV66aEG9/"
speaker: "Sally（Red Hat，10 年容器/Linux/K8s 安全）"
duration: "21:46"
saved: 2026-07-02
transcript_source: "Recastory/workspace/bilibili-retranscribe/BV18LV66aEG9/article.md"
asr_version: v2
material_tier: S
ingest_dir: "Recastory/workspace/bilibili-retranscribe/BV18LV66aEG9/ingest"
column_url: "https://www.bilibili.com/read/cv49986123/"
source_original_date: "2026-05-23"
host_name: "Meetup 主持人"
guest_name: "Sally Ann O'Malley"
guest_title: "Red Hat 资深工程师（容器 / Linux 安全 / Kubernetes）"
speaker_inference: "solo_talk_restructure + column_article"
speaker_confidence: "high"
author:
  - "[[Sally Ann O'Malley]]"
concepts:
  - id: container_sandbox
    zh: 容器沙盒
    en: container sandbox
    one_line: 显式限定主机访问，给智能体干净可预测的运行环境
  - id: secret_ref
    zh: 秘密引用
    en: secret reference
    one_line: 凭证只留指针，日志里不见明文 API 密钥
  - id: baseline_image
    zh: 基线镜像
    en: baseline image
    one_line: 公司批准的 MCP、认证、技能打包，新人即插即用
  - id: pvc_backup
    zh: 持久卷备份
    en: PVC backup
    one_line: K8s 持久卷声明支撑智能体状态备份与恢复
column_source: "Recastory/workspace/bilibili-retranscribe/BV18LV66aEG9/ingest/column_article.md"
curate_method: "vskill-vault-write canonical-dialogue v3.2"
dialogue_version: v3.2
genre: Host-Guest canonical
updated: 2026-07-03
---
# OpenClaw 实战：安全噩梦，恰恰是容器党的金色机会

**Host：** Meetup 主持人  
**Guest：** Sally Ann O'Malley（Red Hat 资深工程师）  
**形态：** Host-Guest 对谈稿 v3.2（中文口语化 · 术语表带英文 · 双语金句）  
**主源：** Recastory `BV18LV66aEG9/ingest/column_article.md`  
**B站：** [BV18LV66aEG9](https://www.bilibili.com/video/BV18LV66aEG9/)

---

## 开场

Red Hat 干了十年容器和 Linux 安全的工程师，休假在家试了 OpenClaw，回公司 Slack 被骂成「安全噩梦」。她没躲——反手把智能体装进 Podman、Kind、OpenShift，现场一条命令起实例。这期聊四件事：容器化到底解决什么、密钥怎么不进日志、K8s 上一个人怎么干六个人的活、团队 baseline 镜像长什么样。

**术语速查（后文对话用中文；英文原文在此统一对照解读）**

| 中文 | 英文 | 白话 |
|------|------|------|
| 容器沙盒 | container sandbox | 跑在隔离环境里，得你明确允许才能碰主机资源 |
| 秘密引用 | secret reference | 配置里只留指向密钥的指针，不直接写明文 |
| 持久卷 | PVC (Persistent Volume Claim) | K8s 里给容器挂一块能长期存数据的盘 |
| 基线镜像 | baseline image | 公司审过的 OpenClaw 打包：MCP、认证、技能一套齐 |
| 可观测性 | observability / OpenTelemetry | 用链路追踪看智能体跑了啥、卡在哪 |
| 安全沙盒 | SSH sandbox | 给智能体 SSH 密钥和已知主机，命令在隔离工作区跑 |
| 模型路由 | OpenRouter | 一个入口换多家模型，演示里用 Gemma |
| 永远爪 | Forever Claw | Sally 给个人 OpenClaw 实例起的名字（她的 Shubra） |

---

## 01 安全噩梦，是容器老兵的金色机会

**Host：** 同事在 Slack 喊别装 OpenClaw、更别装工作本——你一个搞了十年容器安全的人，第一反应是啥？

**Sally：** 我愣了一下，然后想：伙计们，我这十年在干嘛？

我在红帽差不多十年。前七年泡在容器、Linux 安全、Kubernetes，大量时间在 OpenShift 上——那七年特别过瘾，天天跟隔离、权限、编排打交道。五年前调到新兴技术部，终于不用绑死某一个产品，啥新东西都能摸。我知道红帽有个数据科学团队，但之前并不清楚他们在干嘛，机器学习那套离我有点远。大概三年前起，到处都在聊 AI，我这才认真往里钻，大量 Python、大量 Markdown，当时心想：哦，又一个聊天机器人，又是 Python 加 Markdown。没想到今天会疯成现在这样——既疯狂又精彩。

我第一次碰 OpenClaw 是在家休假。一本多功能手册冒出来，我心想：这到底是什么？一定得试。上 GitHub 找到它，第一件事看许可证——MIT，太好了，能自由部署能改。我当场就想：现在就把它装到 OpenShift 上，别等回公司。

接下来几天我构建镜像，先在容器里本地跑，再部署到 OpenShift。先玩着，摸清楚能干什么，再回公司对同事们说：伙计们，看看 OpenClaw，太酷了。Slack 上马上有人回：安全噩梦，别用，更别装工作笔记本。我回应：伙计们，我过去十年一直在做什么？我们能让任何应用安全跑起来，这就是 RHEL 的意义。要是连一个应用都保不住，我们这十年算白干。**这是向所有人展示红帽正在迎头赶上的绝佳机会。**

**Host：** 所以你不是回避风险，是觉得「会容器的人」反而该冲上去？

**Sally：** 对。AI 工具吓人，往往是因为大家习惯本机乱装——依赖、密钥、权限全糊在一台笔记本上，出了事也不知道哪儿漏的。我干的就是把应用关进笼子、把访问写清楚、把边界画明白。OpenClaw 这种能调工具、挂 MCP 服务器、还能跑子代理的智能体，更需要这套玩法，不是更需要躲。

这场分享本身就是我在容器中跑 OpenClaw 的心得。我想列清楚：为什么容器化是最佳选择。我所有东西都在容器里——直接在本地跑反而陌生，因为那样很乱，会把各种东西留在电脑上，以后还得清理，我不喜欢。容器党看到 OpenClaw，第一反应不该是「别装」，该是「怎么装才安全、才可移植、才配得上生产」。

同事那句「安全噩梦」，我听进去的是另一层意思：大家已经意识到 Agent 权限很大、碰得到真数据——这没错。错的是把「风险高」等同于「不能工程化」。我们在 OpenShift 上跑过无数有网络、有存储、有密钥的工作负载；多一个能调 MCP 的智能体，只是多一类工作负载，边界照样能画。休假那几天我先把镜像构建通、本地容器跑通、再推上 OpenShift，不是为了炫技，是为了证明路径存在：从 GitHub 拉到能在公司基础设施里跑，中间没有不可逾越的鸿沟。红帽要是连这一步都走不通，才真该脸红。这也是我接下来要讲的容器化路径的起点。

> **金句 · Sally**
> **中文：** 要是我们连一个应用都安全跑不起来，这十年白干了——OpenClaw 是证明我们能跟上的机会。
> **原文：** If we can't make any application run securely, what have we been doing for ten years? This is a golden opportunity to show Red Hat is catching up.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 容器沙盒 | container sandbox | 天然隔离；访问主机资源必须显式授权 |
| 工作负载隔离 | workload isolation | 智能体跟本机操作系统、别的应用分开跑 |
| 开源许可 | MIT license | OpenClaw 可自由部署、改、商用 |
| OpenShift | OpenShift | 红帽企业级 K8s 平台，Sally 首选部署目标 |

**本章小结**

- 同事喊「安全噩梦」，Sally 当成容器党该上场的机会，不是回避信号
- 十年容器 + Linux 安全背景，让她敢把 OpenClaw 直接推上 OpenShift
- 智能体能调工具、挂 MCP，更需要沙盒，不是更需要本机裸奔

---

## 02 容器给智能体干净的家，密钥不进日志

**Host：** 你为什么坚持所有东西都在容器里跑？跟本机直接装差在哪？

**Sally：** 我所有东西都在容器里。本机直接跑对我来说反而陌生——乱，各种残留堆在电脑上，以后还得清，我讨厌这样。

我有个「永远爪」Shubra，她会贯穿我整场分享。我问她：我们为啥要让你在容器里跑？如果你在读她的回答，会发现她提到：容器化是可复现的；你能隔离密钥；还能在不同基础设施之间移植。我笔记本能跑，x86 能跑，Mac 能跑，甚至在由卷支撑的 Kubernetes 里也能跑——这为备份和恢复提供了非常好的方案。我太看重 Shubra 了，每晚用 systemd 服务给她做备份，状态不丢。

当你在容器中运行程序时，就能获得天然的沙盒环境。你必须非常明确地设定：允许程序访问主机的哪些资源。她喜欢在容器中运行——干净、可预测的环境，不必担心操作系统的怪癖或过时的依赖项。这简直就是「为什么你应该在容器中运行所有东西」的标准定义。

还有一个实用招：你可以设置一个完整的代理目录，里面运行着一些工具、技能或 MCP 服务器，把整个目录挂载到容器中。这样在启动时，所有东西就已就绪并运行。我平时也是这么做的——不用每次手装一堆插件。

**Host：** API 密钥怎么管？环境变量明文我最怕日志泄露。

**Sally：** 这提醒了我，咱们谈谈秘密管理。我所有东西都用 Podman 运行，不是 Docker。虽然理论上你可以用 Podman 和 Docker 做任何事情，但 Podman 有一个非常酷的功能叫 Podman Secrets：你可以将 API 密钥保存到 Podman secret 中，然后将该 secret 挂载到容器里，从而实现分离。这样你的 API 密钥就只是一个对秘密的引用，不是明文躺在配置文件里。

OpenClaw 真正酷的地方在于它有一个双重机制——它本身就具备秘密引用功能，我也使用了它。所以我的 API 密钥是指向外部秘密的引用。虽然这并不完美，但它让我很安心，因为我的 API 密钥不会在日志中显示。与此非常类似，Kubernetes 也有 Kubernetes Secrets，原理是一样的：不是直接使用环境变量，而是对环境变量进行秘密引用。

**Host：** 现场装的时候，这层怎么落地？

**Sally：** 待会儿 demo 给你们看 Podman 秘密映射。你可以看到，我已经在系统上设置好了——用起来像环境变量，但它们不是普通的环境变量，因为它们是受控的。这些是我的 API 密钥。安装程序的作用是获取这些密钥。如果你使用 Docker，这也同样适用：虽然代码里到处写着 Podman，但我设计它时也兼顾了 Docker。如果你使用 Docker，它会获取环境变量，所以你需要将它们导出，并使它们成为 OpenClaw 的秘密引用。这是 OpenClaw 一个非常酷的功能：务必为每个凭证启用此功能，创建一个秘密引用。它实现了在 OpenClaw 中运行秘密信息与仅保留指向它的指针之间的分离，这是最佳实践。

然后是你的提供商。我要从 OpenRouter 开始，因为我最近一直在玩 Gemma，Gemma 很棒；作为备用，我会使用 Anthropic，当然，为什么不呢？这里还有其他选择，比如你可以添加自己的本地端点。另外，因为我在做可观测性工作，我提供了设置 OpenTelemetry 收集器与 Jaeger 的选项，它运行得非常好，但我现在不会去测试它，以免给我的系统增加负担。另一个功能是 SSH 沙盒——我将部署 SSH 沙盒，OpenClaw 中的 SSH 沙盒非常酷。你只需给它 SSH 密钥和已知主机，无论你想访问哪里，它都会在那个工作区中运行所有命令。

> **金句 · Sally**
> **中文：** 密钥在配置里只留指针，日志里见不到明文——不完美，但我能睡着觉。
> **原文：** It's not perfect, but it gives me peace of mind that my API keys won't show up in logs.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 秘密引用 | secret reference | OpenClaw 配置里指向外部密钥，不写明文 |
| Podman Secrets | Podman Secrets | 把 API 密钥存成受控对象再挂进容器 |
| 代理目录挂载 | agent directory mount | 工具、技能、MCP 整包挂进去，一次启动全齐 |
| 可复现环境 | reproducible environment | 换机器、换架构，同一镜像同一行为 |
| SSH 沙盒 | SSH sandbox | 远程命令在隔离工作区执行，不污染主机 |

**本章小结**

- 容器四件套：可复现、隔离密钥、可移植、卷支撑备份恢复
- Podman Secrets + OpenClaw 秘密引用双层指针，防日志泄密
- 整个代理目录可挂载；SSH 沙盒让远程命令也有边界

---

## 03 一个人顶六个工程师，AI 让你去干疯事

**Host：** 智能体上了 Kubernetes，能规模化到什么程度？别光讲架构，有真案例吗？

**Sally：** 我认为我们正走向一个世界：这些代理、这些 AI 工作负载，无论具体是什么，都将无处不在。我希望我们都能看到这一点。我的愿景是，每个人的 OpenClaw 都能在各地运行并相互通信。特别是对于商业用例，处理的是真正的事务，而不是占星术或球队季后赛之类的话题——这就引出了一个需求：运行这类应用程序与运行其他任何程序一样，都需要安全性和大规模实现的能力。这就是 Kubernetes 能提供给你的。

我总是习惯先在本地开发，然后再提升到 Kubernetes。同样的道理也适用于 AI 工作负载或 OpenClaw。我昨天在 PyTorchCon，我的 Nvidia 朋友说我可以分享这个案例：他们正在用 OpenClaw 进行模型评估。他们大约有 **10 名工程师**，每个人都在 Kubernetes 中运行自己的 OpenClaw，并定期检查模型评估。这对他们来说非常有效。他说这让他一个人就能完成六个工程师的工作。关于这一点，我想说，我们不会都失业的，各位，这种情况不会发生。

**Host：** 那人干嘛去了？光剩焦虑吗？

**Sally：** 这为他的团队带来了什么呢？他们可以去做更有趣、更有意思、更有创意的事情。这就是 AI 带给我和我的团队的——我们可以专注于那些跳出框框的、疯狂的创意。你不再需要处理那些繁琐的代码了。我已经几个月没亲手写代码了，而这大概是不到六个月前才开始的转变。当时我在使用 AI，我意识到：它比我更擅长写代码。

是的，我向我的团队宣布了这一点。在一次组织会议上，我说：伙计们，如果你们不把 AI 用于所有事情，你们就错过了机会。它写代码比我强 **1000 倍**。红帽的一些顶尖工程师听到后肯定都挑了挑眉毛。我从他们之后的评论中能感觉到，他们当时在想：「这不可能。」我说：是的，确实如此，它让我们能够拥有更大的梦想。这也提醒了我，稍后要向你们展示我安装程序中的 Kubernetes 部分。此外，备份和恢复在这里也是一个非常清晰、完整的故事。

**Host：** 那你觉得未来工作场所里，OpenClaw 长什么样？

**Sally：** 当你在容器中运行时，状态管理也是基于相同的卷。Docker 和 Podman 的另一个优点是它们支持卷。因此，我所有的运行时状态都存在于一个干净、受控的 Podman 卷中。当然，Kubernetes 有 PVC，持久卷声明，这正是我刚才谈到的。

所以，这就是我对 OpenClaw 工作场所设置的愿景：你可能会有一个精心策划的基线版 OpenClaw。作为新员工，你只需获取这个基础环境。那里面有什么呢？它包含公司批准的 MCP 服务器列表、公司批准的身份验证方式，以及所有特定于你团队的技能设置。也许还可以访问你的 Google Drive，以及所有你每天工作都会用到的资源。你可以把这些配置好，分发给整个团队，然后个人还可以进行个性化设置。这就是这种设置所允许的。

另一种选择是，作为新员工，你坐在某人旁边，或者拿到某人的代码库，然后自己把所有东西拼凑起来——太累。团队标准、可移植环境、可复现的入职流程——这就是我对未来工作场所中 OpenClaw 的愿景。

**Host：** OpenClaw 本身迭代那么快，团队跟得上吗？

**Sally：** 我最近才创建了我的「永远爪」，大概花了一个月的时间。我一直在协助 OpenClaw 的开发，感觉自己甚至没有运行一个真正的 OpenClaw 实例——我只是整天不断地启动它、关闭它、测试它、构建它。每小时都有大约 **100 个新的提交**，所以我必须不断地从主分支拉取代码。昨天我在参加 PyTorch Conf，有几天没拉取了，结果当我再次拉取时，大概堆积了 **10,000 个提交**，这不是开玩笑。太疯狂了。我想，我不知道你们在做什么，能不能慢点？但说实话，我们并不想放慢速度。所以，是的，这就是目前的情况。

> **金句 · Sally**
> **中文：** 它写代码比我强一千倍——不是威胁，是让我们敢梦想更大的理由。
> **原文：** If you're not using AI for everything, you're missing out. It writes code a thousand times better than I do.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| 持久卷声明 | PVC | K8s 给 Pod 挂长期存储，智能体状态可备份 |
| 基线镜像 | baseline image | 审过的 MCP、认证、技能打包，新人即插即用 |
| 模型评估 | model evaluation | Nvidia 案例：每人一个 K8s OpenClaw 跑 eval |
| 可复现入职 | reproducible onboarding | 拉镜像即干活，不用坐旁边手抄配置 |

**本章小结**

- Nvidia 案例：10 人在 K8s 各跑 OpenClaw 做模型评估，单人产出约等于六人
- Sally 数月未手写代码，AI 写码强千倍是团队该全面拥抱的信号
- 未来职场靠基线镜像分发给全队，不是新人自己拼环境

---

## 04 一条命令起实例，本地 Kind 到 OpenShift 同一套

**Host：** 别光讲愿景——能现场跑起来吗？从本地到 K8s 要折腾多久？

**Sally：** 关于运行这个本地安装程序，目前我唯一不喜欢的是，当我在 Mac 上时，不能直接在容器中运行它。我想我可以实现，只是还没花时间弄清楚如何从一个容器中生成另一个容器。如果你在 Linux 上，你可以这样做，因为 Linux 很棒，但在 Mac 上就比较棘手。因为如果你不了解的话，在 Mac 上运行容器其实是在虚拟机中运行的，Docker 也是如此。容器原生只能在 Linux 上运行，所以当你在 Mac 上运行容器时，它总是跑在虚拟机里。Docker 会设置一个虚拟机，Mac 系统也会。因此，当你想要从一个容器中生成另一个容器时，情况会变得有点复杂。

如果我想运行一个本地实例，我现在有几个正在运行的，但你永远不知道「演示之神」会出什么状况。所以为了保险，我将启动一个名为 Joe 的实例。我所做的就是给我的 Pod 起个名字，然后配置所有这些选项。这非常主观，因为我告诉过你，这正是我所需要的。所以如果你喜欢，就直接用；如果你想改变它，那就提交一个 PR。酷。现在，端口通常是 **8089**，那是默认值，但由于这是我在机器上运行的第二个实例，我把它调到了 **9009**。

我想在这里向大家展示这些 Podman 秘密映射。你可以看到，我已经设置好了。它们就在我的系统上，用起来像环境变量，但它们不是普通的环境变量，因为它们是受控的。这些是我的 API 密钥。这个安装程序的作用是获取这些密钥。如果你使用 Docker，这也同样适用。

看，我刚刚启动了一个 Podman 容器。如果查看实例，我现在有了 Joe，它有日志和网关日志命令。我想给你们看一下命令，免得忘了。这是 Podman 命令，如果你运行的是 Docker，那就是 Docker 命令。我用 Docker 测试过吗？还没有，但我有一个在 Docker 工作的朋友，他很棒。他告诉我他会尝试一下，确保它在 Docker 下也能正常工作。他还创建了一个非常酷的项目叫 Infer rs，利用 Turboquant 能让 Gemma 运行得非常快。是的，那是 Eric。这就是我的 Podman 命令。

它启动了，就是 Joe。如果我只看模型，我会查看状态。有人说启动 OpenClaw 很难，但其实只用了**两秒钟**，这还是在我一直在说话的情况下；实际上可能只需要**一秒钟**。很酷的一点是，虽然我因为话太多没时间细展示，但代理都已经设置好了。我得去找拉里，我是从他开始演示的。通过那个表单，一个 MCP 服务器和一个子代理都配置好了。现在回到乔这里，我想展示一下切换模型有多容易。以防你不知道，我不确定 GPT-5 的情况，希望它知道自己只是 GPT 5.4——不，它不知道。我们还是得去找拉里，因为我没给乔设置那个额外的模型。

**Host：** Mac 上有没有坑？你刚才说容器党也有头疼的时候。

**Sally：** 有，刚才说了——Mac 上安装器不能直接在容器里跑，「容器里再起容器」那套我还没啃透。Linux 路径顺得多。这不是放弃容器，是承认：开发机在 Mac 上时，本地实例可以 Podman 直起，安装器本身还得在宿主机跑。生产抬到 K8s 不受影响。

**Host：** Kubernetes 那边呢？跟本地是两套剧本吗？

**Sally：** 不是。还有一点很酷，就是 Kubernetes。你可以用 Kubernetes 做同样的事情，操作一样简单。它现在连接到了我的 kind 集群。如果我切换过去，也可以非常容易地访问我的 Kubernetes 集群。卡尔在那儿，他正在 Kubernetes 中运行。我也可以在 OpenShift 中访问一个实例，如果你连接到 OpenShift，它就会自动切换。所以，是的，运行起来了。有人想运行 OpenClaw 容器吗？试试看。太棒了，非常感谢。

团队路径很清晰：本地 Podman 开发，kind 验证，OpenShift 生产；秘密引用、卷备份、基线镜像同一套逻辑往下走。个人玩具可以随便玩；进了公司，就该是审过的镜像、可审计的 MCP、可复现的入职——容器党十年练的手艺，正好用在智能体上。我没有足够的时间讲完所有内容，但核心就这些：容器不是可选项，是智能体上生产的门票。

> **金句 · Sally**
> **中文：** 本地一条命令两秒起来，同一套逻辑能抬到 Kind、能抬到 OpenShift。
> **原文：** People say OpenClaw is hard to start — it took two seconds. The same installer lifts to Kubernetes just as easily.

**本章概念**

| 中文 | 英文 | 白话 |
|------|------|------|
| Kind 集群 | kind cluster | 本地轻量 K8s，demo 里 Carl 跑在上面 |
| 安装器 | installer | 一条命令起 Podman 实例，可配端口、密钥、模型 |
| 模型切换 | model switching | 运行中换 OpenRouter / Anthropic 等提供商 |
| Docker-in-Docker | Docker-in-Docker | Mac 上从容器内再起容器的难点 |
| OpenShift 切换 | OpenShift context switch | 连上集群后安装器自动切实例上下文 |

**本章小结**

- Demo：Joe 实例端口 9009，Podman Secrets 映射 + OpenRouter/Gemma，约 1–2 秒启动
- Mac 坑：容器内再起容器（DinD）未搞定；Linux 路径更顺
- Kind 上 Carl、OpenShift 可切换——本地到 K8s 不是重写，是同一安装器抬升

---

## 总结：容器不是可选项，是智能体上生产的门票

| 维度 | 要点 |
|------|------|
| 安全叙事 | 「安全噩梦」对容器老兵是机会：沙盒 + 显式权限，不是回避 OpenClaw |
| 密钥 | Podman Secrets × OpenClaw 秘密引用双层指针，日志不见明文 |
| 规模化 | Nvidia 案例：K8s 各跑 OpenClaw 做模型评估，单人 ≈ 六人产出 |
| 人的角色 | 数月未手写代码；AI 写码强千倍 → 人去做更大、更疯的系统设计 |
| 团队 | 基线镜像：批准 MCP、认证、技能分发给全队，可复现入职 |
| 落地 | 安装器本地秒起 → kind → OpenShift；卷 + PVC 撑备份恢复 |

### 对个人的启示

会 Podman/K8s 的人，Agent 时代技能更值钱——不是别装 OpenClaw，是学会把密钥、MCP、状态关进笼子。本机裸奔一时爽，清理和泄密风险在后面。

### 对团队/产品的启示

个人 Forever Claw 可以玩；进公司就该上基线镜像 + 审计过的 MCP。OpenClaw 主分支迭代极快（每小时 ~100 commit），团队靠镜像版本钉住，别让人手抄环境。

### 仍待验证

- Sally 称 Nvidia「一人顶六人」为朋友转述，未在片中给独立数据源
- GPT 5.4 型号表述为现场口误/玩笑，以当时模型配置为准
- Docker 路径由朋友代测，Sally 自述尚未亲自全量验证

> **金句 · Sally（封底）**
> **中文：** 精心策划的基线 OpenClaw，比新人坐旁边手抄配置，像两个时代。
> **原文：** A curated baseline OpenClaw beats sitting next to someone and cobbling it together from scratch.

---

---

## 附录

### 章节时间戳

| 时间 | 主题 |
|------|------|
| 04:15 | 容器化是解决 AI 工具安全噩梦的最佳方案 |
| 07:40 | 利用 Podman Secrets 实现 API 密钥的物理隔离 |
| 09:50 | Kubernetes 为大规模 AI 模型评估提供算力支撑 |
| 10:30 | 开发者应拥抱 AI 编写代码以释放创造力 |
| 11:15 | 智能体将从个人玩具演变为标准化的团队资产 |

### 素材路径

- **ingest**：`Recastory/workspace/bilibili-retranscribe/BV18LV66aEG9/ingest`
- **ASR**：`Recastory/workspace/bilibili-retranscribe/BV18LV66aEG9/article.md`
- **专栏主源**：https://www.bilibili.com/read/cv49986123/
- **B 站**：https://www.bilibili.com/video/BV18LV66aEG9/
- **时长**：21:46

### 相关阅读

- [[30分钟精通OpenClaw]] — 个人助理安全设置与用例  
- [[OpenClaw创始人-我是如何使用OpenClaw的？]] — 创始人用法  
- [[Taven创始人-将OpenClaw嵌入产品的实战经验]] — Pi/OpenClaw 企业嵌入  
- [[PlanetScale-Agent时代的基础设施]] — Agent 时代基础设施观  
- [[IBM团队-Harness工程详解]] — harness 与可靠性  

---

### 收录说明

- **视频**：[BV18LV66aEG9](https://www.bilibili.com/video/BV18LV66aEG9/)（B 站 *Easonlee的AI笔记*）  
- **讲者**：Sally，Red Hat（容器/Linux/K8s 安全）  
- **时长**：~21:46  
- **转写**：Recastory `bilibili-retranscribe/BV18LV66aEG9/`（FunASR SenseVoice + cam++，**asr v2** 14 段）  
- **版本**：canonical Host-Guest v3.2（2026-07-03；原讲义已合并）

