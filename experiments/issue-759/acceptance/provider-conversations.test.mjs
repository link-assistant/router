import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load, upstream, temporary } from './helpers.mjs';
import { owner, request, fixture, reply, destination } from './provider-resource-helpers.mjs';

const { NativeAffinityStore } = await load('js/src/native-service.mjs');
const { AffinityStore } = await load('js/src/affinities.mjs');
const { createRouterCore } = await load('js/src/core.mjs');
const { createNativeRouter } = await load('js/src/server.mjs');
const root = '/api/services/openai/v1/conversations', children = root + '/items';
const missing = (item = false) => ({ error: { message: item ? 'Conversation item not found' : 'Conversation not found', type: 'invalid_request_error', param: null, code: item ? 'conversation_item_not_found' : 'conversation_not_found' } });

// Original golden scenario: src/resource_lifecycle_tests.rs::
// conversations_are_native_owner_scoped_and_parent_bound.
test('conversation create/PATCH/items preserve opaque bytes, encoded IDs, query, owner and provider identity', async t => {
  const service = await upstream(t, (observed, response) => {
    assert.equal(observed.headers.authorization, 'Bearer vendor-key-0');
    if (observed.path.includes('/items/item.')) return reply(response, { id: 'item.?opaque', type: 'message', content: [] });
    if (observed.path.includes('/items')) return reply(response, { object: 'list', data: [{ id: 'item.?opaque', type: 'message' }], has_more: false });
    return reply(response, { id: 'conv.?opaque', object: 'conversation', metadata: { kept: true } }, observed.method === 'POST' ? 201 : 200);
  });
  const { app } = fixture(t, [service]);
  const createBytes = '{ "metadata": {"case":"native"} }';
  const created = await app.fetch(request(root + '?vendor=kept', 'POST', createBytes));
  assert.equal(created.status, 201); assert.equal((await created.json()).id, 'conv.?opaque');
  const path = root + '/conv.%3Fopaque';
  const patchBytes = '{"metadata":{"updated":"yes"},"model":"opaque-unrelated-field","requests":17}';
  const updated = await app.fetch(request(path, 'PATCH', patchBytes, 'alice-rotated'));
  assert.equal(updated.status, 200); await updated.json();
  const added = await app.fetch(request(path + '/items', 'POST', '{"items":[{"type":"message","role":"user","content":"hello"}]}'));
  assert.equal(added.status, 200); await added.json();
  const listed = await app.fetch(request(path + '/items?after=item_0&limit=20&order=desc'));
  assert.equal(listed.status, 200); assert.equal((await listed.json()).data[0].id, 'item.?opaque');
  assert.equal((await app.fetch(request(path + '/items/item.%3Fopaque'))).status, 200);
  const before = service.requests.length;
  const foreign = await app.fetch(request(path, 'GET', undefined, 'bob'));
  assert.equal(foreign.status, 404); assert.deepEqual(await foreign.json(), missing());
  assert.equal(service.requests.length, before);
  assert.equal(service.requests[0].path, '/v1/conversations?vendor=kept');
  assert.equal(service.requests[0].body.toString(), createBytes);
  assert.equal(service.requests[1].method, 'PATCH'); assert.equal(service.requests[1].body.toString(), patchBytes);
  assert.equal(service.requests[3].path, '/v1/conversations/conv.%3Fopaque/items?after=item_0&limit=20&order=desc');
});

test('item lookup rejects missing parent, another parent, another destination and ambiguous IDs before upstream', async t => {
  const service = await upstream(t, (_observed, response) => reply(response, { unexpected: true }));
  const { app, affinities, candidates } = fixture(t, [service]);
  const exact = destination(candidates[0]);
  affinities.set(root, owner, 'parent', { destination: exact });
  affinities.set(children, owner, 'wrong-parent', { destination: exact, parent_id: 'other-parent' });
  affinities.set(children, owner, 'wrong-destination', { destination: { ...exact, base_url: service.origin + '/changed' }, parent_id: 'parent' });
  affinities.set(children, owner, 'ambiguous', { destination: exact, parent_id: 'parent' });
  affinities.set(children, owner, 'ambiguous', { destination: exact, parent_id: 'other-parent' });
  const noParent = await app.fetch(request(root + '/unknown/items/anything'));
  assert.equal(noParent.status, 404); assert.deepEqual(await noParent.json(), missing());
  for (const id of ['unknown', 'wrong-parent', 'wrong-destination', 'ambiguous']) {
    const response = await app.fetch(request(root + '/parent/items/' + id));
    assert.equal(response.status, 404); assert.deepEqual(await response.json(), missing(true));
  }
  assert.equal(service.requests.length, 0);
});

