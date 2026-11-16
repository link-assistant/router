// Independent immutable JS/TS selection case SOURCE. No execution performed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {collectCommittedDraftScopeTargets} from '../../../scripts/draft-scope-20261102-target-collect.mjs';
const revision = 'a'.repeat(40);
const selected = [
  {path: 'js/index.js', source: 'export function fromPackage(){return 1;}\n'},
  {path: 'ts/src/index.ts', source: 'export function fromSource(value:number):number{return value;}\n'},
];
for (const row of selected) {
  row.bytes = Buffer.byteLength(row.source);
  row.blob = createHash('sha1').update('blob ' + row.bytes + '\0').update(row.source).digest('hex');
}
function reader(tamper = false) {
  const calls = [];
  const run = (args, options) => {
    calls.push(args);
    if (args[0] === 'ls-tree') return Buffer.from(selected.map(row => '100644 blob ' + row.blob + '\t' + row.path + '\0').join('') +
      '100644 blob ' + 'b'.repeat(40) + '\trust/src/excluded.rs\0');
    if (args[1] === '--batch-check') {
      assert.equal(options.input, selected.map(row => row.blob + '\n').join(''));
      return Buffer.from(selected.map(row => row.blob + ' blob ' + row.bytes + '\n').join(''));
    }
    const row = selected.find(row => row.blob === args[2]);
    assert.ok(row);
    return Buffer.from(tamper ? row.source.replace('return', 'returX') : row.source);
  };
  return {run, calls};
}

test('immutable reader includes package roots and physical source roots in both languages', {timeout: 60000}, () => {
  const fixture = reader(), result = collectCommittedDraftScopeTargets({revision, run: fixture.run});
  assert.deepEqual(result.observations.sources.map(row => row.origin.path), selected.map(row => row.path));
  assert.deepEqual(result.observations.sources.map(row => row.language), ['JavaScript', 'TypeScript']);
  assert.equal(result.observations.productionFunctionDenominator, null);
  assert.equal(result.observations.nativeExportClosure, 'UNPROVED');
  assert.equal(fixture.calls.length, 4);
});

test('immutable reader refuses mismatched source content and mutable Git references', {timeout: 60000}, () => {
  assert.throws(() => collectCommittedDraftScopeTargets({revision: 'HEAD', run() { throw Error('unexpected'); }}));
  assert.throws(() => collectCommittedDraftScopeTargets({revision, run: reader(true).run}));
});
