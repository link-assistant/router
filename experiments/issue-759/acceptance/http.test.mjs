import test from 'node:test';
import assert from 'node:assert/strict';
import { load, upstream } from './helpers.mjs';

const { createNativeRouter } = await load('packages/javascript/native/server.mjs');
const { TokenManager } = await load('packages/javascript/native/tokens.mjs');
const message = { model: 'fixture/model', messages: [{ role: 'user', content: 'What is 7+5?' }], max_tokens: 20 };
const chatReply = { id: 'reply-acceptance', model: 'actual-model', choices: [{ message: { role: 'assistant', content: '12' }, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 } };
async function router(t, candidates, issue = {}) {
  const tokens = new TokenManager({ secret: 'http-acceptance-secret' });
  const token = await tokens.issue(issue);
  const events = [];
  // Selection is fixed fixture state here. This isolates HTTP transport from
  // routing algorithms, while retaining the actual native token authority.
  const core = { config: { admin_token: 'admin-acceptance-only' }, tokens, models: async () => ['fixture/model'],
    candidates: async () => candidates,
    reportFailure: async (candidate, result) => events.push({ account: candidate.account, failure: result.status }),
    reportSuccess: async candidate => events.push({ account: candidate.account, success: true }) };
  const app = createNativeRouter({ core, timeoutMs: 2000 });
  await app.listen({ host: '127.0.0.1', port: 0 });
  t.after(() => app.close());
  const origin = `http://127.0.0.1:${app.address.port}`;
  const request = (path, body = message, headers = {}, method = 'POST') => fetch(origin + path, {
    method, headers: { authorization: `Bearer ${token.token}`, 'content-type': 'application/json', ...headers },
    ...(body === null ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }), signal: AbortSignal.timeout(5000) });
  return { app, core, tokens, token, request, origin, events };
}

test('actual HTTP relay strips client secrets and uses selected upstream identity', async t => {
  const mock = await upstream(t, (_, response) => { response.writeHead(200, { 'content-type': 'application/json', 'x-request-id': 'upstream-acceptance' }); response.end(JSON.stringify(chatReply)); });
  const runtime = await router(t, [{ protocol: 'chat', baseUrl: mock.origin, apiKey: 'upstream-secret', model: 'actual-model', account: 'primary' }]);
  const response = await runtime.request('/v1/chat/completions', message, { cookie: 'session=client-cookie', 'x-api-key': 'client-secret', 'x-request-id': 'client-id' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-request-id'), 'upstream-acceptance');
  assert.equal((await response.json()).choices[0].message.content, '12');
  assert.equal(mock.requests.length, 1);
  const observed = mock.requests[0];
  assert.equal(observed.path, '/v1/chat/completions');
  assert.equal(observed.headers.authorization, 'Bearer upstream-secret');
  assert.equal(observed.headers.cookie, undefined);
  assert.equal(observed.headers['x-api-key'], undefined);
  assert.equal(observed.headers['x-request-id'], 'client-id');
  assert.equal(JSON.parse(observed.body).model, 'actual-model');
  const record = await runtime.tokens.get(runtime.token.id);
  assert.equal(record.used_requests, 1);
  assert.equal(record.reserved_tokens, 0);
  assert.equal(record.used_tokens, 5);
});

test('unauthorized, malformed JSON, unsupported body and exhausted token never contact upstream', async t => {
  const mock = await upstream(t, (_, response) => { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(chatReply)); });
  const runtime = await router(t, [{ protocol: 'chat', baseUrl: mock.origin, model: 'actual-model', account: 'primary' }], { max_tokens: 10 });
  assert.equal((await runtime.request('/v1/chat/completions', message, { authorization: 'Bearer invalid' })).status, 401);
  assert.equal((await runtime.request('/v1/chat/completions', '{not-json')).status, 400);
  assert.equal((await runtime.request('/v1/chat/completions', { ...message, messages: 'not-array' })).status, 400);
  assert.equal((await runtime.request('/v1/chat/completions', { ...message, stream: 'yes' })).status, 400);
  const limited = await runtime.request('/v1/chat/completions');
  assert.equal(limited.status, 429);
  assert.equal(mock.requests.length, 0);
  assert.equal((await runtime.tokens.get(runtime.token.id)).used_requests, 0);
  const management = await runtime.request('/api/management/tokens', null, {}, 'GET');
  assert.equal(management.status, 403);
});

test('request limit and revocation are enforced over HTTP after a successful dispatch', async t => {
  const mock = await upstream(t, (_, response) => { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(chatReply)); });
  const runtime = await router(t, [{ protocol: 'chat', baseUrl: mock.origin, model: 'actual-model', account: 'primary' }], { max_requests: 1 });
  assert.equal((await runtime.request('/v1/chat/completions')).status, 200);
  assert.equal((await runtime.request('/v1/chat/completions')).status, 429);
  await runtime.tokens.revoke(runtime.token.id);
  assert.equal((await runtime.request('/v1/chat/completions')).status, 401);
  assert.equal(mock.requests.length, 1);
});

