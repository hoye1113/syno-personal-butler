import test from "node:test";
import assert from "node:assert/strict";
import { FeishuPublisher, checked, renderBlocks } from "../packages/syno-core/feishu-bitable-sync.mjs";
test("Feishu errors never disappear; permission denial is nonretryable", () => {
 assert.throws(() => checked({ code: 99991672, msg: "permission denied" }), { code: "SYNC_PERMISSION_DENIED", outcomeKnown: true });
 assert.throws(() => checked({ code: 1, msg: "error" }));
});
test("text is lossless and image position remains native block", () => {
 const blocks = renderBlocks({ body: "before\n![x](99-System/Attachments/p.png)\nafter", resources: { items: [{ role: "body_image", downloadStatus: "succeeded", localRef: "vault/99-System/Attachments/p.png", digest: "p" }] } });
 assert.deepEqual(blocks.map(b => b.block_type), [2,27,2]);
 assert.equal(blocks[1].resource.digest, "p");
});
test("catalog updates preserve unmanaged fields and verify the applied version", async () => {
 let saved, args;
 const adapter = new FeishuPublisher({ client: { bitable: { appTableRecord: { async update(input) { args=input; saved=input.data.fields; return {code:0,data:{record:{record_id:"r"}}}; }, async get() { return {code:0,data:{record:{fields:{...saved,personal:"keep"}}}}; } } } } });
 const config = { appToken:"test", tableId:"table", fields:{id:"ID",title:"Title",version:"Version"} };
 const result = await adapter.apply("catalog", { note:{id:"n",title:"题目",version:"v"},state:{remoteId:"r"},record:{targets:{wiki:{}}},config,effect:async(_,run)=>run() });
 assert.equal(result.remoteId,"r"); assert.equal(args.data.fields.personal,undefined); assert.equal(saved.Version,"v");
});

test("sandbox permission probe performs real adapter create/update/image/cleanup calls",async t=>{
 const {promises:fs}=await import('node:fs');const os=await import('node:os');const path=await import('node:path');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'syno-feishu-probe-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 let blocks=[],fields={},seq=0,uploads=0,created=0,deleted=0;
 const adapter=new FeishuPublisher({root,client:{wiki:{spaceNode:{async create(){created++;return{code:0,data:{node:{node_token:'node',obj_token:'doc'}}}}}},docx:{v1:{documentBlockChildren:{async get(){return{code:0,data:{items:blocks,has_more:false}}},async batchDelete({data}){assert.ok(data.end_index-data.start_index<=50);blocks.splice(data.start_index,data.end_index-data.start_index);return{code:0}},async create({data}){const children=data.children.map(b=>({...structuredClone(b),block_id:`b${++seq}`}));blocks.push(...children);return{code:0,data:{children}}}},documentBlock:{async patch({path,data}){blocks.find(b=>b.block_id===path.block_id).image.token=data.replace_image.token;return{code:0}}}}},drive:{v1:{media:{async uploadAll(){return{file_token:`image-${++uploads}`}}}}},bitable:{appTableRecord:{async create({data}){fields=data.fields;return{code:0,data:{record:{record_id:'row'}}}},async update({data}){fields=data.fields;return{code:0,data:{record:{record_id:'row'}}}},async get(){return{code:0,data:{record:{fields}}}},async delete(){deleted++;return{code:0}}}}}});
 const report=await adapter.probe({config:{mode:'sandbox',sandboxConfirmed:true,wikiSpaceId:'space',wikiParentId:'parent',appToken:'app',tableId:'table',fields:{id:'ID',version:'Version'}},effect:async(_,run)=>run()});
 assert.equal(report.capabilities.mediaUploadFill,true);assert.equal(report.ownerAccess,'pending_owner_verification');assert.equal(created,1);assert.equal(uploads,2);assert.equal(deleted,1);assert.equal(report.cleanup.wikiNodeRetained,true);
});

test("image retries reject human text edits before uploading or filling",async()=>{
 let uploads=0;
 const adapter=new FeishuPublisher({client:{docx:{v1:{documentBlockChildren:{async get(){return{code:0,data:{items:[{block_id:"text",block_type:2,text:{elements:[{text_run:{content:"human change"}}]}}]}}}}}},drive:{v1:{media:{async uploadAll(){uploads++;}}}}}});
 await assert.rejects(adapter.apply("images",{note:{body:"original",resources:{items:[]}},state:{},record:{targets:{wiki:{docId:"doc",imageBlocks:[]}}},config:{},effect:async(_,run)=>run()}),{code:"SYNC_REMOTE_CONFLICT"});assert.equal(uploads,0);
});

test("publishing discovery is read-only, bounded and never claims write or Owner access",async()=>{
 const calls=[];
 const adapter = new FeishuPublisher({ client: {
   wiki: { space: {
     async list(input) { calls.push(input); return { code: 0, data: { items: [{ space_id: 's', name: '测试空间' }], has_more: true } }; },
     async getNode() { return { code: 0, data: { node: { node_token: 'p', space_id: 'different', title: '父节点' } } }; },
   } },
   bitable: { appTableField: { async list(input) { calls.push(input); return { code: 0, data: { items: [{ field_name: 'ID', type: 1 }], has_more: false } }; } } },
 } });
 const result=await adapter.inspect({wikiSpaceId:'s',wikiParentId:'p',appToken:'app',tableId:'table',fields:{id:'ID',version:'Version'}});
 assert.equal(result.writeAccess,'not_verified_by_read_check');assert.equal(result.ownerAccess,'not_verified');
 assert.equal(result.checks.wikiSpaces.truncated,true);assert.equal(result.checks.wikiParent.matchesConfiguredSpace,false);
 assert.deepEqual(result.checks.catalogFields.missingMappings,['version']);assert.equal(calls[0].params.page_size,10);
});
test("publishing discovery reports permission failures without leaking raw errors",async()=>{
 const adapter=new FeishuPublisher({client:{wiki:{space:{async list(){throw new Error('private-token-must-not-leak')}}}}});
 const result=await adapter.inspect({});assert.equal(result.checks.wikiSpaces.status,'blocked');assert.ok(!JSON.stringify(result).includes('private-token'));
});
