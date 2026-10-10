import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeRouter } from '../../../packages/javascript/native/server.mjs';

const make = (path, body, token = 'client') => new Request(`http://router${path}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
const model = (id, provider = 'provider-one') => ({ id, provider, owned_by: provider, supported_clients: ['opencode'], created: 0 });
function setup() {
  const contexts = [], upstreams = [], admissions = [];
  const core = {
    config: { services: { openai: { provider: 'provider-one' }, anthropic: { provider: 'provider-two' } } },
    tokens: {
      validate(token, { model: requested }) {
        if (token !== 'client') throw Object.assign(new Error('Invalid token'), { status: 401 });
        if (requested && requested !== 'allowed') throw Object.assign(new Error('Model outside token scope'), { status: 403 });
        return { sub: 'token-one', client_kind: 'opencode', account: 'account-one', record: { model_policy: { allowed_models: ['allowed'] } } };
      },
      admit: id => { admissions.push(id); return 'admitted'; }, settle() {},
    },
    catalogFor(context) { contexts.push(context); return [model('allowed', context.provider), model('hidden', context.provider)]; },
    candidates(context) { contexts.push(context); return [{ provider: context.provider, protocol: context.protocol === 'anthropic' ? 'chat' : 'anthropic', account: context.pinnedAccount, model: 'upstream-model', baseUrl: 'http://localhost:1/v1', apiKey: 'upstream-secret' }]; },
  };
  const router = createNativeRouter({ core, fetch: async (url, init) => {
    upstreams.push({ url: url.href, headers: init.headers, body: JSON.parse(init.body) });
    return init.headers.has('x-api-key') ? Response.json({ id: 'msg_alias', type: 'message', content: [{ type: 'text', text: 'hello' }], stop_reason: 'end_turn', usage: { input_tokens: 2, output_tokens: 1 } }) : Response.json({ id: 'chat_alias', choices: [{ message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }], usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 } });
  } });
  return { router, core, contexts, upstreams, admissions };
}
test('canonical inference routes preserve dialect, service pin, client binding and token model scopes', async () => {
  const { router, contexts, upstreams, admissions } = setup();
  const chat = await router.fetch(make('/api/services/openai/v1/chat/completions', { model: 'allowed', messages: [{ role: 'user', content: 'hi' }] }));
  assert.equal(chat.status, 200); assert.equal((await chat.json()).choices[0].message.content, 'hello');
  assert.equal(contexts[0].service, 'openai'); assert.equal(contexts[0].provider, 'provider-one'); assert.equal(contexts[0].client, 'opencode'); assert.equal(contexts[0].pinnedAccount, 'account-one'); assert.equal(upstreams[0].url, 'http://localhost:1/v1/messages'); assert.equal(upstreams[0].headers.get('x-api-key'), 'upstream-secret');
  const message = await router.fetch(make('/api/services/anthropic/v1/messages', { model: 'allowed', max_tokens: 10, messages: [{ role: 'user', content: 'hi' }] }));
  assert.equal(message.status, 200); assert.equal((await message.json()).content[0].text, 'hello'); assert.equal(contexts[1].service, 'anthropic'); assert.equal(contexts[1].provider, 'provider-two'); assert.equal(upstreams[1].url, 'http://localhost:1/v1/chat/completions');
  assert.equal((await router.fetch(make('/api/services/openai/v1/chat/completions', { model: 'hidden', messages: [] }))).status, 403); assert.equal(upstreams.length, 2); assert.deepEqual(admissions, ['token-one', 'token-one']);
  assert.equal((await router.fetch(make('/api/services/anthropic/v1/messages', { model: 'allowed', messages: [] }, 'wrong'))).status, 401);
  assert.equal((await router.fetch(make('/api/services/openai/v1/messages', { model: 'allowed', messages: [] }))).status, 404);
});
test('canonical discovery filters token scope and projects vendor model shapes', async () => {
  const { router, contexts } = setup();
  const openai = await (await router.fetch(make('/api/services/openai/v1/models'))).json(); assert.equal(openai.object, 'list'); assert.deepEqual(openai.data.map(m => m.id), ['allowed']); assert.equal(openai.data[0].provider, undefined);
  assert.equal(contexts[0].provider, 'provider-one'); assert.equal(contexts[0].pinnedAccount, 'account-one');
  const anthropic = await (await router.fetch(make('/api/services/anthropic/v1/models'))).json(); assert.equal(anthropic.data[0].type, 'model'); assert.equal(anthropic.data[0].object, undefined); assert.equal(anthropic.first_id, 'allowed'); assert.equal(anthropic.has_more, false);
  const one = await (await router.fetch(make('/api/services/anthropic/v1/models/allowed'))).json(); assert.equal(one.type, 'model'); assert.equal(one.display_name, 'allowed');
  assert.equal((await router.fetch(make('/api/services/openai/v1/models/hidden'))).status, 404);
  assert.equal((await router.fetch(make('/api/services/openai/v1/models', undefined, 'wrong'))).status, 401);
});
test('Anthropic catalog pagination is bounded and validates cursors', async () => {
  const { router, core } = setup(); core.tokens.validate = () => ({ sub: 'one', record: {} }); core.catalogFor = () => [model('a', 'provider-two'), model('b', 'provider-two'), model('c', 'provider-two')];
  const page = await (await router.fetch(make('/api/services/anthropic/v1/models?limit=1&after_id=a'))).json(); assert.equal(page.first_id, 'b'); assert.equal(page.has_more, true);
  const backwards = await (await router.fetch(make('/api/services/anthropic/v1/models?limit=1&before_id=c'))).json(); assert.equal(backwards.first_id, 'b'); assert.equal(backwards.has_more, true);
  for (const query of ['limit=0', 'limit=1001', 'limit=1.0', 'after_id=missing', 'before_id=a&after_id=b', 'limit=1&limit=2']) assert.equal((await router.fetch(make(`/api/services/anthropic/v1/models?${query}`))).status, 400);
});
test('unsupported service pin or client catalog cannot expose unrelated models', async () => {
  const { router, core } = setup(); core.catalogFor = () => [model('allowed', 'other')];
  const catalog = await (await router.fetch(make('/api/services/openai/v1/models'))).json(); assert.deepEqual(catalog.data, []);
  core.catalogFor = () => [{ ...model('allowed'), supported_clients: ['claude'] }]; assert.deepEqual((await (await router.fetch(make('/api/services/openai/v1/models'))).json()).data, []);
});
