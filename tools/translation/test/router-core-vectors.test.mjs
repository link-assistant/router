import {composeOwnedCorePrivateAnalysisRetention} from '../prepare-owned-core-private-analysis-retention.mjs';
import {assertOwnedCorePrivateAnalysisSourceComposition} from './owned-core-private-analysis-source-composition.mjs';
import {composeCoreUnitMatches} from '../prepare-core-unit-matches.mjs';
import {assertUnitMatchesSourceComposition} from './unit-matches-source-composition.mjs';
import {assertAsciiSourceComposition,assertAsciiReverseComposition,assertAsciiAssetsComposition,assertAsciiBaseAssetsComposition} from './ascii-source-composition.mjs';
import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {migrateCoreVectors} from '../migrate-core-vectors.mjs';
import {prepareCoreVectorSources} from '../prepare-core-vector-sources.mjs';
import {composeCurrentCoreMatchesSources} from '../prepare-core-matches-sources.mjs';
import {composePrimitiveIdentityBoundary} from '../prepare-primitive-identity-boundary.mjs';
import {composeCoreAscii} from '../prepare-core-ascii-sources.mjs';
import {composeCoreAsciiReverse} from '../prepare-core-ascii-reverse-sources.mjs';
import {composeCoreAsciiAssets} from '../prepare-core-ascii-assets.mjs';
import {composeCoreAsciiBaseAssets} from '../prepare-core-ascii-base-assets.mjs';
import {composeSourceProofPreservation} from '../prepare-source-proof-preservation.mjs';
import {composeExecutableCheckedSource} from '../prepare-executable-checked-source.mjs';
import {composeSourceLifetimeRefusalBatches} from '../prepare-source-lifetime-refusal-batches.mjs';
import {checkRouterCoreVector, hasCheckedRouterCoreVector} from '../router-core-vectors.mjs';
import * as sourceLifetimes from '../extensions/source-lifetimes.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE, ROUTER_CORE_PRIMITIVES_SOURCE, ROUTER_CORE_RANGES_SOURCE,
  ROUTER_CORE_BASE64_SOURCE, ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const root = new URL('../../../', import.meta.url), C = 'crate::translation_core::';
const hash = text => createHash('sha256').update(text).digest('hex');
const originalInputs = () => JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/owned-vector-original-inputs.json.gz', import.meta.url)), {maxOutputLength: 2_000_000}));
let vectors = [];
const retain = (kind, value) => { vectors.push({kind, value}); return value; };
const test = (name, run) => testCase(name, {timeout: 60_000}, async () => {
  vectors = [];
  try { await run(); }
  finally {
    const output = process.env.ROUTER_CORE_VECTOR_EVIDENCE_DIR;
    if (output) { mkdirSync(output, {recursive: true}); writeFileSync(join(output, Buffer.from(name).toString('hex') + '.json'),
      JSON.stringify({name, vectors}, (_, value) => typeof value === 'bigint' ? {$integer: String(value)} : value) + '\n'); }
  }
});
function files(source, extra = {}, facade = ROUTER_FORMATTING_FACADE_SOURCE) {
  return {'src/lib.rs': 'pub mod translation_core;\n' + source, 'src/translation_core.rs': facade,
    'src/translation_core/primitives.rs': ROUTER_CORE_PRIMITIVES_SOURCE, 'src/translation_core/ranges.rs': ROUTER_CORE_RANGES_SOURCE,
    'src/translation_core/base64.rs': ROUTER_CORE_BASE64_SOURCE, 'src/translation_core/json_collections.rs': ROUTER_CORE_JSON_COLLECTIONS_SOURCE, ...extra};
}
function project(input) {
  retain('complete-original-project-inputs', input);
  return retain('complete-project-result', translateProject({entry: 'src/lib.rs', paths: Object.keys(input), readSource: path => input[path]}));
}
const has = (result, name) => result.meta.executable.some(row => row.name === name);