test('successful item lists relay malformed/non-array documents unchanged and capture only usable string IDs', async t => {
  let body = '{"data":"opaque","vendor":true}';
  const service = await upstream(t, (_observed, response) => { response.writeHead(200, { 'content-type': 'application/json' }); response.end(body); });
  const { app, affinities, candidates } = fixture(t, [service]);
  affinities.set(root, owner, 'parent', { destination: destination(candidates[0]) });
  const invalidUtf8 = Buffer.concat([Buffer.from('{"data":[{"id":"invalid-utf8","unused":"'), Buffer.from([255]), Buffer.from('"}]}')]);
  for (const raw of ['{invalid', '{"data":"opaque","vendor":true}', '{"data":[{"id":"invalid-surrogate","unused":"\\ud800"}]}', '{"data":[{"id":"invalid-overflow","unused":1e400}]}', invalidUtf8, '{"data":[null,{},7,{"id":""},{"id":8},{"id":"captured"}]}']) {
    body = raw;
    const response = await app.fetch(request(root + '/parent/items'));
    assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(raw));
  }
  assert.ok(affinities.get(children, owner, 'captured'));
  assert.equal(affinities.list(children, owner).length, 1);
});

test('child recording follows original sequential transactions when a later ID is invalid', async t => {
  const service = await upstream(t, (_observed, response) => reply(response, { data: [{ id: 'first-child' }, { id: 'é'.repeat(129) }] }));
  const { app, affinities, candidates } = fixture(t, [service]);
  affinities.set(root, owner, 'parent', { destination: destination(candidates[0]) });
  const response = await app.fetch(request(root + '/parent/items', 'POST', { items: [] }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: { type: 'api_error', message: 'resource affinity is unavailable: invalid response id' } });
  assert.ok(affinities.get(root, owner, 'parent')); assert.ok(affinities.get(children, owner, 'first-child'));
  assert.equal(affinities.list(children, owner).length, 1);
});

test('parent and item-list gone results retire only children matching the original owner and destination', async t => {
  const service = await upstream(t, (_observed, response) => reply(response, { private_detail: 'gone' }, 410));
  const { app, affinities, candidates } = fixture(t, [service]);
  const exact = destination(candidates[0]), foreign = { ...owner, principal_id: 'bob' };
  for (const [index, suffix, method] of [[0, '', 'GET'], [1, '', 'PATCH'], [2, '/items', 'GET'], [3, '/items', 'POST'], [4, '', 'DELETE']]) {
    const id = `parent-${index}`;
    affinities.set(root, owner, id, { destination: exact });
    affinities.set(children, owner, 'owned-' + index, { destination: exact, parent_id: id });
    affinities.set(children, owner, 'different-' + index, { destination: { ...exact, base_url: service.origin + '/other' }, parent_id: id });
    affinities.set(children, foreign, 'foreign-' + index, { destination: exact, parent_id: id });
    const response = await app.fetch(request(root + '/' + id + suffix, method, method === 'POST' || method === 'PATCH' ? {} : undefined));
    assert.equal(response.status, 404); assert.deepEqual(await response.json(), missing());
    assert.equal(affinities.get(root, owner, id), null); assert.equal(affinities.get(children, owner, 'owned-' + index), null);
    assert.ok(affinities.get(children, owner, 'different-' + index)); assert.ok(affinities.get(children, foreign, 'foreign-' + index));
  }
});

test('item gone/deletion retires its exact binding while preserving its parent and sibling resources', async t => {
  let status = 410;
  const deleted = { id: 'item', object: 'conversation.item.deleted', deleted: true };
  const service = await upstream(t, (_observed, response) => reply(response, deleted, status));
  const { app, affinities, candidates } = fixture(t, [service]);
  const exact = destination(candidates[0]);
  affinities.set(root, owner, 'parent', { destination: exact });
  affinities.set(children, owner, 'sibling', { destination: exact, parent_id: 'parent' });
  affinities.set(children, owner, 'item', { destination: exact, parent_id: 'parent' });
  const gone = await app.fetch(request(root + '/parent/items/item'));
  assert.equal(gone.status, 404); assert.deepEqual(await gone.json(), missing(true));
  assert.equal(affinities.get(children, owner, 'item'), null);
  assert.ok(affinities.get(root, owner, 'parent')); assert.ok(affinities.get(children, owner, 'sibling'));
  affinities.set(children, owner, 'item', { destination: exact, parent_id: 'parent' }); status = 202;
  const result = await app.fetch(request(root + '/parent/items/item', 'DELETE'));
  assert.equal(result.status, 202); assert.deepEqual(await result.json(), deleted);
  assert.equal(affinities.get(children, owner, 'item'), null); assert.ok(affinities.get(children, owner, 'sibling'));
});

