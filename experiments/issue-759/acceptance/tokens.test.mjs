import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { load, temporary } from './helpers.mjs';

const { TokenManager } = await load('packages/javascript/native/tokens.mjs');
const { MemoryTokenStore, TextTokenStore, createTokenStore } = await load('packages/javascript/native/storage.mjs');
const now = 1_700_000_000;
const secret = 'independent-acceptance-only-secret';
const manager = (options = {}) => new TokenManager({ secret, clock: () => now, ...options });
// Construct a signed input independently; issuance and validation cannot validate
// one another's identical mistake. The token format is specified by src/token.rs.
function signed(claims, key = secret, header = { typ: 'JWT', alg: 'HS256' }) {
  const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${part(header)}.${part(claims)}`;
  return 'la_sk_' + body + '.' + createHmac('sha256', key).update(body).digest('base64url');
}

test('Rust-compatible external HS256 token and Codex alias validate; forged/expired/admin inputs do not', async () => {
  const tokens = manager();
  const claims = { sub: 'external-subject', iat: now - 20, exp: now + 600, label: 'external' };
  const token = signed(claims);
  assert.equal((await tokens.validate(token)).sub, claims.sub);
  assert.equal((await tokens.validate('at-' + token.slice(6))).sub, claims.sub);
  await assert.rejects(tokens.validate(signed(claims, 'wrong-secret')), { status: 401 });
  await assert.rejects(tokens.validate(signed({ ...claims, exp: now - 61 })), { status: 401 });
  await assert.rejects(tokens.validate(token, { admin: true }), { status: 403 });
  await assert.rejects(tokens.validate(signed(claims, secret, { alg: 'none' })), { status: 401 });
  await assert.rejects(tokens.validate(token, { model: 'provider/model-a' }), { code: 'model_policy_unavailable' });
});

test('concurrent reservations respect the cap; settlement bills actual usage and releases cancelled requests', async () => {
  const tokens = manager();
  const { id } = await tokens.issue({ max_tokens: 100 });
  const attempts = await Promise.all(Array.from({ length: 12 }, () => tokens.admit(id, 30)));
  assert.equal(attempts.filter(value => value === 'admitted').length, 3);
  assert.equal(attempts.filter(value => value === 'token_limit_exceeded').length, 9);
  let record = await tokens.get(id);
  assert.equal(record.used_requests, 3);
  assert.equal(record.reserved_tokens, 90);
  await tokens.settle(id, 30, 10);
  await tokens.settle(id, 30, 0);
  assert.equal(await tokens.admit(id, 60), 'admitted');
  await tokens.settle(id, 90, 130);
  record = await tokens.get(id);
  assert.equal(record.reserved_tokens, 0);
  assert.equal(record.used_tokens, 140);
  assert.equal(await tokens.admit(id, 1), 'token_limit_exceeded');
});

test('rejected oversized reservation leaves budgets untouched; request and rate caps are isolated by token', async () => {
  let clock = now;
  const tokens = manager({ clock: () => clock });
  const capped = await tokens.issue({ max_tokens: 100, max_requests: 2 });
  assert.equal(await tokens.admit(capped.id, 101), 'token_limit_exceeded');
  assert.equal((await tokens.get(capped.id)).used_requests, 0);
  assert.equal((await tokens.get(capped.id)).reserved_tokens, 0);
  assert.equal(await tokens.admit(capped.id, 0), 'admitted');
  assert.equal(await tokens.admit(capped.id, 0), 'admitted');
  assert.equal(await tokens.admit(capped.id, 0), 'request_limit_exceeded');
  const a = await tokens.issue({ rate_limit_per_minute: 1 });
  const b = await tokens.issue({ rate_limit_per_minute: 1 });
  assert.equal(await tokens.admit(a.id), 'admitted');
  assert.equal(await tokens.admit(a.id), 'rate_limit_exceeded');
  assert.equal(await tokens.admit(b.id), 'admitted');
  clock += 60;
  assert.equal(await tokens.admit(a.id), 'admitted');
});

test('managed binding and exact model authority survive rotation without granting wider access', async () => {
  const store = new MemoryTokenStore();
  const tokens = manager({ store });
  const original = await tokens.issue({ account: 'primary', client_kind: 'codex', principal_id: 'primary',
    model_policy: { allowed_models: ['provider/model-a'], allow_substitution: true, substitution_source: 'acceptance opt-in' },
    github_repos: ['Owner/Project'] });
  await assert.rejects(tokens.validate(original.token, { model: 'provider/model-b' }), { status: 403 });
  await assert.rejects(tokens.validate(original.token, { repository: 'owner/another' }), { status: 403 });
  assert.equal((await tokens.validate(original.token, { repository: 'owner/project', model: 'provider/model-a' })).account, 'primary');
  const replacement = await tokens.rotate(original.id);
  await assert.rejects(tokens.validate(original.token), { status: 401 });
  const claims = await tokens.validate(replacement.token, { model: 'provider/model-a' });
  assert.equal(claims.client_kind, 'codex');
  assert.equal(claims.principal_id, 'primary');
  await assert.rejects(tokens.validate(replacement.token, { model: 'provider/model-b' }), { status: 403 });
  const record = await store.get(replacement.id);
  await store.put({ ...record, client_kind: 'claude' });
  await assert.rejects(tokens.validate(replacement.token), { status: 401 });
  await store.delete(replacement.id);
  await assert.rejects(tokens.validate(replacement.token), { status: 401 });
});

test('invalid issue requests fail before writing a token record', async () => {
  const tokens = manager();
  for (const options of [{ max_requests: 0 }, { max_tokens: -1 }, { ttl_hours: 0 },
    { client_kind: 'codex' }, { scope: 'superuser' }, { github_repos: ['missing-owner'] },
    { model_policy: { allowed_models: ['m', 'm'] } }]) await assert.rejects(tokens.issue(options));
  assert.deepEqual(await tokens.list(), []);
});

test('text persistence reloads metadata and revocation, keeps raw credentials out, and serializes separate managers', async t => {
  const path = join(await temporary(t), 'tokens.lino');
  const a = manager({ store: new TextTokenStore(path) });
  const b = manager({ store: new TextTokenStore(path) });
  const token = await a.issue({ label: 'quoted "label"\nユニコード', max_tokens: 10 });
  assert.equal((await b.validate(token.token)).sub, token.id);
  const attempts = await Promise.all(Array.from({ length: 8 }, (_, i) => (i % 2 ? a : b).admit(token.id, 4)));
  assert.equal(attempts.filter(value => value === 'admitted').length, 2);
  assert.equal((await b.get(token.id)).reserved_tokens, 8);
  assert.equal((await b.get(token.id)).label, 'quoted "label"\nユニコード');
  await b.revoke(token.id);
  await assert.rejects(manager({ store: new TextTokenStore(path) }).validate(token.token), { status: 401 });
  const contents = await readFile(path, 'utf8');
  assert.equal(contents.includes(token.token), false);
  assert.equal(contents.includes(secret), false);
  if (process.platform !== 'win32') assert.equal((await stat(path)).mode & 0o777, 0o600);
});

test('binary/both storage cannot report success via memory fallback', () => {
  for (const storage_policy of ['binary', 'both', 'invented']) assert.throws(() => createTokenStore({ storage_policy }), { code: 'native_unsupported' });
});
