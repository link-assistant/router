/** Executable parity evidence. A fixture passes only after asserting observed behavior. */
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NativeRouter, catalog, validateNativeResult } from '../native/operations.mjs';

export const fixtureOperations = Object.freeze([
  'version', 'contracts', 'accounts.list', 'accounts.pause', 'accounts.resume', 'accounts.policy',
  'tokens.import', 'tokens.issue', 'tokens.list', 'tokens.show', 'tokens.revoke', 'tokens.expire', 'tokens.rotate', 'tokens.recover-admin',
  'providers.list', 'providers.show', 'providers.add', 'providers.remove', 'providers.import', 'models.explain', 'serve', 'doctor', 'auth.status',
]);
export async function runOperationFixtures() {
  const directory = await mkdtemp(join(tmpdir(), 'router-native-operation-fixtures-'));
  const router = new NativeRouter({ config: { token_secret: 'native-operation-fixture-secret', storage_policy: 'memory', data_dir: directory,
    providers: [], accounts: [{ name: 'fixture-account', provider: 'fixture', policy: { weight: 2 } }] }, env: {} });
  const evidence = new Map();
  const record = async (name, options, verify) => {
    const result = await router.invoke(name, options);
    validateNativeResult(name, result);
    assert.equal(result.success, true); assert.equal(result.exit_code, 0);
    await verify(result.data);
    evidence.set(`operation:${name}`, { operation: name, success: true });
    return result.data;
  };
  try {
    await record('version', {}, data => { assert.equal(data.version, catalog.version); assert.equal(data.source_commit, 'unknown'); });
    await record('contracts', {}, data => { assert.deepEqual(data, catalog); });
    await record('accounts.list', {}, data => { assert.equal(data.accounts[0].name, 'fixture-account'); });
    await record('accounts.policy', { name: 'fixture-account' }, data => { assert.equal(data.weight, 2); });
    const policyPath = join(directory, 'account-policy.json');
    await writeFile(policyPath, JSON.stringify({ weight: 3 }));
    await router.accounts.policy({ name: 'fixture-account', file: policyPath });
    assert.equal((await router.accounts.policy({ name: 'fixture-account' })).data.weight, 3);
    await record('accounts.pause', { name: 'fixture-account', reason: 'fixture' }, async () => {
      const result = await router.accounts.list(); assert.equal(result.data.accounts[0].paused, true);
    });
    await record('accounts.resume', { name: 'fixture-account' }, async () => {
      const result = await router.accounts.list(); assert.equal(result.data.accounts[0].paused, false);
    });
    const tokenPath = join(directory, 'tokens.json');
    const incoming = { id: 'import-fixture', label: 'imported', issued_at: 1, expires_at: 2, revoked: true };
    await writeFile(tokenPath, JSON.stringify([incoming]));
    await record('tokens.import', { from: tokenPath }, async data => {
      assert.deepEqual(data.added, ['import-fixture']);
      assert.equal((await router.tokens.show({ id: incoming.id })).data.revoked, true);
    });
    await writeFile(tokenPath, JSON.stringify([{ ...incoming, revoked: false }]));
    const conflict = await router.execute('tokens.import', { from: tokenPath });
    assert.equal(conflict.exit_code, 2); assert.equal(conflict.data.conflicts.length, 1);
    assert.equal((await router.tokens.show({ id: incoming.id })).data.revoked, true);
    const first = await record('tokens.issue', { ttlHours: 1, label: 'fixture-token', maxRequests: 2 }, data => {
      assert.equal(typeof data.token, 'string'); assert.equal(data.token.split('.').length, 3);
    });
    let id;
    await record('tokens.list', {}, data => { id = data.find(record => record.label === 'fixture-token').id; assert.ok(id); assert.equal(JSON.stringify(data).includes(first.token), false); });
    await record('tokens.show', { id }, data => { assert.equal(data.id, id); assert.equal(data.label, 'fixture-token'); assert.equal(data.revoked, false); });
    const rotated = await record('tokens.rotate', { id, label: 'rotated' }, data => { assert.equal(typeof data.token, 'string'); assert.notEqual(data.token, first.token); });
    const afterRotation = await router.tokens.list();
    assert.equal(afterRotation.data.find(record => record.id === id).revoked, true);
    const rotatedId = afterRotation.data.find(record => record.label === 'rotated').id;
    await record('tokens.expire', { id: rotatedId }, async () => { const show = await router.tokens.show({ id: rotatedId }); assert.ok(show.data.expires_at <= Date.now() / 1000); });
    const revokeToken = await router.tokens.issue({ label: 'revoke-fixture' });
    const revokeRecords = await router.tokens.list();
    const revokeId = revokeRecords.data.find(record => record.label === 'revoke-fixture').id;
    await record('tokens.revoke', { id: revokeId }, async () => { const show = await router.tokens.show({ id: revokeId }); assert.equal(show.data.revoked, true); });
    await record('tokens.recover-admin', { label: 'admin-fixture' }, async data => {
      assert.equal(data.recovered, true); assert.ok(data.token_id); assert.equal(typeof data.token, 'string');
      const show = await router.tokens.show({ id: data.token_id }); assert.equal(show.data.scope, 'admin');
    });
    await record('providers.add', { name: 'fixture', baseUrl: 'https://fixture.invalid/v1', models: ['fixture-model'], apiKeyEnv: 'FIXTURE_API_KEY' }, data => {
      assert.equal(data.name, 'fixture'); assert.equal(data.outcome, 'created'); assert.equal(Object.hasOwn(data, 'api_key'), false);
    });
    await record('providers.list', {}, data => { assert.equal(data.length, 1); assert.equal(data[0].api_key_env, 'FIXTURE_API_KEY'); });
    await record('providers.show', { name: 'fixture' }, data => { assert.deepEqual(data.models, ['fixture-model']); });
    const path = join(directory, 'provider-import.json');
    await writeFile(path, JSON.stringify([{ name: 'imported', kind: 'openai-compatible', base_url: 'https://imported.invalid/v1', models: ['imported-model'] }]));
    await record('providers.import', { path }, async () => { const show = await router.providers.show({ name: 'imported' }); assert.equal(show.data.name, 'imported'); });
    await record('providers.remove', { name: 'imported' }, async () => { const list = await router.providers.list(); assert.equal(list.data.some(provider => provider.name === 'imported'), false); });
    await record('models.explain', { id: 'fixture-model' }, data => { assert.equal(data.requested_selector, 'fixture-model'); assert.ok(data.routing.candidate_count >= 1); });
    await record('serve', { host: '127.0.0.1', port: 0 }, async () => {
      const runtime = await router.runtime();
      assert.ok(runtime.address.port > 0);
      const health = await fetch(`http://127.0.0.1:${runtime.address.port}/health`);
      assert.equal(health.status, 200);
    });
    await record('auth.status', {}, data => { assert.equal(data.api_key_providers[0].name, 'fixture'); assert.ok(data.output[0].includes('not implemented')); });
    await record('doctor', {}, data => { assert.equal(data.status, 'partial'); assert.ok(data.checks.some(check => check.state === 'unverified')); });
    // Unsupported commands must fail closed with a complete versioned contract.
    for (const operation of catalog.operations.filter(operation => !fixtureOperations.includes(operation.name))) {
      const options = Object.fromEntries(operation.options.filter(option => option.required && !option.secret).map(option => [option.name, 'fixture']));
      const result = await router.execute(operation.name, options);
      validateNativeResult(operation.name, result); assert.equal(result.success, false); assert.equal(result.exit_code, 1);
      assert.ok(result.diagnostics.some(detail => detail.includes('not implemented')));
      evidence.set(`unsupported:${operation.name}`, { operation: operation.name, success: false });
    }
    return evidence;
  } finally { await router.close(); await rm(directory, { recursive: true, force: true }); }
}
