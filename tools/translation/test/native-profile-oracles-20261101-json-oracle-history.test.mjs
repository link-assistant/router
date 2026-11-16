// Entire native oracle source-history expectations, SOURCE ONLY / UNRUN.
// No Cargo/Rust/native process is invoked, including during deferred execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {visitNativeJsonOutputOracleSourceEquations}
  from '../native-profile-oracles-20261101-json-oracle-history.mjs';
import {readBoundedTrackedSourceBytes, withBoundedTrackedSourceOperation}
  from '../forward-output-ownership-20261101-bounded-bytes.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {nativeProfileOracleTargetSource, NATIVE_PROFILE_ORACLES}
  from '../native-profile-oracles-20261101-control.mjs';
import {withNativeOracleReadOnlySourceGit, withoutNativeOracleSubprocesses}
  from './native-profile-oracles-20261101-fixture.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const archive = 'tools/translation/source-profiles/native-profile-oracles-20261101/json-oracle-integration.json.gz';
const options = {timeout: 60000, concurrency: false};
const paths = [
  'rust/tests/oracles/generalized_primitive_output_20261101.rs',
  'rust/tests/oracles/owned_json_output_20261101.rs',
];
function sourceCase(run) {
  return withNativeOracleReadOnlySourceGit(root, () => withBoundedTrackedSourceOperation(root, () => {
    const bytes = readBoundedTrackedSourceBytes(root, archive, {maxBytes: 2097152});
    const packet = JSON.parse(new TextDecoder('utf8', {fatal: true, ignoreBOM: true})
      .decode(gunzipSync(bytes, {maxOutputLength: 4194304})));
    assert.equal(packet.schema, 'native-json-output-oracle-complete-source-history-v1');
    assert.deepEqual(packet.rows.map(row => row.path), paths);
    return run(packet);
  }));
}

test('both entire native sources arrive through Rust CST/reparse/inverse and exactly two phases', options,
  () => sourceCase(packet => {
    let index = 0;
    const receipt = visitNativeJsonOutputOracleSourceEquations(event => {
      const row = packet.rows[index++];
      assert.ok(row);
      assert.equal(event.path, row.path);
      assert.equal(event.language, 'Rust');
      assert.equal(event.history.before, row.before);
      assert.equal(event.history.after, row.after);
      assert.equal(event.history.inverse, row.before);
      assert.equal(transportConcreteSyntaxMeta(event.history.beforeMeta).source, row.before);
      assert.equal(transportConcreteSyntaxMeta(event.history.afterMeta).source, row.after);
      assert.deepEqual(event.history.trace.map(item => item.phase), ['language', 'repository']);
      assert.equal(readBoundedTrackedSourceBytes(root, row.path, {maxBytes: 2097152})
        .toString('utf8'), row.after);
      assert.equal(event.semanticAuthority, false);
      assert.equal(event.rustAuthority, false);
      return null;
    });
    assert.equal(index, 2);
    assert.deepEqual(receipt.delivered.map(row => row.path), paths);
    assert.equal(receipt.execution, 'UNRUN');
    assert.equal(receipt.additionalCargoInvocations, 0);
    assert.equal(receipt.semanticAuthority, false);
    assert.equal(receipt.rustAuthority, false);
  }));

test('whole original generalized workload stays byte-exact and new cases join the existing binary', options,
  () => sourceCase(packet => {
    const original = packet.rows[0], added = packet.rows[1];
    assert.equal(original.after.slice(0, original.before.length), original.before);
    assert.equal(original.after.slice(original.before.length),
      '\n// Additional independently authored helper/JSON-borrow cases; same native binary.\n' +
      '#[path = "owned_json_output_20261101.rs"]\nmod owned_json_output_20261101;\n');
    assert.equal(added.before, added.after);
    assert.equal(NATIVE_PROFILE_ORACLES.length, 3);
    assert.deepEqual(NATIVE_PROFILE_ORACLES[1].extraOracles,
      ['rust/tests/oracles/generalized_primitive_output_20261101.rs']);
    const source = nativeProfileOracleTargetSource('dynamic-primitive-output-20261101');
    assert.ok(source.includes('oracles/dynamic_primitive_output_20261101.rs'));
    assert.ok(source.includes('oracles/generalized_primitive_output_20261101.rs'));
    // Cargo resolves the sibling module from the selected generalized file.
    assert.ok(original.after.includes('#[path = "owned_json_output_20261101.rs"]'));
  }));

for (const [index, primary] of [undefined, null, false, 0, '',
  Object.freeze(Error('independent frozen native history primary'))].entries()) {
  test('all source closers preserve exact thrown primary ' + index, options,
    () => sourceCase(() => {
      let caught = false;
      try { visitNativeJsonOutputOracleSourceEquations(() => { throw primary; }); }
      catch (error) { caught = true; assert.strictEqual(error, primary); }
      assert.equal(caught, true);
    }));
}

test('mutated delivered DATA never changes the next fresh whole-source history', options,
  () => sourceCase(packet => {
    visitNativeJsonOutputOracleSourceEquations(event => {
      event.history.before = 'caller-owned replacement';
      event.history.inverse = 'caller-owned replacement';
      return false;
    });
    let index = 0;
    visitNativeJsonOutputOracleSourceEquations(event => {
      assert.equal(event.history.before, packet.rows[index].before);
      assert.equal(event.history.inverse, packet.rows[index++].before);
      return undefined;
    });
    assert.equal(index, 2);
  }));

test('callback accessors/proxies/async work cannot become source or execution authority', options,
  () => sourceCase(() => {
    assert.throws(() => visitNativeJsonOutputOracleSourceEquations(async () => null));
    let reads = 0;
    const callback = new Proxy(() => null, {get() { reads++; throw Error('opaque'); }});
    assert.throws(() => visitNativeJsonOutputOracleSourceEquations(callback));
    assert.equal(reads, 0);
  }));

test('a complete stored receipt cannot issue the private native gate or start Rust', options, async () => {
  const receipt = await sourceCase(() => visitNativeJsonOutputOracleSourceEquations(() => null));
  await withoutNativeOracleSubprocesses(async () => {
    const gate = await import('../native-profile-oracles-20261101-gate.mjs');
    const processModule = await import('../native-profile-oracles-20261101-process.mjs');
    for (const fake of [receipt, structuredClone(receipt), {...receipt, executionAuthority: true}]) {
      await assert.rejects(gate.requireNativeProfileOracleCiGate(fake), /foreign gate/u);
      await assert.rejects(processModule.runNativeProfileOracle(fake, {}), /foreign gate/u);
      assert.equal(processModule.nativeProfileOracleFailureAllowsContinuation(fake,
        'dynamic-primitive-output-20261101'), false);
    }
  });
});
