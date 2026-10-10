import test from 'node:test';
import assert from 'node:assert/strict';
import { load, temporary, upstream } from './helpers.mjs';

const { createRouterCore } = await load('packages/javascript/native/core.mjs');
const { createNativeRouter } = await load('packages/javascript/native/server.mjs');
const configuration = directory => ({ token_secret: 'core-acceptance-secret', storage_policy: 'memory', data_dir: directory,
  providers: [{ name: 'fixture', base_url: 'http://127.0.0.1:1', models: ['one', 'two'], supported_clients: ['codex'] }],
  accounts: [{ name: 'primary', provider: 'fixture', policy: { prefix: 'fixture' } }, { name: 'secondary', provider: 'fixture' }] });

test('exact model selection, pinning, pause, cooldown isolation and aliases observe actual routing state', async t => {
  let now = 1000;
  const config = configuration(await temporary(t));
  config.accounts[1].policy = { prefix: 'team', model_aliases: [{ model: 'two', alias: 'second', fork: false }], excluded_models: ['one'] };
  const core = await createRouterCore({ config, env: {}, clock: () => now });
  assert.equal((await core.route({ model: 'fixture/one' })).account, 'primary');
  assert.equal((await core.route({ model: 'team/second' })).model, 'two');
  await assert.rejects(core.route({ model: 'fixture/team/second' }), { code: 'model_not_found' });
  await assert.rejects(core.route({ model: 'unknown' }), { code: 'model_not_found' });
  await assert.rejects(core.route({}), { code: 'model_required' });
  await core.accounts.pause('primary', { reason: 'maintenance' });
  await assert.rejects(core.route({ model: 'one', pinnedAccount: 'primary' }), { code: 'pinned_account_unavailable' });
  await core.accounts.resume('primary');
  const primary = await core.route({ model: 'one', pinnedAccount: 'primary' });
  await core.reportFailure(primary, { status: 429, retryAfter: '30', scope: 'account' });
  await assert.rejects(core.route({ model: 'one', pinnedAccount: 'primary' }), { code: 'pinned_account_unavailable' });
  assert.equal((await core.route({ model: 'second' })).account, 'secondary');
  now += 31;
  assert.equal((await core.route({ model: 'one', pinnedAccount: 'primary' })).account, 'primary');
});

test('ambiguous bare selectors reject; explicitly published namespace selectors preserve authority', async t => {
  const config = configuration(await temporary(t));
  config.providers.push({ name: 'other', base_url: 'http://127.0.0.1:2', models: ['one'] });
  config.accounts.push({ name: 'other-account', provider: 'other', policy: { prefix: 'other' } });
  const core = await createRouterCore({ config, env: {} });
  await assert.rejects(core.route({ model: 'one' }), { code: 'model_conflict' });
  assert.equal((await core.route({ model: 'fixture/one' })).provider, 'fixture');
  assert.equal((await core.route({ model: 'other/one' })).provider, 'other');
});

test('real native core and HTTP server route a managed client token to its pinned upstream', async t => {
  const mock = await upstream(t, (_, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ id: 'integrated', model: 'one', choices: [{ message: { role: 'assistant', content: 'from real upstream' }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } }));
  });
  const config = configuration(await temporary(t));
  config.providers[0].base_url = mock.origin;
  config.providers[0].api_key = 'integrated-upstream-key';
  const core = await createRouterCore({ config, env: {} });
  const issued = await core.tokens.issue({ account: 'primary', client_kind: 'codex', principal_id: 'primary', model_policy: { allowed_models: ['fixture/one'] } });
  const app = createNativeRouter({ core });
  t.after(() => app.close());
  await app.listen({ host: '127.0.0.1', port: 0 });
  const request = body => fetch(`http://127.0.0.1:${app.address.port}/v1/chat/completions`, { method: 'POST', headers: { authorization: `Bearer ${issued.token}`, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  const response = await request({ model: 'fixture/one', messages: [{ role: 'user', content: 'hello' }], max_tokens: 10 });
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).choices[0].message.content, 'from real upstream');
  assert.equal(mock.requests[0].headers.authorization, 'Bearer integrated-upstream-key');
  assert.equal((await core.tokens.get(issued.id)).used_tokens, 3);
  assert.equal((await request({ model: 'fixture/two', messages: [], max_tokens: 10 })).status, 403);
  await core.accounts.pause('primary', { reason: 'operator pause' });
  assert.equal((await request({ model: 'fixture/one', messages: [], max_tokens: 10 })).status, 503);
  assert.equal(mock.requests.length, 1);
});