test('native source producer derives the actual owned wrapper and composes complete source inverses', () => {
  const input = retain('complete-pinned-source-producer-inputs', originalInputs());
  const result = retain('complete-native-source-proposal', prepareCoreVectorSources({facade: input.sources['rust/src/translation_core.rs'],
    sourceData: input.sources['tools/translation/router-core-source-data.mjs'], hostSource: input.sources['tools/translation/extensions/host-contracts.mjs'], lifetimesSource: input.sources['tools/translation/extensions/source-lifetimes.mjs'], vectorSource: input.sources['tools/translation/router-core-vectors.mjs']}));
  assert.equal(result.value.typescript, '5.9.3');
  assert.ok(result.value.sources['tools/translation/extensions/host-contracts.mjs'].after.split('\n').length <= 1000, 'generated Host source retains fewer than 1000 lines');
  assert.deepEqual(result.trace.map(row => row.phase), ['language', 'repository']);
  const lifetime = retain('complete-current-lifetime-refusal-source-layer', composeSourceLifetimeRefusalBatches(result.value.sources));
  assert.equal(lifetime.layers[0].files.find(row => row.path.endsWith('/source-lifetimes.mjs')).before, result.value.sources['tools/translation/extensions/source-lifetimes.mjs'].after);
  const checked = retain('complete-current-executable-checked-source-layer', composeExecutableCheckedSource(lifetime.sources));
  assert.equal(checked.layers[0].files[0].before, lifetime.sources['tools/translation/project.mjs'].after);
  const preserved = retain('complete-current-source-proof-preservation-layer', composeSourceProofPreservation(checked.sources));
  assert.equal(preserved.layers[0].files.find(row => row.path === 'tools/translation/project.mjs').before, checked.sources['tools/translation/project.mjs'].after);
  for (const row of preserved.layers[0].files) {
    assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source, row.before);
    assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source, row.after);
    assert.equal(row.inverse, row.before); assert.ok(row.nativeCopies);
  }
  const matched = retain('complete-current-owned-matches-source-layer', composeCurrentCoreMatchesSources(preserved.sources));
  assert.equal(matched.layers[0].inputs.facade, result.value.sources['rust/src/translation_core.rs'].after);
  const boundary = retain('complete-current-primitive-identity-boundary-layer', composePrimitiveIdentityBoundary(matched.sources));
  assert.equal(boundary.layers[0].files.find(row => row.path === 'tools/translation/extensions/host-contracts.mjs').before, matched.sources['tools/translation/extensions/host-contracts.mjs'].after);
  for (const row of boundary.layers[0].files) {
    assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source, row.before);
    assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source, row.after);
    assert.equal(row.inverse, row.before); assert.ok(row.nativeCopies);
  }
  const ascii = retain('complete-current-owned-ascii-source-layer', composeCoreAscii(boundary.sources));
  assert.equal(ascii.historicalSources, boundary.sources);
  const reverse = retain('complete-current-owned-ascii-reverse-source-layer', composeCoreAsciiReverse(ascii.sources));
  assert.equal(reverse.historicalSources, ascii.sources);
  const assets = retain('complete-current-owned-ascii-assets-source-layer', composeCoreAsciiAssets(reverse.sources));
  assert.equal(assets.historicalSources, reverse.sources);
  const base = retain('complete-current-owned-ascii-base-assets-source-layer', composeCoreAsciiBaseAssets(assets.sources));
  assert.equal(base.historicalSources, assets.sources);
  const unit = retain('complete-current-owned-unit-matches-source-layer', composeCoreUnitMatches(base.sources));
  assert.equal(unit.historicalSources, base.sources);
  const composition = retain('complete-current-private-analysis-retention-source-layer', composeOwnedCorePrivateAnalysisRetention(unit.sources));
  assert.equal(composition.historicalSources, unit.sources);
  assertAsciiSourceComposition(ascii.layers[0], boundary.sources, composition.sources);
  assertAsciiReverseComposition(reverse.layers[0], ascii.sources, composition.sources);
  assertAsciiAssetsComposition(assets.layers[0], reverse.sources, composition.sources);
  assertAsciiBaseAssetsComposition(base.layers[0], assets.sources, composition.sources);
  assertUnitMatchesSourceComposition(unit.layers[0], base.sources, composition.sources);
  assertOwnedCorePrivateAnalysisSourceComposition(composition.layers[0], unit.sources, composition.sources);
  const reverseSource = reverse.layers[0].files[0];
  assert.throws(() => composeCoreAsciiReverse({...ascii.sources, [reverseSource.path]: {after: 'forged'}}), /preceding complete source equation/u);
  assert.throws(() => composeCoreAscii({...boundary.sources, 'rust/src/translation_core.rs': {after: 'forged'}}), /preceding complete source equation/u);
  assert.equal(composition.sources['rust/src/translation_core.rs'].after, ROUTER_FORMATTING_FACADE_SOURCE);
  for (const [path, source] of Object.entries(composition.sources)) assert.equal(readFileSync(new URL(path, root), 'utf8'), source.after, path);
  assert.equal(readFileSync(new URL('rust/src/translation_core.rs', root), 'utf8'), ROUTER_FORMATTING_FACADE_SOURCE);
  for (const source of Object.values(result.value.sources)) {
    assert.equal(transportConcreteSyntaxMeta(source.beforeMeta).source, source.before);
    assert.equal(transportConcreteSyntaxMeta(source.afterMeta).source, source.after);
    assert.equal(source.inverse, source.before); assert.equal(source.beforeSha256, hash(source.before));
  }
  assert.match(result.value.wrapper.after, /::std::vec!/u);
  assert.throws(() => prepareCoreVectorSources({facade: ROUTER_FORMATTING_FACADE_SOURCE,
    sourceData: input.sources['tools/translation/router-core-source-data.mjs'], hostSource: input.sources['tools/translation/extensions/host-contracts.mjs'], lifetimesSource: input.sources['tools/translation/extensions/source-lifetimes.mjs'], vectorSource: input.sources['tools/translation/router-core-vectors.mjs']}), /fresh|differs/u);
});

