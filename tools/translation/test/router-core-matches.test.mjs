import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync, gunzipSync} from 'node:zlib';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {prepareCurrentCoreMatchesSources, prepareCoreMatchesSources} from '../prepare-core-matches-sources.mjs';
import {prepareSourceBackedMatches} from '../prepare-source-backed-matches.mjs';
import {proposeSourceBackedCoreLiteralMatchesCorpus} from '../source-backed-core-matches.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {HostRustParser, originalHostParserIdentitySnapshot} from '../extensions/host-contracts.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE, ROUTER_CORE_PRIMITIVES_SOURCE, ROUTER_CORE_RANGES_SOURCE,
  ROUTER_CORE_BASE64_SOURCE, ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
const root = new URL('../../../', import.meta.url), C = 'crate::translation_core::';
const hash = value => createHash('sha256').update(value).digest('hex');
const evidence = process.env.ROUTER_CORE_MATCHES_EVIDENCE_DIR ?? mkdtempSync(join(tmpdir(), 'router-owned-matches-evidence-'));
const fixture = () => JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/owned-matches-original-inputs.json.gz', import.meta.url)), {maxOutputLength: 2_000_000}));
let vectors = [];
const retain = (kind, value) => { vectors.push({kind, value}); return value; };
const test = (name, run) => testCase(name, {timeout: 60_000}, async () => {
  vectors = [];
  try { await run(); }
  catch (error) { retain('complete-error', {name: error.name, message: error.message, stack: error.stack}); throw error; }
  finally { mkdirSync(evidence, {recursive: true}); writeFileSync(join(evidence, hash(name) + '.json.gz'), gzipSync(Buffer.from(JSON.stringify({name, vectors}, (_, item) => typeof item === 'bigint' ? {$integer: String(item)} : item) + '\n'), {level: 6, mtime: 0})); }
});
const core = {'src/translation_core.rs': ROUTER_FORMATTING_FACADE_SOURCE, 'src/translation_core/primitives.rs': ROUTER_CORE_PRIMITIVES_SOURCE,
  'src/translation_core/ranges.rs': ROUTER_CORE_RANGES_SOURCE, 'src/translation_core/base64.rs': ROUTER_CORE_BASE64_SOURCE,
  'src/translation_core/json_collections.rs': ROUTER_CORE_JSON_COLLECTIONS_SOURCE};
