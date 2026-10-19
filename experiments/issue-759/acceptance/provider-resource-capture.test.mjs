import test from 'node:test';
import assert from 'node:assert/strict';
import { load, upstream, temporary } from './helpers.mjs';
import { owner, request, fixture } from './provider-resource-helpers.mjs';

const { AffinityStore } = await load('packages/javascript/native/affinities.mjs');
const { NativeAffinityStore } = await load('packages/javascript/native/native-service.mjs');
const namespace = '/api/services/openai/v1/responses';
const body = { model: 'm', input: 'capture', stream: true, background: true };
const capturedError = message => ({ error: { message, type: 'api_error', param: null, code: null } });
const endpoint = { origin: 'http://capture-fixture.test' };
const stream = (chunks, extra = {}) => new Response(new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(Buffer.from(chunk)); controller.close(); } }), { status: 200, headers: { 'content-type': 'text/event-stream' }, ...extra });

// Original: resource_lifecycle_tests::sse_identity_is_durable_before_the_success_response_is_returned;
// resource_capture.rs::sse_id and sse.rs::push_blocks.
test('HTTP SSE capture skips unusable lines, prioritizes root IDs and persists before replaying exact Unicode bytes', async t => {
  const directory = await temporary(t);
  const raw = Buffer.from('data: not-json\r\n\r\nevent: response.created\r\ndata: {"id":null,"response":{"id":"ignored-nested"}}\r\ndata: {"id":"root-世","response":{"id":"wrong-nested"}}\r\n\r\ndata: {"type":"response.completed","response":{"id":"root-世"}}\n\n');
  const unicode = raw.indexOf(Buffer.from('世'));
  const service = await upstream(t, async (_observed, response) => {
    response.writeHead(201, { 'content-type': 'TEXT/EVENT-STREAM; charset=utf-8', 'x-request-id': 'capture-byte-proof' });
    response.write(raw.subarray(0, unicode + 1));
    await new Promise(resolve => setTimeout(resolve, 5));
    response.end(raw.subarray(unicode + 1));
  });
  const affinities = new AffinityStore({ dataDir: directory, persistent: true });
  const { app } = fixture(t, [service], { affinities });
  const response = await app.fetch(request(namespace, 'POST', body));
  assert.equal(response.status, 201); assert.equal(response.headers.get('x-request-id'), 'capture-byte-proof');
  const reopened = new AffinityStore({ dataDir: directory, persistent: true });
  assert.ok(await reopened.get(namespace, owner, 'root-世'));
  assert.equal(await reopened.get(namespace, owner, 'ignored-nested'), null); assert.equal(await reopened.get(namespace, owner, 'wrong-nested'), null);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), raw);
});

test('stored JSON capture uses query-free trailing-slash Location fallback and replays malformed provider bytes', async t => {
  const raw = 'provider-opaque-body';
  const service = await upstream(t, (_observed, response) => {
    response.writeHead(202, { 'content-type': 'application/json', location: 'https://upstream.test/resources/location-id///?opaque=query' }); response.end(raw);
  });
  const { app, affinities } = fixture(t, [service]);
  const response = await app.fetch(request(namespace, 'POST', { model: 'm', input: 'x' }));
  assert.equal(response.status, 202); assert.equal(await response.text(), raw);
  assert.ok(affinities.get(namespace, owner, 'location-id'));
  assert.equal(affinities.get(namespace, owner, '?opaque=query'), null);
});

test('SSE root-field presence suppresses nested fallback even when null; a later valid independent line wins', async t => {
  const raw = 'data: {"id":null,"response":{"id":"nested-must-not-win"}}\n\n' +
    'data: \ufeff{"id":"bom-must-not-win"}\n\n' +
    'data: \u0085{"response":{"id":"later-valid"}}\u0085\n\n';
  const { app, affinities } = fixture(t, [endpoint], {}, { fetch: async () => stream([raw]) });
  const response = await app.fetch(request(namespace, 'POST', body));
  assert.equal(response.status, 200); assert.equal(await response.text(), raw);
  assert.equal(affinities.get(namespace, owner, 'nested-must-not-win'), null); assert.equal(affinities.get(namespace, owner, 'bom-must-not-win'), null);
  assert.ok(affinities.get(namespace, owner, 'later-valid'));
});

