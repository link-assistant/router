// Independent immutable-source reader case SOURCE only. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {collectCommittedDraftScopeRust} from '../../../scripts/draft-scope-20261102-collect.mjs';
const revision = 'a'.repeat(40), source = 'fn main() {}\n', bytes = Buffer.byteLength(source);
const blob = createHash('sha1').update('blob ' + bytes + '\0').update(source).digest('hex');
function reader({actual = Buffer.from(source), list = null} = {}) {
  const calls = [];
  const run = (args, options) => {
    calls.push(args);
    if (args[0] === 'ls-tree') {
      assert.deepEqual(args, ['ls-tree', '-r', '-z', revision]);
      return Buffer.from(list ?? ('100644 blob ' + blob + '\trust/src/main.rs\0' +
        '100644 blob ' + 'b'.repeat(40) + '\tjs/src/ignored.mjs\0'));
    }
    if (args[0] === 'cat-file' && args[1] === '--batch-check') {
      assert.equal(options.input, blob + '\n');
      return Buffer.from(blob + ' blob ' + bytes + '\n');
    }
    assert.deepEqual(args, ['cat-file', 'blob', blob]);
    return actual;
  };
  return {run, calls};
}

test('immutable reader selects actual Rust source before object sizes and reissues private observations', {timeout: 60000}, () => {
  const fixture = reader(), result = collectCommittedDraftScopeRust({revision, run: fixture.run});
  assert.equal(fixture.calls.length, 3);
  assert.equal(result.observations.sources.length, 1);
  assert.equal(result.observations.sources[0].origin.path, 'rust/src/main.rs');
  assert.equal(result.observations.sources[0].origin.revision, revision);
  assert.ok(result.observations.observations.some(row => row.kind === 'parsed-function' && row.name === 'main'));
  assert.equal(result.observations.productionFunctionDenominator, null);
  assert.equal(result.observations.verification, 'UNRUN');
});

test('immutable reader rejects missing bytes wrong blobs invalid UTF8 and mutable revision names', () => {
  assert.throws(() => collectCommittedDraftScopeRust({revision: 'HEAD', run() { throw Error('must not read'); }}));
  assert.throws(() => collectCommittedDraftScopeRust({revision, run: reader({actual: Buffer.from('short')}).run}));
  assert.throws(() => collectCommittedDraftScopeRust({revision, run: reader({actual: Buffer.alloc(bytes, 0xff)}).run}));
  assert.throws(() => collectCommittedDraftScopeRust({revision, run: reader({actual: Buffer.from(source.replace('main','evil'))}).run}));
});