const files = (source, parent = 'pub mod translation_core;pub mod app;', extra = {}) => ({'src/lib.rs': parent, 'src/app.rs': source, ...core, ...extra});
function project(input, dependencies) {
  retain('complete-receiving-project-inputs', {files: input, dependencies});
  return retain('complete-project-result', translateProject({entry: 'src/lib.rs', paths: Object.keys(input), readSource: path => input[path], ...(dependencies ? {deriveDependencies: loadDeriveDependencyProof(dependencies)} : {})}));
}
const has = (result, name) => result.meta.executable.some(row => row.name === name);
function propose(input, dependencyInputs) { retain('complete-original-corpus-inputs', {files: input, dependencyInputs}); return retain('complete-source-adoption-proposal', proposeSourceBackedCoreLiteralMatchesCorpus({files: input, dependencyInputs})); }
function proposalFor(result, path = 'src/app.rs') { const row = result.rows.find(row => row.path === path); assert.ok(row, path); return row; }
test('native source producers retain complete historical inputs actual current outputs and every CST inverse', () => {
  const original = retain('complete-original-owned-matches-inputs', fixture()), prepared = retain('complete-native-runtime-proposal', prepareCurrentCoreMatchesSources());
  assert.deepEqual(prepared.inputs, original.inputs); assert.equal(prepared.typescriptVersion, '5.9.3');
  assert.equal(prepared.newAcrossInvocationCache, false); assert.equal(prepared.oldStandardMatchesOwnershipUnchanged, true);
  for (const row of prepared.files) {
    assert.equal(row.current, row.after, row.path); assert.equal(row.inverse, row.before);
    assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source, row.before); assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source, row.after);
    assert.equal(row.beforeSha256, hash(row.before)); assert.equal(row.afterSha256, hash(row.after));
    assert.deepEqual(row.trace.map(part => part.phase), ['language', 'repository']);
    if (row.nativeBindings) assert.deepEqual(row.nativeBindings.unboundIdentifiers, []);
  }
  const host = prepared.files.find(row => row.path.endsWith('/host-contracts.mjs'));
  assert.ok(host.after.split('\n').length <= 1000); assert.ok(host.before.includes('parseRouterCoreVector')); assert.ok(host.after.includes('parseRouterCoreVector'));
  assert.match(prepared.wrapper.after, /::std::matches!/u);
  assert.deepEqual(prepared.originalFunctions.map(row => row.name), ['codex_root_option_takes_value', 'codex_root_boolean_option']);
  for (const row of prepared.originalFunctions) { assert.equal(row.source, original.inputs.applicationSource.slice(...row.span)); assert.equal(row.after, row.source.replace('matches!', C + 'matches!')); }
  const birth = originalHostParserIdentitySnapshot().parserMethods.find(row => row[0] === 'primary');
  assert.ok(birth); assert.equal(Object.getOwnPropertyDescriptor(HostRustParser.prototype, 'primary').value, birth[1]);
  const corpus = retain('complete-native-corpus-proposal', prepareSourceBackedMatches());
  for (const row of corpus.files) { assert.equal(row.current, row.after); assert.equal(row.inverse, row.original); assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source, row.original); assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source, row.after); assert.deepEqual(row.nativeBindings.unboundIdentifiers, []); }
  assert.throws(() => prepareCoreMatchesSources({...original.inputs, facade: ROUTER_FORMATTING_FACADE_SOURCE}), /fresh|differs/u);
});
test('qualified owned literal patterns execute text integer boolean and Unicode through both strict targets', async () => {
  const result = project(files(`pub fn text(value:&${C}Str)->bool{${C}matches!(value,"-c"|"--config"|"😀")}
pub fn number(value:u8)->bool{${C}matches!(value,0u8|255u8)}
pub fn flag(value:bool)->bool{${C}matches /* gap */ !(value,true)}`));
  for (const name of ['text', 'number', 'flag']) assert.equal(has(result, 'app.' + name), true, JSON.stringify(result.meta.refused.filter(row => row.name === 'app.' + name)));
  await verifyTypedTargets(result, api => {
    const actual = {text: ['-c', '--config', '😀', '--other'].map(value => api['app.text'](value)), number: [0n, 1n, 255n].map(value => api['app.number'](value)), flag: [true, false].map(value => api['app.flag'](value))};
    retain('independent-target-observations', actual); assert.deepEqual(actual, {text: [true, true, true, false], number: [true, false, true], flag: [true, false]});
  }, {childTimeoutMs: 20_000});
});
test('the existing ordered checker evaluates the complete original subject once before testing alternatives', async () => {
  const result = project(files(`fn subject()->u8{7u8}pub fn answer()->bool{${C}matches!(subject(),3u8|7u8|9u8)}`));
  assert.equal(has(result, 'app.answer'), true);
  const program = parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)), calls = [];
  const visit = value => { if (!value || typeof value !== 'object') return; if (value.k === 'call') calls.push(value.fn); for (const [key, child] of Object.entries(value)) if (!['type', 'span'].includes(key)) Array.isArray(child) ? child.forEach(visit) : visit(child); };
  visit(program.declarations.get('app.answer').body); retain('complete-independent-subject-call-census', calls); assert.deepEqual(calls, ['app.subject']);
  await verifyTypedTargets(result, api => assert.equal(api['app.answer'](), true), {childTimeoutMs: 20_000});
});
test('standard ownership remains separate while aliases forged facades guards binders and nominal patterns refuse', () => {
  const baseline = retain('complete-ordinary-standard-baseline', translateSource('pub fn answer(value:u8)->bool{matches!(value,1u8|2u8)}', 'src/original.rs'));
  assert.equal(baseline.ir.items.find(row => row.name === 'answer')?.status, 'executable');
  for (const source of [`pub fn answer(value:u8)->bool{${C}matches!(value,bound)}`, `pub fn answer(value:u8)->bool{${C}matches!(value,1u8 if true)}`, `pub fn answer(value:u8)->bool{${C}matches!(value,0u8..=3u8)}`, `pub const fn answer(value:u8)->bool{${C}matches!(value,1u8)}`, `use crate::translation_core::matches as selected;pub fn answer(value:u8)->bool{selected!(value,1u8)}`, `pub fn answer(value:u8)->bool{foreign::matches!(value,1u8)}`]) assert.equal(has(project(files(source)), 'app.answer'), false, source);
  for (const facade of [ROUTER_FORMATTING_FACADE_SOURCE + '\n', ROUTER_FORMATTING_FACADE_SOURCE.replace('::std::matches!', '::foreign::matches!')]) assert.equal(has(project({...files(`pub fn answer(value:u8)->bool{${C}matches!(value,1u8)}`), 'src/translation_core.rs': facade}), 'app.answer'), false);
});
test('source adoption preserves complete attributes inactive items comments and exact inverse while counting distinct functions', () => {
  const source = '#[allow(dead_code)]pub fn answer(value:u8)->bool{matches /* 😀 */ !(value,1u8|2u8)||matches!(value,3u8)}\n#[cfg(test)]mod tests{unknown!();}\n', input = files(source);
  const result = propose(input), row = proposalFor(result); assert.equal(result.summary.selectedFunctions, 1); assert.equal(row.status, 'proposed'); assert.equal(row.proposal.edits.length, 2);
  assert.equal(row.proposal.after.source, source.replaceAll('matches', C + 'matches')); assert.equal(row.proposal.inverse, source);
  assert.equal(transportConcreteSyntaxMeta(row.proposal.before.meta).source, source); assert.equal(transportConcreteSyntaxMeta(row.proposal.after.meta).source, row.proposal.after.source);
  assert.equal(row.proposal.executableAdmission, false); assert.equal(result.semanticAdmission, false);
  for (const inspection of result.bindingInspections) { assert.equal(inspection.inverse, inspection.before.source); assert.equal(inspection.before.source.length, inspection.after.source.length); }
});
test('unknown local qualified Unicode and attribute producers remain whole-function source barriers', () => {
  const cases = ['emit!(matches!(value,1u8));matches!(value,2u8)', 'foreign::matches!(matches!(value,1u8));matches!(value,2u8)', 'foreign::生成 /* gap */ !(matches!(value,1u8));matches!(value,2u8)', 'macro_rules! matches{()=>{true}}matches!(value,1u8)', 'use foreign::matches;matches!(value,1u8)', '#[unknown]const X:bool=true;matches!(value,1u8)', 'matches!(value,bound)', 'matches!(value,1u8 if true)'];
  for (const body of cases) { const source = 'pub fn answer(value:u8)->bool{' + body + '}', result = propose(files(source)), row = proposalFor(result); assert.equal(result.summary.selectedFunctions, 0, body); assert.equal(row.proposal?.after.source ?? source, source); }
  for (const source of ['#[unknown]pub fn answer(value:u8)->bool{matches!(value,1u8)}', 'use foreign::*;pub fn answer(value:u8)->bool{matches!(value,1u8)}']) { const result = propose(files(source)); assert.equal(result.summary.selectedFunctions, 0); assert.equal(proposalFor(result).status, 'skipped'); }
  const source = 'pub fn answer(value:u8)->bool{matches!(value,1u8)}', unknown = propose(files(source, 'pub mod translation_core;#[cfg(unknown)]pub mod app;'));
  assert.equal(unknown.summary.selectedFunctions, 0); assert.equal(proposalFor(unknown).status, 'skipped');
});
test('both complete original client launch predicates retain their real module parent Cargo and unchanged source bodies', async () => {
  const original = retain('complete-original-production-inputs', fixture().production), physical = readFileSync(new URL(original.application.path, root), 'utf8');
  assert.equal(physical, original.application.source); assert.equal(hash(physical), original.application.sha256);
  assert.equal(readFileSync(new URL(original.parent.path, root), 'utf8'), original.parent.source);
  assert.equal(readFileSync(new URL(original.workspace.path, root), 'utf8'), original.workspace.source); assert.equal(hash(original.workspace.source), original.workspace.sha256);
  for (const name of ['codex_root_option_takes_value', 'codex_root_boolean_option']) { const item = sourceItems(physical).find(row => row.term === 'fn' && row.name === name); assert.ok(item); retain('complete-original-production-function', {name, span: [item.start, item.end], source: physical.slice(item.start, item.end), sha256: hash(physical.slice(item.start, item.end))}); }
  // This receiving graph keeps the complete real root and selected modules.
  // Missing unrelated root children stay diagnostics; it is not whole-crate coverage.
  const input = {...core, 'src/lib.rs': original.parent.source, 'src/client_launch.rs': physical, 'src/operation_output.rs': original.operationOutput.source};
  const result = propose(input, original.dependencies), selected = proposalFor(result, 'src/client_launch.rs');
  assert.equal(selected.status, 'proposed', selected.reason); assert.deepEqual(selected.proposal.functions.map(row => row.name).sort(), ['codex_root_boolean_option', 'codex_root_option_takes_value']);
  assert.equal(selected.proposal.inverse, physical); assert.equal(selected.proposal.edits.length, 2);
  const before = project(input, original.dependencies), after = project({...input, 'src/client_launch.rs': selected.proposal.after.source}, original.dependencies);
  for (const name of ['codex_root_option_takes_value', 'codex_root_boolean_option']) { assert.equal(has(before, 'client_launch.' + name), false); assert.equal(has(after, 'client_launch.' + name), true, JSON.stringify(after.meta.refused.filter(row => row.name === 'client_launch.' + name))); }
  await verifyTypedTargets(after, api => {
    const values = ['-c', '--config', '--enable', '--disable', '-i', '--image', '-m', '--model', '--local-provider', '--profile', '-s', '--sandbox', '-a', '--ask-for-approval', '-C', '--cd', '--add-dir'];
    const flags = ['--oss', '--search', '--full-auto', '--dangerously-bypass-approvals-and-sandbox', '--no-alt-screen', '-h', '--help', '-V', '--version'];
    for (const value of [...values, ...flags, '', '--missing', '😀']) { assert.equal(api['client_launch.codex_root_option_takes_value'](value), values.includes(value), value); assert.equal(api['client_launch.codex_root_boolean_option'](value), flags.includes(value), value); }
    retain('complete-independent-production-witnesses', {values, flags, negatives: ['', '--missing', '😀']});
  }, {childTimeoutMs: 20_000});
});