test('the identifying transport chunk is searched before prefix size refusal and replayed without changes', async t => {
  const raw = Buffer.concat([Buffer.from('data: {"id":"large-identifying-chunk"}\n\n:'), Buffer.alloc(1024 * 1024 + 32, 120)]);
  const { app, affinities } = fixture(t, [endpoint], {}, { fetch: async () => stream([raw]) });
  const response = await app.fetch(request(namespace, 'POST', body));
  assert.equal(response.status, 200); assert.ok(affinities.get(namespace, owner, 'large-identifying-chunk'));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), raw);
});

test('an over-limit unidentified prefix refuses success and cancels the still-open upstream stream', async t => {
  let cancelled = 0;
  const { app, affinities } = fixture(t, [endpoint], {}, { fetch: async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(Buffer.alloc(1024 * 1024 + 1, 120)); }, cancel() { cancelled++; } }), { headers: { 'content-type': 'text/event-stream' } }) });
  const response = await app.fetch(request(namespace, 'POST', body));
  assert.equal(response.status, 502); assert.deepEqual(await response.json(), capturedError('stored stream did not expose a bounded resource id'));
  assert.equal(cancelled, 1); assert.equal(affinities.list(namespace, owner).length, 0);
});

test('EOF before identity and successful JSON without identity have exact original capture error envelopes', async t => {
  let mode = 'stream';
  const { app, affinities } = fixture(t, [endpoint], {}, { fetch: async () => mode === 'stream' ? stream(['data: malformed\n\n']) : Response.json({ object: 'response', no_id: true }) });
  const ended = await app.fetch(request(namespace, 'POST', body));
  assert.equal(ended.status, 502); assert.deepEqual(await ended.json(), capturedError('stored stream ended before exposing a resource id'));
  mode = 'json';
  const missing = await app.fetch(request(namespace, 'POST', { model: 'm', input: 'x' }));
  assert.equal(missing.status, 502); assert.deepEqual(await missing.json(), capturedError('stored response did not include a resource id'));
  assert.equal(affinities.list(namespace, owner).length, 0);
});

test('ownership write failure blocks JSON and SSE success before any captured resource bytes are exposed', async t => {
  const affinities = new NativeAffinityStore();
  affinities.set = async () => { throw new Error('ownership write unavailable'); };
  let mode = 'stream';
  const { app } = fixture(t, [endpoint], { affinities }, { fetch: async () => mode === 'stream' ? stream(['data: {"id":"must-not-expose"}\n\n']) : Response.json({ id: 'must-not-expose', private: 'provider-body' }) });
  for (const next of ['stream', 'json']) {
    mode = next;
    const response = await app.fetch(request(namespace, 'POST', { model: 'm', input: 'x', stream: next === 'stream' }));
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), capturedError('could not persist resource ownership: ownership write unavailable'));
  }
  assert.equal(affinities.get(namespace, owner, 'must-not-expose'), null);
});

