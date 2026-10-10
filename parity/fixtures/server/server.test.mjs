import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createNativeRouter } from '../../../packages/javascript/native/server.mjs';
import { translateRequest, translateResponse } from '../../../packages/javascript/native/protocols.mjs';
import { decodeSSE, translateStream } from '../../../packages/javascript/native/streams.mjs';

const candidate = { provider: 'openai', protocol: 'chat', model: 'upstream-model', baseUrl: 'http://127.0.0.1:12345/v1', apiKey: 'upstream-secret', account: 'account-a' };
const body = { model: 'alias', messages: [{ role: 'user', content: 'hello' }] };
const chat = { id: 'chat_1', model: 'upstream-model', choices: [{ index: 0, message: { role: 'assistant', content: 'hello', tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'weather', arguments: '{"city":"Paris"}' } }] }, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 7, completion_tokens: 4, total_tokens: 11 } };
const request = (path = '/v1/chat/completions', payload = body, headers = {}) => new Request(`http://router${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer client-secret', ...headers }, body: JSON.stringify(payload) });
function core(overrides = {}) {
  return { config: { api_key: 'client-secret', admin_token: 'admin-secret' }, candidates: async () => [candidate], models: () => ['alias'], reportFailure() {}, reportSuccess() {}, ...overrides };
}
const sse = (data, event) => `${event ? `event: ${event}\n` : ''}data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`;
const streamBody = value => new Response(value).body;

test('request and response adapters preserve tools, system and usage', () => {
  const anthropic = translateRequest({ ...body, messages: [{ role: 'system', content: 'Be helpful' }, { role: 'assistant', content: null, tool_calls: chat.choices[0].message.tool_calls }, { role: 'tool', tool_call_id: 'call_1', content: 'sunny' }] }, 'chat', 'anthropic', 'claude');
  assert.equal(anthropic.system, 'Be helpful'); assert.equal(anthropic.messages[0].content[0].input.city, 'Paris'); assert.equal(anthropic.messages[1].content[0].tool_use_id, 'call_1');
  const message = translateResponse(chat, 'chat', 'anthropic', 'alias');
  assert.equal(message.stop_reason, 'tool_use'); assert.equal(message.usage.input_tokens, 7); assert.equal(message.content[1].input.city, 'Paris');
  const responses = translateResponse(message, 'anthropic', 'responses', 'alias');
  assert.equal(responses.output[1].call_id, 'call_1'); assert.equal(responses.usage.total_tokens, 11);
});
test('unsupported bridge fields fail explicitly while native fields pass through', () => {
  assert.throws(() => translateRequest({ ...body, response_format: { type: 'json_schema' } }, 'chat', 'anthropic'), /response_format/);
  assert.throws(() => translateRequest({ model: 'x', input: 'hi', previous_response_id: 'resp_1' }, 'responses', 'chat'), /Stateful/);
  assert.equal(translateRequest({ ...body, response_format: { type: 'json_schema' } }, 'chat', 'chat').response_format.type, 'json_schema');
});
test('local upstream HTTP receives selected credential and no client cookie or bearer', async t => {
  let received;
  const upstream = createServer(async (req, res) => { let raw = ''; for await (const chunk of req) raw += chunk; received = { headers: req.headers, body: JSON.parse(raw), url: req.url }; res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': 'secret=value', 'x-request-id': 'trace-1' }); res.end(JSON.stringify(chat)); });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { upstream.close(resolve); upstream.closeIdleConnections?.(); }));
  const router = createNativeRouter({ core: core({ candidates: () => [{ ...candidate, baseUrl: `http://127.0.0.1:${upstream.address().port}` }] }) });
  const response = await router.fetch(request('/v1/messages', { ...body, max_tokens: 12 }, { cookie: 'client=value', 'x-api-key': 'untrusted' }));
  assert.equal(response.status, 200); assert.equal((await response.json()).stop_reason, 'tool_use');
  assert.equal(received.url, '/v1/chat/completions'); assert.equal(received.headers.authorization, 'Bearer upstream-secret'); assert.equal(received.headers.cookie, undefined); assert.equal(received.headers['x-api-key'], undefined); assert.equal(received.body.model, 'upstream-model'); assert.equal(response.headers.get('set-cookie'), null); assert.equal(response.headers.get('x-request-id'), 'trace-1');
});
test('bounded failover retries transient errors and leaves request errors alone', async () => {
  let attempts = 0; const failures = [];
  const router = createNativeRouter({ core: core({ candidates: () => [candidate, { ...candidate, account: 'b' }], reportFailure: (_c, f) => failures.push(f) }), fetch: async () => { attempts++; return attempts === 1 ? new Response('rate limited', { status: 429, headers: { 'retry-after': '2' } }) : Response.json(chat); } });
  assert.equal((await router.fetch(request())).status, 200); assert.equal(attempts, 2); assert.equal(failures[0].retryAfter, '2');
  attempts = 0;
  const bad = createNativeRouter({ core: core({ candidates: () => [candidate, candidate] }), fetch: async () => { attempts++; return new Response('bad', { status: 400 }); } });
  assert.equal((await bad.fetch(request())).status, 400); assert.equal(attempts, 1);
});
test('authentication, model discovery, administrative mutation and redaction', async () => {
  let issued;
  const router = createNativeRouter({ core: core({ tokens: { list: () => [{ id: 'one', token: 'private' }], issue: value => { issued = value; return { token: 'issued' }; } }, providers: { list: () => [{ name: 'a', api_key: 'secret' }] } }) });
  assert.equal((await router.fetch(new Request('http://router/v1/models'))).status, 401);
  const listed = await router.fetch(new Request('http://router/v1/models', { headers: { authorization: 'Bearer client-secret' } })); assert.equal((await listed.json()).data[0].id, 'alias');
  assert.equal((await router.fetch(request('/api/management/tokens', {}))).status, 401);
  const token = await router.fetch(request('/api/management/tokens/client', { label: 'cli', scope: 'admin' }, { authorization: 'Bearer admin-secret' })); assert.equal(token.status, 201); assert.equal(issued.scope, '');
  const providers = await router.fetch(new Request('http://router/api/management/providers', { headers: { authorization: 'Bearer admin-secret' } })); assert.equal((await providers.json()).providers[0].api_key, '[REDACTED]');
});
test('token admission denial prevents upstream and token usage settles by sub', async () => {
  let called = 0, actual;
  const tokens = { validate: () => ({ sub: 'id' }), admit: () => 'token_limit_exceeded', settle: (_id, _reserved, used) => { actual = used; } };
  const router = createNativeRouter({ core: core({ config: {}, tokens }), fetch: async () => { called++; return Response.json(chat); } });
  assert.equal((await router.fetch(request())).status, 429); assert.equal(called, 0);
  tokens.admit = () => 'admitted'; assert.equal((await router.fetch(request())).status, 200); assert.equal(actual, 11);
});
test('UTF8 SSE decoder handles CRLF and multiline, bounds multibyte and comment lines', async () => {
  const raw = new TextEncoder().encode(': comment\r\nevent: test\r\ndata: {"text":\r\ndata: "😀"}\r\n\r\n');
  const stream = new ReadableStream({ start(c) { for (const byte of raw) c.enqueue(Uint8Array.of(byte)); c.close(); } });
  const values = []; for await (const value of decodeSSE(stream)) values.push(value); assert.deepEqual(JSON.parse(values[0].data), { text: '😀' });
  for (const data of ['data: 😀😀😀😀\n\n', ':'.repeat(50) + '\n\n', 'data: ' + 'x'.repeat(50) + '\n\n']) {
    await assert.rejects(async () => { for await (const _ of decodeSSE(streamBody(data), { maxFrameBytes: 12 })) {} }, /exceeds limit/);
  }
});
test('incremental Chat to Messages streaming preserves parallel tools and usage', async () => {
  const raw = sse({ id: 's1', choices: [{ index: 0, delta: { content: 'Hi' } }] }) + sse({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 't0', function: { name: 'one', arguments: '{"x":' } }, { index: 1, id: 't1', function: { name: 'two', arguments: '{"y":' } }] } }] }) + sse({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '1}' } }, { index: 1, function: { arguments: '2}' } }] }, finish_reason: 'tool_calls' }] }) + sse({ choices: [], usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 } }) + sse('[DONE]');
  const output = await new Response(translateStream(streamBody(raw), 'chat', 'anthropic', 'alias')).text();
  const frames = []; for await (const f of decodeSSE(streamBody(output))) frames.push(JSON.parse(f.data));
  assert.equal(frames.filter(f => f.type === 'content_block_start').length, 3); assert.equal(frames.filter(f => f.type === 'content_block_stop').length, 3); assert.equal(frames.at(-2).usage.input_tokens, 5); assert.equal(frames.at(-2).delta.stop_reason, 'tool_use'); assert.equal(frames.at(-1).type, 'message_stop');
  const firstStop = frames.findIndex(f => f.type === 'content_block_stop' && f.index === 1), finalArgs = frames.findIndex(f => f.delta?.partial_json === '1}'); assert.ok(firstStop > finalArgs);
});
test('native streaming settles usage and truncated native/cross streams emit error without success', async () => {
  let actual;
  const complete = sse({ id: 's', choices: [{ index: 0, delta: { content: 'hi' }, finish_reason: 'stop' }] }) + sse({ choices: [], usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 } }) + sse('[DONE]');
  const router = createNativeRouter({ core: core({ config: {}, tokens: { validate: () => ({ sub: 'id' }), admit: () => null, settle: (_id, _reserved, used) => { actual = used; } } }), fetch: async () => new Response(complete, { headers: { 'content-type': 'text/event-stream' } }) });
  const output = await (await router.fetch(request('/v1/chat/completions', { ...body, stream: true }))).text(); assert.match(output, /\[DONE\]/); assert.equal(actual, 3);
  for (const protocol of ['chat', 'anthropic', 'responses']) {
    const incomplete = createNativeRouter({ core: core(), fetch: async () => new Response(sse({ id: 's', choices: [{ index: 0, delta: { content: 'partial' } }] }), { headers: { 'content-type': 'text/event-stream' } }) });
    const payload = protocol === 'responses' ? { model: 'alias', input: 'hi', stream: true } : { ...body, stream: true };
    const route = protocol === 'chat' ? '/v1/chat/completions' : protocol === 'anthropic' ? '/v1/messages' : '/v1/responses';
    const result = await (await incomplete.fetch(request(route, payload))).text(); assert.match(result, /upstream_stream_error/); assert.doesNotMatch(result, /\[DONE\]|message_stop|response.completed/);
  }
});
test('HTTP listener health and body bounds use Node builtins', async t => {
  const router = createNativeRouter({ core: core(), maxBodyBytes: 32 }); await router.listen({ port: 0 }); t.after(() => router.close());
  const base = `http://127.0.0.1:${router.address.port}`;
  assert.equal(await (await fetch(`${base}/api/health`)).text(), 'ok');
  const result = await fetch(`${base}/v1/chat/completions`, { method: 'POST', body: JSON.stringify(body), headers: { authorization: 'Bearer client-secret' } }); assert.equal(result.status, 413);
});
test('Anthropic streaming converts cache usage, tool arguments and max-token finish', async () => {
  const raw = sse({ type: 'message_start', message: { id: 'a1', usage: { input_tokens: 3, cache_read_input_tokens: 2, cache_creation_input_tokens: 1, output_tokens: 0 } } }, 'message_start') + sse({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }) + sse({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hi' } }) + sse({ type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'call_a', name: 'run', input: {} } }) + sse({ type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"ok":true}' } }) + sse({ type: 'message_delta', delta: { stop_reason: 'max_tokens' }, usage: { output_tokens: 4 } }) + sse({ type: 'message_stop' });
  for (const target of ['chat', 'responses']) {
    let state;
    const output = await new Response(translateStream(streamBody(raw), 'anthropic', target, 'alias', { onComplete: s => { state = s; } })).text();
    assert.equal(state.usage.total, 10); assert.equal(state.usage.input, 6); assert.equal(state.tools[0].function.arguments, '{"ok":true}');
    assert.match(output, target === 'chat' ? /"finish_reason":"length"/ : /response.incomplete/);
  }
});
test('Responses streaming preserves function arguments and final usage in both bridges', async () => {
  const raw = sse({ type: 'response.created', response: { id: 'resp_1' } }) + sse({ type: 'response.output_item.added', output_index: 0, item: { type: 'function_call', id: 'fc_1', call_id: 'call_1', name: 'run' } }) + sse({ type: 'response.function_call_arguments.delta', output_index: 0, delta: '{}' }) + sse({ type: 'response.completed', response: { usage: { input_tokens: 3, output_tokens: 2, total_tokens: 5 } } });
  for (const target of ['chat', 'anthropic']) {
    let state; const output = await new Response(translateStream(streamBody(raw), 'responses', target, 'alias', { onComplete: s => { state = s; } })).text();
    assert.equal(state.usage.total, 5); assert.equal(state.finish, 'tool_calls'); assert.equal(state.tools[0].id, 'call_1'); assert.match(output, /call_1/); assert.match(output, target === 'chat' ? /\[DONE\]/ : /message_stop/);
  }
});
test('stream memory caps and unsupported fragmented identities fail without success', async () => {
  const cases = [
    [sse({ choices: [{ delta: { content: 'x'.repeat(100) } }] }) + sse('[DONE]'), { maxStateBytes: 10 }],
    [sse({ choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'run', arguments: '{}' } }] } }] }) + sse('[DONE]'), {}],
  ];
  for (const [raw, options] of cases) { const output = await new Response(translateStream(streamBody(raw), 'chat', 'anthropic', 'alias', options)).text(); assert.match(output, /upstream_stream_error/); assert.doesNotMatch(output, /message_stop/); }
});
test('cache token accounting is preserved across JSON dialects', () => {
  const anthropic = { id: 'a', content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn', usage: { input_tokens: 3, cache_read_input_tokens: 2, cache_creation_input_tokens: 1, output_tokens: 4 } };
  const result = translateResponse(anthropic, 'anthropic', 'chat', 'alias'); assert.equal(result.usage.prompt_tokens, 6); assert.equal(result.usage.total_tokens, 10); assert.equal(result.usage.prompt_tokens_details.cached_tokens, 2);
  const image = translateRequest({ model: 'x', messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'https://image.example/a.png' } }] }] }, 'chat', 'responses'); assert.equal(image.input[0].content[0].type, 'input_image');
});
test('failed listen leaves shutdown safe and permits a later retry', async t => {
  const occupied = createServer(); await new Promise(resolve => occupied.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => occupied.close(resolve)));
  const router = createNativeRouter({ core: core() }); t.after(() => router.close());
  await assert.rejects(() => router.listen({ port: occupied.address().port }), { code: 'EADDRINUSE' });
  await router.close(); assert.equal(router.address, undefined);
  await router.listen({ port: 0 }); assert.ok(router.address.port);
});
test('malformed upstream usage cannot corrupt durable token budgets', async () => {
  let actual;
  const router = createNativeRouter({ core: core({ config: {}, tokens: { validate: () => ({ sub: 'id' }), admit: () => 'admitted', settle: (_id, _reserve, used) => { actual = used; } } }), fetch: async () => Response.json({ ...chat, usage: { prompt_tokens: -1, completion_tokens: 1 } }) });
  const response = await router.fetch(request()); assert.equal(response.status, 502); assert.equal(actual, 0);
});
test('OAuth credentials use reviewed provider headers and exact configured endpoint', async () => {
  let headers, url;
  const c = core({ candidates: () => [{ ...candidate, protocol: 'anthropic', auth_type: 'oauth', oauth_headers: { 'anthropic-beta': 'oauth-2025-04-20', cookie: 'secret' } }] });
  const router = createNativeRouter({ core: c, fetch: async (target, init) => { url = target; headers = init.headers; return Response.json({ id: 'msg_a', content: [{ type: 'text', text: 'hi' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }); } });
  assert.equal((await router.fetch(request('/v1/messages', { ...body, max_tokens: 10 }))).status, 200);
  assert.equal(headers.get('authorization'), 'Bearer upstream-secret'); assert.equal(headers.get('x-api-key'), null); assert.equal(headers.get('anthropic-beta'), 'oauth-2025-04-20'); assert.equal(headers.get('cookie'), null);
  const codex = createNativeRouter({ core: core({ candidates: () => [{ ...candidate, protocol: 'responses', baseUrl: 'https://chatgpt.com/backend-api/codex', endpointPath: '/responses', auth_type: 'oauth', oauth_headers: { 'chatgpt-account-id': 'acct', originator: 'codex_cli_rs' } }] }), fetch: async (target, init) => { url = target; headers = init.headers; return Response.json({ id: 'resp_oauth', model: 'alias', status: 'completed', output: [], usage: {} }); } });
  assert.equal((await codex.fetch(request('/v1/responses', { model: 'alias', input: 'hi', store: false }))).status, 200); assert.equal(url.href, 'https://chatgpt.com/backend-api/codex/responses'); assert.equal(headers.get('chatgpt-account-id'), 'acct');
});
test('only selected account credentials are prepared before upstream dispatch', async () => {
  const prepared = [], received = [];
  const c = core({ candidates: () => [{ ...candidate, account: 'a' }, { ...candidate, account: 'b' }], prepareCandidate: async value => { prepared.push(value.account); return { ...value, apiKey: `fresh-${value.account}` }; } });
  const router = createNativeRouter({ core: c, fetch: async (_url, { headers }) => { received.push(headers.get('authorization')); return Response.json(chat); } });
  assert.equal((await router.fetch(request())).status, 200); assert.deepEqual(prepared, ['a']); assert.deepEqual(received, ['Bearer fresh-a']);
});