test('failed child cleanup is ignored for missing conversations but propagates after successful parent DELETE', async t => {
  let status = 410;
  const service = await upstream(t, (_observed, response) => reply(response, { id: 'parent', deleted: true }, status));
  const affinities = new NativeAffinityStore();
  affinities.deleteChildren = async () => { throw new Error('child cleanup unavailable'); };
  const { app, candidates } = fixture(t, [service], { affinities });
  affinities.set(root, owner, 'parent', { destination: destination(candidates[0]) });
  const gone = await app.fetch(request(root + '/parent'));
  assert.equal(gone.status, 404); assert.deepEqual(await gone.json(), missing()); assert.ok(affinities.get(root, owner, 'parent'));
  status = 200;
  const deleted = await app.fetch(request(root + '/parent', 'DELETE'));
  assert.equal(deleted.status, 503); assert.deepEqual(await deleted.json(), { error: { type: 'api_error', message: 'resource affinity is unavailable: child cleanup unavailable' } });
  assert.ok(affinities.get(root, owner, 'parent'));
});

test('conversation response read limit uses the request limit and leaves bindings untouched on failed DELETE bodies', async t => {
  let oversized = true;
  const service = await upstream(t, (_observed, response) => reply(response, { id: 'parent', padding: oversized ? 'x'.repeat(200) : '' }));
  const { app, affinities, candidates } = fixture(t, [service], {}, { maxBodyBytes: 128, maxResponseBytes: 4096 });
  affinities.set(root, owner, 'parent', { destination: destination(candidates[0]) });
  const tooLarge = await app.fetch(request(root + '/parent', 'DELETE'));
  assert.equal(tooLarge.status, 502); assert.deepEqual(await tooLarge.json(), { error: { type: 'api_error', message: 'upstream response exceeds the proxy limit' } });
  assert.ok(affinities.get(root, owner, 'parent'));
  oversized = false;
  assert.equal((await app.fetch(request(root + '/parent'))).status, 200);
});

test('original Conversations method policy rejects HEAD after owned lookup while public dispatch strips the error body', async t => {
  const service = await upstream(t, (_observed, response) => reply(response, { unexpected: true }));
  const { app, affinities, candidates } = fixture(t, [service]);
  const exact = destination(candidates[0]);
  affinities.set(root, owner, 'parent', { destination: exact }); affinities.set(children, owner, 'item', { destination: exact, parent_id: 'parent' });
  for (const suffix of ['', '/items', '/items/item']) {
    const response = await app.fetch(request(root + '/parent' + suffix, 'HEAD'));
    assert.equal(response.status, 405); assert.equal(await response.text(), '');
  }
  const unknown = await app.fetch(request(root + '/unknown', 'HEAD'));
  assert.equal(unknown.status, 404); assert.equal(await unknown.text(), ''); assert.equal(service.requests.length, 0);
});

test('real core keeps persisted conversation destination after default change and ignores opaque model metadata', async t => {
  const directory = await temporary(t);
  const services = await Promise.all([0,1].map(index => upstream(t, (_observed, response) => reply(response, { id: 'persisted-conversation', object: 'conversation', vendor_marker: index }))));
  const config = { data_dir: directory, token_secret: 'real-conversation-authority', storage_policy: 'text', services: { openai: { provider: 'actual-0' } }, accounts: [], providers: services.map((service,index) => ({ name: `actual-${index}`, base_url: service.origin + '/v1', api_key: `key-${index}`, models: ['m'], supported_clients: ['codex'] })) };
  const original = await createRouterCore({ config, env: {} });
  const issued = await original.tokens.issue({ account: 'primary', principal_id: 'primary', client_kind: 'codex', model_policy: { allowed_models: ['m'] } });
  const first = createNativeRouter({ core: original }); t.after(() => first.close());
  const created = await first.fetch(request(root, 'POST', { metadata: { case: 'native' }, model: 'opaque-non-selector' }, issued.token));
  assert.equal(created.status, 200); await created.json(); await first.close();
  const reloaded = await createRouterCore({ config: { ...config, services: { openai: { provider: 'actual-1' } } }, env: {} });
  const app = createNativeRouter({ core: reloaded }); t.after(() => app.close());
  const result = await app.fetch(request(root + '/persisted-conversation', 'PATCH', { metadata: { updated: 'yes' } }, issued.token));
  assert.equal(result.status, 200); assert.equal((await result.json()).vendor_marker, 0);
  assert.equal(services[0].requests.length, 2); assert.equal(services[1].requests.length, 0);
});

