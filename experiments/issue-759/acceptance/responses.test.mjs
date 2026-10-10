import test from 'node:test';
import assert from 'node:assert/strict';
import { load, upstream } from './helpers.mjs';

const { createNativeRouter } = await load('packages/javascript/native/server.mjs');
const { TokenManager } = await load('packages/javascript/native/tokens.mjs');
const completed = id => ({ id, object: 'response', status: 'completed', model: 'upstream-model',
  output: [{ id: 'message-exact', type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'retained answer', annotations: [] }] }],
  usage: { input_tokens: 2, output_tokens: 1, total_tokens: 3 } });
async function fixture(t, origin) {
  const tokens = new TokenManager({ secret: 'response-acceptance-secret' });
  const alice = await tokens.issue(), bob = await tokens.issue();
  const core = { config: {}, tokens, candidates: async () => [{ protocol: 'responses', baseUrl: origin, model: 'upstream-model', account: 'primary', apiKey: 'response-upstream-secret' }] };
  const app = createNativeRouter({ core, timeoutMs: 3000 });
  await app.listen({ host: '127.0.0.1', port: 0 });
  t.after(() => app.close());
  const request = (path, method = 'GET', body, owner = alice) => fetch(`http://127.0.0.1:${app.address.port}${path}`, {
    method, headers: { authorization: `Bearer ${owner.token}`, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000) });
  return { request, tokens, alice, bob };
}

test('foreground Responses retention exposes exact IDs, owner isolation, pagination and deletion over HTTP', async t => {
  let count = 0;
  const mock = await upstream(t, (_, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(completed(`response-${++count}`)));
  });
  const runtime = await fixture(t, mock.origin);
  const body = { model: 'fixture/model', input: [{ id: 'first-item', role: 'user', content: 'first' }, { id: 'second-item', role: 'user', content: 'second' }], max_output_tokens: 10 };
  const created = await runtime.request('/v1/responses', 'POST', body);
  assert.equal(created.status, 200, await created.clone().text());
  assert.equal((await created.json()).id, 'response-1');
  const retrieved = await runtime.request('/v1/responses/response-1');
  assert.equal(retrieved.status, 200);
  assert.equal((await retrieved.json()).output[0].id, 'message-exact');
  assert.equal((await runtime.request('/v1/responses/response-1', 'GET', undefined, runtime.bob)).status, 404);
  assert.equal((await runtime.request('/v1/responses/response-1', 'DELETE', undefined, runtime.bob)).status, 404);
  const first = await (await runtime.request('/v1/responses/response-1/input_items?order=asc&limit=1')).json();
  assert.equal(first.data[0].id, 'first-item');
  assert.equal(first.data[0].content[0].text, 'first');
  assert.equal(first.has_more, true);
  const second = await (await runtime.request('/v1/responses/response-1/input_items?order=asc&after=first-item')).json();
  assert.equal(second.data[0].id, 'second-item');
  assert.equal(second.has_more, false);
  assert.equal((await runtime.request('/v1/responses/response-1/cancel', 'POST')).status, 409);
  const deleted = await runtime.request('/v1/responses/response-1', 'DELETE');
  assert.deepEqual(await deleted.json(), { id: 'response-1', object: 'response.deleted', deleted: true });
  assert.equal((await runtime.request('/v1/responses/response-1')).status, 404);
  assert.equal((await runtime.request('/v1/responses', 'POST', { ...body, store: false })).status, 200);
  assert.equal((await runtime.request('/v1/responses/response-2')).status, 404);
  for (const extra of [{ background: true }, { previous_response_id: 'response-1' }, { conversation: 'unknown' }]) {
    assert.equal((await runtime.request('/v1/responses', 'POST', { ...body, ...extra })).status, 501);
  }
  assert.equal(mock.requests.length, 2);
  assert.equal(mock.requests[0].headers.authorization, 'Bearer response-upstream-secret');
  assert.equal((await runtime.tokens.get(runtime.alice.id)).used_tokens, 6);
});

test('only the owner can cancel an active Responses stream; cancellation aborts actual upstream and releases reservation', async t => {
  let closed = false, resolveClosed;
  const disconnected = new Promise(resolve => { resolveClosed = resolve; });
  const mock = await upstream(t, (_, response) => {
    response.on('close', () => { closed = true; resolveClosed(); });
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.write('data: ' + JSON.stringify({ type: 'response.created', response: { ...completed('response-active'), status: 'in_progress', output: [], usage: null } }) + '\n\n');
  });
  const runtime = await fixture(t, mock.origin);
  const stream = await runtime.request('/v1/responses', 'POST', { model: 'fixture/model', input: 'hello', max_output_tokens: 20, stream: true });
  assert.equal(stream.status, 200);
  const reader = stream.body.getReader();
  const first = await reader.read();
  assert.match(new TextDecoder().decode(first.value), /response.created/);
  assert.equal((await runtime.request('/v1/responses/response-active/cancel', 'POST', undefined, runtime.bob)).status, 404);
  assert.equal(closed, false);
  const cancelled = await runtime.request('/v1/responses/response-active/cancel', 'POST');
  assert.equal(cancelled.status, 200);
  assert.equal((await cancelled.json()).status, 'cancelled');
  let timeout;
  try { await Promise.race([disconnected, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Cancellation did not close upstream socket')), 2000); })]); }
  finally { clearTimeout(timeout); }
  let remainder = '';
  while (true) { const chunk = await reader.read(); if (chunk.done) break; remainder += new TextDecoder().decode(chunk.value); }
  assert.doesNotMatch(remainder, /response.completed/);
  const retained = await runtime.request('/v1/responses/response-active');
  assert.equal((await retained.json()).status, 'cancelled');
  assert.equal((await runtime.request('/v1/responses/response-active/cancel', 'POST')).status, 409);
  assert.equal((await runtime.tokens.get(runtime.alice.id)).reserved_tokens, 0);
  assert.equal((await runtime.tokens.get(runtime.alice.id)).used_tokens, 0);
  assert.equal(mock.requests.length, 1);
});
