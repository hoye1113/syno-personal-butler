import { sliceKnowledgeText } from "./knowledge-read.mjs";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { FeishuCredentialStore } from "./feishu-channel.mjs";
const hash = v => createHash("sha256").update(JSON.stringify(v)).digest("hex");
function checked(response) {
  if (response?.code && response.code !== 0) {
    const denied = /permission|forbidden|scope|权限|denied/iu.test(response.msg || "");
    throw Object.assign(new Error(denied ? "飞书写入权限不足" : "飞书操作返回错误"), { code: denied ? "SYNC_PERMISSION_DENIED" : /rate|limit|频率|too many|server|temporary/iu.test(response.msg || "") ? `FEISHU_${response.code}` : "SYNC_CONFIGURATION_INVALID", outcomeKnown: true });
  }
  return response?.file_token ? { file_token: response.file_token } : response?.data || response;
}
function managedBlocks(blocks) {
  return blocks.map(b => b.block_type === 27 ? { image: b.image?.token || "" } : { text: (b.text?.elements || []).map(e => e.text_run?.content || "").join("") });
}
function renderBlocks(note) {
  const items = note.resources.items.filter(r => r.role === "body_image" && r.downloadStatus === "succeeded");
  const output = [];
  const body = note.deleted ? "此知识已删除。历史版本不在本次清理范围。" : note.mergedInto ? `此知识已合并至 ${note.mergedLink}。` : note.body;
  for (const line of String(body).split(/\r?\n/u)) {
    let rest = line;
    const image = /!\[[^\]]*\]\(([^)]+)\)/gu; let start = 0;
    for (const match of line.matchAll(image)) {
      const ref = items.find(r => r.localRef.slice(6) === match[1] || r.source === match[1] || note.path && path.posix.normalize(path.posix.join(path.posix.dirname(note.path), match[1])) === r.localRef);
      if (!ref) throw Object.assign(new Error("正文图片没有资源清单"), { code: "SOURCE_RESOURCE_INCOMPLETE" });
      const before = line.slice(start, match.index); if (before) output.push({ block_type: 2, text: { elements: [{ text_run: { content: before } }] } });
      output.push({ block_type: 27, image: {}, resource: ref }); start = match.index + match[0].length;
    }
    rest = line.slice(start);
    // Docx text_run has finite size; split losslessly without truncating the source.
    for (let offset = 0; offset < rest.length;) {
      const slice = sliceKnowledgeText(rest, offset, 1800);
      output.push({ block_type: 2, text: { elements: [{ text_run: { content: slice.snippet } }] } });
      if (slice.nextOffset === null) break; offset = slice.nextOffset;
    }
  }
  return output;
}
class FeishuPublisher {
  constructor({ credentials = new FeishuCredentialStore(), sdkLoader = () => import("@larksuiteoapi/node-sdk"), root, client } = {}) { Object.assign(this, { credentials, sdkLoader, root, client }); }
  async api() {
    if (!this.client) {
      const credential = await this.credentials.load();
      if (!credential?.appId || !credential?.appSecret) throw Object.assign(new Error("飞书凭据未配置"), { code: "SYNC_PERMISSION_DENIED" });
      const sdk = await this.sdkLoader(); this.client = new sdk.Client({ appId: credential.appId, appSecret: credential.appSecret });
    }
    return this.client;
  }
  async blocks(docId) {
    const client = await this.api(), items = []; let page_token;
    do {
      const data = checked(await client.docx.v1.documentBlockChildren.get({ path: { document_id: docId, block_id: docId }, params: { page_size: 500, ...(page_token ? { page_token } : {}) } }));
      items.push(...(data.items || [])); page_token = data.has_more ? data.page_token : null;
      if (data.has_more && !page_token) throw new Error("Docx 分页不完整");
    } while (page_token);
    return items;
  }
  fields(note, config, record) {
    const values = { id: note.id, title: note.title, summary: note.summary || "", category: note.category || "", localPath: note.path, version: note.version, wiki: record.targets.wiki.link || "", status: record.targets.images?.appliedVersion === note.version || record.targets.images?.verifiedVersion === note.version ? "synced" : "pending" };
    return Object.fromEntries(Object.entries(config.fields).map(([key, field]) => [field, values[key] ?? ""]));
  }
  async read(target, { state, record, config }) {
    const client = await this.api();
    if (target === "catalog") {
      const data = checked(await client.bitable.appTableRecord.get({ path: { app_token: config.appToken, table_id: config.tableId, record_id: state.remoteId } }));
      const fields = Object.fromEntries(Object.values(config.fields).map(key => [key, data.record?.fields?.[key] ?? ""]));
      return { fingerprint: hash(fields), fields };
    }
    const blocks = await this.blocks(state.docId || record.targets.wiki.docId);
    return { fingerprint: hash(managedBlocks(blocks)), blocks };
  }
  async verifyImageBaseline(note, record, events) {
    const blocks = await this.blocks(record.targets.wiki.docId), desired = managedBlocks(renderBlocks(note));
    const actual = managedBlocks(blocks);
    for (const item of record.targets.wiki.imageBlocks || []) {
      const index = blocks.findIndex(b => b.block_id === item.blockId);
      const token = events.findLast(e => e.event === "effect.observed" && e.metadata.operation === `images.fill.${item.digest}.${item.blockId}`)?.metadata.remoteId;
      if (index < 0 || !desired[index] || !("image" in desired[index])) throw Object.assign(new Error("云端图片区块已变化"), { code: "SYNC_REMOTE_CONFLICT" });
      // Only an observed write may explain a nonempty token after a partial attempt.
      desired[index] = { image: token || "" };
    }
    if (JSON.stringify(actual) !== JSON.stringify(desired)) throw Object.assign(new Error("图片回填前云端正文已被修改"), { code: "SYNC_REMOTE_CONFLICT" });
    return blocks;
  }
  async apply(target, { note, state, record, config, effect }) {
    const client = await this.api();
    if (target === "wiki") {
      if (note.mergedInto && !note.mergedLink) throw Object.assign(new Error("合并目标 Wiki 尚未就绪"), { code: "SYNC_DEPENDENCY_PENDING" });
      const desired = renderBlocks(note);
      let remoteId = state.remoteId, docId = state.docId;
      if (!remoteId) {
        const created = await effect("wiki.create", async () => {
          const d = checked(await client.wiki.spaceNode.create({ path: { space_id: config.wikiSpaceId }, data: { obj_type: "docx", node_type: "origin", parent_node_token: config.wikiParentId, title: note.title } }));
          if (!d.node?.node_token || !d.node?.obj_token) throw new Error("Wiki 创建缺少资源身份");
          return { remoteId: d.node.node_token, docId: d.node.obj_token };
        }); remoteId = created.remoteId; docId = created.docId;
      }
      const blocks = await this.blocks(docId);
      for (let end = blocks.length; end > 0; end -= 50) await effect(`wiki.clear.${end}`, async () => { checked(await client.docx.v1.documentBlockChildren.batchDelete({ path: { document_id: docId, block_id: docId }, data: { start_index: Math.max(0, end - 50), end_index: end } })); return { remoteId }; });
      const imageBlocks = [];
      for (let i = 0; i < desired.length; i += 50) {
        const chunk = desired.slice(i, i + 50);
        const created = await effect(`wiki.blocks.${i}`, async () => {
          const d = checked(await client.docx.v1.documentBlockChildren.create({ path: { document_id: docId, block_id: docId }, data: { children: chunk.map(({ resource, ...block }) => block) } }));
          if (d.children?.length !== chunk.length) throw new Error("Docx 区块写入数量不完整");
          return { remoteId, children: d.children };
        });
        chunk.forEach((b, index) => { if (b.resource) imageBlocks.push({ blockId: created.children[index].block_id, digest: b.resource.digest, localRef: b.resource.localRef }); });
      }
      const actual = await this.blocks(docId);
      if (JSON.stringify(managedBlocks(actual)) !== JSON.stringify(managedBlocks(desired))) throw new Error("Wiki 正文版本核验失败");
      return { remoteId, docId, imageBlocks, fingerprint: hash(managedBlocks(actual)), link: `${config.wikiOrigin || "https://www.feishu.cn"}/wiki/${remoteId}` };
    }
    if (target === "catalog") {
      if (note.deleted || note.mergedInto) {
        if (state.remoteId) await effect("catalog.delete", async () => { checked(await client.bitable.appTableRecord.delete({ path: { app_token: config.appToken, table_id: config.tableId, record_id: state.remoteId } })); return { remoteId: state.remoteId }; });
        return { remoteId: null, fingerprint: hash(null), deleted: true };
      }
      const fields = this.fields(note, config, record);
      const result = await effect(state.remoteId ? "catalog.update" : "catalog.create", async () => {
        const common = { path: { app_token: config.appToken, table_id: config.tableId, ...(state.remoteId ? { record_id: state.remoteId } : {}) }, data: { fields } };
        const d = checked(await client.bitable.appTableRecord[state.remoteId ? "update" : "create"](common));
        const remoteId = d.record?.record_id || state.remoteId; if (!remoteId) throw new Error("目录记录未返回身份");
        return { remoteId };
      });
      const verified = await this.read("catalog", { state: result, record, config });
      if (hash(fields) !== verified.fingerprint) throw new Error("目录字段核验失败");
      return { ...result, fingerprint: verified.fingerprint, link: `${config.bitableOrigin || "https://www.feishu.cn"}/base/${config.appToken}?table=${config.tableId}&record=${result.remoteId}` };
    }
    if (target === "images") {
      await this.verifyImageBaseline(note, record, effect.observed || []);
      const expected = record.targets.wiki.imageBlocks || [], receipts = [];
      for (const item of expected) {
        const file = path.resolve(this.root, item.localRef);
        const [real, root] = await Promise.all([fs.realpath(file), fs.realpath(path.join(this.root, "vault/99-System/Attachments"))]);
        if (path.relative(root, real).startsWith("..")) throw new Error("图片路径越界");
        const bytes = await fs.readFile(real);
        if (createHash("sha256").update(bytes).digest("hex") !== item.digest) throw new Error("图片摘要已经变化");
        const uploadOperation = `images.upload.${item.digest}.${item.blockId}`;
        const previous = effect.observed?.findLast(e => e.metadata.operation === uploadOperation)?.metadata.remoteId;
        const uploaded = previous ? { remoteId: previous } : await effect(uploadOperation, async () => {
          const d = checked(await client.drive.v1.media.uploadAll({ data: { file_name: path.basename(file), parent_type: "docx_image", parent_node: item.blockId, size: bytes.length, file: bytes } }));
          if (!d.file_token) throw new Error("图片上传未返回身份"); return { remoteId: d.file_token };
        });
        await effect(`images.fill.${item.digest}.${item.blockId}`, async () => { checked(await client.docx.v1.documentBlock.patch({ path: { document_id: record.targets.wiki.docId, block_id: item.blockId }, data: { replace_image: { token: uploaded.remoteId } } })); return { remoteId: uploaded.remoteId }; });
        receipts.push({ blockId: item.blockId, digest: item.digest, token: uploaded.remoteId });
      }
      const actual = await this.blocks(record.targets.wiki.docId);
      for (const image of receipts) if (!actual.some(b => b.block_id === image.blockId && b.image?.token === image.token)) throw new Error("图片回填核验失败");
      return { receipts, verifiedVersion: note.version, fingerprint: hash(receipts), wikiFingerprint: hash(managedBlocks(actual)) };
    }
    throw new Error("未知发布端");
  }
  async reconcile(target, { note, state, events, record, config }) {
    if (target === "wiki") {
      const observed = events.findLast(e => e.event === "effect.observed" && e.metadata.operation === "wiki.create");
      const remoteId = state.remoteId || observed?.metadata.remoteId;
      if (!remoteId) return null; // Unknown create cannot be rediscovered uniquely: never create again.
      const client = await this.api();
      const node = checked(await client.wiki.space.getNode({ params: { token: remoteId } })).node;
      if (!node?.obj_token) return null;
      const blocks = await this.blocks(node.obj_token), desired = renderBlocks(note);
      if (JSON.stringify(managedBlocks(blocks)) !== JSON.stringify(managedBlocks(desired))) return null;
      return { remoteId, docId: node.obj_token, fingerprint: hash(managedBlocks(blocks)), imageBlocks: blocks.flatMap((b, i) => desired[i]?.resource ? [{ blockId: b.block_id, digest: desired[i].resource.digest, localRef: desired[i].resource.localRef }] : []), link: `${config.wikiOrigin || "https://www.feishu.cn"}/wiki/${remoteId}` };
    }
    if (target === "catalog") {
      const observed = events.findLast(e => e.event === "effect.observed" && /^catalog\.(?:create|update)$/u.test(e.metadata.operation));
      const remoteId = state.remoteId || observed?.metadata.remoteId; if (!remoteId) return null;
      const remote = await this.read(target, { state: { remoteId }, record, config });
      if (remote.fingerprint !== hash(this.fields(note, config, record))) return null;
      return { remoteId, fingerprint: remote.fingerprint };
    }
    if (target === "images") {
      const blocks = await this.blocks(record.targets.wiki.docId), receipts = [];
      for (const item of record.targets.wiki.imageBlocks || []) {
        const token = events.findLast(e => e.event === "effect.observed" && (e.metadata.operation === `images.fill.${item.digest}.${item.blockId}` || e.metadata.operation === `images.upload.${item.digest}.${item.blockId}`))?.metadata.remoteId;
        if (!token || !blocks.some(b => b.block_id === item.blockId && b.image?.token === token)) return null;
        receipts.push({ blockId: item.blockId, digest: item.digest, token });
      }
      const expected = managedBlocks(renderBlocks(note));
      for (const item of receipts) { const index = blocks.findIndex(b => b.block_id === item.blockId); if (index < 0 || !expected[index] || !("image" in expected[index])) return null; expected[index] = { image: item.token }; }
      if (JSON.stringify(managedBlocks(blocks)) !== JSON.stringify(expected)) throw Object.assign(new Error("未知图片效果对账发现云端正文冲突"), { code: "SYNC_REMOTE_CONFLICT" });
      return { receipts, verifiedVersion: note.version, fingerprint: hash(receipts), wikiFingerprint: hash(managedBlocks(blocks)) };
    }
    return null;
  }
  async probe({ config, ownerAccess = false, effect, probeId = `probe-${Date.now()}` }) {
    if (config.mode !== "sandbox" || !config.sandboxConfirmed) throw new Error("写权限探针只允许已确认的隔离 sandbox");
    if (!effect || !/^probe-[A-Za-z0-9-]+$/u.test(probeId)) throw new Error("探针缺少持久效果边界或准确身份");
    const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvX8AAAAASUVORK5CYII=", "base64");
    const digest = createHash("sha256").update(bytes).digest("hex"), localRef = `vault/99-System/Attachments/by-digest/${digest}.png`, file = path.join(this.root, localRef);
    await fs.mkdir(path.dirname(file), { recursive: true });
    const existed = await fs.access(file).then(() => true, e => { if (e.code === "ENOENT") return false; throw e; });
    if (!existed) await fs.writeFile(file, bytes, { flag: "wx" });
    const note = { id: probeId, title: `Syno 隔离权限探针 ${probeId}`, path: "sandbox-probe", body: `权限探针 v1\n![探针图片](${localRef.slice(6)})`, version: "probe-v1", summary: "隔离位置能力验证", category: "probe", resources: { complete: true, items: [{ role: "body_image", downloadStatus: "succeeded", digest, localRef }] } };
    const record = { targets: { wiki: {}, catalog: {}, images: {} } };
    try {
      for (const version of ["probe-v1", "probe-v2"]) {
        note.version = version; note.body = `权限探针 ${version}\n![探针图片](${localRef.slice(6)})`;
        record.targets.wiki = await this.apply("wiki", { note, state: record.targets.wiki, record, config, effect });
        record.targets.images = await this.apply("images", { note, state: record.targets.images, record, config, effect });
        record.targets.catalog = await this.apply("catalog", { note, state: record.targets.catalog, record, config, effect });
      }
      const links = { wiki: record.targets.wiki.link, catalog: record.targets.catalog.link };
      note.deleted = true; note.body = ""; note.resources.items = [];
      record.targets.wiki = await this.apply("wiki", { note, state: record.targets.wiki, record, config, effect });
      record.targets.catalog = await this.apply("catalog", { note, state: record.targets.catalog, record, config, effect });
      return { probeId, status: ownerAccess ? "write_capabilities_verified_owner_reported_access" : "write_capabilities_verified_owner_access_pending", capabilities: { wikiCreateUpdate: true, docxReadWriteClear: true, mediaUploadFill: true, bitableCreateUpdateDelete: true }, ownerAccess: ownerAccess ? "reported_by_owner" : "pending_owner_verification", links, cleanup: { catalogDeleted: true, wikiCurrentBodyMarkedDeleted: true, wikiNodeRetained: true }, remoteIds: { wiki: record.targets.wiki.remoteId } };
    } finally { if (!existed) await fs.unlink(file).catch(() => {}); }
  }

}
export { FeishuPublisher, checked, renderBlocks, managedBlocks };
