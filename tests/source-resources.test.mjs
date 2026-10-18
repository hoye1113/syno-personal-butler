import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { SourceResources, htmlImageReferences } from "../packages/syno-core/source-resources.mjs";
const png = Buffer.from([137,80,78,71,13,10,26,10,1,2,3]);
test("HTML images keep content order; only semantic navigation is decorative", () => {
 const result = htmlImageReferences('<nav><img src="avatar.png"></nav><main><p>图前</p><img data-src="/tiny.png" alt="原理示意"><p>图后</p></main>', 'https://example.com/article');
 assert.equal(result.refs[0].role, "decoration"); assert.equal(result.refs[1].source, "https://example.com/tiny.png"); assert.match(result.html, /!\[原理示意\]/);
});
test("resources dedupe by bytes, retain manifest, fail missing relative attachments without reading disk", async t => {
 const root = await fs.mkdtemp(path.join(os.tmpdir(), "syno-assets-")); t.after(() => fs.rm(root, { recursive: true, force: true }));
 const resources = new SourceResources({ cacheRoot: path.join(root,"cache"), fetcher: async () => ({ bytes: png, mime: "image/png" }) });
 const body = "![one](https://example.com/a.png)\n![two](https://example.com/b.png)";
 const m = await resources.prepare(body); assert.equal(m.complete,true); assert.equal(m.items[0].digest,m.items[1].digest);
 const applied = await resources.apply(m, { workspace: root, noteId: "note-1", noteVersion: "v1", content: body });
 assert.equal(applied.changedPaths.filter(p => p.endsWith(".png")).length,1); assert.doesNotMatch(applied.content,/https:\/\//);
 const missing = await resources.prepare("![secret](../../secrets.png)"); assert.equal(missing.complete,false); assert.equal(missing.items[0].downloadStatus,"failed");
});
test("download failure and unsupported image prevent complete status", async t => {
 const resources = new SourceResources({ cacheRoot: os.tmpdir(), fetcher: async () => ({ bytes: Buffer.from("not png"), mime: "image/png" }) });
 const m = await resources.prepare("![x](https://example.com/x.png)"); assert.equal(m.complete,false);
});

test("shared asset is removed only after all valid references disappear",async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"syno-shared-assets-"));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const resources=new SourceResources({cacheRoot:path.join(root,"cache"),fetcher:async()=>({bytes:png,mime:"image/png"})});
 const manifest=await resources.prepare("![shared](https://example.com/p.png)");const result=await resources.apply(manifest,{workspace:root,noteId:"n",content:"![shared](https://example.com/p.png)"});
 const file=path.join(root,"vault/00-Inbox/n.md");await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,result.content);
 const candidates=[manifest.items[0].localRef];assert.deepEqual(await resources.cleanup({workspace:root,candidates}),[]);
 await fs.unlink(file);assert.deepEqual(await resources.cleanup({workspace:root,candidates}),candidates);
});

test("relative image links resolve from nested notes and unsupported inline graphics remain missing",async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"syno-relative-images-"));t.after(()=>fs.rm(root,{recursive:true,force:true}));const resources=new SourceResources({cacheRoot:path.join(root,"cache"),fetcher:async()=>({bytes:png,mime:"image/png"})});
 const manifest=await resources.prepare('![x](https://example.com/p.png)');const notePath='vault/02-Resources/Topic/n.md';const result=await resources.apply(manifest,{workspace:root,noteId:'n',notePath,content:'![x](https://example.com/p.png)'});
 const reference=/\]\(([^)]+)\)/u.exec(result.content)[1];assert.equal(path.posix.normalize(path.posix.join(path.posix.dirname(notePath),reference)),manifest.items[0].localRef);
 const refs=htmlImageReferences('<article><canvas></canvas><svg></svg></article>','https://example.com');const missing=await resources.prepare('',{resources:refs.refs});assert.equal(missing.complete,false);assert.equal(missing.items.length,2);
});

test("unimplemented reference-style images are partial instead of silently disappearing", async () => {
 const r=new SourceResources({cacheRoot:os.tmpdir()});const m=await r.prepare("正文 ![原图][figure]\n\n[figure]: https://example.com/p.png");assert.equal(m.complete,false);assert.equal(m.items[0].basis,"unsupported_image_reference");
});

test("legacy shorthand shared image references also prevent cleanup",async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"syno-short-image-ref-"));t.after(()=>fs.rm(root,{recursive:true,force:true}));const resources=new SourceResources({cacheRoot:path.join(root,"cache"),fetcher:async()=>({bytes:png,mime:"image/png"})});const m=await resources.prepare("![x](https://example.com/a.png)");await resources.apply(m,{workspace:root,noteId:"n",content:"![x](https://example.com/a.png)"});await fs.mkdir(path.join(root,"vault/00-Inbox"),{recursive:true});await fs.writeFile(path.join(root,"vault/00-Inbox/legacy.md"),`![[${path.basename(m.items[0].localRef)}]]`);assert.deepEqual(await resources.cleanup({workspace:root,candidates:[m.items[0].localRef]}),[]);
});
