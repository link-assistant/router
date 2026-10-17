import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, stat, access } from 'node:fs/promises';
import { join } from 'node:path';
import { load, temporary, upstream } from './helpers.mjs';

const { CredentialFileStore, OAuthManager, importCredential } = await load('packages/javascript/native/oauth.mjs');
const { atomicWrite } = await load('packages/javascript/native/storage.mjs');
const now = 1_800_000_000;
const document = (accessToken = 'old-access', refreshToken = 'old-refresh', expiry = now * 1000 + 60_000) => ({
  preference: { keep: true }, claudeAiOauth: { accessToken, refreshToken, expiresAt: expiry, scopes: ['user:inference'] },
});
async function credentials(t, value = document()) {
  const directory = await temporary(t), home = join(directory, 'home'), dataDir = join(directory, 'router');
  await mkdir(home); const path = join(home, '.credentials.json');
  await writeFile(path, JSON.stringify(value), { mode: 0o600 });
  return { home, dataDir, path };
}
const manager = origin => new OAuthManager({ clock: () => now, endpoints: { claude: origin + '/token' }, allowLoopback: true });
const store = options => new CredentialFileStore({ provider: 'claude', clock: () => now, ...options });

test('concurrent refresh spends one rotating grant and a new manager reloads the persisted successor', async t => {
  const files = await credentials(t);
  const service = await upstream(t, async (request, response) => {
    assert.equal(request.path, '/token');
    assert.deepEqual(JSON.parse(request.body).refresh_token, 'old-refresh');
    await new Promise(resolve => setTimeout(resolve, 20));
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ access_token: 'next-access', refresh_token: 'next-refresh', expires_in: 3600, token_type: 'Bearer' }));
  });
  const oauth = manager(service.origin);
  const tokens = await Promise.all(Array.from({ length: 8 }, () => oauth.getFresh(store(files))));
  assert.equal(service.requests.length, 1);
  for (const token of tokens) assert.equal(token.access_token, 'next-access');
  const saved = JSON.parse(await readFile(files.path, 'utf8'));
  assert.equal(saved.claudeAiOauth.refreshToken, 'next-refresh');
  assert.deepEqual(saved.preference, { keep: true });
  assert.equal((await stat(files.path)).mode & 0o077, 0);
  assert.equal((await manager(service.origin).getFresh(store(files))).access_token, 'next-access');
  assert.equal(service.requests.length, 1);
});

test('refresh recovery survives a failed owning-file write and repairs it without spending another grant', async t => {
  const files = await credentials(t);
  const service = await upstream(t, (_request, response) => response.end(JSON.stringify({ access_token: 'recovered-access', refresh_token: 'recovered-refresh', expires_in: 3600 })));
  const faulted = store({ ...files, write: async (path, value) => {
    if (path === files.path) throw new Error('simulated owning-file failure');
    return atomicWrite(path, value);
  } });
  const fresh = await manager(service.origin).getFresh(faulted);
  assert.equal(fresh.access_token, 'recovered-access');
  assert.equal(JSON.parse(await readFile(files.path, 'utf8')).claudeAiOauth.accessToken, 'old-access');
  assert.equal((await stat(faulted.recoveryPath)).mode & 0o077, 0);
  const recovery = JSON.parse(await readFile(faulted.recoveryPath, 'utf8'));
  assert.equal(recovery.token.refresh_token, 'recovered-refresh');
  const repaired = await manager(service.origin).getFresh(store(files));
  assert.equal(repaired.access_token, 'recovered-access');
  assert.equal(JSON.parse(await readFile(files.path, 'utf8')).claudeAiOauth.refreshToken, 'recovered-refresh');
  await assert.rejects(access(faulted.recoveryPath), { code: 'ENOENT' });
  assert.equal(service.requests.length, 1);
});

test('uncertain token exchange refuses a second spend until an external owner advances the credential chain', async t => {
  const files = await credentials(t);
  const service = await upstream(t, (_request, response) => response.end('{}'));
  const oauth = manager(service.origin), held = store(files);
  await assert.rejects(oauth.getFresh(held), { code: 'oauth_response_invalid' });
  await assert.rejects(oauth.getFresh(held), { code: 'oauth_exchange_uncertain' });
  assert.equal(service.requests.length, 1);
  await writeFile(files.path, JSON.stringify(document('externally-repaired', 'external-next', now * 1000 + 3_600_000)));
  assert.equal((await oauth.getFresh(held)).access_token, 'externally-repaired');
  assert.equal(service.requests.length, 1);
});

