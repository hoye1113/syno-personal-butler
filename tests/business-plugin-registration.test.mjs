import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, selectToolDefinitions } from "../config/deepseek-harness/syno-tool-bridge-plugin.mjs";
import { BUSINESS_TOOL_SPECS } from "../packages/syno-core/business-tools.mjs";
test('production plugin exposes business tools alongside in-process reads and sends DSH-owned turn identity', async () => {
    const oldFetch = globalThis.fetch;
    const names = ['SYNO_CHAT_TOOLS', 'SYNO_BRIDGE_ORIGIN', 'SYNO_BRIDGE_TOKEN'];
    const env = Object.fromEntries(names.map(n => [n, process.env[n]]));
    try {
        delete process.env.SYNO_CHAT_TOOLS;
        process.env.SYNO_BRIDGE_ORIGIN = 'http://127.0.0.1/test';
        process.env.SYNO_BRIDGE_TOKEN = 'test';
        const registered = [];
        let called;
        globalThis.fetch = async (_url, options) => {
            const body = JSON.parse(options.body);
            if (body.method === 'tools/list')
                return { ok: true, json: async () => ({ result: { tools: [...BUSINESS_TOOL_SPECS.map(s => ({ ...s, name: s.name.replaceAll('.', '_') })), { name: 'knowledge_search', description: 'Search', inputSchema: { type: 'object' } }] } }) };
            called = body;
            return { ok: true, json: async () => ({ result: { structuredContent: { status: 'completed' } } }) };
        };
        await apply({ tools: { register(t) {
                    registered.push(t);
                } } }, { toolSet: 'core' });
        assert.equal(registered.length, BUSINESS_TOOL_SPECS.length);
        assert.equal(registered.some(t => t.name === 'syno_knowledge_search'), false);
        const tool = registered.find(t => t.name === 'syno_actions_create');
        await tool.execute({ title: '中文待办' }, { agent: { id: 'session-web', session: { snapshotEvents: () => [{ seq: 0, type: 'turn/start' }, { seq: 1, type: 'user/message', data: { id: 'human-1', source: { kind: 'user' } } }, { seq: 2, type: 'user/message', data: { id: 'injected', source: { kind: 'runtime-context' } } }] } } });
        assert.equal(called.params.sessionId, 'session-web');
        assert.equal(called.params.userMessageId, 'human-1');
        assert.deepEqual(called.params.arguments, { title: '中文待办' });
        const capture = selectToolDefinitions([{ name: 'browser_snapshot' }, { name: 'actions_create' }], 'browser');
        assert.deepEqual(capture, [{ name: 'browser_snapshot' }]);
    }
    finally {
        globalThis.fetch = oldFetch;
        for (const n of names) {
            if (env[n] === undefined)
                delete process.env[n];
            else
                process.env[n] = env[n];
        }
    }
});
