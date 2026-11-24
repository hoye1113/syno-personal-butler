const $ = (id) => document.getElementById(id);
const state = { view: "today", date: "", q: "", items: [], current: null, days: [], loading: 0 };
const labels = { today: "今日雷达", all: "历史雷达", unread: "全部未读", read: "已阅归档", followed: "跟进记录", ignored: "已忽略" };
let toastTimer;
let searchTimer;
let listScroll = 0;

function toast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").classList.add("is-visible");
  toastTimer = setTimeout(() => $("toast").classList.remove("is-visible"), 2400);
}

async function request(url, options) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json", ...options?.headers }, ...options });
  if (response.status === 401) { location.href = "/login"; throw new Error("需要登录"); }
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || "请求失败");
  return value;
}

function params() {
  const value = new URLSearchParams({ view: state.view });
  if (state.date) value.set("date", state.date);
  if (state.q) value.set("q", state.q);
  return value;
}

function syncUrl({ item = null, push = false } = {}) {
  const url = new URL(location.href);
  for (const key of ["view", "date", "q", "item", "itemDate"]) url.searchParams.delete(key);
  for (const [key, value] of params()) url.searchParams.set(key, value);
  if (item) { url.searchParams.set("item", item.itemId); url.searchParams.set("itemDate", item.date); }
  history[push ? "pushState" : "replaceState"]({ scroll: listScroll }, "", url);
}

