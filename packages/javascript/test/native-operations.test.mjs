import test from 'node:test';
import assert from 'node:assert/strict';
import { NativeRouter, NativeRouterError, catalog } from '../native/operations.mjs';
import { parseNativeArguments, runNativeCli } from '../native/cli.mjs';
import { runOperationFixtures, fixtureOperations } from './native-operation-fixtures.mjs';

test('native operation fixtures assert successful behavior and unsupported failures', async () => {
  const evidence = await runOperationFixtures();
  assert.equal(evidence.size, catalog.operations.length);
  for (const name of fixtureOperations) assert.equal(evidence.get(`operation:${name}`).success, true);
});
test('native input errors preserve schema and operation exit codes', async () => {
  const router = new NativeRouter();
  for (const options of [{ unknown: true }, { verbose: 'yes' }, { tokenSecret: 'secret' }]) {
    const result = await router.execute('version', options);
    assert.equal(result.operation, 'version'); assert.equal(result.exit_code, 2); assert.equal(result.success, false);
  }
  await assert.rejects(router.deploy(), error => error instanceof NativeRouterError && error.exitCode === 1 && error.code === 'unsupported');
  const missing = await router.execute('tokens.show'); assert.equal(missing.exit_code, 2);
  const unknown = await router.execute('imaginary'); assert.equal(unknown.operation, 'cli-error'); assert.equal(unknown.exit_code, 2);
});
test('native CLI parses canonical flags and rejects secret argv', () => {
  const parsed = parseNativeArguments(['providers', 'add', '--json', '--name', 'fixture', '--base-url=https://fixture.invalid', '--models', 'a', '--models', 'b', '--enabled=false']);
  assert.equal(parsed.name, 'providers.add'); assert.deepEqual(parsed.options.models, ['a', 'b']); assert.equal(parsed.options.enabled, false);
  assert.throws(() => parseNativeArguments(['providers', 'add', '--api-key', 'secret']), /secret/);
  assert.throws(() => parseNativeArguments(['version', '--unknown']), /Unknown/);
  assert.throws(() => parseNativeArguments(['version', '--verbose=false', '--verbose']), /Duplicate/);
});
test('native CLI writes one JSON result and returns its actual exit code', async () => {
  for (const args of [['version', '--json'], ['deploy', '--json'], ['unknown'], ['tokens', 'show']]) {
    let text = '';
    const exit = await runNativeCli(args, { stdout: { write(chunk) { text += chunk; } }, env: {} });
    const result = JSON.parse(text); assert.equal(exit, result.exit_code); assert.equal(text.trim().split('\n').length, 1);
    assert.equal(result.success, args[0] === 'version');
  }
});

test('schema-invalid native handlers cannot inherit a successful exit status', async () => {
  const core = { tokens: { list: async () => [{ id: 'invalid-contract' }] } };
  const result = await new NativeRouter({ core }).execute('tokens.list');
  assert.equal(result.success, false); assert.equal(result.exit_code, 1);
  assert.match(result.diagnostics[0], /schema/);
});