test('failure of both durable destinations returns no rotated token and forbids another exchange', async t => {
  const files = await credentials(t);
  const service = await upstream(t, (_request, response) => response.end(JSON.stringify({ access_token: 'must-not-return', refresh_token: 'spent-successor', expires_in: 3600 })));
  const held = store({ ...files, write: async () => { throw new Error('both writes unavailable'); } });
  await assert.rejects(manager(service.origin).getFresh(held), { code: 'credential_persistence_failed' });
  await assert.rejects(manager(service.origin).getFresh(store(files)), { code: 'oauth_exchange_uncertain' });
  assert.equal(service.requests.length, 1);
  assert.equal(JSON.parse(await readFile(files.path, 'utf8')).claudeAiOauth.refreshToken, 'old-refresh');
  await assert.rejects(access(held.recoveryPath), { code: 'ENOENT' });
});

test('validated imports retain one writable owner while snapshots cannot spend its refresh grant', async t => {
  const files = await credentials(t, document('live-access', 'owner-refresh', now * 1000 + 3_600_000));
  const destination = join(files.dataDir, 'adopted'), snapshot = join(files.dataDir, 'snapshot');
  let validations = 0;
  const validateCatalog = async ({ token }) => { validations++; assert.equal(token.access_token, 'live-access'); return ['exact-model']; };
  await importCredential({ provider: 'claude', sourceHome: files.home, destinationHome: destination, dataDir: files.dataDir, clock: () => now, validateCatalog });
  const pointer = JSON.parse(await readFile(join(destination, '.credentials.json'), 'utf8'));
  assert.equal(pointer._link_assistant_router.credential_source, files.path);
  const service = await upstream(t, (_request, response) => response.end(JSON.stringify({ access_token: 'owner-next', refresh_token: 'owner-rotated', expires_in: 3600 })));
  await manager(service.origin).getFresh(store({ home: destination, dataDir: files.dataDir }), { force: true });
  assert.equal(JSON.parse(await readFile(files.path, 'utf8')).claudeAiOauth.refreshToken, 'owner-rotated');
  assert.equal(JSON.parse(await readFile(join(destination, '.credentials.json'), 'utf8')).claudeAiOauth, undefined);
  await importCredential({ provider: 'claude', sourceHome: files.home, destinationHome: snapshot, dataDir: files.dataDir, clock: () => now, snapshot: true, validateCatalog: async () => ['exact-model'] });
  await assert.rejects(manager(service.origin).getFresh(store({ home: snapshot, dataDir: files.dataDir }), { force: true }), { code: 'external_refresh_owner' });
  assert.equal(service.requests.length, 1);
  assert.equal(validations, 1);
});

test('unverified imports and malformed recovery never overwrite or spend the existing credential', async t => {
  const files = await credentials(t);
  const destination = join(files.dataDir, 'destination');
  await mkdir(destination, { recursive: true });
  const destinationPath = join(destination, '.credentials.json');
  await writeFile(destinationPath, JSON.stringify(document('keep-existing', 'keep-refresh', now * 1000 + 3_600_000)));
  const before = await readFile(destinationPath, 'utf8');
  await assert.rejects(importCredential({ provider: 'claude', sourceHome: files.home, destinationHome: destination, dataDir: files.dataDir, clock: () => now, validateCatalog: async () => [] }), { code: 'catalog_unverified' });
  assert.equal(await readFile(destinationPath, 'utf8'), before);
  const held = store(files);
  await mkdir(join(files.dataDir, 'refresh-recovery'), { recursive: true });
  await writeFile(held.recoveryPath, '{"version":1,"token":{"access_token":"forged"}}');
  const service = await upstream(t, (_request, response) => response.end('{}'));
  await assert.rejects(manager(service.origin).getFresh(held), { code: 'credential_recovery_invalid' });
  assert.equal(service.requests.length, 0);
});
