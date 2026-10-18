import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createBusinessTools, BUSINESS_TOOL_NAMES } from "../packages/syno-core/business-tools.mjs";
import { executeDomainOperation } from "../packages/syno-core/domain-operations.mjs";
import { listDomainRecords } from "../packages/syno-core/domain-records.mjs";
import { PendingDecisionStore } from "../packages/syno-core/pending-decision.mjs";
import { ToolRegistry } from "../apps/syno/syno/tool-registry.mjs";
import { SynoToolBridge } from "../apps/syno/syno/syno-tool-bridge.mjs";
import { EffectReceiptStore } from "../apps/syno/syno/effect-receipt-store.mjs";
import { validateRepositoryChange } from "../packages/syno-core/validator.mjs";
import { evaluate } from "../packages/syno-core/policy.mjs";
const base = path.resolve(".");

async function fixture(t) {
    const root = await fs.mkdtemp(path.join(tmpdir(), 'syno-tools-中文-'));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    const opsRoot = path.join(root, 'ops'), requests = [], workflows = new Map();
    const pendingDecisions = new PendingDecisionStore({ file: path.join(root, 'pending.json') });
    const services = { pendingDecisions, core: { host: { async list() {
                    return [{ id: 'background', status: 'running', request: { operation: 'ingest.apply' } }];
                } }, async execute(request, context) {
                requests.push({ request, context });
                const result = await executeDomainOperation(request.operation, request.payload, { workspace: root, job: { ownerKey: context.ownerKey, request } });
                await validateRepositoryChange({ repoRoot: root, contractRoot: base, changedPaths: result.changedPaths, decision: evaluate(request) });
                return { job: { id: 'job-' + requests.length, status: 'completed', result: { operationResult: result } } };
            }, async inspect() {
                return { result: {} };
            }, async approve(id) {
                return { job: { id, status: 'completed' } };
            } }, ingestWorkflows: { async receive(payload, ctx) {
                const workflow = { id: 'workflow-' + workflows.size, stage: 'received', ownerKey: ctx.ownerKey };
                workflows.set(workflow.id, workflow);
                return { workflow };
            }, async status(id, ctx) {
                const w = workflows.get(id);
                if (w && w.ownerKey !== ctx.ownerKey)
                    throw Error('owner');
                return w;
            }, async listPending(owner) {
                return [...workflows.values()].filter(w => w.ownerKey === owner);
            }, schedule(fn) {
                this.queued = fn;
            }, async retry() {
                throw Error('must not await analysis');
            } } };
    const tools = new ToolRegistry(createBusinessTools(() => services, { opsRoot }));
    const effects = new EffectReceiptStore({ root: path.join(root, 'effects'), payloadRoot: path.join(root, 'payloads'), lockFile: path.join(root, 'lock'), protect: async (x) => Buffer.from(x).toString('base64'), unprotect: async (x) => Buffer.from(x, 'base64').toString('utf8') });
    const make = () => new SynoToolBridge({ tools, token: 'test', effectReceipts: effects });
    let bridge = make(), release;
    const sessionId = 'syno-main-' + 'a'.repeat(32);
    function bind(messageId = 'turn-1', extra = {}) {
        release?.();
        release = bridge.bindContext({ ownerKey: 'owner', threadKey: 'main', channel: 'feishu', messageId, harnessSessionId: sessionId, privateConversation: true, allowedTools: BUSINESS_TOOL_NAMES.map(n => n.replaceAll('.', '_')), ...extra });
    }
    bind();
    t.after(() => release?.());
    const raw = (name, args = {}, extra = {}) => bridge.handle({ authorization: 'Bearer test', body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: name.replaceAll('.', '_'), arguments: args, sessionId, ...extra } } });
    async function call(name, args = {}, extra = {}) {
        const r = await raw(name, args, extra);
        assert.equal(r.error, undefined, JSON.stringify(r));
        assert.equal(r.result.isError, false, JSON.stringify(r));
        return r.result.structuredContent;
    }
    return { root, opsRoot, requests, services, raw, call, bind, tools, effectVersion: () => bridge.effectVersion(), restart() {
            release();
            release = null;
            bridge = make();
            bind();
        } };
}
test('distinct actions, persistent replay, completion and overview', async (t) => {
    const f = await fixture(t);
    const a = await f.call('actions.create', { title: '周五阅读', scheduledStart: '2026-10-23T09:00:00+08:00' });
    const b = await f.call('actions.create', { title: '整理笔记' });
    assert.notEqual(a.record.id, b.record.id);
    f.restart();
    assert.deepEqual(await f.call('actions.create', { scheduledStart: '2026-10-23T09:00:00+08:00', title: '周五阅读' }), a);
    assert.equal(f.requests.length, 2);
    const view = await f.call('work.overview');
    assert.equal(view.actions.length, 2);
    assert.equal(view.jobs[0].id, 'background');
    f.bind('turn-2');
    assert.equal((await f.call('actions.update', { id: a.record.id, version: a.version, status: 'completed' })).record.status, 'completed');
    assert.equal((await f.call('actions.list')).actions.length, 1);
    assert.equal((await f.raw('actions.update', { id: a.record.id, version: a.version, status: 'archived' })).result.isError, true);
});
test('memory proposes then waits for later confirmation and validates note', async (t) => {
    const f = await fixture(t);
    const proposed = await f.call('memory.propose', { statement: '以后回答优先给中文实例' });
    assert.equal(proposed.record.status, 'proposed');
    await assert.rejects(fs.access(path.join(f.root, 'vault')), { code: 'ENOENT' });
    const [d] = (await f.call('decisions.list')).decisions;
    assert.equal((await f.raw('decisions.resolve', { id: d.id, version: d.version, action: 'approve' })).result.isError, true);
    f.bind('later-confirm');
    const done = await f.call('decisions.resolve', { id: d.id, version: d.version, action: 'approve' });
    assert.equal(done.record.status, 'approved');
    assert.match(await fs.readFile(path.join(f.root, done.record.notePath), 'utf8'), /中文实例/);
    assert.equal((await f.call('decisions.list')).decisions.length, 0);
});
test('memory rejection never creates vault and owner is enforced', async (t) => {
    const f = await fixture(t);
    await f.call('memory.propose', { statement: '偏好简短回复' });
    assert.equal((await listDomainRecords(f.opsRoot, 'memory', 'stranger')).length, 0);
    const [d] = (await f.call('decisions.list')).decisions;
    f.bind('reject');
    assert.equal((await f.call('decisions.resolve', { id: d.id, version: d.version, action: 'reject' })).record.status, 'rejected');
    await assert.rejects(fs.access(path.join(f.root, 'vault')), { code: 'ENOENT' });
});
test('capture is explicit and references safe attachments', async (t) => {
    const f = await fixture(t);
    const w = await f.call('capture.submit', { kind: 'url', value: 'https://example.com/article' });
    assert.equal(w.stage, 'received');
    assert.equal((await f.call('capture.get', { id: w.id })).stage, 'received');
    await f.call('capture.resume', { id: w.id });
    assert.equal(typeof f.services.ingestWorkflows.queued, 'function');
    f.bind('file', { attachments: [{ id: 'file-1', payload: { kind: 'text', value: '资料' } }] });
    assert.equal((await f.call('capture.submit', { kind: 'attachment', attachmentId: 'file-1' })).stage, 'received');
    assert.equal((await f.raw('capture.submit', { kind: 'attachment', attachmentId: 'forged' })).result.isError, true);
    assert.equal((await f.raw('capture.submit', { kind: 'attachment', attachmentId: 'file-1', path: '/secret' })).error.code, -32602);
});
test('session, private chat and identity guards', async (t) => {
    const f = await fixture(t);
    assert.equal((await f.raw('actions.create', { title: 'x', ownerKey: 'victim' })).error.code, -32602);
    assert.equal((await f.raw('actions.create', { title: 'x' }, { sessionId: 'other' })).error.code, -32003);
    f.bind('group', { privateConversation: false });
    assert.equal((await f.raw('actions.create', { title: 'x' })).error.code, -32003);
    assert.equal(f.requests.length, 0);
});
test('decision requires current version and consumes one exact item', async (t) => {
    const f = await fixture(t);
    const d = await f.services.pendingDecisions.add({ ownerKey: 'owner', threadKey: 'main', jobId: 'job-c', summary: '选择方案', options: ['create'], businessVersion: 'v1' });
    const [old] = (await f.call('decisions.list')).decisions;
    await f.services.pendingDecisions.update(d.id, { businessVersion: 'v2' });
    assert.equal((await f.raw('decisions.resolve', { id: d.id, version: old.version, action: 'approve' })).result.isError, true);
    f.bind('fresh');
    const [fresh] = (await f.call('decisions.list')).decisions;
    assert.equal((await f.call('decisions.resolve', { id: d.id, version: fresh.version, action: 'approve' })).status, 'completed');
    assert.equal((await f.call('decisions.list')).decisions.length, 0);
});
test("temporary attachments can be read completely in bounded Unicode-safe slices without capture", async (t) => {
    const f = await fixture(t);
    const content = "前".repeat(199) + "😀" + "正文".repeat(6500);
    f.bind("read-only", { attachments: [{ id: "long-file", name: "长文.txt", content }] });
    const parts = [];
    let offset = 0;
    do {
        const result = await f.call("attachments.read", { attachmentId: "long-file", offset, maxChars: 200 });
        parts.push(result.snippet);
        assert.doesNotMatch(result.snippet, /[\uD800-\uDBFF]$|^[\uDC00-\uDFFF]/u);
        if (result.nextOffset === null)
            break;
        assert.ok(result.nextOffset > offset);
        offset = result.nextOffset;
    } while (true);
    assert.equal(parts.join(""), content);
    assert.equal(f.requests.length, 0);
    assert.equal((await f.call("capture.list")).workflows.length, 0);
});
test("concurrent duplicate writes have one effect and replayed effects still disable model fallback", async (t) => {
    const f = await fixture(t);
    const replies = await Promise.all([f.raw("actions.create", { title: "只创建一次" }), f.raw("actions.create", { title: "只创建一次" })]);
    assert.ok(replies.some((reply) => reply.result?.isError === false));
    assert.equal(f.requests.length, 1);
    const before = f.effectVersion();
    await f.call("actions.create", { title: "只创建一次" });
    assert.ok(f.effectVersion() > before);
    f.restart();
    const afterRestart = f.effectVersion();
    await f.call("actions.create", { title: "只创建一次" });
    assert.ok(f.effectVersion() > afterRestart);
    assert.equal(f.requests.length, 1);
});
test("direct privileged DSH Web uses the bound Owner/thread and cannot resurrect quarantined sessions", async (t) => {
    const f = await fixture(t);
    const { createSynoRuntime } = await import("../apps/syno/syno/runtime.mjs");
    let lifecycle = "available";
    const runtime = createSynoRuntime({ harnessBindings: { async list() {
                return [{ ownerKey: "owner", threadKey: "main", harnessSessionId: "web-session", lifecycle }];
            } } });
    const bridge = new SynoToolBridge({ tools: f.tools, token: "web-test", resolveWebContext: runtime.toolBridge.resolveWebContext });
    const call = (extra = {}) => bridge.handle({ authorization: "Bearer web-test", body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "work_overview", arguments: {}, sessionId: "web-session", ...extra } } });
    assert.equal((await call()).error.code, -32001);
    assert.equal((await call({ userMessageId: "human-turn" })).result.isError, false);
    lifecycle = "quarantined";
    assert.equal((await call({ userMessageId: "human-turn" })).error.code, -32001);
    assert.equal(await runtime.toolBridge.resolveWebContext({ sessionId: "syno-capture-artifact-1", userMessageId: "human-turn" }), null);
});

