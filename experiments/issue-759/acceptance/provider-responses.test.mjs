import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load, upstream, temporary } from './helpers.mjs';
import { owner, request, fixture, reply } from './provider-resource-helpers.mjs';

const { createNativeRouter } = await load('js/src/server.mjs');
const { NativeAffinityStore } = await load('js/src/native-service.mjs');
const { createRouterCore } = await load('js/src/core.mjs');
const { AffinityStore } = await load('js/src/affinities.mjs');
const root = '/api/services/openai/v1', namespace = `${root}/responses`;
const absent = { error: { message: 'Response not found', type: 'invalid_request_error', param: null, code: 'response_not_found' } };

// Rust: responses_lifecycle.rs::{forward,relay}, resource_capture.rs::capture.
test('provider background state, owner-scoped retrieval, input cursors and cancellation preserve upstream contracts', async t => {
  let state = 'queued';
  const service = await upstream(t, (observed, response) => {
    assert.equal(observed.headers.authorization, 'Bearer vendor-key-0');
    if (observed.method === 'POST' && observed.path === '/v1/responses') return reply(response, { id: 'background-1', object: 'response', status: state, model: 'm', output: [], background: true }, 202);
    if (observed.path.endsWith('/cancel')) {
      if (state === 'cancelled') return reply(response, { error: { code: 'response_not_cancellable', message: 'Already cancelled upstream' } }, 409);
      state = 'cancelled'; return reply(response, { id: 'background-1', status: state, error: null, incomplete_details: null }, 202);
    }
    if (observed.path.includes('/input_items?')) return reply(response, { object: 'list', data: [{ id: 'item-upstream', type: 'message' }], first_id: 'item-upstream', last_id: 'item-upstream', has_more: false });
    return reply(response, { id: 'background-1', status: state, output: [] });
  });
  const { app } = fixture(t, [service]);
  const body = { model: 'm', input: [{ id: 'client-item', role: 'user', content: 'continue' }], background: true, metadata: { operator: 'kept' } };
  const created = await app.fetch(request(namespace, 'POST', body));
  assert.equal(created.status, 202); assert.equal((await created.json()).status, 'queued');
  assert.deepEqual(JSON.parse(service.requests[0].body), body);
  for (const [suffix, method] of [['', 'GET'], ['/cancel', 'POST'], ['', 'DELETE'], ['/input_items', 'GET']]) {
    const result = await app.fetch(request(`${namespace}/background-1${suffix}`, method, undefined, 'bob'));
    assert.equal(result.status, 404); assert.deepEqual(await result.json(), absent);
  }
  assert.equal(service.requests.length, 1);
  const rotated = await app.fetch(request(`${namespace}/background-1`, 'GET', undefined, 'alice-rotated'));
  assert.equal((await rotated.json()).status, 'queued');
  state = 'in_progress';
  assert.equal((await (await app.fetch(request(`${namespace}/background-1`))).json()).status, 'in_progress');
  const input = await app.fetch(request(`${namespace}/background-1/input_items?after=item%2F01&limit=2&order=asc`));
  assert.equal((await input.json()).data[0].id, 'item-upstream');
  assert.equal(service.requests.at(-1).path, '/v1/responses/background-1/input_items?after=item%2F01&limit=2&order=asc');
  const cancelled = await app.fetch(request(`${namespace}/background-1/cancel`, 'POST', { reason: 'operator' }));
  assert.equal(cancelled.status, 202); assert.equal((await cancelled.json()).status, 'cancelled');
  assert.deepEqual(JSON.parse(service.requests.at(-1).body), { reason: 'operator' });
  assert.equal((await (await app.fetch(request(`${namespace}/background-1`))).json()).status, 'cancelled');
  const repeated = await app.fetch(request(`${namespace}/background-1/cancel`, 'POST', {}));
  assert.equal(repeated.status, 409); assert.equal((await repeated.json()).error.code, 'response_not_cancellable');
  assert.equal((await app.fetch(request('/api/services/codex/v1/responses/background-1'))).status, 404);
});

