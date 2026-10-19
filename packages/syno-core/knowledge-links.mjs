import path from "node:path";

// Supported local note links only; code examples and external URLs are never rewrite targets.
function noteLinks(markdown, logicalPath) {
  const blank = text => text.replace(/[^\r\n]/gu, match => " ".repeat(match.length));
  let fence;
  const visible = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---/u, blank).split(/(?<=\n)/u).map(line => {
    const marker = /^ {0,3}(`{3,}|~{3,})/u.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !line.slice(marker[0].length).trim()) fence = null;
      return blank(line);
    }
    if (marker) { fence = marker[1]; return blank(line); }
    if (/^(?: {4}|\t)/u.test(line)) return blank(line);
    return line;
  }).join("").replace(/(?<!`)(`+)([\s\S]*?)(?<!`)\1(?!`)/gu, blank);
  const links = [], definitions = new Map();
  for (const m of visible.matchAll(/^ {0,3}\[([^\]]+)\]:\s*<?([^\s>]+)>?/gmu)) definitions.set(m[1].toLowerCase(), m[2]);
  function add(m, href, label, kind) {
    let decoded; try { decoded = decodeURIComponent(href.split("#")[0]); } catch { return; }
    if (!decoded || /^[a-z][a-z0-9+.-]*:|^\/\//iu.test(decoded)) return;
    if (kind !== "wiki" && !/\.md$/iu.test(decoded)) return;
    const root = decoded.startsWith("vault/") ? decoded : `vault/${decoded}`;
    const relative = path.posix.normalize(path.posix.join(path.posix.dirname(logicalPath), decoded));
    links.push({ start: m.index, end: m.index + m[0].length, text: m[0], href, label, kind, root: root.endsWith(".md") ? root : `${root}.md`, relative: relative.endsWith(".md") ? relative : `${relative}.md`, basename: path.posix.basename(decoded, ".md") });
  }
  for (const m of visible.matchAll(/(?<!!)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/gu)) add(m, m[1].trim(), m[2] || m[1], "wiki");
  for (const m of visible.matchAll(/(?<!!|\[)\[([^\]\n]*)\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/gu)) add(m, m[2], m[1], "markdown");
  for (const m of visible.matchAll(/(?<!!|\[)\[([^\]\n]+)\]\[([^\]\n]*)\]/gu)) {
    const href = definitions.get((m[2] || m[1]).toLowerCase());
    if (href) add(m, href, m[1], "reference");
  }
  return links.sort((a, b) => a.start - b.start);
}
function resolveNoteLink(link, paths) {
  const candidates = link.kind === "wiki" || link.href.startsWith("vault/") ? [link.root, link.relative] : [link.relative, link.root];
  for (const candidate of candidates) if (paths.has(candidate)) return [candidate];
  return link.kind === "wiki" && !link.href.split("#")[0].includes("/") ? [...paths].filter(p => path.posix.basename(p, ".md") === link.basename) : [];
}
function rewriteNoteLinks(markdown, links, replace) {
  let result = markdown;
  for (const link of [...links].sort((a,b) => b.start-a.start)) result = result.slice(0, link.start) + replace(link) + result.slice(link.end);
  return result;
}
export { noteLinks, resolveNoteLink, rewriteNoteLinks };