function formatDate(value, withTime = false) {
  if (!value) return "日期未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "long", day: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}) }).format(date);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function isUnread(item) { return !item.readAt && (!item.legacy || Boolean(item.unreadAt)); }

function followLabel(follow) {
  return {
    pending: "待收录", running: "收录处理中", captured: "已收录", failed: "收录失败",
    followed: "已标记跟进", ignored: "已忽略", none: "",
  }[follow?.status] || "";
}

function render() {
  $("page-title").textContent = state.date ? `${state.date.slice(5).replace("-", "月")}日` : labels[state.view];
  const latest = state.days[0]?.date;
  $("issue-date").textContent = state.date || latest || "暂无日报";
  $("result-count").textContent = `${state.items.length} 条${state.q ? ` · “${state.q}”` : ""}`;
  $("bulk-bar").hidden = !state.items.length || ["ignored", "followed"].includes(state.view);
  $("read-page").hidden = state.view === "read" || !state.items.some(isUnread);
  $("undo-page").hidden = state.view !== "read";
  const list = $("reading-list");
  list.replaceChildren();
  $("status").hidden = state.items.length > 0;
  if (!state.items.length) $("status").textContent = state.q ? "没有匹配的内容，换个关键词试试。" : state.view === "today" ? "今天没有新增。历史内容仍可在上方查找。" : "这里还没有内容。";
  for (const item of state.items) {
    const li = element("li", `reading-item${item.readAt ? " is-read" : ""}`);
    li.dataset.itemId = item.itemId;
    li.append(element("span", "item-index", String(item.index).padStart(2, "0")));
    const body = element("div", "item-body");
    body.append(element("p", "item-source", `${item.source || "未知来源"} · ${item.date}`));
    const button = element("button", "item-title-button");
    button.type = "button";
    button.setAttribute("aria-label", `查看：${item.titleZh || item.title}`);
    button.append(element("span", "item-title", item.titleZh || item.title));
    button.addEventListener("click", () => openItem(item, true));
    body.append(button);
    if (item.summary) body.append(element("p", "item-summary", item.summary));
    const footer = element("div", "item-footer");
    footer.append(element("span", "", item.kind === "video" ? "视频" : "文章"));
    footer.append(element("span", "", formatDate(item.publishedAt)));
    if (item.readAt) footer.append(element("span", "read-mark", "已阅"));
    const follow = followLabel(item.follow);
    if (follow) footer.append(element("span", "follow-mark", follow));
    body.append(footer);
    li.append(body);
    list.append(li);
  }
}

async function load() {
  const generation = ++state.loading;
  $("status").hidden = false;
  $("status").textContent = "正在读取真实日报…";
  try {
    const value = await request(`/api/items?${params()}`);
    if (generation !== state.loading) return;
    state.items = value.items;
    render();
    if (state.current) {
      const fresh = state.items.find((item) => item.itemId === state.current.itemId && item.date === state.current.date);
      if (fresh) state.current = fresh;
      fillDetail();
    }
  } catch (error) {
    if (generation !== state.loading) return;
    state.items = [];
    $("reading-list").replaceChildren();
    $("status").hidden = false;
    $("status").textContent = `${error.message}。请稍后重试。`;
  }
}

function command(item) { return `跟进 ${item.date} ${item.index}`; }

function fillDetail() {
  const item = state.current;
  if (!item) return;
  $("detail-number").textContent = `NO. ${String(item.index).padStart(2, "0")} · ${item.date}`;
  $("detail-source").textContent = item.source || "未知来源";
  $("detail-title").textContent = item.titleZh || item.title;
  $("detail-original-title").textContent = item.title && item.title !== item.titleZh ? item.title : "";
  $("detail-meta").textContent = `${item.kind === "video" ? "视频" : "文章"} · ${formatDate(item.publishedAt, true)}`;
  $("detail-summary").textContent = item.summary || "资料不足。";
  const points = $("detail-points");
  points.replaceChildren();
  for (const point of item.points || []) points.append(element("li", "", point));
  $("points-section").hidden = !(item.points || []).length;
  $("why-section").hidden = !item.why;
  $("detail-why").textContent = item.why || "";
  $("detail-scope").textContent = `资料范围：${item.sourceStatus || "源摘要"}`;
  $("original-link").href = item.url;
  $("follow-text").textContent = command(item);
  $("follow-status").textContent = followLabel(item.follow);
  $("read-toggle").textContent = item.readAt ? "标为未读" : "标为已阅";
}

function openItem(item, push) {
  if (push) listScroll = window.scrollY;
  state.current = item;
  fillDetail();
  $("detail-pane").hidden = false;
  $("detail-pane").classList.add("is-open");
  document.body.style.overflow = "hidden";
  $("detail-pane").scrollTop = 0;
  syncUrl({ item, push });
  $("detail-title").setAttribute("tabindex", "-1");
  if (push && matchMedia("(max-width: 799px)").matches) $("detail-title").focus({ preventScroll: true });
}

function closeDetail(useHistory = false) {
  if (!state.current) return;
  if (useHistory && new URL(location.href).searchParams.has("item")) { history.back(); return; }
  state.current = null;
  $("detail-pane").hidden = true;
  document.body.style.overflow = "";
  syncUrl();
  requestAnimationFrame(() => window.scrollTo({ top: listScroll, behavior: "instant" }));
}

async function markRead(itemIds, read) {
  try {
    const result = await request("/api/read", { method: "POST", body: JSON.stringify({ itemIds, read }) });
    if (state.current && itemIds.includes(state.current.itemId)) {
      state.current = { ...state.current, readAt: read ? (state.current.readAt || result.at) : null };
    }
    await Promise.all([load(), loadSummary()]);
    toast(read ? `已将 ${itemIds.length} 条标为已阅` : `已恢复 ${itemIds.length} 条为未读`);
  } catch (error) { toast(error.message); }
}

async function copyFollow() {
  if (!state.current) return;
  const text = command(state.current);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = element("textarea");
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  toast("已复制，请粘贴到飞书发送");
}

async function loadSummary() {
  const value = await request("/api/summary");
  state.days = value.days;
  const select = $("history-select");
  const selected = state.date;
  select.replaceChildren(element("option", "", "全部历史"));
  select.firstChild.value = "";
  for (const day of state.days) {
    const option = element("option", "", `${day.date} · ${day.itemCount} 条`);
    option.value = day.date;
    select.append(option);
  }
  select.value = selected;
}

for (const button of document.querySelectorAll("[data-view]")) {
  button.addEventListener("click", () => {
    state.view = button.dataset.view;
    state.date = "";
    state.q = "";
    $("search-input").value = "";
    closeDetail();
    for (const peer of document.querySelectorAll("[data-view]")) {
      if (peer === button) peer.setAttribute("aria-current", "page");
      else peer.removeAttribute("aria-current");
    }
    syncUrl({ push: true });
    load();
  });
}

$("search-input").addEventListener("input", (event) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.q = event.target.value.trim(); syncUrl(); load(); }, 250);
});
$("history-select").addEventListener("change", (event) => {
  state.date = event.target.value;
  if (state.date) state.view = "all";
  closeDetail();
  syncUrl({ push: true });
  load();
});
$("close-detail").addEventListener("click", () => closeDetail(true));
$("read-toggle").addEventListener("click", () => state.current && markRead([state.current.itemId], !state.current.readAt));
$("read-page").addEventListener("click", () => markRead(state.items.filter(isUnread).map((item) => item.itemId), true));
$("undo-page").addEventListener("click", () => markRead(state.items.filter((item) => item.readAt).map((item) => item.itemId), false));
$("copy-follow").addEventListener("click", copyFollow);
$("detail-copy").addEventListener("click", copyFollow);
$("theme-toggle").addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme === "dark";
  document.documentElement.dataset.theme = dark ? "light" : "dark";
  localStorage.setItem("p5-radar-theme", dark ? "light" : "dark");
});
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDetail(true); });
window.addEventListener("popstate", () => {
  const url = new URL(location.href);
  if (!url.searchParams.has("item")) closeDetail();
});

async function init() {
  try { document.documentElement.dataset.theme = localStorage.getItem("p5-radar-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); } catch { /* system theme remains usable */ }
  const url = new URL(location.href);
  state.view = url.searchParams.get("view") || "today";
  state.date = url.searchParams.get("date") || "";
  state.q = url.searchParams.get("q") || "";
  $("search-input").value = state.q;
  for (const button of document.querySelectorAll("[data-view]")) {
    if (button.dataset.view === state.view) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  await Promise.all([loadSummary(), load()]);
  const itemId = Number(url.searchParams.get("item"));
  if (itemId) {
    let item = state.items.find((candidate) => candidate.itemId === itemId);
    if (!item) {
      const itemDate = url.searchParams.get("itemDate") || state.date;
      const value = await request(`/api/items?view=all&date=${encodeURIComponent(itemDate)}`);
      item = value.items.find((candidate) => candidate.itemId === itemId);
    }
    if (item) openItem(item, false);
  }
}

init().catch((error) => { $("status").hidden = false; $("status").textContent = `雷达站初始化失败：${error.message}`; });
