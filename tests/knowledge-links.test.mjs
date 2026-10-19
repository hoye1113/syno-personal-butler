import test from "node:test";
import assert from "node:assert/strict";
import { noteLinks, resolveNoteLink } from "../packages/syno-core/knowledge-links.mjs";
test("code masks retain source offsets and skip nested ticks, long fences and unclosed fences",()=>{
 const source='``x ` [[ignore]]``\n````md\n[[ignore2]]\n`````\n😀 [[target|别名]]\n```md\n[[unclosed]]';
 const links=noteLinks(source,'vault/00-Inbox/a.md');assert.equal(links.length,1);assert.equal(links[0].text,'[[target|别名]]');assert.equal(source.slice(links[0].start,links[0].end),links[0].text);
});
test("markdown resolves relative paths before root fallbacks and wiki ambiguity is explicit",()=>{
 const paths=new Set(['vault/a.md','vault/00-Inbox/a.md','vault/02-Resources/a.md']);
 const [link]=noteLinks('[local](a.md)','vault/00-Inbox/b.md');assert.deepEqual(resolveNoteLink(link,paths),['vault/00-Inbox/a.md']);
 const [wiki]=noteLinks('[[a]]','vault/01-Areas/b.md');paths.delete('vault/a.md');assert.equal(resolveNoteLink(wiki,paths).length,2);
});
