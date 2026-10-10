/** Canonical OpenAPI route census with observed native HTTP behavior. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRouterCore } from '../native/core.mjs';
import { ResponsesStore, responseOwner, normalizeResponseInput } from '../native/responses.mjs';
import { createNativeRouter } from '../native/server.mjs';
const methods = new Set(['get','post','put','patch','delete','options','head','trace']);
export const nativeRouteSubset = Object.freeze(new Set([
  'POST /api/services/openai/v1/chat/completions', 'POST /api/services/anthropic/v1/messages',
  'GET /api/services/openai/v1/models', 'GET /api/services/openai/v1/models/{model_id}',
  'GET /api/services/anthropic/v1/models', 'GET /api/services/anthropic/v1/models/{model_id}',
  'POST /api/services/openai/v1/responses', 'GET /api/services/openai/v1/responses/{response_id}',
  'DELETE /api/services/openai/v1/responses/{response_id}', 'POST /api/services/openai/v1/responses/{response_id}/cancel',
  'GET /api/services/openai/v1/responses/{response_id}/input_items',
  'GET /api/health', 'GET /api/models', 'GET /api/management/accounts',
  'POST /api/management/accounts/{name}/pause', 'POST /api/management/accounts/{name}/resume',
  'GET /api/management/accounts/{name}/policy', 'POST /api/management/accounts/{name}/policy',
  'GET /api/management/providers', 'POST /api/management/providers',
  'GET /api/management/providers/{name}', 'DELETE /api/management/providers/{name}',
  'GET /api/management/tokens', 'POST /api/management/tokens', 'POST /api/management/tokens/client',
  'POST /api/management/tokens/revoke', 'PATCH /api/management/routing',
  'POST /api/management/routing/cooldown/reset', 'GET /api/management/usage', 'GET /api/management/logs/errors',
]));
export async function runParityFixtures() {
  const spec = JSON.parse(await readFile(new URL('../../../openapi/router.yaml', import.meta.url), 'utf8'));
  const evidence = new Map();
  for (const [template, operations] of Object.entries(spec.paths)) for (const method of Object.keys(operations)) {
    if (!methods.has(method)) continue;
    const key = `${method.toUpperCase()} ${template}`;
    if (method === 'trace') {
      try { new Request('http://native.invalid/', { method: 'TRACE' }); }
      catch (error) {
        assert.match(error.message, /unsupported|forbidden/i);
        evidence.set(`route:${key}`, { route: key, success: false }); continue;
      }
    }
    const core = await createRouterCore({ config: { token_secret: 'native-route-census-secret', storage_policy: 'memory',
      admin_token: 'native-route-admin', providers: [{ name: 'fixture', kind: 'openai-compatible', base_url: 'https://fixture.invalid/v1', models: ['fixture-model'] }],
      accounts: [{ name: 'fixture', provider: 'fixture' }] }, env: {} });
    const issued = await core.tokens.issue({ label: 'route-fixture' });
    const responseStore = new ResponsesStore(); let cancelled = false;
    if (template.includes('{response_id}') && template.startsWith('/api/services/openai/')) {
      responseStore.save('/api/services/openai/v1', responseOwner({ admin: true }, 'native-route-admin'),
        { id: 'fixture', object: 'response', model: 'fixture-model', status: template.endsWith('/cancel') ? 'in_progress' : 'completed', output: [] },
        normalizeResponseInput({ input: 'hello' }), { abort() { cancelled = true; } });
    }
    const runtime = createNativeRouter({ core, responseStore, fetch() {
      if (['POST /api/services/openai/v1/responses', 'POST /api/services/openai/v1/chat/completions', 'POST /api/services/anthropic/v1/messages'].includes(key)) return Response.json({ id: 'fixture', model: 'fixture-model', choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'hello' } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } });
      assert.fail('Unimplemented routes must never reach upstream');
    } });
    const path = template.replace(/\{[^}]+\}/g, placeholder => placeholder === '{model_id}' ? 'fixture-model' : 'fixture');
    const body = ['POST /api/services/openai/v1/chat/completions', 'POST /api/services/anthropic/v1/messages'].includes(key) ? { model: 'fixture-model', messages: [{ role: 'user', content: 'hello' }], max_tokens: 10 } : key === 'POST /api/services/openai/v1/responses' ? { model: 'fixture-model', input: 'hello' } : template.endsWith('/revoke') ? { id: issued.id }
      : template.endsWith('/policy') ? { weight: 2 }
      : template.endsWith('/routing') ? { strategy: 'priority' }
      : template.endsWith('/providers') ? { name: 'fixture-new', kind: 'openai-compatible', base_url: 'https://fixture.invalid/v1', models: ['fixture-model'] }
      : { label: 'route-issued', reason: 'route-fixture' };
    const response = await runtime.fetch(new Request(`http://native.invalid${path}`, { method: method.toUpperCase(),
      headers: { authorization: 'Bearer native-route-admin', 'content-type': 'application/json' },
      ...(['GET','HEAD'].includes(method.toUpperCase()) ? {} : { body: JSON.stringify(body) }) }));
    const text = await response.text();
    if (nativeRouteSubset.has(key)) {
      assert.ok(response.status >= 200 && response.status < 300, `${key}: ${response.status} ${text}`);
      if (key === 'GET /api/health') assert.equal(text, 'ok');
      else {
        const data = JSON.parse(text);
        if (key.endsWith('/tokens') && method === 'post') assert.ok(data.token.startsWith('la_sk_'));
        if (key === 'POST /api/management/tokens/revoke') assert.equal((await core.tokens.get(issued.id)).revoked, true);
        if (key === 'POST /api/management/accounts/{name}/pause') assert.ok((await core.accounts.list())[0].limits.pause);
        if (key === 'POST /api/management/accounts/{name}/policy') assert.equal(core.accounts.records.get('fixture').policy.weight, 2);
        if (key === 'POST /api/services/openai/v1/responses') assert.equal(data.object, 'response');
        if (key === 'POST /api/services/openai/v1/responses/{response_id}/cancel') { assert.equal(data.status, 'cancelled'); assert.equal(cancelled, true); }
        if (key === 'GET /api/services/openai/v1/responses/{response_id}/input_items') assert.equal(data.data[0].content[0].text, 'hello');
        if (key === 'DELETE /api/services/openai/v1/responses/{response_id}') assert.equal(data.deleted, true);
        if (key === 'POST /api/services/openai/v1/chat/completions') assert.equal(data.choices[0].message.content, 'hello');
        if (key === 'POST /api/services/anthropic/v1/messages') assert.equal(data.content[0].text, 'hello');
        if (key.startsWith('GET /api/services/') && template.endsWith('/models')) assert.equal(data.data[0].id, 'fixture-model');
        if (key.startsWith('GET /api/services/') && template.endsWith('/{model_id}')) assert.equal(data.id, 'fixture-model');
        if (key === 'GET /api/models') assert.equal(data.data[0].id, 'fixture-model');
      }
      evidence.set(`route:${key}`, { route: key, success: true });
    } else {
      // Some unsupported account HEAD methods explicitly return 501.
      assert.ok([404,501].includes(response.status), `${key}: unsupported route unexpectedly ${response.status} ${text}`);
      const error = JSON.parse(text); assert.ok(error.error?.message, `${key}: missing structured error`);
      evidence.set(`route:${key}`, { route: key, success: false });
    }
    await runtime.close();
  }
  assert.equal(evidence.size, Object.values(spec.paths).reduce((total, operations) => total + Object.keys(operations).filter(method => methods.has(method)).length, 0));
  return evidence;
}
