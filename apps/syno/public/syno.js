(() => {
  const drawer = document.querySelector("#synoDrawer");
  const scrim = document.querySelector("#synoDrawerScrim");
  const title = document.querySelector("#synoDrawerTitle");
  const panes = [...document.querySelectorAll("[data-syno-pane]")];
  const tabs = [...document.querySelectorAll("[data-syno-tab]")];
  const labels = { knowledge: "知识", jobs: "任务与审批", notifications: "通知", chat: "问赛诺" };
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
    if (panel === "knowledge") document.querySelector("#synoKnowledgeQuery")?.focus();
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
      if (kind === "pdf") {
        const file = fileInput.files[0];
        if (!file) throw new Error("请选择 PDF 文件");
        if (file.size > 10 * 1024 * 1024) throw new Error("PDF 不能超过 10 MB");
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
        payload = { kind, name: file.name, base64: btoa(binary) };
      }
      const result = await api("/api/syno/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      document.querySelector("#synoIntakeHint").textContent = `任务 ${result.job.id} 已进入审批中心。`;
      select("jobs");
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
      reader.replaceChildren(heading, source, body);
    } catch (error) {
      reader.replaceChildren(node("p", "syno-error", error.message));
    }
  }

  function statusLabel(job) {
    const values = {
      pending: "待执行", awaiting_approval: "等待审批", running: "执行中",
      validating: "校验中", completed: "已完成", failed: "失败", rejected: "已拒绝", canceled: "已取消",
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
        const request = node("p", "", job.request?.text || job.request?.message || "结构化任务");
        item.append(meta, request);
        if (job.error?.message) item.append(node("p", "syno-error", job.error.message));
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
        await api("/api/syno/weixin/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        status.textContent = "已连接。请在 ClawBot 私聊发送一条文字完成收发验证。";
        document.querySelector("#synoWeixinQr").hidden = true;
        document.querySelector("#synoWeixinPoll").hidden = true;
        await loadChannelStatus();
      } else status.textContent = `当前状态：${result.status}。请在手机完成确认后重试。`;
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
        body: JSON.stringify({ text, ...(intent ? { intent } : {}) }),
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

  for (const trigger of document.querySelectorAll("[data-syno-panel]")) trigger.addEventListener("click", () => show(trigger.dataset.synoPanel, trigger));
  for (const tab of tabs) tab.addEventListener("click", () => select(tab.dataset.synoTab));
  document.querySelector("#synoDrawerClose")?.addEventListener("click", close);
  scrim?.addEventListener("click", close);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && drawer.classList.contains("is-open")) close(); });
  document.querySelector("#synoKnowledgeSearch")?.addEventListener("click", loadKnowledge);
  document.querySelector("#synoKnowledgeQuery")?.addEventListener("keydown", (event) => { if (event.key === "Enter") loadKnowledge(); });
  document.querySelector("#synoJobsRefresh")?.addEventListener("click", loadJobs);
  document.querySelector("#synoIntakeKind")?.addEventListener("change", (event) => {
    const pdf = event.target.value === "pdf";
    document.querySelector("#synoIntakeFile").hidden = !pdf;
    document.querySelector("#synoIntakeValue").hidden = pdf;
  });
  document.querySelector("#synoIntakeSubmit")?.addEventListener("click", submitIntake);
  document.querySelector("#synoChatForm")?.addEventListener("submit", submitChat);
  document.querySelector("#synoWeixinLogin")?.addEventListener("click", beginWeixinLogin);
  document.querySelector("#synoWeixinPoll")?.addEventListener("click", pollWeixinLogin);
  loadChannelStatus();
})();