test('store:false and failed provider responses bypass capture, while invalid UTF8 JSON can use Location identity', async t => {
  let mode = 'opt-out';
  const malformed = Buffer.from('data: not-json\n\n');
  const invalidUtf8 = Buffer.concat([Buffer.from('{"id":"must-not-capture","unused":"'), Buffer.from([255]), Buffer.from('"}')]);
  const { app, affinities } = fixture(t, [endpoint], {}, { fetch: async () => mode === 'opt-out' ? stream([malformed]) : mode === 'failed' ? new Response('provider failure', { status: 409, headers: { 'content-type': 'text/event-stream' } }) : new Response(invalidUtf8, { headers: { 'content-type': 'application/json', location: '/resources/utf8-fallback/' } }) });
  const unstored = await app.fetch(request(namespace, 'POST', { ...body, store: false }));
  assert.equal(unstored.status, 200); assert.deepEqual(Buffer.from(await unstored.arrayBuffer()), malformed);
  mode = 'failed';
  const failed = await app.fetch(request(namespace, 'POST', body)); assert.equal(failed.status, 409); assert.equal(await failed.text(), 'provider failure');
  mode = 'utf8';
  const fallback = await app.fetch(request(namespace, 'POST', { model: 'm', input: 'x' }));
  assert.equal(fallback.status, 200); assert.deepEqual(Buffer.from(await fallback.arrayBuffer()), invalidUtf8);
  assert.equal(affinities.get(namespace, owner, 'must-not-capture'), null); assert.ok(affinities.get(namespace, owner, 'utf8-fallback'));
  assert.equal(affinities.list(namespace, owner).length, 1);
});

test('disconnecting the captured stream preserves provider-owned affinity for later owner retrieval and cancellation', async t => {
  let cancelled = 0, calls = 0;
  const { app, affinities } = fixture(t, [endpoint], {}, { fetch: async (url, options) => {
    calls++;
    if (String(url).endsWith('/responses') && options.method === 'POST') return new Response(new ReadableStream({ start(controller) { controller.enqueue(Buffer.from('data: {"response":{"id":"retained-job","status":"queued"}}\n\n')); }, cancel() { cancelled++; } }), { headers: { 'content-type': 'text/event-stream' } });
    return Response.json({ id: 'retained-job', status: String(url).endsWith('/cancel') ? 'cancelled' : 'queued' });
  } });
  const created = await app.fetch(request(namespace, 'POST', body));
  assert.equal(created.status, 200); assert.ok(affinities.get(namespace, owner, 'retained-job'));
  await created.body.cancel('client disconnected'); assert.equal(cancelled, 1);
  assert.ok(affinities.get(namespace, owner, 'retained-job'));
  const foreign = await app.fetch(request(namespace + '/retained-job/cancel', 'POST', {}, 'bob'));
  assert.equal(foreign.status, 404); assert.equal(calls, 1);
  const retrieved = await app.fetch(request(namespace + '/retained-job')); assert.equal((await retrieved.json()).status, 'queued');
  const stopped = await app.fetch(request(namespace + '/retained-job/cancel', 'POST', {})); assert.equal((await stopped.json()).status, 'cancelled');
  assert.equal(calls, 3);
});

test('malformed surrogate escapes cannot create Rust-inexpressible identities or hide inside unused metadata', async t => {
  let mode = 'stream';
  const raw = 'data: {"id":"must-not-own","unused":"\\ud800"}\n\n' + 'data: {"id":"valid-\\ud83d\\ude42"}\n\n';
  const { app, affinities } = fixture(t, [endpoint], {}, { fetch: async () => mode === 'stream' ? stream([raw]) : new Response('{"id":"must-not-own-json","unused":"\\udc00"}', { headers: { 'content-type': 'application/json', location: '/resources/scalar-fallback' } }) });
  const streamed = await app.fetch(request(namespace, 'POST', body));
  assert.equal(streamed.status, 200); assert.equal(await streamed.text(), raw);
  assert.equal(affinities.get(namespace, owner, 'must-not-own'), null); assert.ok(affinities.get(namespace, owner, 'valid-🙂'));
  mode = 'json';
  const json = await app.fetch(request(namespace, 'POST', { model: 'm', input: 'x' }));
  assert.equal(json.status, 200); await json.text();
  assert.equal(affinities.get(namespace, owner, 'must-not-own-json'), null); assert.ok(affinities.get(namespace, owner, 'scalar-fallback'));
});
