function awaitSessionTurn({ ctx, sessionId, sourceKind = "weixin", timeoutMs = 120_000, dispatch } = {}) {
  if (!ctx || typeof ctx.on !== "function") throw new Error("awaitSessionTurn 需要可订阅的 ctx");
  if (!sessionId) throw new Error("awaitSessionTurn 需要 sessionId");
  return new Promise((resolve, reject) => {
    let claimedTurn = null;
    let sawAssistant = false;
    let finalText = "";
    let settled = false;
    const disposers = [];
    const timer = setTimeout(() => {
      finish(Object.assign(new Error("通道回合等待超时"), { code: "CHANNEL_TURN_TIMEOUT" }));
    }, Math.max(1_000, Number(timeoutMs) || 120_000));

    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const dispose of disposers) {
        try { dispose?.(); } catch { /* 订阅清理失败不得覆盖结算结果 */ }
      }
      if (error) reject(error);
      else resolve(value);
    }

    const matches = (session) => (session?.header?.id ?? session?.id) === sessionId;

    disposers.push(ctx.on("session/event", (session, event) => {
      if (!matches(session)) return;
      if (event.type === "assistant/message") {
        sawAssistant = true;
        const text = event.data.message.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("");
        if (text) finalText = text;
        return;
      }
      if (event.type !== "turn/end") return;
      const turn = event.data?.turn;
      const correlated = claimedTurn !== null ? turn === claimedTurn : sawAssistant;
      if (correlated) finish(null, { text: finalText, reason: event.data?.reason?.kind ?? null });
    }, { global: true }));

    disposers.push(ctx.on("agent/inbox/claimed", ({ agent, message, turn } = {}) => {
      const id = agent?.session?.id ?? agent?.session?.header?.id;
      if (id !== sessionId) return;
      if (sourceKind && message?.source?.kind !== sourceKind) return;
      claimedTurn = turn ?? null;
    }, { global: true }));

    try {
      dispatch?.(sessionId);
    } catch (error) {
      finish(error);
    }
  });
}

export { awaitSessionTurn };
