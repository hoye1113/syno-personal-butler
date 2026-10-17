const CAPABILITY_LABELS = Object.freeze([
  ["问答", "回答问题、梳理思路，并在同一会话里保持上下文"],
  ["收录", "收录 URL、Markdown、文本和附件，自动查重并生成可确认的收录方案"],
  ["知识库", "搜索、重读与串联你的知识库，追踪主张的证据与时效"],
  ["主动提醒", "晨间计划、晚间复盘与每周知识库复盘（按节奏推送，安静时段不打扰）"],
]);

class CapabilityPresenter {
  describe({ runtime = {}, pendingCaptureCount = 0, browserCapture = {} } = {}) {
    const lines = ["我可以帮你：", ...CAPABILITY_LABELS.map(([title, description]) => `- ${title}：${description}`)];
    lines.push("直接说「今天有什么」看今日快照；说「记住 …」生成待你确认的记忆候选。");
    const pending = Math.max(0, Number(pendingCaptureCount) || 0);
    lines.push(pending ? `当前有 ${pending} 项收录等待你处理，可以直接说“收录状态”。` : "当前没有收录等待你处理。")
    if (browserCapture.available === true) {
      lines.push("遇到普通地址无法直接读取时，我会自动尝试通过浏览器读取；需要登录或验证时会请你完成后继续。");
    } else if (browserCapture.available === false) {
      lines.push("当前浏览器读取能力不可用，仍可使用直接地址抓取和本地收录。");
    }
    lines.push(runtime.ready === false ? "AI 服务当前不可用，但收录回执、状态查询和澄清仍可继续。" : "AI 服务正常运行。");
    return { text: lines.join("\n"), capabilities: CAPABILITY_LABELS.map(([title]) => title) };
  }
}

export { CAPABILITY_LABELS, CapabilityPresenter };
