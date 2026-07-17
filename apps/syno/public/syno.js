(() => {
  const drawer = document.querySelector("#synoDrawer");
  const scrim = document.querySelector("#synoDrawerScrim");
  const title = document.querySelector("#synoDrawerTitle");
  const panes = [...document.querySelectorAll("[data-syno-pane]")];
  const tabs = [...document.querySelectorAll("[data-syno-tab]")];
  const labels = { knowledge: "知识", learn: "学习", create: "创作", jobs: "任务与审批", notifications: "通知", settings: "设置", chat: "问赛诺" };
  let active = "knowledge";
  let lastTrigger = null;

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
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    scrim.hidden = false;
    select(active);
    document.querySelector("#synoDrawerClose")?.focus();
  }

  function close() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    scrim.hidden = true;
    lastTrigger?.focus?.();
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
    if (panel === "settings") loadProviderStatus();
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
      const { results } = await api(`/api/syno/search?q=${encodeURIComponent(query)}&limit=40`);
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

  async function submitIntake() {
    const kind = document.querySelector("#synoIntakeKind").value;
    const value = document.querySelector("#synoIntakeValue").value.trim();
    const fileInput = document.querySelector("#synoIntakeFile");
    const button = document.querySelector("#synoIntakeSubmit");
    button.disabled = true;
    button.textContent = "正在提交…";
    try {
      let payload = { kind, value };
      if (["pdf", "txt"].includes(kind)) {
        const file = fileInput.files[0];
        if (!file) throw new Error("请选择文件");
        const maximum = kind === "pdf" ? 10 * 1024 * 1024 : 1024 * 1024;
        if (file.size > maximum) throw new Error(kind === "pdf" ? "PDF 不能超过 10 MB" : "文本文件不能超过 1 MB");
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
        payload = { kind, name: file.name, base64: btoa(binary) };
      }
      const result = await api("/api/syno/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      document.querySelector("#synoIntakeHint").textContent = `已收到 ${result.artifact.id}。赛诺正在异步查重并形成收录方案。`;
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
    try {
      const result = await api("/api/syno/weixin/login/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const image = document.querySelector("#synoWeixinQr");
      image.src = result.imageUrl;
      image.hidden = false;
      document.querySelector("#synoWeixinPoll").hidden = false;
      status.textContent = "请用 Android 微信扫码并在手机确认。二维码过期后重新获取。";
    } catch (error) { status.textContent = error.message; }
  }

  async function pollWeixinLogin() {
    const status = document.querySelector("#synoWeixinStatus");
    status.textContent = "正在确认扫码状态…";
    try {
      const result = await api("/api/syno/weixin/login/poll", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (result.status === "confirmed") {
        const connection = await api("/api/syno/weixin/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        status.textContent = connection.running
          ? "已连接。请在 ClawBot 私聊发送一条文字完成收发验证。"
          : (connection.lastError || "凭据已保存，后台 Worker 将接管连接。");
        document.querySelector("#synoWeixinQr").hidden = true;
        document.querySelector("#synoWeixinPoll").hidden = true;
        await loadChannelStatus();
      } else status.textContent = `当前状态：${result.status}。请在手机完成确认后重试。`;
    } catch (error) { status.textContent = error.message; }
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
    } catch (error) {
      document.querySelector("#synoChannelStatus").textContent = error.message;
    }
  }

  function priorityKind(kind) {
    return { goal: "目标", commitment: "承诺", review: "复习" }[kind] || "事项";
  }

  async function loadToday() {
    const target = document.querySelector("#synoTodayPriorities");
    if (!target) return;
    try {
      const snapshot = await api("/api/syno/today");
      target.replaceChildren();
      const priorities = snapshot.priorities.slice(0, 4);
      if (!priorities.length) {
        const empty = node("article", "flow-step");
        empty.append(node("span", "", "今日清场"), node("strong", "", "还没有必须处理的事项"), node("p", "", "可以从一次复习、收录或输出开始。"));
        target.append(empty);
      }
      priorities.forEach((item, index) => {
        const card = node("article", "flow-step");
        card.append(node("span", "", `${String(index + 1).padStart(2, "0")} · ${priorityKind(item.kind)}`), node("strong", "", item.title), node("p", "", item.dueAt ? `到期：${new Date(item.dueAt).toLocaleString("zh-CN")}` : "按当前目标与知识缺口排序"));
        target.append(card);
      });
      document.querySelector("#weekScheduledCount").textContent = snapshot.counts.commitments;
      document.querySelector("#inboxCandidateCount").textContent = snapshot.counts.reviews;
    } catch (error) {
      target.replaceChildren(node("p", "syno-error", `Today 暂不可用：${error.message}`));
    }
  }

  async function loadDueReviews() {
    const target = document.querySelector("#synoDueReviews");
    if (!target) return;
    target.replaceChildren(node("p", "syno-empty", "正在读取到期复习…"));
    try {
      const { reviews } = await api("/api/syno/learning/due");
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
        rawArtifactRef: document.querySelector("#synoLearningArtifact").value.trim(),
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

  async function loadProviderStatus() {
    const hint = document.querySelector("#synoProviderHint");
    try {
      const status = await api("/api/syno/provider");
      document.querySelector("#synoProviderBaseUrl").value = status.baseUrl;
      document.querySelector("#synoProviderModel").value = status.modelId || "";
      document.querySelector("#synoProviderContext").value = status.contextLength;
      hint.textContent = status.configured ? `已配置 ${status.modelId}；Token 已加密保存。` : "尚未配置；本地搜索、任务与提醒仍可使用。";
    } catch (error) { hint.textContent = error.message; }
  }

  async function saveProvider(event) {
    event.preventDefault(); const hint = document.querySelector("#synoProviderHint"); hint.textContent = "正在使用 DPAPI 保存…";
    try {
      const status = await api("/api/syno/provider", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseUrl: document.querySelector("#synoProviderBaseUrl").value.trim(), token: document.querySelector("#synoProviderToken").value, modelId: document.querySelector("#synoProviderModel").value.trim(), contextLength: Number(document.querySelector("#synoProviderContext").value) }) });
      document.querySelector("#synoProviderToken").value = ""; hint.textContent = `已安全保存 ${status.modelId}。`;
    } catch (error) { hint.textContent = error.message; }
  }

  async function feishuAction(action) {
    const status = document.querySelector("#synoFeishuStatus"); status.textContent = "正在处理…";
    try {
      const result = await api(`/api/syno/feishu/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      status.textContent = result.status === "waiting_scan" ? "请扫描二维码并在飞书中确认。" : `当前状态：${result.status || (result.running ? "已连接" : "未连接")}`;
      const qr = document.querySelector("#synoFeishuQr");
      if (result.url) { const link = node("a", "accent-btn", "打开飞书扫码注册"); link.href = result.url; link.target = "_blank"; link.rel = "noreferrer"; qr.replaceChildren(link); }
    } catch (error) { status.textContent = error.message; }
  }

  window.Syno = Object.freeze({ show, close, select });

  for (const trigger of document.querySelectorAll("[data-syno-panel]")) trigger.addEventListener("click", () => show(trigger.dataset.synoPanel, trigger));
  for (const tab of tabs) tab.addEventListener("click", () => select(tab.dataset.synoTab));
  document.querySelector("#synoDrawerClose")?.addEventListener("click", close);
  scrim?.addEventListener("click", close);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && drawer.classList.contains("is-open")) close(); });
  document.querySelector("#synoKnowledgeSearch")?.addEventListener("click", loadKnowledge);
  document.querySelector("#synoKnowledgeQuery")?.addEventListener("keydown", (event) => { if (event.key === "Enter") loadKnowledge(); });
  document.querySelector("#synoJobsRefresh")?.addEventListener("click", loadJobs);
  document.querySelector("#synoIntakeKind")?.addEventListener("change", (event) => {
    const fileMode = ["pdf", "txt"].includes(event.target.value);
    document.querySelector("#synoIntakeFile").hidden = !fileMode;
    document.querySelector("#synoIntakeValue").hidden = fileMode;
  });
  document.querySelector("#synoIntakeSubmit")?.addEventListener("click", submitIntake);
  document.querySelector("#synoChatForm")?.addEventListener("submit", submitChat);
  document.querySelector("#synoWeixinLogin")?.addEventListener("click", beginWeixinLogin);
  document.querySelector("#synoWeixinPoll")?.addEventListener("click", pollWeixinLogin);
  document.querySelector("#synoWeixinHome")?.addEventListener("click", setWeixinHome);
  document.querySelector("#synoLearningForm")?.addEventListener("submit", submitLearning);
  document.querySelector("#synoTeachBackForm")?.addEventListener("submit", submitTeachBack);
  document.querySelector("#synoOutputForm")?.addEventListener("submit", submitOutput);
  document.querySelector("#synoProviderForm")?.addEventListener("submit", saveProvider);
  document.querySelector("#synoFeishuRegister")?.addEventListener("click", () => feishuAction("register/start"));
  document.querySelector("#synoFeishuConnect")?.addEventListener("click", () => feishuAction("connect"));
  document.querySelector("#synoFeishuDisconnect")?.addEventListener("click", () => feishuAction("disconnect"));
  for (const trigger of document.querySelectorAll("[data-scroll-target]")) trigger.addEventListener("click", () => {
    document.querySelector(`#${trigger.dataset.scrollTarget}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelectorAll("[data-scroll-target]").forEach((item) => item.classList.toggle("is-active", item === trigger));
  });
  loadToday();
  loadChannelStatus();
})();