test('429 fails over before bytes reach the client and settles a single request', async t => {
  const failing = await upstream(t, (_, response) => { response.writeHead(429, { 'content-type': 'application/json', 'retry-after': '30' }); response.end('{"error":"temporary"}'); });
  const healthy = await upstream(t, (_, response) => { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(chatReply)); });
  const runtime = await router(t, [
    { protocol: 'chat', baseUrl: failing.origin, model: 'actual-model', account: 'first' },
    { protocol: 'chat', baseUrl: healthy.origin, model: 'actual-model', account: 'second' },
  ]);
  const response = await runtime.request('/v1/chat/completions');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).choices[0].message.content, '12');
  assert.equal(failing.requests.length, 1);
  assert.equal(healthy.requests.length, 1);
  assert.ok(runtime.events.some(event => event.account === 'first' && event.failure === 429));
  assert.ok(runtime.events.some(event => event.account === 'second' && event.success));
  assert.equal((await runtime.tokens.get(runtime.token.id)).used_requests, 1);
  assert.equal((await runtime.tokens.get(runtime.token.id)).used_tokens, 5);
});

test('same-dialect SSE survives network chunk boundaries and records usage once', async t => {
  const data = 'data: ' + JSON.stringify({ id: 'stream-fixture', choices: [{ delta: { content: 'hé🙂' }, finish_reason: null }] }) + '\n\n' +
    'data: ' + JSON.stringify({ id: 'stream-fixture', choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 } }) + '\n\ndata: [DONE]\n\n';
  const mock = await upstream(t, async (_, response) => {
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    const bytes = Buffer.from(data);
    for (let offset = 0; offset < bytes.length; offset += 7) response.write(bytes.subarray(offset, offset + 7));
    response.end();
  });
  const runtime = await router(t, [{ protocol: 'chat', baseUrl: mock.origin, model: 'actual-model', account: 'primary' }]);
  const response = await runtime.request('/v1/chat/completions', { ...message, stream: true });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), data);
  const record = await runtime.tokens.get(runtime.token.id);
  assert.equal(record.used_requests, 1);
  assert.equal(record.reserved_tokens, 0);
  assert.equal(record.used_tokens, 5);
});

test('truncated SSE cannot become a successful completion or retry after emitted bytes', async t => {
  const mock = await upstream(t, (_, response) => {
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.end('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n');
  });
  const backup = await upstream(t, (_, response) => { response.writeHead(500); response.end(); });
  const runtime = await router(t, [
    { protocol: 'chat', baseUrl: mock.origin, model: 'actual-model', account: 'first' },
    { protocol: 'chat', baseUrl: backup.origin, model: 'actual-model', account: 'second' },
  ]);
  const response = await runtime.request('/v1/chat/completions', { ...message, stream: true });
  let failed = response.status >= 400;
  if (!failed) { try { const output = await response.text(); failed = /event: error|"type":"error"|"error"/.test(output); } catch { failed = true; } }
  assert.equal(failed, true, 'EOF without terminal event must be observable as an error');
  assert.equal(backup.requests.length, 0);
  assert.equal(runtime.events.some(event => event.success), false);
  assert.equal((await runtime.tokens.get(runtime.token.id)).reserved_tokens, 0);
});