// Rust: proxy_openai_resource.rs::state_for_previous_response explicitly permits
// legacy unknown create IDs; compact/input_tokens require known owned resources.
test('known continuation stays on its exact provider after routing order changes; legacy IDs remain upstream-owned', async t => {
  const services = await Promise.all([0, 1].map(index => upstream(t, (observed, response) => {
    const body = JSON.parse(observed.body);
    reply(response, { id: body.previous_response_id ? `child-${index}` : `parent-${index}`, model: 'm', status: 'completed', output: [] });
  })));
  const { app, select } = fixture(t, services);
  assert.equal((await app.fetch(request(namespace, 'POST', { model: 'm', input: 'first' }))).status, 200);
  select(1);
  const childBody = { model: 'm', input: 'next', previous_response_id: 'parent-0', background: true };
  const child = await app.fetch(request(namespace, 'POST', childBody));
  assert.equal((await child.json()).id, 'child-0');
  assert.deepEqual(JSON.parse(services[0].requests.at(-1).body), childBody);
  assert.equal(services[1].requests.length, 0);
  const legacy = await app.fetch(request(namespace, 'POST', { model: 'm', input: 'legacy', previous_response_id: 'pre-router-id' }));
  assert.equal(legacy.status, 200); assert.equal((await legacy.json()).id, 'child-1');
  const strict = await app.fetch(request(`${namespace}/compact`, 'POST', { previous_response_id: 'pre-router-id' }));
  assert.equal(strict.status, 404); assert.deepEqual(await strict.json(), { error: { type: 'not_found_error', message: 'the referenced response resource is unavailable' } });
  assert.equal(services[1].requests.length, 1);
});

test('malformed continuation selectors and non-JSON Responses creates never dispatch', async t => {
  const service = await upstream(t, (_observed, response) => reply(response, { id: 'unexpected' }));
  const { app } = fixture(t, [service]);
  for (const previous_response_id of [null, '', 7, false, {}, []]) {
    const response = await app.fetch(request(namespace, 'POST', { model: 'm', input: 'x', previous_response_id }));
    assert.equal(response.status, 400); assert.deepEqual(await response.json(), { error: { type: 'invalid_request_error', message: 'previous_response_id must be a non-empty string' } });
  }
  for (const model of ['', null, 7, []]) {
    const response = await app.fetch(request(namespace, 'POST', { model, input: 'x' }));
    assert.equal(response.status, 400); assert.deepEqual(await response.json(), { error: { type: 'model_required', message: 'request model must be a non-empty exact catalog id' } });
  }
  for (const body of ['{invalid', '[]', 'null', '"scalar"', '{}']) assert.equal((await app.fetch(request(namespace, 'POST', body))).status, 400);
  assert.equal(service.requests.length, 0);
});

test('Responses-only continuation fields do not bind unrelated image resource requests', async t => {
  const service = await upstream(t, (observed, response) => {
    assert.equal(observed.path, '/v1/images/generations');
    reply(response, { created: 123, data: [{ url: 'https://fixture.test/image' }] });
  });
  const { app } = fixture(t, [service]);
  const body = { model: 'm', prompt: 'image', previous_response_id: 'opaque-vendor-field', conversation: 'opaque-conversation' };
  const response = await app.fetch(request(`${root}/images/generations`, 'POST', body));
  assert.equal(response.status, 200); assert.deepEqual(JSON.parse(service.requests[0].body), body);
});

test('every Responses lifecycle operation normalizes upstream gone state and retires only that owner binding', async t => {
  let status = 410;
  const service = await upstream(t, (observed, response) => {
    if (observed.path === '/v1/responses') return reply(response, { id: JSON.parse(observed.body).input, model: 'm', status: 'queued' });
    reply(response, { private_vendor_detail: 'must not escape missing resource envelope' }, status);
  });
  const { app } = fixture(t, [service]);
  for (const [index, suffix, method] of [[0, '', 'GET'], [1, '/cancel', 'POST'], [2, '/input_items', 'GET'], [3, '', 'DELETE']]) {
    status = index % 2 ? 404 : 410;
    const id = `gone-${index}`;
    assert.equal((await app.fetch(request(namespace, 'POST', { model: 'm', input: id }))).status, 200);
    const result = await app.fetch(request(`${namespace}/${id}${suffix}`, method));
    assert.equal(result.status, 404); assert.deepEqual(await result.json(), absent);
    const count = service.requests.length;
    assert.equal((await app.fetch(request(`${namespace}/${id}`))).status, 404);
    assert.equal(service.requests.length, count);
  }
});