test('qualified vector lists execute checked primitive, borrowed text, owned text and empty contextual elements', async () => {
  const source = `pub fn numbers()->Vec<u8>{${C}vec![0u8,255u8,7u8,]}
pub fn flags()->Vec<bool>{${C}vec![true,false]}
pub fn empty()->Vec<bool>{${C}vec![]}
pub fn headers()->Vec<&'static ${C}Str>{${C}vec!["user-agent","😀","content-type"]}
pub fn empty_headers()->Vec<&'static ${C}Str>{${C}vec![]}
pub fn borrowed<'a>(value:&'a ${C}Str)->Vec<&'a ${C}Str>{${C}vec![value]}
pub fn text()->Vec<${C}Text>{${C}vec![${C}format!("alpha"),${C}format!("{}","beta")]}`;
  const result = project(files(source));
  for (const name of ['numbers', 'flags', 'empty', 'headers', 'empty_headers', 'borrowed', 'text']) assert.equal(has(result, name), true, name + ': ' + JSON.stringify(result.meta.refused.filter(row => row.name === name)));
  await verifyTypedTargets(result, api => {
    const actual = {numbers: api.numbers(), flags: api.flags(), empty: api.empty(), headers: api.headers(), text: api.text()};
    retain('independent-native-target-observations', actual);
    assert.deepEqual(actual, {numbers: [0n, 255n, 7n], flags: [true, false], empty: [], headers: ['user-agent', '😀', 'content-type'], text: ['alpha', 'beta']});
    assert.deepEqual(api.empty_headers(), []); assert.deepEqual(api.borrowed('input 😀'), ['input 😀']);
  }, {childTimeoutMs: 20_000});
});

test('list operands remain once-only and left-to-right through serialized checked meta and both targets', async () => {
  const result = project(files(`fn first()->u8{4u8} fn second()->u8{5u8} pub fn ordered()->Vec<u8>{${C}vec![first(),second()]}`));
  assert.equal(has(result, 'ordered'), true);
  const program = parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)), calls = [];
  const visit = node => { if (!node || typeof node !== 'object') return; if (node.k === 'call') calls.push(node.fn);
    for (const [key, child] of Object.entries(node)) if (!['type', 'span'].includes(key)) Array.isArray(child) ? child.forEach(visit) : visit(child); };
  visit(program.declarations.get('ordered').body); retain('independent-complete-call-order', calls);
  assert.deepEqual(calls, ['first', 'second']);
  await verifyTypedTargets(result, api => { const actual = api.ordered(); retain('actual-ordered-target', actual); assert.deepEqual(actual, [4n, 5n]); }, {childTimeoutMs: 20_000});
});

