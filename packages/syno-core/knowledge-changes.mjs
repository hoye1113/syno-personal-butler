import { noteLinks, resolveNoteLink, rewriteNoteLinks, removeDeadDefinitions } from "./knowledge-links.mjs";
import { SourceResources } from "./source-resources.mjs";
import { PATHS } from "./paths.mjs";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { KnowledgeStore, walkMarkdown } from "./knowledge-store.mjs";
import { assertKnowledgeNotSensitive, isExcludedKnowledge, isSensitiveKnowledgeNote } from "./knowledge-read.mjs";
import { frontmatterData } from "./validator.mjs";
import { decisionVersion } from "./pending-decision.mjs";
const digest = (s) => createHash("sha256").update(s).digest("hex");
const NOTE_DIRS = { inbox: "00-Inbox", areas: "01-Areas", resources: "02-Resources", archive: "03-Archive" };
function noteIdentity(markdown, logicalPath) { return frontmatterData(markdown).values.note_id || `note-${digest(logicalPath).slice(0, 24)}`; }
function noteVersion(markdown) { return digest(markdown); }
function withIdentity(markdown, id) { return /^note_id:/mu.test(markdown.split("---")[1] || "") ? markdown : markdown.replace(/^---\r?\n/u, `---\nnote_id: ${id}\n`); }
function knowledgeError(code, text) { return Object.assign(new Error(text), { code }); }
class KnowledgeChanges {
  constructor({ knowledge, root, decisions, judge, clock = () => new Date() } = {}) { Object.assign(this, { knowledge, root, decisions, judge, clock }); this.resources = new SourceResources({ cacheRoot: path.join(PATHS.stateRoot, "knowledge-resources") }); }
  async find(id, version, knowledge = this.knowledge) {
    const notes = await knowledge.search("", { limit: 100 });
    // allNotes is required for vaults with >100 entries; never select a fuzzy search match.
    const all = typeof knowledge.list === "function" ? await knowledge.list({ searchable: true }) : notes;
    for (const note of all) {
      const current = await knowledge.read(note.path);
      if (noteIdentity(current.markdown, current.path) !== id) continue;
      assertKnowledgeNotSensitive(current.markdown);
      if (version && noteVersion(current.markdown) !== version) throw knowledgeError("OBJECT_VERSION_CHANGED", "笔记版本已变化，请重新查询");
      if (!/^vault\/(?:00-Inbox|01-Areas|02-Resources|03-Archive)\//u.test(current.path)) throw knowledgeError("KNOWLEDGE_SCOPE_DENIED", "只允许维护普通内容笔记");
      return { ...current, id, version: noteVersion(current.markdown) };
    }
    throw knowledgeError("KNOWLEDGE_NOT_FOUND", "有效笔记不存在，请先搜索准确 ID");
  }
  async backlinks(targets, knowledge = this.knowledge) {
    const notes = await knowledge.list({ searchable: true });
    const paths = new Set(notes.map(n => n.path)), retired = new Set(targets.map(n => n.path));
    const affected = [];
    for (const n of notes.sort((a,b) => a.path.localeCompare(b.path))) {
      if (retired.has(n.path)) continue;
      const current = await knowledge.read(n.path);
      const links = [];
      for (const link of noteLinks(current.markdown, current.path)) {
        const resolved = resolveNoteLink(link, paths);
        if (!resolved.some(p => retired.has(p))) continue;
        if (resolved.length !== 1) throw knowledgeError("KNOWLEDGE_LINK_AMBIGUOUS", `引用 ${current.path} 的 ${link.text} 有多个目标；请先明确引用`);
        links.push({ ...link, target: resolved[0] });
      }
      if (links.length) affected.push({ id: noteIdentity(current.markdown, current.path), path: current.path, version: noteVersion(current.markdown), links });
    }
    return affected;
  }
  async validateReferences(plan, knowledge = this.knowledge) {
    const expected = plan.backlinks || [];
    const actual = await this.backlinks(plan.operation === "notes.merge" ? plan.targets.slice(1) : plan.targets, knowledge);
    if (JSON.stringify(expected) !== JSON.stringify(actual)) throw knowledgeError("OBJECT_VERSION_CHANGED", "引用或其内容已变化，请重新生成预览");
  }
  async preview(operation, input, context) {
    const ids = operation === "notes.merge" ? [input.targetId, ...input.sources.map(x => x.id)] : [input.id];
    if (new Set(ids).size !== ids.length || ids.length > 20) throw new Error("合并目标不能重复且最多 20 条");
    const refs = operation === "notes.merge" ? [{ id: input.targetId, version: input.targetVersion }, ...input.sources] : [{ id: input.id, version: input.version }];
    const targets = [];
    for (const ref of refs) { const n = await this.find(ref.id, ref.version); targets.push({ id: n.id, version: n.version, path: n.path, title: n.title }); }
    const resourcePaths = [];
    const directory = path.join(this.root, "ops/knowledge/resources");
    for (const name of await fs.readdir(directory).catch(e => { if (e.code === "ENOENT") return []; throw e; })) {
      if (!targets.some(t => name === `${t.id}-${t.version}.json`)) continue;
      const manifest = JSON.parse(await fs.readFile(path.join(directory, name), "utf8"));
      resourcePaths.push(...manifest.items.filter(x => x.downloadStatus === "succeeded").map(x => x.localRef));
    }
    const backlinks = await this.backlinks(operation === "notes.merge" ? targets.slice(1) : targets);
    const plan = { operation, targets, backlinks, resourcePaths: [...new Set(resourcePaths)].sort() };
    const summary = (operation === "notes.delete" ? `删除笔记 ${targets[0].title}；清理本地有效内容和目录，Wiki 当前正文将标记删除，历史不擦除。` : `将 ${targets.slice(1).map(x => x.title).join("、")} 合入 ${targets[0].title}；保留来源原文，旧笔记退出有效检索。`) + ` 同时处理 ${backlinks.length} 篇引用笔记：${backlinks.map(n => n.path).join("、") || "无"}。`;
    const d = await this.decisions.add({ jobId: `preview:${context.messageId}:${digest(JSON.stringify(plan))}`, kind: "knowledge", ownerKey: context.ownerKey, threadKey: context.threadKey, summary, options: ["approve", "reject"], businessVersion: digest(JSON.stringify(plan)), plan, creationMessageId: context.messageId });
    return { id: d.id, version: decisionVersion(d), status: "awaiting_confirmation", summary, targets, references: backlinks.map(({ path, version, links }) => ({ path, version, links: links.map(l => l.text), action: operation === "notes.delete" ? "保留文字并标注目标已删除" : "指向合并目标" })), resourcePaths: plan.resourcePaths, code: "OWNER_CONFIRMATION_REQUIRED" };
  }
  async prepareTurn({ ownerKey, threadKey, messageId, text }) {
    const pending = (await this.decisions.list({ ownerKey, threadKey })).filter(d => d.kind === "knowledge" && !d.executingJob && d.creationMessageId !== messageId && Date.parse(d.expiresAt) > this.clock().getTime());
    if (!pending.length || !text?.trim() || !this.judge) return;
    const id = await this.judge({ message: text, decisions: pending.map(d => ({ id: d.id, summary: d.summary, targets: d.plan.targets })) });
    const selected = pending.find(d => d.id === id);
    if (!selected) return;
    await this.decisions.update(id, { authorization: { messageId, businessVersion: selected.businessVersion, issuedAt: this.clock().toISOString() } });
  }
  async execute(operation, payload, { workspace, job }) {
    const knowledge = new KnowledgeStore({ vaultRoot: path.join(workspace, "vault"), indexFile: path.join(workspace, ".runtime", "knowledge-maintenance-index.json") });
    let targets, plan, cleanupCandidates = [];
    if (["notes.delete", "notes.merge"].includes(operation)) {
      const d = (await this.decisions.list({ ownerKey: job.ownerKey, threadKey: job.threadKey })).find(d => d.id === payload.decisionId);
      if (!d || d.kind !== "knowledge" || d.plan.operation !== operation || digest(JSON.stringify(d.plan)) !== d.businessVersion || Date.parse(d.expiresAt) <= this.clock().getTime() || d.authorization?.messageId !== job.request.sourceMessageId || d.authorization.messageId === d.creationMessageId || d.authorization.businessVersion !== d.businessVersion || d.executingJob && d.executingJob !== job.id) throw knowledgeError("OWNER_CONFIRMATION_REQUIRED", "没有绑定本轮真实主人消息的一次性授权");
      plan = d.plan;
      await this.validateReferences(plan, knowledge);
      targets = await Promise.all(d.plan.targets.map(n => this.find(n.id, n.version, knowledge)));
      cleanupCandidates = d.plan.resourcePaths || [];
      await this.decisions.update(d.id, { executingJob: job.id });
    } else targets = [await this.find(payload.id, payload.version, knowledge)];
    const changedPaths = [], affectedIds = [];
    const write = async (logical, text) => { const file = path.join(workspace, logical); await fs.mkdir(path.dirname(file), { recursive: true }); const temp = `${file}.${process.pid}.tmp`; await fs.writeFile(temp, text, "utf8"); await fs.rename(temp, file); changedPaths.push(logical); };
    const [target, ...sources] = targets;
    const knownItems = [];
    const resourceDir = path.join(workspace, "ops/knowledge/resources");
    for (const name of await fs.readdir(resourceDir).catch(e => { if (e.code === "ENOENT") return []; throw e; })) {
      if (!targets.some(t => name === `${t.id}-${t.version}.json`)) continue;
      const manifest = JSON.parse(await fs.readFile(path.join(resourceDir, name), "utf8")); knownItems.push(...manifest.items);
    }
    const writeNote = async (logical, text, noteId = target.id, sourcePath = target.path, priorItems = knownItems) => {
      const manifest = await this.resources.prepare(text, { knownItems: priorItems, notePath: sourcePath });
      const result = await this.resources.apply(manifest, { workspace, noteId, notePath: logical, content: text });
      changedPaths.push(...result.changedPaths); await write(logical, result.content);
    };
    const replaceReference = (link, referencePath) => {
      const removed = targets.find(n => n.path === link.target);
      if (operation === "notes.delete") return `${link.label}（已删除：${removed.title}）`;
      const anchor = link.href.includes("#") ? `#${link.href.split("#").slice(1).join("#")}` : "";
      if (link.kind === "wiki") return `[[${target.path.slice(6).replace(/\.md$/u, "")}${anchor}|${link.label}]]`;
      const href = path.posix.relative(path.posix.dirname(referencePath), target.path).split("/").map(encodeURIComponent).join("/");
      return `[${link.label}](${href}${anchor})`;
    };
    const retiredPaths = new Set((operation === "notes.merge" ? sources : [target]).map(n => n.path));
    const rewriteReferences = async () => {
      for (const ref of plan.backlinks || []) {
        if (operation === "notes.merge" && ref.path === target.path) continue;
        const current = await knowledge.read(ref.path);
        const rewritten = rewriteNoteLinks(current.markdown, ref.links, link => replaceReference(link, ref.path));
        const updated = removeDeadDefinitions(rewritten, ref.path, retiredPaths);
        const manifest = await fs.readFile(path.join(resourceDir, `${ref.id}-${ref.version}.json`), "utf8").then(JSON.parse, e => { if (e.code === "ENOENT") return { items: [] }; throw e; });
        await writeNote(ref.path, withIdentity(updated, ref.id), ref.id, ref.path, manifest.items);
        if (/^vault\/(?:00-Inbox|01-Areas|02-Resources|03-Archive)\//u.test(ref.path)) affectedIds.push(ref.id);
      }
    };
    if (operation === "notes.merge") {
      const ref = plan.backlinks?.find(n => n.path === target.path);
      if (ref) {
        const rewritten = rewriteNoteLinks(target.markdown, ref.links, link => replaceReference(link, ref.path));
        target.markdown = removeDeadDefinitions(rewritten, target.path, new Set(sources.map(n => n.path)));
      }
    }
    if (operation === "notes.prepare_publish") {
      const content = withIdentity(target.markdown, target.id);
      if (frontmatterData(content).values.note_id !== target.id) throw new Error("目标缺少有效 frontmatter");
      await writeNote(target.path, content);
    } else if (operation === "notes.edit") {
      if (!String(payload.body || "").trim()) throw new Error("update 不能用空正文代替删除");
      const header = /^---\r?\n[\s\S]*?\r?\n---\r?\n/u.exec(target.markdown)?.[0];
      if (!header) throw new Error("目标缺少有效 frontmatter");
      await writeNote(target.path, withIdentity(`${header}\n${payload.body.trim()}\n`, target.id));
    } else if (operation === "notes.move") {
      const directory = NOTE_DIRS[payload.destination];
      if (!directory) throw new Error("未知知识分类");
      const destination = `vault/${directory}/${path.posix.basename(target.path)}`;
      if (destination === target.path) return { changedPaths: [], id: target.id, path: target.path };
      const dest = path.join(workspace, destination);
      // Refuse symlink destinations and collisions before making any change.
      await fs.realpath(path.dirname(dest)).then(p => { if (path.relative(path.join(workspace, "vault"), p).startsWith("..")) throw new Error("目标目录越界"); }, e => { if (e.code !== "ENOENT") throw e; });
      if (await fs.lstat(dest).then(() => true, e => { if (e.code === "ENOENT") return false; throw e; })) throw new Error("目标已经存在");
      await writeNote(destination, withIdentity(target.markdown, target.id));
      await fs.unlink(path.join(workspace, target.path)); changedPaths.push(target.path);
      for (const file of await walkMarkdown(path.join(workspace, "vault"))) {
        const old = await fs.readFile(file, "utf8");
        if (isExcludedKnowledge(old) || isSensitiveKnowledgeNote(old)) continue;
        const prior = target.path.slice(6).replace(/\.md$/u, ""), next = destination.slice(6).replace(/\.md$/u, "");
        const fileLogical = path.relative(workspace, file).replaceAll("\\", "/");
        let updated = old.replace(/\[\[([^\]|#]+)([^\]]*)\]\]/gu, (whole, ref, tail) => {
          const value = ref.trim();
          if (value !== prior && value !== `${prior}.md`) return whole;
          return `[[${next}${value.endsWith(".md") ? ".md" : ""}${tail}]]`;
        });
        updated = updated.replace(/\]\(([^\s)]+)\)/gu, (whole, href) => {
          const hash = href.indexOf("#"), anchor = hash < 0 ? "" : href.slice(hash), value = hash < 0 ? href : href.slice(0, hash);
          if (/^[a-z][a-z0-9+.-]*:/iu.test(value)) return whole;
          let decoded; try { decoded = decodeURIComponent(value); } catch { return whole; }
          const resolved = decoded.startsWith("vault/") ? decoded : decoded === target.path.slice(6) ? `vault/${decoded}` : path.posix.normalize(path.posix.join(path.posix.dirname(fileLogical), decoded));
          if (resolved !== target.path) return whole;
          const relative = decoded.startsWith("vault/") ? destination : path.posix.relative(path.posix.dirname(fileLogical), destination);
          return `](${relative.split("/").map(encodeURIComponent).join("/")}${anchor})`;
        });
        if (updated !== old) {
          const id = noteIdentity(old, fileLogical);
          const manifest = await fs.readFile(path.join(resourceDir, `${id}-${noteVersion(old)}.json`), "utf8").then(t => JSON.parse(t), e => { if (e.code === "ENOENT") return { items: [] }; throw e; });
          await writeNote(fileLogical, withIdentity(updated, id), id, fileLogical, manifest.items);
          if (/^vault\/(?:00-Inbox|01-Areas|02-Resources|03-Archive)\//u.test(fileLogical)) affectedIds.push(id);
        }
      }
      return { id: target.id, path: destination, version: noteVersion(await fs.readFile(dest, "utf8")), changedPaths, affectedIds };
    } else if (operation === "notes.merge") {
      let merged = withIdentity(target.markdown, target.id).trimEnd();
      for (const source of sources) {
        const sourceMetadata = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(source.markdown)?.[1];
        const metadataBlock = sourceMetadata ? `原始来源元数据：\n\n\x60\x60\x60yaml\n${sourceMetadata}\n\x60\x60\x60\n\n` : "";
        const sourceBody = source.markdown.replace(/^---[\s\S]*?---\s*/u, "");
        merged += `\n\n## 合并来源：${source.title}\n\n来源 ID：${source.id}（版本 ${source.version}）\n\n${metadataBlock}${sourceBody}`;
        const tombstone = `ops/knowledge/deleted/${source.id}.json`;
        await write(tombstone, JSON.stringify({ id: source.id, ownerKey: job.ownerKey, path: source.path, title: source.title, mergedInto: target.id, version: source.version, deletedAt: this.clock().toISOString() }) + "\n");
        // Keep a provenance redirect; never treat it as valid knowledge.
        await write(source.path, `---\ntitle: ${JSON.stringify(source.title)}\nnote_id: ${source.id}\ntags: [notes]\ncreated: ${new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(this.clock())}\nsource: owner\ndescription: 已合并\nknowledge_state: merged\nmerged_into: ${target.id}\n---\n\n已合并至 [[${target.path.slice(6).replace(/\.md$/u, "")}]]。\n`);
      }
      await writeNote(target.path, `${merged}\n`);
    } else if (operation === "notes.delete") {
      await fs.unlink(path.join(workspace, target.path)); changedPaths.push(target.path);
      const tombstone = `ops/knowledge/deleted/${target.id}.json`;
      await write(tombstone, JSON.stringify({ id: target.id, ownerKey: job.ownerKey, path: target.path, title: target.title, version: target.version, deletedAt: this.clock().toISOString() }) + "\n");
    } else throw new Error("未知知识维护操作");
    if (plan) await rewriteReferences();
    if (cleanupCandidates.length) changedPaths.push(...await this.resources.cleanup({ workspace, candidates: cleanupCandidates }));
    const version = operation === "notes.delete" ? digest(JSON.stringify(JSON.parse(await fs.readFile(path.join(workspace, `ops/knowledge/deleted/${target.id}.json`), "utf8")))) : noteVersion(await fs.readFile(path.join(workspace, target.path), "utf8"));
    return { id: target.id, path: target.path, version, changedPaths, affectedIds, retiredIds: operation === "notes.delete" ? [target.id] : sources.map(s => s.id) };
  }
}
export { KnowledgeChanges, noteIdentity, noteVersion };