test('late gone response cannot delete a replacement affinity to a different provider', async t => {
  let release, started;
  const began = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  const first = await upstream(t, async (_observed, response) => { started(); await gate; reply(response, {}, 410); });
  const second = await upstream(t, (_observed, response) => reply(response, { id: 'race', status: 'completed', output: [{ id: 'replacement-output' }] }));
  const { app, affinities, candidates } = fixture(t, [first, second]);
  const destination = index => ({ provider: candidates[index].provider, account: candidates[index].account, protocol: 'openai', provider_kind: 'openai-compatible', destination_kind: 'stored_provider', base_url: candidates[index].base_url });
  affinities.set(namespace, owner, 'race', { destination: destination(0) });
  const pending = app.fetch(request(`${namespace}/race`));
  try {
    await began;
    affinities.delete(namespace, owner, 'race');
    affinities.set(namespace, owner, 'race', { destination: destination(1) });
  } finally { release(); }
  assert.equal((await pending).status, 404);
  const replacement = await app.fetch(request(`${namespace}/race`));
  assert.equal(replacement.status, 200); assert.equal((await replacement.json()).output[0].id, 'replacement-output');
  assert.equal(first.requests.length, 1); assert.equal(second.requests.length, 1);
});

test('upstream lifecycle errors preserve the binding while successful deletion retires it and preserves its body', async t => {
  const denied = { error: { type: 'invalid_request_error', code: 'response_not_cancellable', message: 'Provider terminal state' } };
  const deleted = { id: 'terminal', object: 'response.deleted', deleted: true, vendor_receipt: 'kept' };
  const service = await upstream(t, (observed, response) => {
    if (observed.path === '/v1/responses') return reply(response, { id: 'terminal', model: 'm', status: 'completed' });
    if (observed.path.endsWith('/cancel')) return reply(response, denied, 409);
    if (observed.method === 'DELETE') return reply(response, deleted, 202);
    return reply(response, { id: 'terminal', status: 'completed' });
  });
  const { app } = fixture(t, [service]);
  await app.fetch(request(namespace, 'POST', { model: 'm', input: 'terminal' }));
  const failed = await app.fetch(request(`${namespace}/terminal/cancel`, 'POST', {}));
  assert.equal(failed.status, 409); assert.deepEqual(await failed.json(), denied);
  assert.equal((await app.fetch(request(`${namespace}/terminal`))).status, 200);
  const removed = await app.fetch(request(`${namespace}/terminal`, 'DELETE'));
  assert.equal(removed.status, 202); assert.deepEqual(await removed.json(), deleted);
  assert.equal((await app.fetch(request(`${namespace}/terminal`))).status, 404);
  assert.equal(service.requests.length, 4);
});

test('a token with the same principal cannot continue or control another pinned subscription account', async t => {
  const service = await upstream(t, (_observed, response) => reply(response, { id: 'unexpected' }));
  const { app, affinities } = fixture(t, [service], { authenticate: async credential => ({ sub: credential, ...owner, account: 'different-account' }) });
  const codex = '/api/services/codex/v1/responses';
  affinities.set(codex, owner, 'pinned', { destination: { provider: 'codex', account: 'original-account', protocol: 'responses', provider_kind: 'codex', destination_kind: 'subscription', base_url: service.origin + '/v1' } });
  for (const [path, method, body] of [[`${codex}/pinned`, 'GET'], [`${codex}/pinned/cancel`, 'POST', {}], [codex, 'POST', { model: 'm', input: 'x', previous_response_id: 'pinned' }]]) {
    const response = await app.fetch(request(path, method, body));
    assert.equal(response.status, 404); assert.deepEqual(await response.json(), absent);
  }
  assert.equal(service.requests.length, 0);
});

