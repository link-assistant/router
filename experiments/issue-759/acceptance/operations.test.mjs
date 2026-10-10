import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { load, repository, temporary } from './helpers.mjs';

const { NativeRouter, validateNativeResult, version } = await load('packages/javascript/native/operations.mjs');
const { Router } = await load('packages/javascript/index.js');
export const processResult = (file, args, options = {}) => new Promise(resolve => {
  execFile(file, args, { timeout: 5000, maxBuffer: 1_048_576, ...options }, (error, stdout, stderr) => resolve({ status: error ? error.code : 0, stdout, stderr }));
});

test('native operation lifecycle changes state and reports secrets only in the issue response', async t => {
  const directory = await temporary(t);
  const router = new NativeRouter({ config: { token_secret: 'operations-secret', storage_policy: 'memory', data_dir: directory,
    providers: [], accounts: [{ name: 'primary', provider: 'fixture' }] }, env: {} });
  t.after(() => router.close());
  const added = await router.providers.add({ name: 'fixture', baseUrl: 'http://127.0.0.1:1', models: ['one'], apiKeyStdin: true }, { stdin: 'upstream-credential\n' });
  assert.equal(added.data.outcome, 'created');
  assert.equal(JSON.stringify(added).includes('upstream-credential'), false);
  assert.equal((await router.providers.show({ name: 'fixture' })).data.has_encrypted_api_key, true);
  const issued = await router.tokens.issue({ label: 'acceptance', ttlHours: 1, maxRequests: 1, allowedModel: ['fixture/one'] });
  const records = (await router.tokens.list()).data;
  const record = records.find(value => value.label === 'acceptance');
  assert.ok(record?.id);
  assert.equal(JSON.stringify(records).includes(issued.data.token), false);
  assert.deepEqual(record.model_policy.allowed_models, ['fixture/one']);
  await router.accounts.pause({ name: 'primary', reason: 'maintenance' });
  assert.equal((await router.accounts.list()).data.accounts.find(account => account.name === 'primary').paused, true);
  await router.accounts.resume({ name: 'primary' });
  assert.equal((await router.accounts.list()).data.accounts.find(account => account.name === 'primary').paused, false);
  await router.tokens.revoke({ id: record.id });
  assert.equal((await router.tokens.show({ id: record.id })).data.revoked, true);
  await router.providers.remove({ name: 'fixture' });
  assert.deepEqual((await router.providers.list()).data, []);
});

test('native unsupported operations/options and malformed contract responses fail closed', async t => {
  const router = new NativeRouter({ config: { token_secret: 'operations-secret', storage_policy: 'memory', data_dir: await temporary(t), providers: [], accounts: [] }, env: {} });
  t.after(() => router.close());
  for (const [name, options, exitCode] of [['deploy', {}, 1], ['version', { invented: true }, 2], ['tokens.issue', { tokenSecret: 'forbidden-argv' }, 2], ['tokens.issue', { server: 'https://remote.invalid' }, 1]]) {
    const result = await router.execute(name, options);
    assert.equal(result.success, false);
    assert.equal(result.exit_code, exitCode);
    validateNativeResult(name, result);
    await assert.rejects(router.invoke(name, options), error => error.exitCode === exitCode && error.result?.success === false);
  }
  assert.throws(() => validateNativeResult('version', { schema: 'link-assistant-router/version/v1', operation: 'version', success: true, exit_code: 2, diagnostics: [], data: { version, source_commit: 'unknown' } }), { code: 'schema' });
});

test('schema-invalid core output cannot be transformed into a successful fallback envelope', async () => {
  const router = new NativeRouter({ core: { tokens: { list: async () => [{ id: 7, label: 'invalid record' }] } } });
  const result = await router.execute('tokens.list');
  assert.equal(result.success, false);
  assert.ok(result.exit_code > 0);
  assert.ok(result.diagnostics.some(diagnostic => diagnostic.startsWith('schema:')));
  await assert.rejects(router.tokens.list(), error => error.code === 'schema' && error.exitCode > 0);
});

test('model explanation returns an actual requested selector and candidate observations', async t => {
  const router = new NativeRouter({ config: { token_secret: 'explain-secret', storage_policy: 'memory', data_dir: await temporary(t),
    providers: [{ name: 'fixture', base_url: 'http://127.0.0.1:1', models: ['fixture/one'] }], accounts: [] }, env: {} });
  t.after(() => router.close());
  const result = await router.models.explain({ id: 'fixture/one' });
  assert.equal(result.data.requested_selector, 'fixture/one');
  assert.equal(result.data.routing.candidate_count, 1);
  assert.ok(result.data.health.healthy_providers.includes('fixture'));
});

test('native CLI publishes parse failures and numeric issue flags with matching actual exit status', async t => {
  const directory = await temporary(t);
  const cli = join(repository, 'packages/javascript/native/cli.mjs');
  const env = { PATH: process.env.PATH, TOKEN_SECRET: 'cli-acceptance-secret', STORAGE_POLICY: 'memory', DATA_DIR: directory };
  for (const args of [['version', '--invented'], ['tokens', 'issue', '--ttl-hours', 'no-number'], ['version', '--token-secret', 'secret-argument']]) {
    const result = await processResult(process.execPath, [cli, ...args, '--json'], { env });
    const envelope = JSON.parse(result.stdout);
    assert.equal(result.status, 2);
    assert.equal(envelope.exit_code, result.status);
    assert.equal(envelope.success, false);
    assert.equal(result.stdout.includes('secret-argument'), false);
  }
  const issue = await processResult(process.execPath, [cli, 'tokens', 'issue', '--ttl-hours', '1', '--max-requests', '2', '--json'], { env });
  assert.equal(issue.status, 0, issue.stdout + issue.stderr);
  const result = JSON.parse(issue.stdout);
  assert.equal(result.operation, 'tokens.issue');
  assert.equal(result.success, true);
  assert.match(result.data.token, /^la_sk_/);
});

test('existing wrapper transport still validates success, errors and exit-code/schema disagreement without a Rust binary', async t => {
  const binary = join(await temporary(t), 'fixture-cli');
  const versionEnvelope = { schema: 'link-assistant-router/version/v1', operation: 'version', success: true, exit_code: 0, data: { version, source_commit: 'a'.repeat(40) }, diagnostics: [] };
  const listEnvelope = { schema: 'link-assistant-router/providers-list/v1', operation: 'providers.list', success: true, exit_code: 0, data: [], diagnostics: [] };
  await writeFile(binary, `#!${process.execPath}\nconst version=${JSON.stringify(versionEnvelope)};const list=${JSON.stringify(listEnvelope)};if(process.argv.includes('version')) console.log(JSON.stringify(version));else {if(process.env.TEST_BROKEN==='yes') list.exit_code=2;console.log(JSON.stringify(list));}\n`, { mode: 0o755 });
  const wrapper = new Router({ binary, allowDownload: false });
  assert.equal((await wrapper.version()).data.version, version);
  assert.deepEqual((await wrapper.providers.list()).data, []);
  await assert.rejects(wrapper.providers.list({}, { env: { TEST_BROKEN: 'yes' } }), { code: 'schema' });
  await assert.rejects(wrapper.tokens.issue({ tokenSecret: 'must-stay-private' }), { code: 'secret-argv' });
});
