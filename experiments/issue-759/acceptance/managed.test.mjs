import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, stat, access } from 'node:fs/promises';
import { join } from 'node:path';
import { load, temporary } from './helpers.mjs';

const { NativeRouter } = await load('packages/javascript/native/operations.mjs');
const config = data_dir => ({ data_dir, token_secret: 'independent-local-secret', storage_policy: 'memory', providers: [], accounts: [] });

test('managed operation envelopes preserve claimed authority across restart and reject counterfeit control identity', async t => {
  const directory = await temporary(t), router = new NativeRouter({ config: config(directory), env: {} });
  const statePath = join(directory, 'native-managed', 'state.json');
  t.after(async () => { await router.server.stop().catch(() => {}); await router.close(); });
  await router.server.start();
  const initial = JSON.parse(await readFile(statePath, 'utf8'));
  const status = await router.server.status();
  assert.equal(status.data.managed.state, 'running');
  assert.equal(JSON.stringify(status).includes(initial.control_key), false);
  assert.equal(JSON.stringify(status).includes(initial.token_secret), false);
  assert.equal((await stat(statePath)).mode & 0o077, 0);
  const origin = status.data.managed.url;
  const claimed = await router.server.claim(), token = claimed.data.output[0];
  assert.match(token, /^la_sk_/);
  const adminRequest = url => fetch(url + '/api/management/tokens', { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(3000) });
  assert.equal((await fetch(origin + '/api/management/tokens')).status, 401);
  assert.equal((await adminRequest(origin)).status, 200);
  await assert.rejects(router.server.claim(), error => error.result?.success === false);
  const authentic = await readFile(statePath, 'utf8');
  try {
    const counterfeit = JSON.parse(authentic); counterfeit.control_key = '0'.repeat(64);
    await writeFile(statePath, JSON.stringify(counterfeit));
    assert.equal((await router.server.status()).data.managed.state, 'unverified');
    for (const operation of ['stop', 'claim', 'remove']) {
      const result = await router.execute(`server.${operation}`, operation === 'remove' ? { yes: true } : {});
      assert.equal(result.success, false, operation);
      assert.ok(result.exit_code > 0, operation);
    }
    assert.equal((await fetch(origin + '/health')).status, 200);
    assert.equal(JSON.parse(await readFile(statePath, 'utf8')).pid, initial.pid);
  } finally { await writeFile(statePath, authentic); }
  await router.server.stop();
  await router.server.start();
  const restarted = (await router.server.status()).data.managed.url;
  assert.equal((await adminRequest(restarted)).status, 200);
  await assert.rejects(router.server.claim());
  await writeFile(join(directory, 'unrelated.txt'), 'preserve');
  await router.server.remove({ yes: true });
  await assert.rejects(access(join(directory, 'native-managed', 'data')), { code: 'ENOENT' });
  assert.equal(await readFile(join(directory, 'unrelated.txt'), 'utf8'), 'preserve');
});

test('persisted remote selection blocks local token mutations until the operator explicitly selects local state', async t => {
  const directory = await temporary(t), router = new NativeRouter({ config: config(directory), env: {} });
  t.after(() => router.close());
  const use = await router.server.use({ server: 'https://inference.example', tokenStdin: true }, { stdin: 'selected-private-token\n' });
  assert.equal(JSON.stringify(use).includes('selected-private-token'), false);
  const before = (await router.tokens.list({ local: true })).data;
  const blocked = await router.execute('tokens.issue', { label: 'must-not-create' });
  assert.equal(blocked.success, false);
  assert.ok(blocked.exit_code > 0);
  assert.deepEqual((await router.tokens.list({ local: true })).data, before);
  const local = await router.tokens.issue({ local: true, label: 'explicit-local' });
  assert.match(local.data.token, /^la_sk_/);
  const saved = await readFile(join(directory, 'native-managed', 'server.json'), 'utf8');
  await assert.rejects(router.server.use({ server: 'https://user:secret@example.test/path' }));
  assert.equal(await readFile(join(directory, 'native-managed', 'server.json'), 'utf8'), saved);
  await router.server.use({ clear: true });
  assert.equal((await router.tokens.list()).data.length, before.length + 1);
});
