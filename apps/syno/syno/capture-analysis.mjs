function splitSourceText(value, { maxChars = 48_000 } = {}) {
  const source = String(value || "");
  if (!source) return [""];
  if (source.length <= maxChars) return [source];
  const paragraphs = source.split(/\n{2,}/u);
  const chunks = [];
  let current = "";
  const pushCurrent = () => {
    if (current) chunks.push(current);
    current = "";
  };
  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      pushCurrent();
      for (let offset = 0; offset < paragraph.length; offset += maxChars) {
        chunks.push(paragraph.slice(offset, offset + maxChars));
      }
      continue;
    }
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > maxChars) pushCurrent();
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  pushCurrent();
  return chunks;
}

function stableKey(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableKey).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableKey(value[key])}`).join(",")}}`;
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = stableKey(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeCaptureAnalyses(analyses) {
  const items = analyses.filter(Boolean);
  if (!items.length) return {};
  const first = items[0];
  const qualityRank = new Map([["pending", 0], ["accepted", 1], ["limited", 2], ["rejected", 3]]);
  const quality = items.map((item) => item.quality || {})
    .reduce((worst, current) => (qualityRank.get(current.status) ?? 0) > (qualityRank.get(worst.status) ?? 0) ? current : worst, first.quality || {});
  return {
    quality: {
      ...quality,
      reasons: unique(items.flatMap((item) => item.quality?.reasons || [])),
    },
    materialTier: first.materialTier,
    suggestedPath: first.suggestedPath,
    canonicalTags: unique(items.flatMap((item) => item.canonicalTags || [])),
    relations: unique(items.flatMap((item) => item.relations || [])),
    mocChanges: unique(items.flatMap((item) => item.mocChanges || [])),
    claimCandidates: unique(items.flatMap((item) => item.claimCandidates || [])),
    evidenceCandidates: unique(items.flatMap((item) => item.evidenceCandidates || [])),
    ...(first.sourceProfile ? { sourceProfile: first.sourceProfile } : {}),
    ...(items.some((item) => item.canonicalBody) ? {
      canonicalBody: items.map((item) => String(item.canonicalBody || "").trim()).filter(Boolean).join("\n\n"),
    } : {}),
    unresolved: unique(items.flatMap((item) => item.unresolved || [])),
    validators: unique(items.flatMap((item) => item.validators || [])),
  };
}

export { mergeCaptureAnalyses, splitSourceText };
