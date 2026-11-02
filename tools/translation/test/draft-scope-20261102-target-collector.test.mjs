// Independent native JS/TS observation receiving case SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {collectDraftScopeTargetObservations} from '../draft-scope-20261102-target-collector.mjs';
const revision = 'a'.repeat(40);
const file = (source, path = 'js/src/source.mjs') => ({source, origin: {revision, path, mode: '100644',
  bytes: Buffer.byteLength(source), blob: createHash('sha1').update('blob ' + Buffer.byteLength(source) + '\0').update(source).digest('hex')}});
const collect = (source, path) => collectDraftScopeTargetObservations({files: [file(source, path)]});

test('actual native AST selects nested functions arrows methods constructors and accessors with full Unicode origins', {timeout: 60000}, () => {
  const source = '// 🌍 byte positions\nexport function outer(){ function inner(){return 1;} return ()=>inner(); }\n' +
    'export const callback = ()=>1; export class Box { constructor(){this.value=1;} method(){return this.value;} get current(){return this.value;} set current(value){this.value=value;} }';
  const result = collect(source), rows = result.observations;
  for (const kind of ['function-declaration', 'arrow-function', 'class', 'constructor', 'method', 'getter', 'setter']) {
    assert.ok(rows.some(row => row.kind === kind), kind);
  }
  assert.ok(rows.some(row => row.kind === 'arrow-function' && row.syntacticBinding?.name === 'callback'));
  assert.ok(rows.some(row => row.name === 'inner' && row.owner.some(owner => owner.name === 'outer')));
  for (const row of rows) {
    assert.equal(source.slice(row.span.start, row.span.end), row.original);
    assert.equal(Buffer.from(source).subarray(row.span.byteStart, row.span.byteEnd).toString(), row.original);
    assert.ok(Object.values(row.authority).every(value => value === false));
    assert.equal(row.role, 'unclassified');
  }
  assert.equal(result.productionFunctionDenominator, null);
  assert.equal(result.verification, 'UNRUN');
});

test('TypeScript namespace and interface methods stay distinct from JavaScript owners and false spellings in data', {timeout: 60000}, () => {
  const source = 'const note="function phantom(){}"; // function comment(){}\n' +
    'export namespace Scope { export interface Shape { method(value:number):number; } export function actual(value:number):number{return value;} }';
  const result = collect(source, 'ts/src/source.ts');
  assert.ok(result.observations.some(row => row.kind === 'module' && row.name === 'Scope'));
  assert.ok(result.observations.some(row => row.kind === 'method' && row.name === 'method' && row.owner.some(owner => owner.kind === 'interface' && owner.name === 'Shape')));
  assert.ok(result.observations.some(row => row.name === 'actual' && row.owner.some(owner => owner.name === 'Scope')));
  assert.ok(!result.observations.some(row => ['phantom', 'comment'].includes(row.name)));
  assert.equal(result.translationCoverage, null);
});

test('genuine native binding and grammar refusals remain explicit and do not produce acceptance', {timeout: 60000}, () => {
  const binding = collect('export function missing(){return absentName;}');
  assert.ok(binding.diagnostics.some(row => row.kind === 'native-binding-refusal'));
  assert.ok(binding.observations.every(row => row.nativeScope === 'REFUSED'));
  const grammar = collect('export function incomplete( {');
  assert.ok(grammar.diagnostics.some(row => row.kind === 'native-grammar-refusal'));
  assert.equal(grammar.observations.length, 0);
});

test('actual Router package native export source is freshly parsed with immutable physical source DATA', {timeout: 60000}, () => {
  const source = readFileSync(new URL('../../../js/src/index.mjs', import.meta.url), 'utf8');
  const result = collect(source, 'js/src/index.mjs');
  assert.equal(result.observations.filter(row => row.kind === 'export').length, 4);
  assert.equal(result.sources[0].origin.path, 'js/src/index.mjs');
  assert.notEqual(result.compilerOrigin, null);
  assert.equal(result.productionFunctionDenominator, null);
});

test('wrong blob malformed Unicode duplicate files and caller AST/compiler payloads refuse', {timeout: 60000}, () => {
  const original = file('export function original(){}');
  assert.throws(() => collectDraftScopeTargetObservations({files: [{...original, origin: {...original.origin, blob: 'b'.repeat(40)}}]}));
  assert.throws(() => collectDraftScopeTargetObservations({files: [original, original]}));
  assert.throws(() => collect('// ' + String.fromCharCode(0xd800)));
  assert.throws(() => collectDraftScopeTargetObservations({files: [{...original, compiler: {}, ast: {kind: 'Function'}}]}));
  const oversized = collect('// ' + 'x'.repeat(1_048_576));
  assert.ok(oversized.diagnostics.some(row => row.kind === 'native-source-domain'));
  assert.equal(oversized.sources.length, 1);
});

test('broader native predicate/checker qualification stays an explicit gap despite source observations', {timeout: 60000}, () => {
  const result = collect('export function observed(){return 1;}');
  assert.equal(result.nativeExportClosure, 'UNPROVED');
  assert.ok(result.sources.every(source => source.unresolved.includes('complete-private-native-predicate-and-checker-export-closure-unproved')));
  assert.equal(result.authority.executable, false);
});
