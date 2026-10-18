import { validateContractRecord } from "./schema-registry.mjs";
import { walkMarkdown } from "./knowledge-store.mjs";
import { isExcludedKnowledge } from "./knowledge-read.mjs";
import { frontmatterData } from "./validator.mjs";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import net from "node:net";
import { requestOnce, requestViaProxy, resolvePublicAddress, proxyRouteForUrl } from "./source-fetcher.mjs";
import { isPrivateAddress } from "./source-fetcher.mjs";
function validatePublicUrl(value) { const u = new URL(value); if (!["http:", "https:"].includes(u.protocol) || u.username || u.password || /(?:^|\.)localhost$|\.local$/iu.test(u.hostname) || isPrivateAddress(u.hostname.replace(/^\[|\]$/gu, "")) || [...u.searchParams.keys()].some(k => /^(?:token|access_token|secret|password|api_key)$/iu.test(k))) throw new Error("资源 URL 不安全"); return u.toString(); }
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
function resourceReferences(markdown) {
const text = String(markdown);
  const matches = [...text.matchAll(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/gu)];
  const refs = matches.map((m, index) => ({ index, position: m.index, alt: m[1], source: m[2], role: "body_image", basis: "markdown_inline_image" }));
  for (const marker of text.matchAll(/!\[/gu)) {
    if (matches.some(m => marker.index >= m.index && marker.index < m.index + m[0].length)) continue;
    refs.push({ index: refs.length, position: marker.index, source: `unsupported:markdown:${marker.index}`, type: "markdown_image_syntax", role: "body_resource", basis: "unsupported_image_reference" });
  }
  return refs.sort((a, b) => a.position - b.position);
}
function htmlImageReferences(html, url) {
  const refs = [];
  // Decorative regions are explicit semantic containers, never image dimensions.
  let content = String(html).replace(/<(nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/giu, (block) => {
    for (const m of block.matchAll(/<img\b[^>]*>/giu)) refs.push({ markup: m[0], role: "decoration", basis: "semantic_navigation_region" });
    return " ";
  });
  for (const match of content.matchAll(/<(svg|canvas)\b[^>]*>/giu)) {
    if (/aria-hidden\s*=\s*["']true["']/iu.test(match[0])) continue;
    refs.push({ source: `inline:${match[1]}:${refs.length}`, role: "body_resource", type: match[1], basis: "unsupported_inline_graphic" });
  }
  content = content.replace(/<img\b[^>]*>/giu, markup => {
    const attr = name => new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "iu").exec(markup)?.slice(1).find(v => v !== undefined) || "";
    const source = attr("data-src") || attr("src");
    const alt = attr("alt").replace(/[\[\]\n]/gu, " ");
    let absolute = source;
    try { absolute = new URL(source.replaceAll("&amp;", "&"), url).toString().replaceAll("(", "%28").replaceAll(")", "%29"); } catch {}
    refs.push({ source: absolute, role: "body_image", basis: "inline_content_image", alt });
    return `\n![${alt}](${absolute})\n`;
  });
  return { html: content, refs: refs.map((r, index) => ({ ...r, index })) };
}
async function fetchImage(value, { maxBytes = 10 * 1024 * 1024, lookup, proxyEnv = process.env } = {}) {
  let url = new URL(validatePublicUrl(value));
  for (let redirects = 0; redirects <= 3; redirects++) {
    validatePublicUrl(url.toString());
    const route = net.isIP(url.hostname) ? { proxied: false } : proxyRouteForUrl(url, proxyEnv);
    const response = route.proxied ? await requestViaProxy(url, route.proxyUrl, { maxBytes }) : await requestOnce(url, await resolvePublicAddress(url, lookup), { maxBytes });
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) { url = new URL(response.headers.location, url); continue; }
    if (response.statusCode < 200 || response.statusCode >= 300) throw new Error(`图片返回 HTTP ${response.statusCode}`);
    const mime = String(response.headers["content-type"] || "").split(";")[0].toLowerCase();
    return { bytes: response.body, mime };
  }
  throw new Error("图片重定向次数超限");
}
function imageExtension(bytes, mime) {
  if (mime === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "png";
  if (mime === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (mime === "image/gif" && /^GIF8[79]a/u.test(bytes.subarray(0, 6).toString("ascii"))) return "gif";
  if (mime === "image/webp" && bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP") return "webp";
  throw Object.assign(new Error("图片 MIME 与格式不支持或不一致"), { code: "SOURCE_RESOURCE_INCOMPLETE" });
}
class SourceResources {
  constructor({ cacheRoot, fetcher = fetchImage, maxImages = 200, maxTotalBytes = 100 * 1024 * 1024 } = {}) { Object.assign(this, { cacheRoot, fetcher, maxImages, maxTotalBytes }); }
  async prepare(content, { resources, attachments = [], knownItems = [], notePath } = {}) {
    const refs = resources || resourceReferences(content), items = []; let total = 0;
    for (const [index, ref] of refs.entries()) {
      const item = { ...ref, index, type: ref.type || "image", downloadStatus: ref.role === "decoration" ? "skipped" : "pending", remoteStatus: "pending" };
      if (item.role === "decoration") { items.push(item); continue; }
      try {
        if (ref.type && ref.type !== "image") throw new Error(`暂不支持 ${ref.type} 原图提取`);
        if (index >= this.maxImages) throw new Error("图片数量超限");
        const known = knownItems.find(x => x.downloadStatus === "succeeded" && (x.localRef?.slice(6) === ref.source || x.source === ref.source || notePath && path.posix.normalize(path.posix.join(path.posix.dirname(notePath), ref.source)) === x.localRef || x.localRef && ref.source.endsWith(`/by-digest/${path.posix.basename(x.localRef)}`)));
        if (known) { items.push({ ...known, bodyReference: ref.source, index, position: ref.position, alt: ref.alt }); continue; }
        if (index >= this.maxImages) throw new Error("图片数量超限");
        const attachment = attachments.find(a => a.name === item.source);
        if (!attachment && !/^https?:\/\//iu.test(item.source)) throw new Error("相对资源不在本次合法附件集合中");
        const { bytes, mime } = attachment ? { bytes: Buffer.from(attachment.base64, "base64"), mime: attachment.mime } : await this.fetcher(item.source);
        if (!bytes.length || bytes.length > 10 * 1024 * 1024 || total + bytes.length > this.maxTotalBytes) throw new Error("图片大小超限");
        const ext = imageExtension(bytes, mime), digest = sha(bytes); total += bytes.length;
        Object.assign(item, { digest, mime, size: bytes.length, localRef: `vault/99-System/Attachments/by-digest/${digest}.${ext}`, downloadStatus: "succeeded" });
        await fs.mkdir(this.cacheRoot, { recursive: true });
        const file = path.join(this.cacheRoot, `${digest}.${ext}`);
        await fs.writeFile(file, bytes, { flag: "wx", mode: 0o600 }).catch(e => { if (e.code !== "EEXIST") throw e; });
        if (sha(await fs.readFile(file)) !== digest) throw new Error("图片缓存摘要不一致");
      } catch (error) { item.downloadStatus = "failed"; item.error = { code: error.code || "SOURCE_RESOURCE_INCOMPLETE", message: error.message }; }
      items.push(item);
    }
    const manifest = { schemaVersion: 1, items, complete: items.every(x => x.downloadStatus === "succeeded" || x.role === "decoration") };
    return { ...manifest, version: sha(JSON.stringify(manifest)) };
  }
  async cleanup({ workspace, candidates }) {
    const changedPaths = [], texts = [], referenced = new Set();
    for (const file of await walkMarkdown(path.join(workspace, "vault"))) {
      if (path.relative(path.join(workspace, "vault"), file).startsWith("99-System/")) continue;
      const text = await fs.readFile(file, "utf8");
      if (isExcludedKnowledge(text)) continue;
      texts.push(text);
      const logical = path.relative(workspace, file).replaceAll("\\", "/");
      const id = frontmatterData(text).values.note_id || `note-${sha(logical).slice(0, 24)}`;
      const manifest = await fs.readFile(path.join(workspace, "ops/knowledge/resources", `${id}-${sha(text)}.json`), "utf8").then(JSON.parse, e => { if (e.code === "ENOENT") return null; throw e; });
      if (manifest) {
        if (manifest.noteId !== id || manifest.noteVersion !== sha(text)) throw new Error("有效引用清单与笔记版本不一致，停止图片清理");
        for (const item of manifest.items) if (item.localRef) referenced.add(item.localRef);
      }
    }
    for (const ref of new Set(candidates)) {
      if (!/^vault\/99-System\/Attachments\/by-digest\/[a-f0-9]{64}\.(?:png|jpg|gif|webp)$/u.test(ref)) throw new Error("清理候选不在受管图片范围");
      // Persistent current-version manifests are authoritative; legacy shorthand
      // references conservatively keep the asset rather than risking a shared deletion.
      if (referenced.has(ref) || texts.some(text => text.includes(path.posix.basename(ref)))) continue;
      const file = path.join(workspace, ref);
      if (await fs.lstat(file).then(s => { if (!s.isFile()) throw new Error("图片清理对象不是普通文件"); return true; }, e => { if (e.code === "ENOENT") return false; throw e; })) { await fs.unlink(file); changedPaths.push(ref); }
    }
    return changedPaths;
  }
  async apply(manifest, { workspace, noteId, noteVersion, notePath = "vault/note.md", content }) {
    const changedPaths = [];
    for (const item of manifest.items) {
      if (item.downloadStatus !== "succeeded") continue;
      const cached = path.join(this.cacheRoot, path.posix.basename(item.localRef));
      const bytes = await fs.readFile(cached).catch(async error => {
        if (error.code !== "ENOENT") throw error;
        const candidate = await fs.realpath(path.join(workspace, item.localRef));
        const root = await fs.realpath(path.join(workspace, "vault/99-System/Attachments"));
        if (path.relative(root, candidate).startsWith("..")) throw new Error("共享图片路径越界");
        return fs.readFile(candidate);
      });
      if (sha(bytes) !== item.digest) throw new Error("图片缓存摘要已变化");
      const dest = path.join(workspace, item.localRef);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      if (await fs.access(dest).then(() => false, e => { if (e.code === "ENOENT") return true; throw e; })) { await fs.writeFile(dest, bytes, { flag: "wx" }); changedPaths.push(item.localRef); }
      else if (sha(await fs.readFile(dest)) !== item.digest) throw new Error("已有共享图片摘要不匹配");
      // Original image position is retained; remote URL never masquerades as a local asset.
      const reference = path.posix.relative(path.posix.dirname(notePath), item.localRef);
      for (const from of new Set([item.source, item.bodyReference].filter(Boolean))) content = content.replaceAll(`](${from})`, `](${reference})`);
    }
    noteVersion = sha(content);
    const manifestPath = `ops/knowledge/resources/${noteId}-${noteVersion}.json`;
    await fs.mkdir(path.dirname(path.join(workspace, manifestPath)), { recursive: true });
    const { version: _version, ...data } = manifest;
    const stored = { ...data, version: sha(JSON.stringify(data)), noteId, noteVersion };
    await validateContractRecord("source-resource-manifest", stored);
    await fs.writeFile(path.join(workspace, manifestPath), JSON.stringify(stored, null, 2) + "\n");
    changedPaths.push(manifestPath);
    return { content, changedPaths, manifestPath, noteVersion };
  }
}
export { SourceResources, resourceReferences, htmlImageReferences, fetchImage };