test('overview ignores directory guides and reads existing frontmatter memory proposals', async (t) => {
    const f = await fixture(t);
    await f.call('actions.create', { title: '真实目录结构验证' });
    for (const kind of ['actions', 'memory']) {
        await fs.mkdir(path.join(f.opsRoot, kind), { recursive: true });
        await fs.writeFile(path.join(f.opsRoot, kind, 'README.md'), '# Directory guide\n');
    }
    await fs.mkdir(path.join(f.opsRoot, 'memory', 'proposals'));
    await fs.writeFile(path.join(f.opsRoot, 'memory', 'proposals', 'memory-legacy.md'), '---\nid: memory-legacy\nstatement: "旧格式长期约定"\nreason: "主人提出"\nstatus: proposed\nownerKey: owner\n---\n# Memory proposal\n');
    assert.equal((await f.call('actions.list')).actions.length, 1);
    const view = await f.call('work.overview');
    assert.equal(view.actions.length, 1);
    assert.equal(view.decisions[0].id, 'memory-legacy');
    assert.equal(view.decisions[0].summary, '旧格式长期约定');
    assert.equal((await listDomainRecords(f.opsRoot, 'memory', 'stranger')).length, 0);
});
test('domain listing still rejects malformed business records', async (t) => {
    const f = await fixture(t);
    await fs.mkdir(path.join(f.opsRoot, 'memory'), { recursive: true });
    await fs.writeFile(path.join(f.opsRoot, 'memory', 'memory-broken.md'), '<!-- syno:json:start -->\n```json\n{broken}\n```\n<!-- syno:json:end -->');
    await assert.rejects(listDomainRecords(f.opsRoot, 'memory', 'owner'), SyntaxError);
});
