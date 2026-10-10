/** Canonical OpenAPI route census with observed native HTTP behavior. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRouterCore } from '../native/core.mjs';
import { createNativeRouter } from '../native/server.mjs';
const methods = new Set(['get','post','put','patch','delete','options','head','trace']);
export const nativeRouteSubset = Object.freeze(new Set([
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
      assert.throws(() => new Request('http://native.invalid/', { method: 'TRACE' }), /unsupported|forbidden/i);
      evidence.set(`route:${key}`, { route: key, success: false }); continue;
    }
    const core = await createRouterCore({ config: { token_secret: 'native-route-census-secret', storage_policy: 'memory',
      admin_token: 'native-route-admin', providers: [{ name: 'fixture', kind: 'openai-compatible', base_url: 'https://fixture.invalid/v1', models: ['fixture-model'] }],
      accounts: [{ name: 'fixture', provider: 'fixture' }] }, env: {} });
    const issued = await core.tokens.issue({ label: 'route-fixture' });
    const runtime = createNativeRouter({ core, fetch() { assert.fail('Unimplemented routes must never reach upstream'); } });
    const path = template.replace(/\{[^}]+\}/g, 'fixture');
    const body = template.endsWith('/revoke') ? { id: issued.id }
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
