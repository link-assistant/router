// Independent whole-source native case-copy integration. SOURCE ONLY / UNRUN.
// Rust executes only in the existing gated policy integration target, never here.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {readBoundedTrackedSourceBytes, withBoundedTrackedSourceOperation}
  from '../forward-output-ownership-20261101-bounded-bytes.mjs';
import {withNativeOracleReadOnlySourceGit} from './native-profile-oracles-20261101-fixture.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const archive = 'tools/translation/source-profiles/native-profile-oracles-20261101/constant-index-native-integration.json.gz';
const pin = '6e82d85c001400d3d909bbab1d69663f67301e3d8c9d3ca96b18bd27f155248d';
const options = {timeout: 60000, concurrency: false};
const paths = [
  'tools/translation/test/constant-index-format-20261101-native.rs',
  'rust/tests/oracles/constant_index_format_20261101.rs',
  'rust/tests/policy_collection_edges_20261101.rs',
];
const append = '\n// Exact independent constant-index baseline; reuse this existing integration target.\n' +
  '#[path = "oracles/constant_index_format_20261101.rs"]\nmod constant_index_format_20261101;\n';
function sourceCase(run) {
  return withNativeOracleReadOnlySourceGit(root, () => withBoundedTrackedSourceOperation(root, () => {
    const packed = readBoundedTrackedSourceBytes(root, archive, {maxBytes: 2097152});
    assert.equal(createHash('sha256').update(packed).digest('hex'), pin);
    const packet = JSON.parse(new TextDecoder('utf8', {fatal: true, ignoreBOM: true}).decode(
      gunzipSync(packed, {maxOutputLength: 4194304})));
    assert.equal(packet.schema, 'constant-index-native-case-complete-source-history-v1');
    assert.deepEqual(packet.rows.map(row => row.path), paths);
    assert.equal(packet.semanticAuthority, false);
    assert.equal(packet.rustAuthority, false);
    assert.equal(packet.execution, 'UNRUN');
    for (const row of packet.rows) {
      assert.equal(row.language, 'Rust');
      assert.equal(readBoundedTrackedSourceBytes(root, row.path, {maxBytes: 2097152})
        .toString('utf8'), row.after);
    }
    return run(packet.rows);
  }));
}

test('native tree receives the entire unchanged independently authored constant-index baseline', options,
  () => sourceCase(rows => {
    assert.equal(rows[0].before, rows[0].after);
    assert.equal(rows[1].before, rows[1].after);
    assert.equal(rows[0].after, rows[1].after);
    assert.equal(rows[2].after, rows[2].before + append);
    assert.equal(rows[2].before.includes('mod constant_index_format_20261101;'), false);
    // Every earlier native policy, credential, URL, static and source oracle
    // remains in the full original prefix. This adds no new Cargo test target.
    assert.equal(rows[2].after.slice(0, rows[2].before.length), rows[2].before);
    assert.ok(rows[2].after.includes('mod client_static_producer_20261101;'));
  }));

test('all three complete native histories traverse Rust CST/reparse and preserve whole inverses', options,
  () => sourceCase(rows => {
    const equations = transportConcreteSourceEquations(rows.map(row => ({
      before: row.before, after: row.after, language: row.language,
    })));
    assert.equal(equations.length, 3);
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index], equation = equations[index];
      assert.equal(equation.before, row.before);
      assert.equal(equation.after, row.after);
      assert.equal(equation.inverse, row.before);
      assert.equal(transportConcreteSyntaxMeta(equation.beforeMeta).source, row.before);
      assert.equal(transportConcreteSyntaxMeta(equation.afterMeta).source, row.after);
      assert.deepEqual(equation.trace.map(item => item.phase), ['language', 'repository']);
    }
  }));