test('ordinary vector baselines remain unchanged while aliases forged facades repetition and unsupported element ownership refuse', async () => {
  // Test the private helper's association independently; this synthetic unit
  // value is never fed to translation or treated as an executable program.
  const checked = {k: 'array', items: [{k: 'lit', value: true, type: {kind: 'bool'}}], type: {kind: 'array', element: {kind: 'bool'}, rustOwnership: {kind: 'owned', source: 'Vec'}}};
  const associated = checkRouterCoreVector({expr: () => checked}, {value: {}}, null, [], null, false);
  assert.equal(hasCheckedRouterCoreVector(associated), true);
  for (const copied of [structuredClone(associated), {...associated, items: [...associated.items]},
    {...associated, type: {...associated.type, element: {...associated.type.element}}}, {...associated, ownedVectorProof: {profile: 'checked-router-owned-vector-list-v1'}}]) assert.equal(hasCheckedRouterCoreVector(copied), false);
  associated.items.push({k: 'lit', value: false, type: {kind: 'bool'}}); assert.equal(hasCheckedRouterCoreVector(associated), false); associated.items.pop();
  assert.equal(hasCheckedRouterCoreVector({...associated}), false);
  associated.items[0].value = false; assert.equal(hasCheckedRouterCoreVector(associated), false); associated.items[0].value = true;
  assert.equal(Object.hasOwn(sourceLifetimes, 'bindNormalizedOwnedVectors'), false);
  for (const context of ['foreign-checker', 'copied-source', 'copied-program']) {
    const Lifetime = sourceLifetimes.withSourceLifetimeChecker(class {
      constructor() { this.language = 'Rust'; this.items = new Map(); }
      resolveType(type) { return type; }
      program() {
        const current = context === 'foreign-checker' ? associated : checkRouterCoreVector(this, {value: {}}, null, [], null, false);
        const body = {...current, items: current.items.map(item => ({...item}))}, entry = {k: 'fn', name: 'synthetic', fullName: 'synthetic', modulePath: [], params: [], ret: checked.type, body, span: {start: 0, end: 10}};
        this.items.set(entry.fullName, entry);
        return {schemaVersion: 1, sourceLanguage: 'Rust', items: [entry], declarations: context === 'copied-program' ? new Map(this.items) : this.items};
      }
      expr() { return checked; }
    });
    const checker = new Lifetime(), syntheticSource = {items: [{k: 'fn', name: 'synthetic', params: [], ret: checked.type, body: {}, span: {start: 0, end: 10}}]};
    if (context === 'copied-program') assert.throws(() => checker.program(syntheticSource), /normalization context/);
    else { const program = checker.program(syntheticSource); assert.equal(hasCheckedRouterCoreVector(program.declarations.get('synthetic').body), false, context); }
  }
  // These synthetic frames exercise storage lifetime only. They have no parsed
  // source authority, no executable declarations and no semantic roundtrip.
  const Framed = sourceLifetimes.withSourceLifetimeChecker(class {
    constructor() { this.language = 'Rust'; this.items = new Map(); }
    expr() { return checked; }
    program() {
      this.issued = checkRouterCoreVector(this, {value: {}}, null, [], null, false);
      assert.equal(hasCheckedRouterCoreVector(this.issued), true);
      assert.equal(hasCheckedRouterCoreVector({...this.issued}), false);
      this.issued.items[0].value = false; assert.equal(hasCheckedRouterCoreVector(this.issued), false); this.issued.items[0].value = true;
      this.during?.();
      if (this.fail) throw new Error('synthetic super.program exception');
      return {sourceLanguage: 'Rust', declarations: this.items};
    }
  });
  const emptySurface = {items: []}, outer = new Framed(), inner = new Framed(), throwing = new Framed();
  throwing.fail = true;
  outer.during = () => {
    inner.during = () => { assert.equal(hasCheckedRouterCoreVector(outer.issued), false); assert.equal(hasCheckedRouterCoreVector(inner.issued), true); };
    inner.program(emptySurface);
    assert.equal(hasCheckedRouterCoreVector(inner.issued), false); assert.equal(hasCheckedRouterCoreVector(outer.issued), true);
    assert.throws(() => throwing.program(emptySurface), /super.program exception/);
    assert.equal(hasCheckedRouterCoreVector(throwing.issued), false); assert.equal(hasCheckedRouterCoreVector(outer.issued), true);
  };
  outer.program(emptySurface);
  for (const frame of [outer, inner, throwing]) assert.equal(hasCheckedRouterCoreVector(frame.issued), false, 'closed frames cannot retain issued proof authority');
  assert.throws(() => throwing.program(emptySurface), /super.program exception/); assert.equal(hasCheckedRouterCoreVector(throwing.issued), false);
  assert.equal(hasCheckedRouterCoreVector(associated), true, 'separate synthetic helper contract survives frame cleanup');
  // Synthetic wrapper observer: the original empty-declaration lifetime pass
  // has two values() traversals. A no-vector frame must add no binder traversal.
  // This exercises storage behavior only and issues no executable declarations.
  const observer = [];
  class ObservedDeclarations extends Map { values() { observer.push('values'); return super.values(); } }
  const OrdinaryLifetime = sourceLifetimes.withSourceLifetimeChecker(class {
    constructor() { this.language = 'Rust'; this.items = new ObservedDeclarations(); }
    program() { return {sourceLanguage: 'Rust', declarations: this.items}; }
  });
  new OrdinaryLifetime().program({items: []});
  retain('ordinary-no-vector-wrapper-callback-tape', observer); assert.deepEqual(observer, ['values', 'values']);
  // Genuine source ingress keeps its original intrinsics for the actual
  // ordinary project and independent JavaScript/strict-TypeScript targets.
  const ordinary = project(files('pub fn ordinary(value:u8)->u8{value}'));
  assert.equal(has(ordinary, 'ordinary'), true);
  await verifyTypedTargets(ordinary, api => { assert.equal(api.ordinary(7n), 7n); }, {childTimeoutMs: 20_000});
  // Independent source inputs establish the actual old standard decisions.
  // A facade draft must not retroactively turn an admitted ordinary list red.
  for (const [source, admitted] of [['pub fn bad()->Vec<u8>{vec![1u8]}', true], ['pub fn bad()->Vec<u8>{std::vec![1u8]}', false]]) {
    const baseline = retain('ordinary-vector-baseline', translateSource(source));
    assert.equal(baseline.ir.items.find(row => row.name === 'bad').status === 'executable', admitted);
    assert.equal(has(project(files(source)), 'bad'), admitted, source);
  }
  for (const source of [
    `use crate::translation_core::vec as list;pub fn bad()->Vec<u8>{list![1u8]}`,
    `pub fn bad()->Vec<u8>{${C}vec![1u8;2]}`,
    `pub fn bad()->Vec<Vec<u8>>{${C}vec![${C}vec![1u8]]}`,
    `pub fn bad(value:&u8)->Vec<&u8>{${C}vec![value]}`,
    `pub fn bad(value:&${C}Str)->Vec<&'static ${C}Str>{${C}vec![value]}`,
    `pub fn bad()->Vec<f64>{${C}vec![1.0f64]}`,
    `struct Owned{value:u8} pub fn bad()->Vec<Owned>{${C}vec![Owned{value:1u8}]}`,
    `pub fn bad()->Vec<u8>{${C}vec![missing]}`,
    `pub const BAD:Vec<u8>=${C}vec![1u8];`,
    `pub fn bad()->Vec<u8>{${C}vec![${Array(4097).fill('1u8').join(',')}]}`,
  ]) { const result = project(files(source)); assert.equal(has(result, source.includes('const BAD') ? 'BAD' : 'bad'), false, source); }
  const result = project(files(`pub fn bad()->Vec<u8>{${C}vec![1u8]}`, {}, ROUTER_FORMATTING_FACADE_SOURCE.replace('::std::vec!', '::foreign::vec!')));
  assert.equal(has(result, 'bad'), false);
  const standalone = retain('unchanged-standalone-vector-refusal', translateSource(`pub fn bad()->Vec<u8>{${C}vec![1u8]}`));
  assert.equal(standalone.ir.items.find(row => row.name === 'bad').status, 'carried');
});