test('late parent gone result keeps a replacement persistent destination and its new children', async t => {
  let started, release, now = 1_800_000_000;
  const began = new Promise(resolve => { started = resolve; }), held = new Promise(resolve => { release = resolve; });
  t.after(() => release()); const directory = await temporary(t);
  const first = await upstream(t, async (_observed, response) => { started(); await held; reply(response, {}, 410); });
  const second = await upstream(t, (_observed, response) => reply(response, { id: 'parent', replacement: true }));
  const affinities = new AffinityStore({ dataDir: directory, persistent: true, clock: () => now });
  const { app, candidates } = fixture(t, [first,second], { affinities });
  await affinities.set(root, owner, 'parent', { destination: destination(candidates[0]) });
  const pending = app.fetch(request(root + '/parent'));
  try {
    await began; await affinities.delete(root, owner, 'parent'); now++;
    await affinities.set(root, owner, 'parent', { destination: destination(candidates[1]) });
    await affinities.set(children, owner, 'new-child', { destination: destination(candidates[1]), parent_id: 'parent' });
  } finally { release(); }
  assert.equal((await pending).status, 404);
  const reopened = new AffinityStore({ dataDir: directory, persistent: true, clock: () => now });
  assert.ok(await reopened.get(root, owner, 'parent')); assert.ok(await reopened.get(children, owner, 'new-child'));
  const result = await app.fetch(request(root + '/parent')); assert.equal(result.status, 200); assert.equal((await result.json()).replacement, true);
});

test('Qwen Conversations keeps original unsupported400 and matching IDs remain isolated by service namespace', async t => {
  const service = await upstream(t, (_observed, response) => reply(response, { id: 'same', object: 'conversation' }));
  const { app, affinities, candidates } = fixture(t, [service]);
  affinities.set(root, owner, 'same', { destination: destination(candidates[0]) });
  const codex = await app.fetch(request('/api/services/codex/v1/conversations/same'));
  assert.equal(codex.status, 404); assert.deepEqual(await codex.json(), missing());
  const qwen = await app.fetch(request('/api/services/qwen/v1/conversations', 'POST', {}));
  assert.equal(qwen.status, 400); assert.deepEqual(await qwen.json(), { error: { type: 'invalid_request_error', message: 'the selected service does not support native Conversations resources' } });
  assert.equal(service.requests.length, 0);
});

test('successful parent DELETE preserves upstream status/body and removes only its original destination children', async t => {
  const raw = '{ "id":"parent", "object":"conversation.deleted", "deleted":true, "vendor_receipt":123 }';
  const service = await upstream(t, (_observed, response) => { response.writeHead(202, { 'content-type': 'application/json', 'x-request-id': 'delete-receipt' }); response.end(raw); });
  const { app, affinities, candidates } = fixture(t, [service]);
  const exact = destination(candidates[0]);
  affinities.set(root, owner, 'parent', { destination: exact });
  affinities.set(children, owner, 'removed', { destination: exact, parent_id: 'parent' });
  affinities.set(children, owner, 'preserved', { destination: { ...exact, base_url: service.origin + '/changed' }, parent_id: 'parent' });
  const response = await app.fetch(request(root + '/parent', 'DELETE'));
  assert.equal(response.status, 202); assert.equal(response.headers.get('x-request-id'), 'delete-receipt'); assert.equal(await response.text(), raw);
  assert.equal(affinities.get(root, owner, 'parent'), null); assert.equal(affinities.get(children, owner, 'removed'), null); assert.ok(affinities.get(children, owner, 'preserved'));
  const count = service.requests.length;
  assert.equal((await app.fetch(request(root + '/parent'))).status, 404); assert.equal(service.requests.length, count);
});

