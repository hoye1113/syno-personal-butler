// Root Router chooses a domain and object only; Specialists own execution and Result Lane.
import { parseRadarCommand } from "./p5-radar/command.mjs";
import { resolveDecisionCommand } from "./decision-object.mjs";
import { ideaContextId, resolveIdeaRequest } from "./idea-object.mjs";
import { resolveKnowledgeRequest } from "./knowledge-query.mjs";
import { resolveMemoryCommand } from "./memory-object.mjs";
import { projectContextId, resolveProjectRequest } from "./project-object.mjs";

const ideaPrompt = (text) => {
  const match = /^继续想法\s*[：:]\s*(\S[\s\S]*)$/u.exec(String(text).trim());
  return match ? match[1].trim() : null;
};

const projectRevision = (text) => {
  const match = /^修订项目\s*[：:]\s*(\S[\s\S]*)$/u.exec(String(text).trim());
  return match ? match[1].trim() : null;
};

/** Only a genuine multi-candidate question gets a Decision; the router never silently picks a candidate. */
function decisionHint({ domain, resolved, text, versions }) {
  const ids = resolved.candidates ?? [];
  if (ids.length < 2) return {};
  if (domain === "idea") {
    if (resolved.reason !== "missing-idea-id") return {};
    const prompt = ideaPrompt(text);
    if (!prompt) return {};
    return {
      frozen: { action: "continue", prompt },
      decisionCandidates: ids.map((id, index) => {
        const contextId = ideaContextId(id);
        return {
          candidateId: `candidate-${index + 1}`, domain: "idea", objectId: id, contextId,
          expectedObjectVersion: versions[contextId] ?? null, action: "continue",
        };
      }),
    };
  }
  if (domain === "project") {
    if (resolved.reason !== "multiple-projects") return {};
    const revision = projectRevision(text);
    if (!revision) return {};
    return {
      frozen: { action: "revise", revision },
      decisionCandidates: ids.map((id, index) => {
        const contextId = projectContextId(id);
        return {
          candidateId: `candidate-${index + 1}`, domain: "project", objectId: id, contextId,
          expectedObjectVersion: versions[contextId] ?? null, action: "revise",
        };
      }),
    };
  }
  return {};
}

export function routeRoot({
  text, sourceUrl, documentIds = [], ideaIds = [], projectIds = [], versions = {},
}) {
  const normalized = text.trim();
  if (normalized === sourceUrl) return { status: "routed", domain: "capture" };
  const radar = parseRadarCommand(normalized);
  if (radar) return { status: "routed", domain: "radar", ...radar };
  const decision = resolveDecisionCommand(normalized);
  if (decision.status === "resolved") return { ...decision, status: "routed", domain: "decision" };
  if (decision.status === "ambiguous") return { ...decision, status: "ambiguous", domain: "decision" };
  const memory = resolveMemoryCommand(normalized);
  if (memory.status === "resolved") return { ...memory, status: "routed", domain: "memory" };
  if (memory.status === "ambiguous") return { ...memory, status: "ambiguous", domain: "memory" };
  if (/^(?:查询\s|继续查询)/u.test(normalized)) {
    const resolved = resolveKnowledgeRequest(normalized, documentIds);
    return resolved.status === "ambiguous"
      ? { status: "ambiguous", domain: "knowledge", candidates: resolved.candidates }
      : { status: "routed", domain: "knowledge", ...resolved };
  }
  const idea = resolveIdeaRequest(normalized, ideaIds);
  if (idea.status === "resolved") return { ...idea, status: "routed", domain: "idea" };
  if (idea.status !== "unsupported") {
    const hint = idea.status === "ambiguous" ? decisionHint({ domain: "idea", resolved: idea, text: normalized, versions }) : {};
    return { domain: "idea", ...idea, ...hint };
  }
  const project = resolveProjectRequest(normalized, projectIds);
  if (project.status === "resolved") return { ...project, status: "routed", domain: "project" };
  if (project.status !== "unsupported") {
    const hint = project.status === "ambiguous" ? decisionHint({ domain: "project", resolved: project, text: normalized, versions }) : {};
    return { domain: "project", ...project, ...hint };
  }
  return { status: "unsupported", domain: null };
}
