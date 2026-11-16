// Independent receiving case SOURCE only. Native parsers/CST are UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {collectDraftScopeRustObservations} from '../draft-scope-20261102-collector.mjs';
const revision = 'a'.repeat(40);
const file = (source, path = 'rust/src/lib.rs') => ({source, origin: {revision, path,
  mode: '100644', bytes: Buffer.byteLength(source),
  blob: createHash('sha1').update('blob ' + Buffer.byteLength(source) + '\0').update(source).digest('hex')}});
const collect = source => collectDraftScopeRustObservations({files: [file(source)]});

test('private original functions distinguish free impl trait inline local functions and closures', {timeout: 60000}, () => {
  const source = '// Unicode 🌍 shifts UTF-8 byte positions\n' +
    'trait T { fn required(&self); fn provided(&self)->u8 { 1 } }\n' +
    'struct S; impl S { fn same(&self)->u8 { 2 } }\n' +
    'mod inline { fn same()->u8 { 3 } }\n' +
    'fn outer()->u8 { fn local()->u8 { 4 } let callback=|| local(); callback() }';
  const result = collect(source), parsed = result.observations.filter(row => row.kind.startsWith('parsed-'));
  assert.ok(parsed.some(row => row.kind === 'parsed-function' && row.name === 'required'));
  assert.ok(parsed.some(row => row.kind === 'parsed-function' && row.name === 'provided'));
  assert.equal(parsed.filter(row => row.name === 'same').length, 2);
  assert.ok(parsed.some(row => row.kind === 'parsed-Function' && row.name === 'local'));
  assert.ok(parsed.some(row => row.kind === 'parsed-Closure'));
  assert.equal(result.productionFunctionDenominator, null);
  assert.equal(result.verification, 'UNRUN');
  for (const row of result.observations) {
    assert.equal(source.slice(row.span.start, row.span.end), row.original);
    assert.equal(Buffer.from(source).subarray(row.span.byteStart, row.span.byteEnd).toString(), row.original);
    assert.ok(Object.values(row.authority).every(value => value === false));
  }
});

test('macro token-tree functions are opaque producer data and never parsed function observations', {timeout: 60000}, () => {
  const source = 'fn caller(){ emit!{ fn invented(){} }; }\nmacro_rules! m {()=>{fn also_invented(){}}}\n';
  const result = collect(source);
  assert.ok(result.observations.some(row => row.producerExpansion === 'unknown'));
  assert.ok(!result.observations.some(row => row.kind.startsWith('parsed-') && ['invented', 'also_invented'].includes(row.name)));
  assert.equal(result.translationCoverage, null);
});

test('test cfg attributes and external module paths remain source conditions and producer gaps', {timeout: 60000}, () => {
  const result = collect('#[cfg(test)] mod tests { fn helper(){} } mod external; #[unknown] fn changed(){}');
  assert.ok(result.observations.some(row => row.kind === 'attribute-producer' && row.name === 'cfg'));
  assert.ok(result.observations.some(row => row.kind === 'attribute-producer' && row.name === 'unknown'));
  assert.ok(result.diagnostics.some(row => row.kind === 'original-module-review'));
  assert.ok(result.observations.every(row => row.role === 'unclassified'));
});

test('complete original sources refuse wrong physical blobs revisions paths and malformed Unicode', () => {
  const input = file('fn main(){}');
  assert.throws(() => collectDraftScopeRustObservations({files: [{...input, origin: {...input.origin, blob: 'b'.repeat(40)}}]}));
  assert.throws(() => collectDraftScopeRustObservations({files: [input, input]}));
  assert.throws(() => collectDraftScopeRustObservations({files: [input, {...file('fn other(){}','rust/src/other.rs'), origin: {...file('fn other(){}','rust/src/other.rs').origin, revision: 'c'.repeat(40)}}]}));
  assert.throws(() => collectDraftScopeRustObservations({files: [file('fn main(){}', '../escape.rs')]}));
  assert.throws(() => collectDraftScopeRustObservations({files: [file('// ' + String.fromCharCode(0xd800))]}));
});

test('unsupported complete functions and actual source-size domains remain explicit rather than disappearing', {timeout: 60000}, () => {
  const malformed = collect('fn broken(] {}');
  assert.ok(malformed.diagnostics.length > 0);
  const large = collect('// ' + 'x'.repeat(256001));
  assert.ok(large.diagnostics.some(row => row.kind === 'source-parser-domain'));
  assert.equal(large.sources.length, 1);
  assert.equal(large.productionFunctionDenominator, null);
});

test('actual Router hardening source retains inline tests separately in genuine module owners', {timeout: 60000}, () => {
  const source = readFileSync(new URL('../../../rust/src/security_headers.rs', import.meta.url), 'utf8');
  const result = collectDraftScopeRustObservations({files: [file(source, 'rust/src/security_headers.rs')]});
  assert.ok(result.observations.some(row => row.kind === 'original-fn' && row.name === 'apply'));
  assert.ok(result.observations.some(row => row.name === 'every_hardening_header_has_a_valid_value' &&
    row.owner.some(owner => owner.kind === 'module' && owner.name === 'tests')));
  assert.ok(result.observations.some(row => row.kind === 'attribute-producer' && row.name === 'test'));
  assert.equal(result.productionFunctionDenominator, null);
});

test('caller getters proxies parser frames and AST payloads cannot replace original source ingress', () => {
  let callbacks = 0;
  const input = file('fn original(){}');
  const accessor = Object.defineProperty({...input}, 'source', {get() { callbacks++; throw Error('caller getter'); }});
  assert.throws(() => collectDraftScopeRustObservations({files: [accessor]}));
  const proxy = new Proxy(input, {get() { callbacks++; throw Error('caller proxy'); }});
  assert.throws(() => collectDraftScopeRustObservations({files: [proxy]}));
  assert.throws(() => collectDraftScopeRustObservations({files: [{...input, parserFrame: {}, ast: {kind: 'Function'}}]}));
  assert.equal(callbacks, 0);
});

test('unsupported visibility or attribute headers retain complete opaque item producer diagnostics', {timeout: 60000}, () => {
  const source = 'pub(in nowhere) fn unsupported() {} fn visible() {}';
  const result = collect(source);
  assert.ok(result.diagnostics.some(row => row.kind === 'declaration-header' && row.error !== null));
  assert.ok(result.observations.some(row => row.kind === 'opaque-item-producer-review' && row.original.includes('unsupported')));
  assert.ok(result.observations.some(row => row.name === 'visible'));
  assert.equal(result.sources.length, 1);
});
