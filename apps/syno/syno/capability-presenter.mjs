const CAPABILITY_LABELS = Object.freeze([
  ["问答", "回答问题、梳理思路并保持跨微信、飞书和 Web 的连续对话"],
  ["收录", "收录 URL、Markdown、文本和附件，自动查重并生成可确认的收录方案"],
  ["学习", "安排复习、发起 teach-back，并只根据你的真实输出记录掌握证据"],
  ["创作", "根据目标、知识缺口和证据生成文章、提纲与下一步输出机会"],
]);

class CapabilityPresenter {
  describe({ runtime = {}, pendingCaptureCount = 0, browserCapture = {} } = {}) {
    const lines = ["我可以帮你：", ...CAPABILITY_LABELS.map(([title, description]) => `- ${title}：${description}`)];
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