test('input-token helper requires response and conversation references to share one exact provider', async t => {
  const services = await Promise.all([0, 1].map(() => upstream(t, (_observed, response) => reply(response, { object: 'response.input_tokens', input_tokens: 31 }))));
  const { app, affinities, candidates } = fixture(t, services);
  const destination = index => ({ provider: candidates[index].provider, account: candidates[index].account, protocol: 'openai', provider_kind: 'openai-compatible', destination_kind: 'stored_provider', base_url: candidates[index].base_url });
  affinities.set(namespace, owner, 'response-helper', { destination: destination(0) });
  affinities.set(`${root}/conversations`, owner, 'conversation-helper', { destination: destination(1) });
  const body = { previous_response_id: 'response-helper', conversation: { id: 'conversation-helper' } };
  const conflict = await app.fetch(request(`${namespace}/input_tokens`, 'POST', body));
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { error: { type: 'invalid_request_error', message: 'the referenced response resources do not share one provider account' } });
  assert.equal(services[0].requests.length + services[1].requests.length, 0);
  affinities.delete(`${root}/conversations`, owner, 'conversation-helper');
  affinities.set(`${root}/conversations`, owner, 'conversation-helper', { destination: destination(0) });
  const accepted = await app.fetch(request(`${namespace}/input_tokens`, 'POST', body));
  assert.equal(accepted.status, 200); assert.equal((await accepted.json()).input_tokens, 31);
  assert.deepEqual(JSON.parse(services[0].requests[0].body), body);
  assert.equal(services[1].requests.length, 0);
});

test('real core reloads persisted Responses affinity after the default changes without redirecting its authority', async t => {
  const directory = await temporary(t);
  const services = await Promise.all([0, 1].map(index => upstream(t, (observed, response) => {
    assert.equal(observed.headers.authorization, `Bearer actual-key-${index}`);
    if (observed.method === 'GET') return reply(response, { id: 'persisted-parent', status: 'queued', upstream_marker: index });
    const body = JSON.parse(observed.body);
    return reply(response, { id: body.previous_response_id ? `persisted-child-${index}` : 'persisted-parent', model: 'm', status: body.background ? 'queued' : 'completed', output: [] });
  })));
  const config = { data_dir: directory, token_secret: 'real-core-responses-secret', storage_policy: 'text', services: { openai: { provider: 'actual-0' } },
    providers: services.map((service, index) => ({ name: `actual-${index}`, base_url: service.origin + '/v1', api_key: `actual-key-${index}`, models: ['m'], supported_clients: ['codex'] })), accounts: [] };
  const original = await createRouterCore({ config, env: {} });
  const issued = await original.tokens.issue({ account: 'primary', client_kind: 'codex', principal_id: 'primary', model_policy: { allowed_models: ['m'] } });
  const first = createNativeRouter({ core: original }); t.after(() => first.close());
  const created = await first.fetch(request(namespace, 'POST', { model: 'm', input: 'create', background: true }, issued.token));
  assert.equal(created.status, 200); await created.json();
  const stored = await readFile(join(directory, 'response-affinities.lino'), 'utf8');
  assert.match(stored, /persisted-parent/); assert.equal(stored.includes('actual-key-0'), false);
  await first.close();
  const reloaded = await createRouterCore({ config: { ...config, services: { openai: { provider: 'actual-1' } } }, env: {} });
  const app = createNativeRouter({ core: reloaded }); t.after(() => app.close());
  const retrieved = await app.fetch(request(`${namespace}/persisted-parent`, 'GET', undefined, issued.token));
  assert.equal(retrieved.status, 200); assert.equal((await retrieved.json()).upstream_marker, 0);
  const continued = await app.fetch(request(namespace, 'POST', { model: 'm', input: 'continue', previous_response_id: 'persisted-parent' }, issued.token));
  assert.equal(continued.status, 200); assert.equal((await continued.json()).id, 'persisted-child-0');
  assert.equal(services[1].requests.length, 0);
  const legacy = await app.fetch(request(namespace, 'POST', { model: 'm', input: 'legacy', previous_response_id: 'outside-router-history' }, issued.token));
  assert.equal(legacy.status, 200); assert.equal((await legacy.json()).id, 'persisted-child-1');
  const count = services[0].requests.length + services[1].requests.length;
  await reloaded.providers.upsert({ ...config.providers[0], base_url: services[1].origin + '/v1' });
  assert.equal((await app.fetch(request(`${namespace}/persisted-parent`, 'GET', undefined, issued.token))).status, 503);
  assert.equal(services[0].requests.length + services[1].requests.length, count);
});

