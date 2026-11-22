function oneLine(text, fallback = "") {
  return String(text ?? "").replace(/\s+/gu, " ").trim() || fallback;
}

export function formatCandidate(candidate, index) {
  const title = oneLine(candidate.title, "(无标题)");
  const source = oneLine(candidate.source_name, candidate.source_id);
  const reason = oneLine(candidate.reason, "");
  return `${index}. [${title}](${candidate.url}) — ${source} — ${candidate.score} 分${reason ? `\n   ${reason}` : ""}`;
}

export function formatDigest(candidates, { date = new Date().toISOString().slice(0, 10), limit = 10 } = {}) {
  const list = candidates.slice(0, limit);
  const lines = [
    `# P5 信息雷达 · ${date}`,
    "",
    "> 候选只代表“值得看”，不代表已收录；回复“跟进 N”才进入收录链。",
    "",
  ];
  if (!list.length) {
    lines.push("今天没有达到门槛的新候选。");
  } else {
    lines.push(...list.map((candidate, index) => formatCandidate(candidate, index + 1)));
  }
  lines.push("", `共 ${list.length} 条候选。`);
  return `${lines.join("\n")}\n`;
}

export function formatStatus(status) {
  const lines = [
    `P5 信息雷达 · sources=${status.sources.length} items=${status.items} candidates=${status.new_candidates}`,
    "",
    "来源：",
  ];
  for (const source of status.sources) {
    const state = source.last_error ? `error=${oneLine(source.last_error).slice(0, 120)}` : "ok";
    lines.push(`- ${source.id} [${source.kind}/${source.tier}] items=${source.item_count} ${state}`);
  }
  if (status.runs?.length) {
    lines.push("", "最近运行：");
    for (const run of status.runs) {
      lines.push(`- #${run.id} ${run.started_at} fetched=${run.fetched} inserted=${run.inserted} scored=${run.scored} candidates=${run.candidates}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
