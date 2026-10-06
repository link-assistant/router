import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Router, RouterError, catalog, operationNames, version, runProcess } from '../index.js';
import { temporaryHome, mockUpstream, vendorStub } from '../testing.js';

const binary = resolve(process.env.ROUTER_TEST_BIN ?? '../../target/debug/router');
async function fixture(body) {
  const dir = await mkdtemp(join(tmpdir(), 'router-binding-test-'));
  const path = join(dir, 'router');
  await writeFile(path, `#!${process.execPath}\n${body}`, { mode: 0o755 });
  return { path, close: () => rm(dir, { recursive: true, force: true }) };
}
const versionProbe = `if(process.argv.includes('version')) { console.log(JSON.stringify({schema:'link-assistant-router/version/v1',operation:'version',success:true,exit_code:0,data:{version:'${version}',source_commit:'${'a'.repeat(40)}'},diagnostics:[]}));process.exit(0); }`;

test('every catalog operation is exported with its published schema', async () => {
  const router = new Router({ binary, allowDownload: false });
  assert.equal(new Set(operationNames).size, catalog.operations.length);
  for (const operation of catalog.operations) {
    let entry = router;
    for (const name of operation.name.split('.')) entry = entry[name.replace(/[-_]([a-z])/g, (_, char) => char.toUpperCase())];
    assert.equal(typeof entry, 'function', operation.name);
  }
});
// This exercises several actual encrypted-store operations. Bun's default 5s
// per-test limit is shorter than the full lifecycle on a busy build runner.
test('actual binary, isolated state, version, token lifecycle and providers', { timeout: 30_000 }, async () => {
  const home = await temporaryHome();
  const upstream = await mockUpstream();
  const router = new Router({ binary, allowDownload: false, env: { ...home.env, TOKEN_SECRET: 'binding-test-secret', STORAGE_POLICY: 'text', UPSTREAM_ALLOW_PRIVATE_NETWORKS: 'loopback' } });
  try {
    assert.equal((await router.version()).data.version, version);
    await assert.rejects(router.tokens.issue({ ttlHours: 'invalid' }), error => error.exitCode === 2 && error.code === 'operation' && error.result.operation === 'cli-error');
    const token = await router.tokens.issue({ label: 'fixture' });
    assert.match(token.data.token, /^la_sk_/);
    const tokens = (await router.tokens.list()).data;
    const row = tokens.find(token => token.label === 'fixture');
    assert.ok(row);
    await router.tokens.revoke({ id: row.id });
    assert.equal((await router.tokens.show({ id: row.id })).data.revoked, true);
    await router.providers.add({ name: 'fixture', baseUrl: upstream.origin, apiKeyStdin: true }, { stdin: 'fixture-secret\n' });
    assert.equal((await router.providers.show({ name: 'fixture' })).data.name, 'fixture');
    const clients = await router.clients.list();
    assert.equal(clients.data.length, 8);
    assert.ok(!(JSON.stringify(clients).includes('fixture-secret')));
    await assert.rejects(router.providers.add({ apiKey: 'secret' }), error => error instanceof RouterError && error.code === 'secret-argv');
  } finally { await upstream.close(); await home.close(); }
});
test('unknown response fields fail loudly and preserve exit/stderr', async () => {
  const stub = await fixture(versionProbe + `console.error('fixture diagnostic');console.log(JSON.stringify({schema:'link-assistant-router/doctor/v1',operation:'doctor',success:true,exit_code:0,data:{output:[],undocumented:true},diagnostics:[]}));`);
  try {
    await assert.rejects(new Router({ binary: stub.path }).doctor(), error => error.code === 'schema' && error.exitCode === 0 && error.stderr.includes('fixture diagnostic'));
  } finally { await stub.close(); }
});
test('deadline, cancellation and output bound terminate finite probes', async () => {
  const stub = await fixture('setTimeout(() => process.exit(0), 2000);');
  try {
    await assert.rejects(runProcess(stub.path, [], { deadlineMs: 50 }), error => error.code === 'deadline');
    const controller = new AbortController();
    const running = runProcess(stub.path, [], { signal: controller.signal }); controller.abort();
    await assert.rejects(running, error => error.code === 'cancelled');
    await assert.rejects(runProcess(process.execPath, ['-e', 'console.log("x".repeat(8192))'], { maxOutputBytes: 1024 }), error => error.code === 'output-limit');
  } finally { await stub.close(); }
});
test('vendor fixture implements bounded version and output probes', async () => {
  const stub = await vendorStub({ version: '0.158.0' });
  try { assert.match((await runProcess(stub.binary, ['--version'])).stdout, /0.158.0/); }
  finally { await stub.close(); }
});

test('version mismatch needs explicit opt-in and failures retain typed diagnostics', async () => {
  const foreign = await fixture(versionProbe.replace(`version:'${version}'`, "version:'99.0.0'") + `console.error('transport diagnostic');console.log(JSON.stringify({schema:'link-assistant-router/doctor/v1',operation:'doctor',success:false,exit_code:17,data:{output:[]},diagnostics:['operation diagnostic']}));process.exit(17);`);
  try {
    await assert.rejects(new Router({ binary: foreign.path }).doctor(), error => error.code === 'version');
    await assert.rejects(new Router({ binary: foreign.path, allowVersionMismatch: true }).doctor(), error => error.exitCode === 17 && error.result.operation === 'doctor' && error.stderr.includes('transport diagnostic') && error.stderr.includes('operation diagnostic'));
  } finally { await foreign.close(); }
});

test('every catalog secret option is rejected before starting a process', async () => {
  const router = new Router({ binary: '/must-not-start-router', allowDownload: false });
  for (const operation of catalog.operations) {
    for (const option of operation.options.filter(option => option.secret)) {
      const name = option.name.replace(/[-_]([a-z])/g, (_, character) => character.toUpperCase());
      await assert.rejects(router.invoke(operation.name, { [name]: 'never-in-argv' }), error => error.code === 'secret-argv', `${operation.name}:${name}`);
    }
  }
});

test('native verifier returns its saved versioned document using vendor fixtures', async () => {
  const { verifyContracts } = await import('../testing.js');
  const home = await temporaryHome();
  const stub = await vendorStub({ name: 'codex', version: '0.158.0' });
  const router = new Router({ binary, allowDownload: false, env: { ...home.env, ...stub.env }, cwd: resolve('../..') });
  try {
    const response = await router.verify({ arguments: ['--prepare-clients', '--client', 'codex', '--output', join(home.home, 'result.json')] });
    assert.equal(response.data.schema, 'link-assistant-router/verification/v1');
    const preparation = response.data.client_preparation[0];
    if (process.platform === 'darwin') {
      assert.equal(preparation.observed, null);
      assert.equal(preparation.status, 'not-proven');
      assert.match(preparation.reason, /credential-store boundary/);
    } else {
      assert.equal(preparation.observed, '0.158.0');
      assert.equal(preparation.status, 'prepared');
    }
    // Unknown areas exercise the shared helper's typed error without running a suite.
    await assert.rejects(verifyContracts({ router, repository: resolve('../..'), areas: ['missing-area'] }), error => error.exitCode === 2 && error.result.operation === 'verify');
  } finally { await stub.close(); await home.close(); }
});
