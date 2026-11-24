// Independent source-bookkeeping case draft. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {draftScopeEntryKey, reconcileDraftScope} from '../draft-inventory-scope.mjs';
const revision = 'a'.repeat(40);
const origin = (path = 'rust/src/lib.rs') => ({revision, path, blob: 'b'.repeat(40), mode: '100644', bytes: 200});
const source = (path = 'rust/src/lib.rs') => ({origin: origin(path), role: 'application', itemReview: 'OPEN', unresolved: ['nested-item-census']});
const item = (changes = {}) => ({origin: origin(), kind: 'function', role: 'application', name: 'answer', owner: [],
  span: [20, 60], configuration: [], producer: null, evidence: 'manual-source-review',
  reviewStatus: 'OPEN', unresolved: ['actual-private-caller-proof'], ...changes});
const scope = (entries = [item()], sources = [source()], producers = []) => ({schema: 'router-source-scope-v2', revision, entries, sources, producers});
const lane = () => ({status: 'required', paths: []});
const adoption = entry => ({entry: draftScopeEntryKey(entry), requirements: ['L01', 'L02'],
  implementations: [{path: entry.origin.path, symbol: 'answer', span: [20, 60]}],
  lanes: {forwardJavaScript: lane(), strictTypeScript: lane(), reverseRust: lane(), synchronization: lane()},
  independentCases: [], reviewStatus: 'OPEN', unresolved: ['actual-cases-and-receiving-adoption-missing']});
const report = (baseline, current = baseline, adoptions = []) => reconcileDraftScope({baseline, current, adoptions});

test('an unchanged current function remains unassigned and has no denominator or authority', () => {
  const result = report(scope());
  assert.deepEqual(result.unassigned, [draftScopeEntryKey(item())]);
  assert.equal(result.productionFunctionDenominator, null);
  assert.equal(result.draftedRequirements, null);
  assert.equal(result.semanticAuthority, false);
  assert.equal(result.verification, 'UNRUN');
  assert.equal(result.hasBlockingChanges, true);
});

test('trait, impl, inline, nested, cfg and producer identities never merge by spelling', () => {
  const entries = [item(), item({kind: 'trait-method', owner: ['Trait']}),
    item({kind: 'impl-method', owner: ['Impl']}), item({owner: ['inline']}),
    item({kind: 'nested-function', owner: ['parent']}), item({configuration: ['cfg(windows)']})];
  const result = report(scope(entries));
  assert.equal(result.unassigned.length, 6);
  assert.equal(new Set(entries.map(draftScopeEntryKey)).size, 6);
  assert.throws(() => report(scope([...entries, item()])));
});

test('new production entries and physical sources refuse silent requirement inheritance', () => {
  const before = scope(), next = item({name: 'new_function', span: [70, 90]});
  const result = report(before, scope([item(), next], [source(), source('rust/src/new.rs')]), [adoption(item())]);
  assert.deepEqual(result.addedSources, ['rust/src/new.rs']);
  assert.deepEqual(result.addedEntries, [draftScopeEntryKey(next)]);
  assert.deepEqual(result.unassigned, [draftScopeEntryKey(next)]);
  assert.equal(result.requirementEntries.L02.length, 1);
});

test('same item identity on changed source invalidates adoption and retained implementation binding', () => {
  const before = scope(), changedOrigin = {...origin(), blob: 'c'.repeat(40)};
  const after = scope([item({origin: changedOrigin})], [{...source(), origin: changedOrigin}]);
  const result = report(before, after, [adoption(item())]);
  assert.deepEqual(result.changedSources, ['rust/src/lib.rs']);
  assert.deepEqual(result.staleAdoptions, [draftScopeEntryKey(item())]);
  assert.throws(() => report(before, scope([item()], [{...source(), origin: changedOrigin}])));
});

test('unknown expansions and unclassified or inline test items remain explicit review gaps', () => {
  const producer = {id: 'actual-include', kind: 'include', sourcePath: 'rust/src/lib.rs', inputs: [], outputs: [],
    expansion: 'unknown', reviewStatus: 'OPEN', unresolved: ['native-owner-and-expansion-missing']};
  const value = scope([item({producer: producer.id}), item({name: 'test_answer', role: 'test', owner: ['tests']})],
    [{...source(), role: 'unclassified'}], [producer]);
  const result = report(value);
  assert.ok(result.unresolved.some(row => row.kind === 'producer' && row.key === producer.id));
  assert.equal(result.unassigned.length, 2);
  assert.throws(() => report(scope([item({producer: 'invented'})])));
  assert.throws(() => report(scope([item()], [source()], [{...producer, inputs: ['outside/missing.rs']}])));
});

test('missing lanes, false exclusions, duplicate assignments and invalid source ranges refuse', () => {
  const value = scope(), mapping = adoption(item());
  assert.throws(() => report(value, value, [mapping, mapping]));
  assert.throws(() => report(value, value, [{...mapping, requirements: ['L99']}]));
  assert.throws(() => report(value, value, [{...mapping, implementations: []}]));
  assert.throws(() => report(value, value, [{...mapping, lanes: {}}]));
  assert.throws(() => report(value, value, [{...mapping, lanes: {...mapping.lanes, reverseRust: {status: 'inapplicable', paths: []}}}]));
  assert.throws(() => report(scope([item({span: [0, 201]})])));
  assert.throws(() => report(scope([item({span: [-1, 1]})])));
  assert.throws(() => report(scope([item({origin: {...origin(), revision: 'd'.repeat(40)}})])));
});

test('a producer cannot silently disappear or change its source dependency list', () => {
  const p = {id: 'derive', kind: 'attribute', sourcePath: 'rust/src/lib.rs', inputs: [], outputs: [],
    expansion: 'unknown', reviewStatus: 'OPEN', unresolved: ['owner-expansion']};
  const before = scope([item()], [source()], [p]);
  assert.deepEqual(report(before, scope()).removedProducers, ['derive']);
  assert.deepEqual(report(scope(), before).addedProducers, ['derive']);
  assert.deepEqual(report(before, scope([item()], [source()], [{...p, kind: 'changed-attribute'}])).changedProducers, ['derive']);
});

test('case and receiving evidence must have physical source records', () => {
  const value = scope(), mapping = adoption(item());
  assert.throws(() => report(value, value, [{...mapping, independentCases: ['test/missing.rs']}]));
  assert.throws(() => report(value, value, [{...mapping, lanes: {...mapping.lanes,
    strictTypeScript: {status: 'required', paths: ['ts/src/missing.ts']}}}]));
});

test('a legitimate repeated enclosing name retains its full owner path', () => {
  const entry = item({owner: ['module', 'module']});
  assert.deepEqual(report(scope([entry])).unassigned, [draftScopeEntryKey(entry)]);
});