test('CST vector adoption preserves complete Unicode/trivia/source inverse and ordinary formatter behavior', () => {
  const source = '\uFEFF// vec!["comment"]\r\npub fn selected()->Vec<&\'static str>{vec /* gap */ !["a","😀"]}\r\n';
  const proposal = retain('complete-owned-vector-source-adoption', migrateCoreVectors(source));
  assert.equal(proposal.after.source, source.replace('>{vec', '>{' + C + 'vec'));
  assert.equal(proposal.functions.length, 1); assert.equal(proposal.edits.length, 1);
  assert.equal(transportConcreteSyntaxMeta(proposal.before.meta).source, source);
  assert.equal(transportConcreteSyntaxMeta(proposal.after.meta).source, proposal.after.source);
  assert.equal(proposal.inverse, source); assert.equal(proposal.executableAdmission, false);
  assert.deepEqual(proposal.trace.map(row => row.phase), ['language', 'repository']);
  for (const row of proposal.mapping) if (row.kind === 'unchanged') assert.equal(source.slice(...row.before), proposal.after.source.slice(...row.after));
});

test('source adoption refuses competing macro imports and producers without changing qualified or unsupported functions', () => {
  const body = 'pub fn one()->Vec<u8>{vec![1u8]}';
  for (const prefix of ['use foreign::vec;', 'use foreign::*;', 'macro_rules! vec{()=>{custom}}', '#[unknown] ']) {
    assert.throws(() => migrateCoreVectors(prefix + body), TypeError);
  }
  assert.throws(() => migrateCoreVectors(body, {rootSource: '#[macro_use] mod macros;', macroUseSources: {macros: 'macro_rules! vec{()=>{custom}}'}}), /competing vec/u);
  for (const source of ['pub fn one()->Vec<u8>{std::vec![1u8]}', 'pub fn one()->Vec<u8>{r#vec![1u8]}',
    'pub fn one()->Vec<u8>{emit!();vec![1u8]}', 'pub fn one()->Vec<u8>{let a=format!("x");vec![1u8]}',
    'pub fn one()->Vec<u8>{foreign::vec!(vec![1u8]);vec![2u8]}',
    'pub fn one()->Vec<u8>{foreign::vec /* 😀 */ !(vec![1u8]);vec![2u8]}',
    'pub fn one()->Vec<u8>{foreign::生成 /* 😀 */ !{vec![1u8]};vec![2u8]}',
    'pub fn one()->Vec<u8>{生成 /* gap */ !(vec![1u8]);vec![2u8]}']) {
    const proposal = retain('unchanged-uncertain-complete-source', migrateCoreVectors(source));
    assert.equal(proposal.after.source, source); assert.equal(proposal.functions.length, 0); assert.equal(proposal.edits.length, 0);
    assert.equal(proposal.inverse, source); assert.equal(transportConcreteSyntaxMeta(proposal.before.meta).source, source); assert.equal(transportConcreteSyntaxMeta(proposal.after.meta).source, source);
  }
  const nested = 'pub fn nested()->Vec<Vec<u8>>{vec![vec![1u8]]}', selected = retain('complete-selected-family-nested-candidate', migrateCoreVectors(nested));
  assert.equal(selected.functions.length, 1); assert.equal(selected.edits.length, 2); assert.equal(selected.inverse, nested);
  assert.equal(selected.after.source, nested.replaceAll('vec!', C + 'vec!')); assert.equal(transportConcreteSyntaxMeta(selected.after.meta).source, selected.after.source);
  let callbacks = 0; const poisoned = Object.defineProperty({}, 'macros', {get() { callbacks++; return ''; }});
  assert.throws(() => migrateCoreVectors(body, {macroUseSources: poisoned}), TypeError); assert.equal(callbacks, 0);
});

