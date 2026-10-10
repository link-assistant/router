import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeRouter } from '../../../packages/javascript/native/server.mjs';
import { ResponsesStore, normalizeResponseInput } from '../../../packages/javascript/native/responses.mjs';

const response = { id: 'resp_one', object: 'response', status: 'completed', model: 'alias', output: [{ id: 'msg_one', type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Hello', annotations: [] }] }], usage: { input_tokens: 2, output_tokens: 1, total_tokens: 3 } };
const config = { token_secret: 'secret' };
const core = () => ({ config, candidates: () => [{ protocol: 'responses', model: 'upstream', account: 'a', baseUrl: 'http://localhost:1/v1', apiKey: 'upstream' }], tokens: { validate: value => ({ sub: value }), admit: () => 'admitted', settle() {} } });
const make = (path, method = 'GET', body, token = 'alice') => new Request(`http://router${path}`, { method, headers: { authorization: `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
const create = (router, extra = {}, prefix = '/v1') => router.fetch(make(`${prefix}/responses`, 'POST', { model: 'alias', input: [{ role: 'user', content: 'first' }, { role: 'user', content: 'second' }], ...extra }));
const frame = payload => `data: ${JSON.stringify(payload)}\n\n`;

test('foreground Responses create/retrieve/input-items/delete use exact IDs and owner isolation', async () => {
  const router = createNativeRouter({ core: core(), fetch: async () => Response.json(response) });
  const created = await create(router); assert.equal(created.status, 200); assert.equal((await created.json()).id, 'resp_one');
  assert.equal((await router.fetch(make('/v1/responses/resp_one', 'GET', undefined, 'bob'))).status, 404);
  assert.equal((await router.fetch(make('/api/services/openai/v1/responses/resp_one'))).status, 404);
  const retrieved = await (await router.fetch(make('/v1/responses/resp_one'))).json(); assert.equal(retrieved.id, 'resp_one'); assert.equal(retrieved.model, 'alias'); assert.equal(retrieved.output[0].id, 'msg_one');
  const list = await (await router.fetch(make('/v1/responses/resp_one/input_items?order=asc&limit=1'))).json(); assert.equal(list.data[0].content[0].text, 'first'); assert.equal(list.has_more, true);
  const page2 = await (await router.fetch(make(`/v1/responses/resp_one/input_items?order=asc&after=${list.last_id}`))).json(); assert.equal(page2.data[0].content[0].text, 'second'); assert.equal(page2.has_more, false);
  assert.equal((await router.fetch(make('/v1/responses/resp_one/input_items?limit=101'))).status, 400);
  assert.equal((await router.fetch(make('/v1/responses/resp_one/cancel', 'POST'))).status, 409);
  const deleted = await (await router.fetch(make('/v1/responses/resp_one', 'DELETE'))).json(); assert.deepEqual(deleted, { id: 'resp_one', object: 'response.deleted', deleted: true });
  assert.equal((await router.fetch(make('/v1/responses/resp_one'))).status, 404);
  assert.equal((await router.fetch(make('/v1/responses/resp_one', 'DELETE'))).status, 404);
});
test('canonical Responses namespace supports retained foreground creation', async () => {
  const router = createNativeRouter({ core: core(), fetch: async () => Response.json(response) });
  assert.equal((await create(router, {}, '/api/services/openai/v1')).status, 200);
  assert.equal((await router.fetch(make('/api/services/openai/v1/responses/resp_one'))).status, 200);
  assert.equal((await router.fetch(make('/v1/responses/resp_one'))).status, 404);
});
test('store:false and unsupported stateful controls never create lifecycle resources', async () => {
  let calls = 0;
  const router = createNativeRouter({ core: core(), fetch: async () => { calls++; return Response.json(response); } });
  assert.equal((await create(router, { store: false })).status, 200);
  assert.equal((await router.fetch(make('/v1/responses/resp_one'))).status, 404);
  for (const extra of [{ background: true }, { conversation: 'conv_a' }, { previous_response_id: 'resp_unknown' }]) assert.equal((await create(router, extra)).status, 501);
  assert.equal(calls, 1);
});
test('retention expiration, record eviction, byte caps and duplicate IDs are enforced', () => {
  let time = 100;
  const store = new ResponsesStore({ clock: () => time, ttlMs: 100, maxRecords: 1, maxBytes: 4096, maxRecordBytes: 2048 });
  store.save('/v1', 'a', response, []); store.save('/v1', 'a', { ...response, id: 'resp_two' }, []);
  assert.throws(() => store.get('/v1', 'a', 'resp_one'), /not found/); assert.throws(() => store.save('/v1', 'a', { ...response, id: 'resp_two' }, []), /already retained/);
  assert.throws(() => store.save('/v1', 'a', { ...response, id: 'big', output: ['x'.repeat(3000)] }, []), /storage limit/);
  time = 201; assert.throws(() => store.get('/v1', 'a', 'resp_two'), /not found/); assert.equal(store.bytes, 0);
});
test('native Responses SSE completion retains its complete resource and usage', async () => {
  let used;
  const c = core(); c.tokens.settle = (_id, _reserve, total) => { used = total; };
  c.tokens.validate = (value, { model }) => { if (model && model !== 'alias') throw Object.assign(new Error('Model outside token scope'), { status: 403 }); return { sub: value }; };
  const raw = frame({ type: 'response.created', response: { ...response, model: 'upstream', status: 'in_progress', output: [], usage: null } }) + frame({ type: 'response.completed', response: { ...response, model: 'upstream' } });
  const router = createNativeRouter({ core: c, fetch: async () => new Response(raw, { headers: { 'content-type': 'text/event-stream' } }) });
  const output = await (await create(router, { stream: true })).text(); assert.match(output, /response.completed/); assert.equal(used, 3);
  const stored = await (await router.fetch(make('/v1/responses/resp_one'))).json(); assert.equal(stored.status, 'completed'); assert.equal(stored.model, 'alias'); assert.equal(stored.output[0].content[0].text, 'Hello');
});
test('bridge streaming completion is retrievable with announced response ID', async () => {
  const c = core(); c.candidates = () => [{ protocol: 'chat', model: 'upstream', account: 'a', baseUrl: 'http://localhost:1/v1' }];
  const raw = frame({ id: 'chat_one', choices: [{ index: 0, delta: { content: 'Hello' }, finish_reason: 'stop' }] }) + 'data: [DONE]\n\n';
  const router = createNativeRouter({ core: c, fetch: async () => new Response(raw, { headers: { 'content-type': 'text/event-stream' } }) });
  const output = await (await create(router, { stream: true })).text(); assert.match(output, /resp_chat_one/);
  const stored = await (await router.fetch(make('/v1/responses/resp_chat_one'))).json(); assert.equal(stored.id, 'resp_chat_one'); assert.equal(stored.status, 'completed'); assert.equal(stored.output[0].content[0].text, 'Hello');
});
test('cancelling an active native response aborts upstream and keeps cancelled ownership record', async () => {
  let aborted = false;
  const router = createNativeRouter({ core: core(), fetch: async (_url, { signal }) => {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(frame({ type: 'response.created', response: { ...response, status: 'in_progress', output: [], usage: null } }))); signal.addEventListener('abort', () => { aborted = true; controller.error(new Error('aborted')); }, { once: true }); } });
    return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
  } });
  const streaming = await create(router, { stream: true }); const reader = streaming.body.getReader(); await reader.read();
  assert.equal((await router.fetch(make('/v1/responses/resp_one/cancel', 'POST', undefined, 'bob'))).status, 404); assert.equal(aborted, false);
  const cancelled = await (await router.fetch(make('/v1/responses/resp_one/cancel', 'POST'))).json(); assert.equal(cancelled.status, 'cancelled'); assert.equal(aborted, true);
  let remainder = ''; while (true) { const { value, done } = await reader.read(); if (done) break; remainder += new TextDecoder().decode(value); }
  assert.match(remainder, /upstream_stream_error/); assert.doesNotMatch(remainder, /response.completed/);
  assert.equal((await (await router.fetch(make('/v1/responses/resp_one'))).json()).status, 'cancelled');
});
test('HTTPS configuration is rejected before an HTTP listener can start', () => {
  for (const tls of [{ tls_self_signed: true }, { tls_cert: 'cert.pem' }, { tls_key: 'key.pem' }, { listeners: [{ protocol: 'https' }] }]) assert.throws(() => createNativeRouter({ core: { ...core(), config: tls } }), /HTTPS listeners/);
});
test('deleting an active stream aborts it and cannot resurrect the response', async () => {
  let aborted = false;
  const router = createNativeRouter({ core: core(), fetch: async (_url, { signal }) => new Response(new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode(frame({ type: 'response.created', response: { ...response, status: 'in_progress', output: [], usage: null } })));
    signal.addEventListener('abort', () => { aborted = true; controller.error(new Error('deleted')); }, { once: true });
  } }), { headers: { 'content-type': 'text/event-stream' } }) });
  const reader = (await create(router, { stream: true })).body.getReader(); await reader.read();
  assert.equal((await router.fetch(make('/v1/responses/resp_one', 'DELETE'))).status, 200); assert.equal(aborted, true);
  while (!(await reader.read()).done) {}
  assert.equal((await router.fetch(make('/v1/responses/resp_one'))).status, 404);
  assert.throws(() => router.responseStore.save('/v1', 'alice', response, [], { update: true }), /not found/);
});
test('active records cannot be evicted by capacity pressure and shutdown aborts them', () => {
  let aborted = false;
  const store = new ResponsesStore({ maxRecords: 1 });
  store.save('/v1', 'a', { ...response, status: 'in_progress' }, [], { abort: () => { aborted = true; } });
  assert.throws(() => store.save('/v1', 'b', { ...response, id: 'other' }, []), /storage is full/);
  assert.equal(aborted, false); store.close(); assert.equal(aborted, true); assert.equal(store.bytes, 0);
});
test('near-cap cancellation and failure fit precharged transition allocations', () => {
  const active = { ...response, status: 'in_progress', error: undefined, incomplete_details: undefined };
  const probe = new ResponsesStore(), allocation = probe.size({ namespace: '/v1', owner: 'a', input: [], response: active });
  for (const action of ['cancel', 'fail']) {
    let aborted = false;
    const store = new ResponsesStore({ maxBytes: allocation, maxRecordBytes: allocation });
    store.save('/v1', 'a', active, [], { abort: () => { aborted = true; } });
    store[action]('/v1', 'a', active.id);
    const record = [...store.records.values()][0]; assert.equal(store.bytes, allocation); assert.equal(record.bytes, allocation); assert.ok(store.serializedBytes(record) <= record.bytes); assert.ok(store.serializedBytes(record) <= store.maxRecordBytes);
    assert.equal(record.response.status, action === 'cancel' ? 'cancelled' : 'failed'); assert.equal(aborted, action === 'cancel');
  }
  for (const body of [{}, { input: null }, { input: {} }, null]) assert.throws(() => normalizeResponseInput(body), error => error.status === 400 && /input/.test(error.message));
});
