(() => {
  const drawer = document.querySelector("#synoDrawer");
  const scrim = document.querySelector("#synoDrawerScrim");
  const title = document.querySelector("#synoDrawerTitle");
  const panes = [...document.querySelectorAll("[data-syno-pane]")];
  const tabs = [...document.querySelectorAll("[data-syno-tab]")];
  const labels = { knowledge: "知识", learn: "学习", create: "创作", jobs: "任务与审批", notifications: "通知", settings: "设置", chat: "问赛诺" };
  let active = "knowledge";
  let lastTrigger = null;
  let weixinLoginGeneration = 0;
  let weixinLoginTimer = null;
  let weixinLoginInFlight = 0;
  const setupState = { ai: false, channel: false, windows: false };
  const healthIssues = new Map();
  const uiModel = window.SynoUiModel;

  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "details > summary:first-of-type",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  async function api(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `请求失败（${response.status}）`);
    return payload;
  }

  function show(panel = active, trigger) {
    active = labels[panel] ? panel : "knowledge";
    lastTrigger = trigger || document.activeElement;
    drawer.hidden = false;
    drawer.inert = false;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    scrim.hidden = false;
    select(active);
    document.querySelector("#synoDrawerClose")?.focus();
  }

  function close() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    drawer.inert = true;
    drawer.hidden = true;
    scrim.hidden = true;
    lastTrigger?.focus?.();
  }

  function keepFocusInside(event) {
    if (event.key !== "Tab" || !drawer.classList.contains("is-open")) return;
    const focusable = [...drawer.querySelectorAll(focusableSelector)].filter((element) => !element.closest("[hidden]"));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function select(panel) {
    active = panel;
    title.textContent = labels[panel];
    for (const pane of panes) pane.hidden = pane.dataset.synoPane !== panel;
    for (const tab of tabs) {
      const selected = tab.dataset.synoTab === panel;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-current", selected ? "page" : "false");
    }
    if (panel === "jobs") loadJobs();
    if (panel === "notifications") loadNotifications();
    if (panel === "learn") loadDueReviews();
    if (panel === "settings") { loadProviderStatus(); loadPreferences(); loadWindowsService(); loadChannelStatus(); }
    if (panel === "create") loadOutputOpportunities();
    if (panel === "knowledge") {
      loadMemoryProposals();
      document.querySelector("#synoKnowledgeQuery")?.focus();
    }
  }

  async function loadMemoryProposals() {
    const target = document.querySelector("#synoMemoryProposals");
    if (!target) return;
    target.replaceChildren(node("p", "syno-empty", "正在读取候选…"));
    try {
      const { proposals } = await api("/api/memory/proposals");
      target.replaceChildren();
      const pending = proposals.filter((item) => item.status === "proposed");
      if (!pending.length) target.append(node("p", "syno-empty", "暂时没有待晋升候选。"));
      for (const proposal of pending) {
        const item = node("article", "syno-job");
        item.append(node("strong", "", proposal.statement), node("p", "", proposal.reason));
        const promote = node("button", "ghost-btn", "提交晋升");
        promote.type = "button";
        promote.addEventListener("click", async () => {
          promote.disabled = true;
          try {
            await api("/api/memory/promote", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: proposal.path }),
            });
            select("jobs");
          } catch (error) {
            promote.disabled = false;
            item.append(node("p", "syno-error", error.message));
          }
        });
        item.append(promote);
        target.append(item);
      }
    } catch (error) {
      target.replaceChildren(node("p", "syno-error", error.message));
    }
  }

  async function loadKnowledge() {
    const target = document.querySelector("#synoKnowledgeResults");
    const query = document.querySelector("#synoKnowledgeQuery").value.trim();
    target.replaceChildren(node("p", "syno-empty", "正在检索…"));
    try {
      const params = new URLSearchParams({ q: query, limit: "40" });
      const filters = {
        tags: document.querySelector("#synoKnowledgeTags")?.value.trim(), source: document.querySelector("#synoKnowledgeSource")?.value.trim(),
        stability: document.querySelector("#synoKnowledgeStability")?.value, from: document.querySelector("#synoKnowledgeFrom")?.value,
        to: document.querySelector("#synoKnowledgeTo")?.value,
      };
      for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
      const { results } = await api(`/api/syno/search?${params}`);
      target.replaceChildren();
      if (!results.length) target.append(node("p", "syno-empty", "没有匹配笔记。换一个概念试试。"));
      for (const result of results) {
        const button = node("button", "syno-result");
        button.type = "button";
        button.append(node("strong", "", result.title), node("span", "", result.excerpt || result.path));
        button.addEventListener("click", () => readNote(result.path));
        target.append(button);
      }
    } catch (error) {
      target.replaceChildren(node("p", "syno-error", error.message));
    }
  }

  async function buildFileIntakePayload(file, requestedKind) {
    if (!file) throw new Error("请选择文件");
    const kind = requestedKind || (file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "txt");
    const maximum = kind === "pdf" ? 10 * 1024 * 1024 : 1024 * 1024;
    if (file.size > maximum) throw new Error(kind === "pdf" ? "PDF 不能超过 10 MB" : "文本文件不能超过 1 MB");
    const bytes = new Uint8Array(await file.arrayBuffer()); let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return { kind, name: file.name, base64: btoa(binary) };
  }

  function sendIntake(payload) {
    return api("/api/syno/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  }

  async function submitIntake() {
    const kind = document.querySelector("#synoIntakeKind").value;
    const value = document.querySelector("#synoIntakeValue").value.trim();
    const fileInput = document.querySelector("#synoIntakeFile");
    const button = document.querySelector("#synoIntakeSubmit");
    button.disabled = true;
    button.textContent = "正在提交…";
    try {
      let payload = { kind, value };
      if (["pdf", "txt"].includes(kind)) payload = await buildFileIntakePayload(fileInput.files[0], kind);
      const result = await sendIntake(payload);
      document.querySelector("#synoIntakeHint").textContent = `已收到 ${result.artifact.id}。赛诺正在异步查重并形成收录方案。`;
      loadIntakeProposal(result.artifact.id);
    } catch (error) {
      document.querySelector("#synoIntakeHint").textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "提交收录候选";
    }
  }

  async function readNote(path) {
    const reader = document.querySelector("#synoReader");
    reader.replaceChildren(node("p", "syno-empty", "正在读取…"));
    try {
      const note = await api(`/api/syno/note?path=${encodeURIComponent(path)}`);
      const heading = node("h3", "", note.title);
      const source = node("small", "syno-note-path", note.path);
      const body = node("pre", "syno-markdown", note.markdown);
      const edit = node("button", "syno-source-edit", "编辑原文");
      edit.type = "button";
      edit.addEventListener("click", () => showNoteEditor(note));
      reader.replaceChildren(heading, source, edit, body);
    } catch (error) {
      reader.replaceChildren(node("p", "syno-error", error.message));
    }
  }

  function showNoteEditor(note) {
    const reader = document.querySelector("#synoReader");
    const heading = node("h3", "", `编辑：${note.title}`);
    const hint = node("p", "syno-edit-hint", "保存后会先生成 Markdown diff，并要求两次审批；这里不会直接覆盖原文。");
    const textarea = node("textarea", "syno-source-editor");
    textarea.value = note.markdown;
    textarea.rows = 24;
    const actions = node("div", "syno-job-actions");
    const save = node("button", "accent-btn", "提交修改候选");
    const cancel = node("button", "ghost-btn", "取消");
    save.type = cancel.type = "button";
    cancel.addEventListener("click", () => readNote(note.path));
    save.addEventListener("click", async () => {
      save.disabled = true;
      try {
        const result = await api("/api/notes/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: note.path, markdown: textarea.value }),
        });
        hint.textContent = `任务 ${result.job.id} 已进入审批中心。`;
        select("jobs");
      } catch (error) {
        hint.textContent = error.message;
      } finally { save.disabled = false; }
    });
    actions.append(save, cancel);
    reader.replaceChildren(heading, hint, textarea, actions);
    textarea.focus();
  }

  function statusLabel(job) {
    const values = {
      pending: "待执行", awaiting_approval: "等待审批", running: "执行中",
      validating: "校验中", waiting_provider: "等待 Provider", completed: "已完成", failed: "失败", rejected: "已拒绝", canceled: "已取消",
    };
    return values[job.status] || job.status;
  }

  async function loadJobs() {
    const target = document.querySelector("#synoJobs");
    target.replaceChildren(node("p", "syno-empty", "正在读取任务…"));
    try {
      const { jobs } = await api("/api/syno/jobs");
      target.replaceChildren();
      if (!jobs.length) target.append(node("p", "syno-empty", "还没有任务。可以从“问赛诺”开始。"));
      for (const job of jobs) {
        const item = node("article", `syno-job is-${job.status}`);
        const meta = node("div", "syno-job-meta");
        meta.append(node("strong", "", job.intent), node("span", "syno-status", statusLabel(job)));
        const request = node("p", "", job.request?.summary || "结构化任务");
        item.append(meta, request);
        if (job.error?.message) item.append(node("p", "syno-error", job.error.message));
        if (job.result?.preview) {
          const details = node("details", "syno-diff");
          details.append(node("summary", "", "查看待合并 Markdown diff"), node("pre", "syno-markdown", job.result.preview));
          item.append(details);
        }
        if (job.status === "awaiting_approval") {
          const actions = node("div", "syno-job-actions");
          const approve = node("button", "accent-btn", job.phase === "merge" ? "批准合并" : "批准");
          const reject = node("button", "ghost-btn", "拒绝");
          approve.type = reject.type = "button";
          approve.addEventListener("click", () => decide(job.id, "approve"));
          reject.addEventListener("click", () => decide(job.id, "reject"));
          actions.append(approve, reject);
          item.append(actions);
        }
        target.append(item);
      }
    } catch (error) {
      target.replaceChildren(node("p", "syno-error", error.message));
    }
  }

  async function decide(id, action) {
    try {
      await api(`/api/syno/jobs/${encodeURIComponent(id)}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reject" ? { reason: "用户在 Web UI 拒绝" } : {}),
      });
    } catch (error) {
      alert(error.message);
    }
    await loadJobs();
  }

  async function loadNotifications() {
    const target = document.querySelector("#synoNotifications");
    target.replaceChildren(node("p", "syno-empty", "正在读取通知…"));
    try {
      const { notifications } = await api("/api/syno/notifications");
      target.replaceChildren();
      if (!notifications.length) target.append(node("p", "syno-empty", "暂时没有通知。"));
      for (const notice of notifications) {
        const item = node("article", "syno-notice");
        item.append(node("strong", "", notice.title), node("p", "", notice.body), node("small", "", new Date(notice.created).toLocaleString("zh-CN")));
        target.append(item);
      }
    } catch (error) {
      target.replaceChildren(node("p", "syno-error", error.message));
    }
  }

  async function beginWeixinLogin() {
    const status = document.querySelector("#synoWeixinStatus");
    status.textContent = "正在获取二维码…";
    const generation = ++weixinLoginGeneration;
    clearTimeout(weixinLoginTimer);
    try {
      const result = await api("/api/syno/weixin/login/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (generation !== weixinLoginGeneration) return;
      const image = document.querySelector("#synoWeixinQr");
      image.src = result.imageUrl;
      image.hidden = false;
      status.textContent = "请用 Android 微信扫码并在手机确认；赛诺正在自动等待连接。";
      scheduleWeixinLoginPoll(generation, 0);
    } catch (error) { status.textContent = error.message; }
  }

  async function submitQuickCapture() {
    const valueInput = document.querySelector("#synoQuickCaptureValue");
    const fileInput = document.querySelector("#synoQuickCaptureFile");
    const button = document.querySelector("#synoQuickCaptureSubmit");
    const hint = document.querySelector("#synoQuickCaptureHint");
    button.disabled = true; button.textContent = "正在接收…";
    try {
      const file = fileInput.files[0];
      let payload;
      if (file) payload = await buildFileIntakePayload(file);
      else {
        const value = valueInput.value.trim();
        if (!value) throw new Error("请粘贴内容或选择文件");
        payload = { kind: /^https?:\/\//i.test(value) ? "url" : "text", value };
      }
      await sendIntake(payload);
      hint.textContent = "已接收内容，正在后台安全提取、查重并生成收录方案。";
      valueInput.value = ""; fileInput.value = ""; await loadToday();
    } catch (error) { hint.textContent = error.message; }
    finally { button.disabled = false; button.textContent = "收录"; }
  }

  function scheduleWeixinLoginPoll(generation, delayMs = 750) {
    if (generation !== weixinLoginGeneration) return;
    clearTimeout(weixinLoginTimer);
    weixinLoginTimer = setTimeout(() => pollWeixinLogin(generation), delayMs);
  }

  async function pollWeixinLogin(generation) {
    if (generation !== weixinLoginGeneration) return;
    if (weixinLoginInFlight) { scheduleWeixinLoginPoll(generation, 250); return; }
    weixinLoginInFlight = generation;
    const status = document.querySelector("#synoWeixinStatus");
    try {
      const result = await api("/api/syno/weixin/login/poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (generation !== weixinLoginGeneration) return;
      if (result.status === "confirmed") {
        weixinLoginGeneration += 1;
        clearTimeout(weixinLoginTimer);
        const connection = await api("/api/syno/weixin/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        status.textContent = connection.running
          ? "已连接。请在 ClawBot 私聊发送一条文字完成收发验证。"
          : (connection.lastError || "凭据已保存，后台 Worker 将接管连接。");
        document.querySelector("#synoWeixinQr").hidden = true;
        await loadChannelStatus();
      } else if (["expired", "verify_code_blocked"].includes(result.status)) {
        status.textContent = "二维码已失效，请重新获取。";
      } else {
        status.textContent = result.status === "scaned"
          ? "已扫码，等待手机确认…"
          : "等待扫码确认中…";
        scheduleWeixinLoginPoll(generation);
      }
    } catch {
      if (generation === weixinLoginGeneration) {
        status.textContent = "扫码状态连接暂时中断，正在自动重试…";
        scheduleWeixinLoginPoll(generation, 1_500);
      }
    } finally {
      if (weixinLoginInFlight === generation) weixinLoginInFlight = 0;
    }
  }

  async function setWeixinHome() {
    const status = document.querySelector("#synoWeixinStatus");
    try {
      await api("/api/syno/channels/home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "weixin" }),
      });
      status.textContent = "微信已设为主要通知渠道；Web 通知中心与 Windows 通知仍会保留。";
      await loadChannelStatus();
    } catch (error) { status.textContent = error.message; }
  }

  function addMessage(text, role) {
    const conversation = document.querySelector("#synoConversation");
    conversation.append(node("p", `syno-message is-${role}`, text));
    conversation.scrollTop = conversation.scrollHeight;
  }

  async function submitChat(event) {
    event.preventDefault();
    const input = document.querySelector("#synoChatInput");
    const intent = document.querySelector("#synoChatIntent").value;
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, "user");
    input.value = "";
    try {
      const result = await api("/api/syno/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, ...(intent ? { mode: intent } : {}) }),
      });
      const message = result.error?.message
        || (result.requiresApproval
          ? `任务 ${result.job.id} 已进入审批中心。批准后才会写入。`
          : result.job?.result?.text || `任务 ${result.job?.id || ""} 已完成。`);
      addMessage(message, result.error ? "error" : "syno");
    } catch (error) {
      addMessage(error.message, "error");
    }
  }

  async function loadChannelStatus() {
    try {
      const { channels } = await api("/api/syno/channels");
      const enabled = Object.values(channels).filter((channel) => channel.running).map((channel) => channel.id);
      document.querySelector("#synoChannelStatus").textContent = `本地服务已连接 · ${enabled.join(" · ") || "Web"}`;
      const weixin = Object.values(channels).find((channel) => channel.id === "weixin");
      const feishu = Object.values(channels).find((channel) => channel.id === "feishu");
      setSettingStatus("#synoSettingWeixin", weixin?.running ? "已连接" : "未连接", weixin?.running);
      setSettingStatus("#synoSettingFeishu", feishu?.running ? "已连接" : "未连接", feishu?.running);
      const weixinDetail = document.querySelector("#synoWeixinStatus");
      if (weixinDetail) weixinDetail.textContent = weixin?.running
        ? "已连接本人微信；支持快速收录、查询、复习与提醒。"
        : weixin?.ownerBound ? "已绑定本人微信，连接暂时中断。" : "未连接。只允许扫码者本人，不启用群聊。";
      const feishuDetail = document.querySelector("#synoFeishuStatus");
      if (feishuDetail && feishu?.running) feishuDetail.textContent = "已连接本人飞书；用于日程与结构化通知。";
      setupState.channel = Boolean(weixin?.running || feishu?.running);
      setHealthIssue("channels", [weixin, feishu].some((channel) => channel?.ownerBound && !channel.running) ? "已绑定渠道连接中断" : "");
      refreshOnboarding();
    } catch (error) {
      document.querySelector("#synoChannelStatus").textContent = error.message;
      setHealthIssue("channels", "无法读取微信和飞书状态");
    }
  }

  function setSettingStatus(selector, text, healthy) {
    const status = document.querySelector(`${selector} em`);
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("is-ready", Boolean(healthy));
  }

  function setHealthIssue(key, message) {
    if (message) healthIssues.set(key, message); else healthIssues.delete(key);
    const details = document.querySelector("#synoHealthSummary");
    if (!details) return;
    const summary = details.querySelector("summary");
    if (!healthIssues.size) {
      details.open = false; details.classList.remove("is-degraded"); summary.textContent = "Syno 正常运行";
      details.querySelector("p").textContent = "AI、微信、飞书和后台任务的异常会在这里直接提示。";
    } else {
      details.open = true; details.classList.add("is-degraded"); summary.textContent = "Syno 需要你检查";
      details.querySelector("p").textContent = [...healthIssues.values()].join("；");
    }
  }

  function refreshOnboarding() {
    const onboarding = document.querySelector("#synoOnboarding");
    if (onboarding) onboarding.hidden = setupState.ai && setupState.channel && setupState.windows;
  }

  async function loadWindowsService() {
    try {
      const status = await api("/api/syno/windows-service");
      const label = !status.supported ? "此系统不支持" : status.installed ? (status.running ? "已开启" : "已安装，未运行") : "未开启";
      setSettingStatus("#synoSettingAutostart", label, status.installed && status.running);
      document.querySelector("#synoWindowsServiceHint").textContent = status.installed ? "Windows 登录后会在后台启动完整 Syno，不会自动打开浏览器。" : "开启后，Windows 登录时会在后台启动 Syno。";
      setupState.windows = Boolean(status.installed);
      setHealthIssue("windows", status.installed && !status.running ? "Windows 后台任务未运行" : "");
      refreshOnboarding();
    } catch (error) {
      setSettingStatus("#synoSettingAutostart", "检测失败", false);
      setHealthIssue("windows", "无法读取 Windows 后台服务状态");
    }
  }

  let windowsServiceMutation = false;
  async function changeWindowsService(action) {
    if (windowsServiceMutation) return;
    const verb = action === "install" ? "开启" : "关闭";
    if (!window.confirm(`${verb}开机自动运行？此操作只修改当前用户的 Syno 计划任务，不会删除数据。`)) return;
    windowsServiceMutation = true;
    const buttons = [document.querySelector("#synoWindowsInstall"), document.querySelector("#synoWindowsUninstall")].filter(Boolean);
    const region = document.querySelector("#synoAutostartSettings");
    for (const button of buttons) button.disabled = true;
    region?.setAttribute("aria-busy", "true");
    const hint = document.querySelector("#synoWindowsServiceHint"); hint.textContent = `正在${verb}…`;
    try {
      await api(`/api/syno/windows-service/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      await loadWindowsService();
    } catch (error) { hint.textContent = error.message; }
    finally {
      windowsServiceMutation = false;
      for (const button of buttons) button.disabled = false;
      region?.removeAttribute("aria-busy");
    }
  }

  async function loadIntakeProposal(id, attempt = 0) {
    const target = document.querySelector("#synoIntakeProposal");
    try {
      const state = await api(`/api/syno/intake/${encodeURIComponent(id)}`);
      if (["received"].includes(state.status) && attempt < 20) {
        target.replaceChildren(node("p", "syno-empty", "正在提取、查重并形成方案…"));
        setTimeout(() => loadIntakeProposal(id, attempt + 1), 500);
        return;
      }
      if (state.status === "failed") {
        target.replaceChildren(node("p", "syno-error", state.error?.message || "收录方案生成失败"));
        return;
      }
      const proposal = state.proposal;
      if (!proposal) return;
      const card = node("article", "syno-job");
      card.append(node("strong", "", state.candidate?.title || id), node("p", "", proposal.risk === "additive" ? `建议新建：${proposal.suggestedPath}` : `发现重复候选：${proposal.existingNoteRef}`));
      const actions = node("div", "syno-job-actions");
      const choices = proposal.risk === "additive"
        ? [["create", "批准新建"]]
        : [["append-source", "追加为来源"], ["link-only", "只建立关联"], ["keep-separate", "保留独立笔记"]];
      choices.push(["reject", "拒绝"]);
      for (const [action, label] of choices) {
        const button = node("button", action === "create" ? "accent-btn" : "ghost-btn", label);
        button.type = "button";
        button.addEventListener("click", async () => {
          for (const item of actions.querySelectorAll("button")) item.disabled = true;
          try {
            const result = await api(`/api/syno/intake/${encodeURIComponent(id)}/apply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: { action } }) });
            document.querySelector("#synoIntakeHint").textContent = `任务 ${result.job.id} 已进入审批中心。`;
            select("jobs");
          } catch (error) {
            card.append(node("p", "syno-error", error.message));
            for (const item of actions.querySelectorAll("button")) item.disabled = false;
          }
        });
        actions.append(button);
      }
      card.append(actions); target.replaceChildren(card);
    } catch (error) { target.replaceChildren(node("p", "syno-error", error.message)); }
  }

  function priorityKind(kind) {
    return { goal: "目标", commitment: "承诺", review: "复习" }[kind] || "事项";
  }

  async function loadToday() {
    const primary = document.querySelector("#synoTodayPrimary");
    if (!primary) return;
    try {
      const snapshot = await api("/api/syno/today");
      const item = snapshot.primary;
      const action = node("button", "accent-btn", item ? (item.kind === "review" ? "开始复习" : item.kind === "commitment" ? "去处理" : "开始") : "去收录一条内容");
      action.id = "synoTodayPrimaryAction"; action.type = "button";
      action.addEventListener("click", () => show(uiModel.todayTarget(item), action));
      primary.replaceChildren(
        node("span", "", item ? priorityKind(item.kind) : "今日清场"),
        node("strong", "", item?.title || "从一条真正想理解的内容开始"),
        node("p", "", item?.dueAt ? `到期：${new Date(item.dueAt).toLocaleString("zh-CN")}` : item ? "根据你的目标、承诺和知识缺口排在第一位。" : "收录后，赛诺会异步查重并给出整理建议。"),
        action,
      );
      const needs = document.querySelector("#synoTodayNeedsYou"); needs.replaceChildren();
      const needLabels = { approval: "待确认", review: "到期复习", output: "需要你的输出" };
      for (const entry of snapshot.needsYou || []) needs.append(node("button", "today-row", `${needLabels[entry.kind] || "待处理"} · ${entry.title}`));
      if (!needs.children.length) needs.append(node("p", "syno-empty", "没有需要你确认的事项。"));
      needs.querySelectorAll("button").forEach((button, index) => button.addEventListener("click", () => show(uiModel.todayTarget(snapshot.needsYou[index]), button)));
      const recent = document.querySelector("#synoTodayRecent"); recent.replaceChildren();
      for (const entry of snapshot.recentIntake || []) recent.append(node("p", "today-row", `${entry.title} · ${entry.status === "proposed" ? "待确认收录方案" : entry.status}`));
      if (!recent.children.length) recent.append(node("p", "syno-empty", "今天还没有新收录。"));
      const progress = snapshot.progress || { completed: 0, waiting: 0, failed: 0 };
      document.querySelector("#synoTodayProgress").replaceChildren(
        node("span", "is-complete", `已完成 ${progress.completed}`),
        node("span", "is-waiting", `等待中 ${progress.waiting}`),
        node("span", progress.failed ? "is-failed" : "", `异常 ${progress.failed}`),
      );
      setHealthIssue("tasks", progress.failed ? `今天有 ${progress.failed} 个任务异常` : "");
      document.querySelector("#weekScheduledCount").textContent = snapshot.counts.commitments;
      document.querySelector("#inboxCandidateCount").textContent = snapshot.counts.reviews;
    } catch (error) {
      primary.replaceChildren(node("span", "", "需要检查"), node("strong", "", "Today 暂时不可用"), node("p", "syno-error", error.message));
    }
  }

  async function loadDueReviews() {
    const target = document.querySelector("#synoDueReviews");
    if (!target) return;
    target.replaceChildren(node("p", "syno-empty", "正在读取到期复习…"));
    try {
      const { reviews } = await api("/api/syno/learning/due");
      document.querySelector("#synoLearnCount").textContent = `今天复习 ${reviews.length} 项`;
      target.replaceChildren();
      if (!reviews.length) target.append(node("p", "syno-empty", "当前没有到期复习。可以主动选择一个主题做 Teach-back。"));
      for (const review of reviews) {
        const item = node("article", "syno-job");
        item.append(node("strong", "", review.knowledgeRef), node("p", "", `掌握度 ${Math.round(review.mastery * 100)}% · 当前阶段 ${review.stage}`));
        const start = node("button", "ghost-btn", "开始复习");
        start.type = "button";
        start.addEventListener("click", () => { document.querySelector("#synoLearningRef").value = review.knowledgeRef; document.querySelector("#synoLearningArtifact").focus(); });
        item.append(start); target.append(item);
      }
    } catch (error) { target.replaceChildren(node("p", "syno-error", error.message)); }
  }

  async function submitLearning(event) {
    event.preventDefault();
    const hint = document.querySelector("#synoLearningHint");
    hint.textContent = "正在记录…";
    try {
      const result = await api("/api/syno/learning/evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        knowledgeRef: document.querySelector("#synoLearningRef").value.trim(),
        inputMode: document.querySelector("#synoLearningMode").value,
        assistedLevel: document.querySelector("#synoLearningAssist").value,
        rubric: {
          accurate: document.querySelector("#synoRubricAccurate").checked ? 1 : 0,
          explained: document.querySelector("#synoRubricExplained").checked ? 1 : 0,
          applied: document.querySelector("#synoRubricApplied").checked ? 1 : 0,
          discriminated: document.querySelector("#synoRubricDiscriminated").checked ? 1 : 0,
        },
        selfAssessment: document.querySelector("#synoLearningSelf").value,
        isReview: document.querySelector("#synoLearningReview").checked,
        rawOutput: document.querySelector("#synoLearningArtifact").value.trim(),
        misconceptions: document.querySelector("#synoLearningMisconceptions").value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      }) });
      hint.textContent = result.requiresApproval ? `任务 ${result.job.id} 等待审批。` : "学习证据已记录，复习时间已更新。";
      await loadDueReviews();
    } catch (error) { hint.textContent = error.message; }
  }

  async function submitTeachBack(event) {
    event.preventDefault();
    const target = document.querySelector("#synoTeachBackPrompt");
    target.replaceChildren(node("p", "syno-empty", "正在准备问题…"));
    try {
      const prompt = await api("/api/syno/learning/teach-back", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: document.querySelector("#synoTeachBackTitle").value.trim() }) });
      const card = node("article", "syno-job"); card.append(node("strong", "", prompt.title));
      const list = node("ol", ""); prompt.questions.forEach((question) => list.append(node("li", "", question)));
      card.append(list, node("small", "", prompt.evidenceRule)); target.replaceChildren(card);
      document.querySelector("#synoOutputTitle").value = document.querySelector("#synoTeachBackTitle").value.trim();
    } catch (error) { target.replaceChildren(node("p", "syno-error", error.message)); }
  }

  async function submitOutput(event) {
    event.preventDefault(); const hint = document.querySelector("#synoOutputHint"); hint.textContent = "正在建立机会…";
    try {
      const result = await api("/api/syno/outputs/opportunities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: document.querySelector("#synoOutputTitle").value.trim(), reason: document.querySelector("#synoOutputReason").value.trim(), format: document.querySelector("#synoOutputFormat").value, priority: 70 }) });
      hint.textContent = result.requiresApproval ? `任务 ${result.job.id} 等待审批。` : "输出机会已建立。";
    } catch (error) { hint.textContent = error.message; }
  }

  async function loadOutputOpportunities() {
    const target = document.querySelector("#synoOutputOpportunities");
    if (!target) return;
    target.replaceChildren(node("p", "syno-empty", "正在读取创作机会…"));
    try {
      const { opportunities } = await api("/api/syno/outputs/opportunities");
      target.replaceChildren();
      if (!opportunities.length) target.append(node("p", "syno-empty", "还没有创作机会。先从一个想讲清的主题开始。"));
      const more = node("details", "setting-detail");
      more.append(node("summary", "", `更多创作机会（${Math.max(0, opportunities.length - 1)}）`));
      const moreList = node("div", "syno-list"); more.append(moreList);
      for (const [index, opportunity] of opportunities.entries()) {
        const card = node("article", index === 0 ? "syno-job is-featured" : "syno-job");
        card.append(node("strong", "", opportunity.title), node("p", "", `${opportunity.status} · ${opportunity.reason}`));
        if (opportunity.outline?.length) { const list = node("ol"); opportunity.outline.forEach((item) => list.append(node("li", "", item))); card.append(list); }
        const outputField = node("textarea", "syno-source-editor"); outputField.rows = 6; outputField.placeholder = "粘贴你的原始草稿或实践复盘（至少 20 字）"; outputField.setAttribute("aria-label", `${opportunity.title} 的原始输出`);
        const feedbackField = node("textarea", "syno-source-editor"); feedbackField.rows = 3; feedbackField.placeholder = "记录发布反馈、仍不清楚的地方或下一次要补的例子"; feedbackField.setAttribute("aria-label", `${opportunity.title} 的输出反馈`);
        if (["accepted", "drafting"].includes(opportunity.status)) card.append(outputField);
        if (["drafting", "practiced"].includes(opportunity.status)) card.append(feedbackField);
        const actions = node("div", "syno-job-actions");
        const add = (action, label, needsOutput = false) => {
          const button = node("button", action === "accept" ? "accent-btn" : "ghost-btn", label); button.type = "button";
          button.addEventListener("click", async () => {
            const userOutput = needsOutput ? outputField.value.trim() : "";
            const feedback = action === "publish" ? feedbackField.value.trim() : "";
            if (needsOutput && userOutput.length < 20) { outputField.focus(); card.append(node("p", "syno-error", "请先提交至少 20 个字符的主人原始输出。")); return; }
            try {
              const result = await api(`/api/syno/outputs/opportunities/${encodeURIComponent(opportunity.id)}/progress`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, userOutput, feedback }) });
              document.querySelector("#synoOutputHint").textContent = `任务 ${result.job.id} 已进入审批中心。`;
              select("jobs");
            } catch (error) { card.append(node("p", "syno-error", error.message)); }
          }); actions.append(button);
        };
        for (const descriptor of uiModel.outputActions(opportunity)) add(descriptor.action, descriptor.label, descriptor.needsOutput === true);
        card.append(actions); (index === 0 ? target : moreList).append(card);
      }
      if (moreList.children.length) target.append(more);
    } catch (error) { target.replaceChildren(node("p", "syno-error", error.message)); }
  }

  async function loadPreferences() {
    try {
      const state = await api("/api/syno/settings"); const values = state.values || {};
      document.querySelector("#synoCadence").value = values["notifications.cadence"] || "balanced";
      document.querySelector("#synoReviewCount").value = values["learning.dailyReviewCount"] || 5;
      document.querySelector("#synoQuietStart").value = values["notifications.quietHours"]?.start || "22:30";
      document.querySelector("#synoQuietEnd").value = values["notifications.quietHours"]?.end || "07:30";
      document.querySelector("#synoReducedDensity").checked = values["ui.preferences"]?.reducedDensity === true;
      document.body.classList.toggle("syno-reduced-density", values["ui.preferences"]?.reducedDensity === true);
      const primary = document.querySelector(".syno-primary-links");
      for (const key of values["ui.displayOrder"] || []) {
        const button = primary?.querySelector(`[data-scroll-target="${key}"], [data-syno-panel="${key}"]`);
        if (button) primary.append(button);
      }
    } catch (error) { document.querySelector("#synoPreferenceHint").textContent = error.message; }
  }

  async function savePreferences(event) {
    event.preventDefault(); const hint = document.querySelector("#synoPreferenceHint");
    const changes = [
      ["notifications.cadence", document.querySelector("#synoCadence").value],
      ["learning.dailyReviewCount", Number(document.querySelector("#synoReviewCount").value)],
      ["notifications.quietHours", { start: document.querySelector("#synoQuietStart").value, end: document.querySelector("#synoQuietEnd").value }],
      ["ui.preferences", { reducedDensity: document.querySelector("#synoReducedDensity").checked }],
    ];
    try {
      for (const [key, value] of changes) await api("/api/syno/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) });
      hint.textContent = "主动偏好已保存并生效。"; await loadPreferences();
    } catch (error) { hint.textContent = error.message; }
  }

  async function loadProviderStatus() {
    const hint = document.querySelector("#synoProviderHint");
    try {
      const status = await api("/api/syno/provider");
      document.querySelector("#synoProviderBaseUrl").value = status.baseUrl;
      document.querySelector("#synoProviderModel").value = status.modelId || "";
      document.querySelector("#synoProviderContext").value = status.contextLength;
      hint.textContent = status.configured ? `已配置 ${status.modelId}；Token 已加密保存。` : "尚未配置；本地搜索、任务与提醒仍可使用。";
      setSettingStatus("#synoSettingAi", status.configured ? "已连接" : "未连接", status.configured);
      setupState.ai = Boolean(status.configured); setHealthIssue("provider", status.configured ? "" : "AI 服务尚未连接"); refreshOnboarding();
    } catch (error) { hint.textContent = error.message; setSettingStatus("#synoSettingAi", "检测失败", false); setHealthIssue("provider", "无法读取 AI 服务状态"); }
  }

  async function saveProvider(event) {
    event.preventDefault(); const hint = document.querySelector("#synoProviderHint"); hint.textContent = "正在使用 DPAPI 保存…";
    try {
      const status = await api("/api/syno/provider", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseUrl: document.querySelector("#synoProviderBaseUrl").value.trim(), token: document.querySelector("#synoProviderToken").value, modelId: document.querySelector("#synoProviderModel").value.trim(), contextLength: Number(document.querySelector("#synoProviderContext").value) }) });
      document.querySelector("#synoProviderToken").value = ""; hint.textContent = `已安全保存 ${status.modelId}。`;
      await loadProviderStatus();
    } catch (error) { hint.textContent = error.message; }
  }

  let feishuRegistrationGeneration = 0;
  let feishuRegistrationTimer = null;

  function stopFeishuRegistrationPoll() {
    feishuRegistrationGeneration += 1;
    if (feishuRegistrationTimer) clearTimeout(feishuRegistrationTimer);
    feishuRegistrationTimer = null;
  }

  function scheduleFeishuRegistrationPoll(generation, delay = 1_500) {
    if (generation !== feishuRegistrationGeneration) return;
    if (feishuRegistrationTimer) clearTimeout(feishuRegistrationTimer);
    feishuRegistrationTimer = setTimeout(() => pollFeishuRegistration(generation), delay);
  }

  async function pollFeishuRegistration(generation) {
    if (generation !== feishuRegistrationGeneration) return;
    const status = document.querySelector("#synoFeishuStatus");
    try {
      const result = await api("/api/syno/feishu/register/status");
      if (generation !== feishuRegistrationGeneration) return;
      if (result.status === "confirmed") {
        stopFeishuRegistrationPoll();
        document.querySelector("#synoFeishuQr").replaceChildren();
        status.textContent = "注册完成，正在建立飞书长连接…";
        await feishuAction("connect");
        return;
      }
      if (["failed", "expired", "canceled"].includes(result.status)) {
        stopFeishuRegistrationPoll();
        status.textContent = `注册未完成：${result.error || result.status}`;
        return;
      }
      status.textContent = result.status === "waiting_scan" ? "请扫描二维码并在飞书中确认。" : "飞书已扫码，正在等待授权确认…";
      scheduleFeishuRegistrationPoll(generation);
    } catch {
      status.textContent = "注册状态连接暂时中断，正在自动重试…";
      scheduleFeishuRegistrationPoll(generation, 2_500);
    }
  }

  async function feishuAction(action) {
    const status = document.querySelector("#synoFeishuStatus"); status.textContent = "正在处理…";
    try {
      const result = await api(`/api/syno/feishu/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      status.textContent = result.status === "waiting_scan" ? "请扫描二维码并在飞书中确认。" : `当前状态：${result.status || (result.running ? "已连接" : "未连接")}`;
      const qr = document.querySelector("#synoFeishuQr");
      if (result.url) {
        const children = [];
        if (result.qrDataUrl) {
          const image = node("img", "syno-weixin-qr");
          image.src = result.qrDataUrl;
          image.alt = "飞书扫码注册二维码";
          image.width = 320;
          image.height = 320;
          children.push(image);
        }
        const link = node("a", "accent-btn", "打开飞书扫码注册");
        link.href = result.url; link.target = "_blank"; link.rel = "noreferrer";
        children.push(link);
        qr.replaceChildren(...children);
      }
      if (action === "register/start" && result.status === "waiting_scan") {
        stopFeishuRegistrationPoll();
        const generation = feishuRegistrationGeneration;
        scheduleFeishuRegistrationPoll(generation, 0);
      }
    } catch (error) { status.textContent = error.message; }
  }

  window.Syno = Object.freeze({ show, close, select });

  const workspaceSettings = document.querySelector("#synoWorkspaceSettings");
  const workspaceSettingsMount = document.querySelector("#synoWorkspaceSettingsMount");
  if (workspaceSettings && workspaceSettingsMount) {
    workspaceSettingsMount.append(workspaceSettings);
    workspaceSettings.hidden = false;
  }

  for (const trigger of document.querySelectorAll("[data-syno-panel]")) trigger.addEventListener("click", () => show(trigger.dataset.synoPanel, trigger));
  for (const tab of tabs) tab.addEventListener("click", () => select(tab.dataset.synoTab));
  document.querySelector("#synoDrawerClose")?.addEventListener("click", close);
  scrim?.addEventListener("click", close);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) close();
    else keepFocusInside(event);
  });
  document.querySelector("#synoKnowledgeSearch")?.addEventListener("click", loadKnowledge);
  document.querySelector("#synoKnowledgeQuery")?.addEventListener("keydown", (event) => { if (event.key === "Enter") loadKnowledge(); });
  document.querySelector("#synoKnowledgeFiltersReset")?.addEventListener("click", () => {
    for (const id of ["synoKnowledgeTags", "synoKnowledgeSource", "synoKnowledgeStability", "synoKnowledgeFrom", "synoKnowledgeTo"]) document.querySelector(`#${id}`).value = "";
    loadKnowledge();
  });
  document.querySelector("#synoJobsRefresh")?.addEventListener("click", loadJobs);
  document.querySelector("#synoIntakeKind")?.addEventListener("change", (event) => {
    const fileMode = ["pdf", "txt"].includes(event.target.value);
    document.querySelector("#synoIntakeFile").hidden = !fileMode;
    document.querySelector("#synoIntakeValue").hidden = fileMode;
  });
  document.querySelector("#synoIntakeSubmit")?.addEventListener("click", submitIntake);
  document.querySelector("#synoQuickCaptureSubmit")?.addEventListener("click", submitQuickCapture);
  document.querySelector("#synoQuickCaptureFileButton")?.addEventListener("click", () => document.querySelector("#synoQuickCaptureFile").click());
  document.querySelector("#synoQuickCaptureFile")?.addEventListener("change", (event) => {
    document.querySelector("#synoQuickCaptureFileButton").textContent = event.target.files[0]?.name || "选择文件";
  });
  document.querySelector("#synoLearnStart")?.addEventListener("click", () => {
    const queue = document.querySelector("#synoReviewQueue"); queue.open = true;
    const first = document.querySelector("#synoDueReviews button");
    if (first) first.focus(); else { document.querySelector("#synoLearningDetails").open = true; document.querySelector("#synoLearningRef").focus(); }
  });
  document.querySelector("#synoChatForm")?.addEventListener("submit", submitChat);
  document.querySelector("#synoWeixinLogin")?.addEventListener("click", beginWeixinLogin);
  document.querySelector("#synoWeixinHome")?.addEventListener("click", setWeixinHome);
  document.querySelector("#synoLearningForm")?.addEventListener("submit", submitLearning);
  document.querySelector("#synoTeachBackForm")?.addEventListener("submit", submitTeachBack);
  document.querySelector("#synoOutputForm")?.addEventListener("submit", submitOutput);
  document.querySelector("#synoProviderForm")?.addEventListener("submit", saveProvider);
  document.querySelector("#synoPreferenceForm")?.addEventListener("submit", savePreferences);
  document.querySelector("#synoFeishuRegister")?.addEventListener("click", () => feishuAction("register/start"));
  document.querySelector("#synoFeishuConnect")?.addEventListener("click", () => feishuAction("connect"));
  document.querySelector("#synoFeishuDisconnect")?.addEventListener("click", () => feishuAction("disconnect"));
  document.querySelector("#synoWindowsInstall")?.addEventListener("click", () => changeWindowsService("install"));
  document.querySelector("#synoWindowsUninstall")?.addEventListener("click", () => changeWindowsService("uninstall"));
  document.querySelector("#synoShowOnboarding")?.addEventListener("click", () => {
    document.querySelector("#synoOnboarding").hidden = false; close();
    document.querySelector("#synoOnboarding").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  for (const trigger of document.querySelectorAll("[data-setting-target]")) trigger.addEventListener("click", () => {
    const detail = document.querySelector(`#${trigger.dataset.settingTarget}`);
    if (!detail) return;
    detail.open = true;
    detail.querySelector("summary")?.focus();
  });
  for (const trigger of document.querySelectorAll("[data-scroll-target]")) trigger.addEventListener("click", () => {
    document.querySelector(`#${trigger.dataset.scrollTarget}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelectorAll("[data-scroll-target]").forEach((item) => item.classList.toggle("is-active", item === trigger));
  });
  loadToday();
  loadChannelStatus();
  loadProviderStatus();
  loadWindowsService();
})();