test('the complete actual upstream-header module retains its original function and yields an independently checked owned candidate', async () => {
  const original = retain('complete-original-application-module', originalInputs().originalApplication);
  const physical = readFileSync(new URL(original.path, root), 'utf8');
  assert.equal(physical, original.source); assert.equal(hash(physical), original.sha256);
  const originalFn = sourceItems(physical).find(item => item.term === 'fn' && item.name === 'forwarded_client_headers');
  assert.ok(originalFn);
  const completeFunction = physical.slice(originalFn.start, originalFn.end);
  const carrier = 'pub mod candidate;pub const REQUIRED_FORWARD_HEADERS:&[&str]=&[];';
  const proposal = retain('complete-original-parent-vector-adoption', migrateCoreVectors(physical, {rootSource: 'pub mod translation_core;' + carrier}));
  assert.equal(proposal.functions.some(row => row.name === 'forwarded_client_headers'), true);
  const before = project(files(carrier, {'src/candidate.rs': physical}));
  const after = project(files(carrier, {'src/candidate.rs': proposal.after.source}));
  retain('actual-original-function-span-and-body', {span: [originalFn.start, originalFn.end], source: completeFunction, sha256: hash(completeFunction)});
  assert.equal(has(before, 'candidate.forwarded_client_headers'), false);
  assert.equal(has(after, 'candidate.forwarded_client_headers'), true, JSON.stringify(after.meta.refused.filter(row => row.name.endsWith('forwarded_client_headers'))));
  await verifyTypedTargets(after, api => {
    const actual = api['candidate.forwarded_client_headers'](); retain('original-whole-function-owned-candidate-output', actual);
    assert.deepEqual(actual, ['user-agent', 'anthropic-version', 'anthropic-beta', 'x-stainless-*', 'x-claude-code-*', 'accept', 'content-type']);
  }, {childTimeoutMs: 20_000});
});