test('a truncated successful DELETE body leaves its exact response binding available for retry', async t => {
  const service = await upstream(t, (observed, response) => {
    if (observed.method === 'DELETE') {
      response.writeHead(200, { 'content-type': 'application/json', 'content-length': '1000' });
      response.write('{"deleted":');
      setTimeout(() => response.destroy(), 20);
      return;
    }
    return reply(response, { id: 'delete-read-failure', model: 'm', status: 'queued' });
  });
  const { app } = fixture(t, [service]);
  assert.equal((await app.fetch(request(namespace, 'POST', { model: 'm', input: 'create' }))).status, 200);
  const failed = await app.fetch(request(`${namespace}/delete-read-failure`, 'DELETE'));
  assert.equal(failed.status, 502);
  const retry = await app.fetch(request(`${namespace}/delete-read-failure`));
  assert.equal(retry.status, 200); assert.equal((await retry.json()).id, 'delete-read-failure');
  assert.equal(service.requests.length, 3);
});

test('late gone response preserves a recreated persistent record on the same destination with a new lifetime', async t => {
  let release, started, count = 0, now = 1_800_000_000;
  const began = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  t.after(() => release());
  const directory = await temporary(t);
  const service = await upstream(t, async (_observed, response) => {
    if (++count === 1) { started(); await gate; return reply(response, {}, 410); }
    return reply(response, { id: 'same-destination-race', status: 'queued', replacement_marker: true });
  });
  const affinities = new AffinityStore({ dataDir: directory, persistent: true, clock: () => now });
  const { app, candidates } = fixture(t, [service], { affinities });
  const destination = { provider: candidates[0].provider, account: candidates[0].account, protocol: 'openai', provider_kind: 'openai-compatible', destination_kind: 'stored_provider', base_url: candidates[0].base_url };
  const id = 'same-destination-race';
  await affinities.set(namespace, owner, id, { destination });
  const original = await affinities.get(namespace, owner, id);
  const pending = app.fetch(request(`${namespace}/${id}`));
  try {
    await began;
    await affinities.delete(namespace, owner, id);
    now += 1;
    await affinities.set(namespace, owner, id, { destination });
  } finally { release(); }
  assert.equal((await pending).status, 404);
  const reopened = new AffinityStore({ dataDir: directory, persistent: true, clock: () => now });
  const replacement = await reopened.get(namespace, owner, id);
  assert.ok(replacement);
  assert.equal(replacement.created_at, original.created_at + 1);
  assert.equal(replacement.expires_at, original.expires_at + 1);
  const next = await app.fetch(request(`${namespace}/${id}`));
  assert.equal(next.status, 200); assert.equal((await next.json()).replacement_marker, true);
  assert.equal(service.requests.length, 2);
});

// Rust responses_lifecycle.rs::relay explicitly ignores removal failure for
// missing resources, but surfaces it after a successful provider deletion.
test('upstream 404 and 410 remain exact response-not-found when affinity retirement fails', async t => {
  const service = await upstream(t, (observed, response) => reply(response, { upstream_detail: 'not part of the public error' }, observed.path.includes('gone') ? 410 : 404));
  const affinities = new NativeAffinityStore();
  affinities.delete = async () => { throw new Error('simulated retirement storage failure'); };
  const { app, candidates } = fixture(t, [service], { affinities });
  const destination = { provider: candidates[0].provider, account: candidates[0].account, protocol: 'openai', provider_kind: 'openai-compatible', destination_kind: 'stored_provider', base_url: candidates[0].base_url };
  for (const [id, method, suffix] of [['missing', 'GET', ''], ['gone', 'GET', ''], ['gone-cancel', 'POST', '/cancel'], ['missing-delete', 'DELETE', '']]) {
    affinities.set(namespace, owner, id, { destination });
    const response = await app.fetch(request(`${namespace}/${id}${suffix}`, method));
    assert.equal(response.status, 404); assert.deepEqual(await response.json(), absent);
    assert.ok(affinities.get(namespace, owner, id));
  }
  assert.equal(service.requests.length, 4);
});

