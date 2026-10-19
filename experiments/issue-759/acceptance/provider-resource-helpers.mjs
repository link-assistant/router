import { load } from './helpers.mjs';

const { createNativeRouter } = await load('packages/javascript/native/server.mjs');
const { NativeAffinityStore } = await load('packages/javascript/native/native-service.mjs');
export const owner = { client_kind: 'codex', principal_id: 'alice' };
export const request = (path, method = 'GET', body, credential = 'alice') => new Request(`http://router.test${path}`, {
  method, headers: { authorization: `Bearer ${credential}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
  ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }), signal: AbortSignal.timeout(5000),
});
export function fixture(t, endpoints, extra = {}, options = {}) {
  const affinities = new NativeAffinityStore();
  let current = 0;
  const candidates = endpoints.map((endpoint, index) => ({ provider: `vendor-${index}`, account: `vendor-${index}`, provider_kind: 'openai-compatible', destination_kind: 'stored_provider', protocol: 'chat', base_url: endpoint.origin + '/v1', api_key: `vendor-key-${index}` }));
  const core = { config: {}, affinities,
    authenticate: async credential => ({ sub: credential, ...owner, principal_id: credential === 'alice-rotated' ? 'alice' : credential }),
    nativeCandidates: async context => {
      const ordered = [candidates[current], ...candidates.filter((_candidate, index) => index !== current)];
      return context.provider ? ordered.filter(candidate => candidate.provider === context.provider) : ordered;
    }, ...extra };
  const app = createNativeRouter({ ...options, core }); t.after(() => app.close());
  return { app, core, affinities: core.affinities, candidates, select: index => { current = index; } };
}
export const destination = candidate => ({ provider: candidate.provider, account: candidate.account, protocol: candidate.protocol === 'chat' ? 'openai' : candidate.protocol, provider_kind: candidate.provider_kind, destination_kind: candidate.destination_kind, base_url: candidate.base_url });
export const reply = (response, value, status = 200) => { response.writeHead(status, { 'content-type': 'application/json' }); response.end(JSON.stringify(value)); };