test('child retirement errors are ignored for upstream missing but surfaced after successful item deletion', async t => {
  let status = 404;
  const service = await upstream(t, (_observed, response) => reply(response, { id: 'item', deleted: true }, status));
  const affinities = new NativeAffinityStore();
  affinities.delete = async () => { throw new Error('item retirement unavailable'); };
  const { app, candidates } = fixture(t, [service], { affinities });
  const exact = destination(candidates[0]);
  affinities.set(root, owner, 'parent', { destination: exact }); affinities.set(children, owner, 'item', { destination: exact, parent_id: 'parent' });
  const gone = await app.fetch(request(root + '/parent/items/item'));
  assert.equal(gone.status, 404); assert.deepEqual(await gone.json(), missing(true));
  status = 200;
  const result = await app.fetch(request(root + '/parent/items/item', 'DELETE'));
  assert.equal(result.status, 503); assert.deepEqual(await result.json(), { error: { type: 'api_error', message: 'resource affinity is unavailable: item retirement unavailable' } });
  assert.ok(affinities.get(root, owner, 'parent')); assert.ok(affinities.get(children, owner, 'item'));
});

test('create identity and storage failures follow original502/503 policies without exposing successful resources', async t => {
  let value = { object: 'conversation', missing_id: true };
  const service = await upstream(t, (_observed, response) => reply(response, value, 201));
  const affinities = new NativeAffinityStore();
  affinities.set = async () => { throw new Error('conversation recording unavailable'); };
  const { app } = fixture(t, [service], { affinities });
  const missingId = await app.fetch(request(root, 'POST', {}));
  assert.equal(missingId.status, 502); assert.deepEqual(await missingId.json(), { error: { type: 'api_error', message: 'conversation create response did not contain an id' } });
  value = { id: 'surrogate-parent', unused: '\ud800' };
  const malformedId = await app.fetch(request(root, 'POST', {}));
  assert.equal(malformedId.status, 502); assert.deepEqual(await malformedId.json(), { error: { type: 'api_error', message: 'conversation create response did not contain an id' } });
  value = { id: 'new-parent', object: 'conversation' };
  const storage = await app.fetch(request(root, 'POST', {}));
  assert.equal(storage.status, 503); assert.deepEqual(await storage.json(), { error: { type: 'api_error', message: 'resource affinity is unavailable: conversation recording unavailable' } });
  assert.equal(affinities.get(root, owner, 'new-parent'), null);
});

test('real core resolves recorded logical primary for implicit Codex conversations and Responses continuations', async t => {
  const directory = await temporary(t), home = join(directory, 'codex-home');
  await mkdir(home);
  await writeFile(join(home, 'auth.json'), JSON.stringify({ tokens: { access_token: 'mock-codex-owned-access' } }), { mode: 0o600 });
  const service = await upstream(t, (observed, response) => {
    assert.equal(observed.headers.authorization, 'Bearer mock-codex-owned-access');
    const isResponses = observed.path.includes('/responses');
    return reply(response, { id: isResponses ? 'codex-response' : 'codex-conversation', object: isResponses ? 'response' : 'conversation', status: 'completed', model: 'm', output: [] });
  });
  const core = await createRouterCore({ config: { data_dir: join(directory, 'router'), token_secret: 'implicit-codex-authority', storage_policy: 'memory', providers: [{ name: 'codex', kind: 'codex', base_url: service.origin + '/v1', models: ['m'], supported_clients: ['codex'], credential_home: home }], accounts: [] }, env: {} });
  const issued = await core.tokens.issue({ account: 'primary', principal_id: 'primary', client_kind: 'codex', model_policy: { allowed_models: ['m'] } });
  const app = createNativeRouter({ core }); t.after(() => app.close());
  const codex = '/api/services/codex/v1';
  assert.equal((await app.fetch(request(codex + '/conversations', 'POST', {}, issued.token))).status, 200);
  const found = await app.fetch(request(codex + '/conversations/codex-conversation', 'GET', undefined, issued.token));
  assert.equal(found.status, 200); assert.equal((await found.json()).id, 'codex-conversation');
  assert.equal((await app.fetch(request(codex + '/responses', 'POST', { model: 'm', input: 'first' }, issued.token))).status, 200);
  const continued = await app.fetch(request(codex + '/responses', 'POST', { model: 'm', input: 'next', previous_response_id: 'codex-response', store: false }, issued.token));
  assert.equal(continued.status, 200); assert.equal((await continued.json()).id, 'codex-response');
  assert.equal(service.requests.length, 4);
});