test('successful provider DELETE reports exact affinity-storage error when retirement cannot commit', async t => {
  const service = await upstream(t, (observed, response) => reply(response, observed.method === 'DELETE' ? { id: 'delete-storage-failure', object: 'response.deleted', deleted: true } : { id: 'delete-storage-failure', status: 'completed' }));
  const affinities = new NativeAffinityStore();
  affinities.delete = async () => { throw new Error('simulated retirement storage failure'); };
  const { app, candidates } = fixture(t, [service], { affinities });
  const destination = { provider: candidates[0].provider, account: candidates[0].account, protocol: 'openai', provider_kind: 'openai-compatible', destination_kind: 'stored_provider', base_url: candidates[0].base_url };
  affinities.set(namespace, owner, 'delete-storage-failure', { destination });
  const response = await app.fetch(request(`${namespace}/delete-storage-failure`, 'DELETE'));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: { type: 'api_error', message: 'response affinity is unavailable: simulated retirement storage failure' } });
  assert.ok(affinities.get(namespace, owner, 'delete-storage-failure'));
  assert.equal((await app.fetch(request(`${namespace}/delete-storage-failure`))).status, 200);
  assert.equal(service.requests.length, 2);
});

test('public Web HEAD forwards the original method and preserves lifecycle status and headers with empty bodies', async t => {
  const service = await upstream(t, (observed, response) => {
    assert.equal(observed.method, 'HEAD');
    response.setHeader('x-request-id', 'head-lifecycle-proof');
    return reply(response, { id: 'head-resource', status: 'queued', marker: 'body exists upstream' }, observed.path.includes('/missing') ? 410 : 200);
  });
  const { app, affinities, candidates } = fixture(t, [service]);
  const destination = { provider: candidates[0].provider, account: candidates[0].account, protocol: 'openai', provider_kind: 'openai-compatible', destination_kind: 'stored_provider', base_url: candidates[0].base_url };
  for (const id of ['head-resource', 'missing-head']) affinities.set(namespace, owner, id, { destination });
  const head = await app.fetch(request(`${namespace}/head-resource`, 'HEAD'));
  assert.equal(head.status, 200); assert.equal(head.headers.get('x-request-id'), 'head-lifecycle-proof'); assert.equal(await head.text(), '');
  const inputs = await app.fetch(request(`${namespace}/head-resource/input_items?limit=2&order=asc`, 'HEAD'));
  assert.equal(inputs.status, 200); assert.equal(await inputs.text(), '');
  assert.equal(service.requests.at(-1).path, '/v1/responses/head-resource/input_items?limit=2&order=asc');
  const missing = await app.fetch(request(`${namespace}/missing-head`, 'HEAD'));
  assert.equal(missing.status, 404); assert.equal(await missing.text(), '');
  const foreign = await app.fetch(request(`${namespace}/head-resource`, 'HEAD', undefined, 'bob'));
  assert.equal(foreign.status, 404); assert.equal(await foreign.text(), '');
  const health = await app.fetch(request('/health', 'HEAD'));
  assert.equal(health.status, 200); assert.equal(await health.text(), '');
  assert.equal(service.requests.length, 3);
  assert.deepEqual(service.requests.map(observed => observed.method), ['HEAD', 'HEAD', 'HEAD']);
});

test('network HEAD reaches the provider as HEAD and exposes no lifecycle body through the public dispatcher', async t => {
  const service = await upstream(t, (observed, response) => { assert.equal(observed.method, 'HEAD'); response.setHeader('x-request-id', 'network-head-proof'); reply(response, { id: 'network-head', status: 'completed', upstream_only: 'body' }); });
  const { app, affinities, candidates } = fixture(t, [service]);
  const destination = { provider: candidates[0].provider, account: candidates[0].account, protocol: 'openai', provider_kind: 'openai-compatible', destination_kind: 'stored_provider', base_url: candidates[0].base_url };
  affinities.set(namespace, owner, 'network-head', { destination });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const response = await fetch(`http://127.0.0.1:${app.address.port}${namespace}/network-head`, { method: 'HEAD', headers: { authorization: 'Bearer alice' }, signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200); assert.equal(response.headers.get('x-request-id'), 'network-head-proof'); assert.equal(await response.text(), '');
  assert.equal(service.requests.length, 1);
  assert.equal(service.requests[0].method, 'HEAD');
});
