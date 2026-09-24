import { inspectRemoteContent } from "./sensitive-content.mjs";

function remoteSafeJobSummary(job = {}) {
  const candidateSummary = String(job.result?.summary || job.summary || job.request?.summary || "").slice(0, 500);
  const summary = inspectRemoteContent(candidateSummary, { maxChars: 500 }).safe ? candidateSummary : "";
  return {
    id: String(job.id || ""),
    intent: String(job.intent || job.request?.intent || job.decision?.intent || ""),
    status: String(job.status || ""),
    risk: String(job.risk || job.decision?.risk || ""),
    phase: String(job.phase || ""),
    changedPaths: Array.isArray(job.changedPaths)
      ? job.changedPaths.map(String).filter((item) => /^(?:vault|ops)\//u.test(item)).slice(0, 100)
      : [],
    ...(summary ? { summary } : {}),
  };
}

export { remoteSafeJobSummary };
