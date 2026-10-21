import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync, symlinkSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync, gunzipSync} from 'node:zlib';
import {proposeSourceBackedCoreAdoptionSequence, reviewSourceBackedCoreAdoptionSequence} from '../source-backed-core-adoption-sequence.mjs';
import {proposePhysicalCoreAdoptionSequence, reviewPhysicalCoreAdoptionSequence} from '../physical-core-adoption-sequence.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {formattingPacketIO} from '../formatting-packet-io.mjs';
import {repositorySourceURL, repositoryWorkspaceManifestURL} from './fixtures/repository-paths.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE, ROUTER_CORE_PRIMITIVES_SOURCE, ROUTER_CORE_RANGES_SOURCE,
  ROUTER_CORE_BASE64_SOURCE, ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
const root = new URL('../../../', import.meta.url), hash = value => createHash('sha256').update(value).digest('hex');
const evidence = process.env.ROUTER_CORE_SEQUENCE_EVIDENCE_DIR ?? mkdtempSync(join(tmpdir(), 'router-core-sequence-evidence-'));
let vectors = [];
const retain = (kind, value) => { vectors.push({kind, value}); return value; };
const test = (name, run) => testCase(name, {timeout: 60_000}, async t => {
  vectors = []; try { await run(t); }
  catch (error) { retain('complete-error', {name: error.name, message: error.message, stack: error.stack}); throw error; }
  finally { mkdirSync(evidence, {recursive: true}); const raw = Buffer.from(JSON.stringify({name, vectors}, (_, value) => typeof value === 'bigint' ? {$integer: String(value)} : value) + '\n'), bytes = gzipSync(raw, {level: 6, mtime: 0}); assert.deepEqual(gunzipSync(bytes), raw); writeFileSync(join(evidence, hash(name) + '.json.gz'), bytes); }
});
const cargo = () => ({manifest: readFileSync(repositorySourceURL('Cargo.toml', root), 'utf8'), lock: readFileSync(repositorySourceURL('Cargo.lock', root), 'utf8')});
const core = {'src/translation_core.rs': ROUTER_FORMATTING_FACADE_SOURCE, 'src/translation_core/primitives.rs': ROUTER_CORE_PRIMITIVES_SOURCE,
  'src/translation_core/ranges.rs': ROUTER_CORE_RANGES_SOURCE, 'src/translation_core/base64.rs': ROUTER_CORE_BASE64_SOURCE,
  'src/translation_core/json_collections.rs': ROUTER_CORE_JSON_COLLECTIONS_SOURCE};
const source = '\uFEFF#[derive(Clone,Copy)]pub struct Marker{value:u8}\r\n' +
  '#[allow(dead_code)]pub fn formatted(value:u8)->String{format!("value={value}")}\r\n' +
  'pub fn accepted(value:&crate::translation_core::Str)->bool{matches /* 😀 */ !(value,"a"|"😀")}\r\n' +
  'pub fn values()->Vec<u8>{vec![1u8,2u8]}\r\n#[cfg(test)]mod tests{unknown!();}\r\n';
const files = (application = source) => ({'src/lib.rs': 'pub mod translation_core;pub mod app;', 'src/app.rs': application, ...core});
function sequence(input = files(), dependencyInputs = cargo()) {
  const options = retain('complete-original-sequence-inputs', {files: input, dependencyInputs});
  return retain('complete-source-sequence', proposeSourceBackedCoreAdoptionSequence(options));
}
const clone = value => JSON.parse(JSON.stringify(value));
function physical(t, application = source) {
  const directory = mkdtempSync(join(tmpdir(), 'router-physical-core-sequence-')); t.after(() => rmSync(directory, {recursive: true, force: true}));
  const input = Object.fromEntries(Object.entries(files(application)).map(([path, text]) => ['rust/' + path, text])), dependencies = cargo();
  input['rust/Cargo.toml'] = dependencies.manifest; input['Cargo.lock'] = dependencies.lock;
  input['Cargo.toml'] = readFileSync(repositoryWorkspaceManifestURL(root), 'utf8');
  for (const [path, text] of Object.entries(input)) { mkdirSync(dirname(join(directory, path)), {recursive: true}); writeFileSync(join(directory, path), text); }
  retain('complete-physical-source-and-Cargo-inputs', {directory, input}); return {directory, input};
}
test('three actual source steps receive complete fresh after maps and retain every source CST and inverse', () => {
  const original = files(), result = sequence(original), decoded = retain('complete-detached-JSON-readback', clone(result)), checked = reviewSourceBackedCoreAdoptionSequence(decoded);
  assert.deepEqual(result.trace.map(row => row.phase), ['language', 'repository']); assert.deepEqual(result.history.map(row => row.name), ['formatting', 'matches', 'vectors']);
  assert.deepEqual(result.summary.stepSelections.map(row => row.selectedFunctions), [1, 1, 1]); assert.equal(result.summary.candidateSelections, 3); assert.equal(result.summary.distinctCandidateFunctions, 3);
  assert.equal(checked.completeSourceInverse, true); assert.equal(checked.executableCoverageGain, null); assert.equal(result.newAcrossInvocationCache, false);
  let previous = original;
  for (const step of result.history) {
    assert.deepEqual(step.proposal.inputs.map(row => [row.path, row.source]), Object.keys(previous).sort().map(path => [path, previous[path]]));
    previous = {...previous}; for (const row of step.proposal.rows) if (row.proposal) {
      formattingPacketIO.assertAdoptionInverse(row.proposal);
      if (step.name === 'formatting') assert.equal(Object.hasOwn(row.proposal, 'inverse'), false);
      else assert.equal(row.proposal.inverse, row.proposal.before.source);
      previous[row.path] = row.proposal.after.source;
    }
  }
  assert.deepEqual(Object.keys(result.files).sort().map(path => [path, result.files[path]]), Object.keys(previous).sort().map(path => [path, previous[path]]));
  for (const document of result.documents) { assert.equal(transportConcreteSyntaxMeta(document.meta).source, document.source); assert.equal(hash(document.source), document.sha256); }
  assert.equal(Object.keys(result.originalFiles).length, Object.keys(original).length); assert.equal(result.originalFiles['src/app.rs'], source);
  assert.ok(result.files['src/app.rs'].startsWith('\uFEFF#[derive(Clone,Copy)]')); assert.ok(result.files['src/app.rs'].endsWith('#[cfg(test)]mod tests{unknown!();}\r\n'));
  assert.deepEqual(files(), original); assert.equal(result.applicationSourcesInstalled, false);
});
test('the complete final map reaches a fresh genuine project and executes JS and separately strict TypeScript', async () => {
  const result = sequence(), dependencies = cargo(), input = retain('complete-final-project-inputs', result.files);
  const translated = retain('complete-fresh-final-project-result', translateProject({entry: result.entry, paths: Object.keys(input), readSource: path => input[path], deriveDependencies: loadDeriveDependencyProof(dependencies)}));
  for (const name of ['formatted', 'accepted', 'values']) assert.ok(translated.meta.executable.some(row => row.name === 'app.' + name), JSON.stringify(translated.meta.refused.filter(row => row.name === 'app.' + name)));
  await verifyTypedTargets(translated, api => { const actual = {text: api['app.formatted'](7n), yes: api['app.accepted']('😀'), no: api['app.accepted']('other'), values: api['app.values']()}; retain('independent-final-target-observations', actual); assert.deepEqual(actual, {text: 'value=7', yes: true, no: false, values: [1n, 2n]}); }, {childTimeoutMs: 20_000});
  assert.equal(result.semanticAdmission, false); assert.equal(result.executableCoverageGain, null);
});
test('later function coordinates invert earlier length changes to exact complete original source identities', () => {
  const result = sequence(), originals = sourceItems(source).filter(row => row.term === 'fn');
  for (const group of result.summary.functions) { const original = originals.find(row => row.name === group.name); assert.ok(original); assert.deepEqual(group.span, [original.start, original.end]); assert.equal(group.sha256, hash(source.slice(...group.span))); assert.deepEqual(group.module, ['app']); assert.equal(new Set(group.selectedBy).size, group.selectedBy.length); }
  const late = result.history[2].proposal.rows.find(row => row.path === 'src/app.rs').proposal.functions.find(row => row.name === 'values'), base = result.summary.functions.find(row => row.name === 'values');
  assert.ok(late.span[0] > base.span[0]); assert.ok(late.span[1] > base.span[1]);
  assert.equal(new Set(result.summary.functions.map(row => row.id)).size, result.summary.distinctCandidateFunctions);
  const bad = clone(result); bad.summary.distinctCandidateFunctions++; assert.throws(() => reviewSourceBackedCoreAdoptionSequence(bad), /census/u);
});
test('mixed-family unknown local qualified Unicode conditional and attribute barriers preserve all original bytes', () => {
  const application = 'pub fn mixed()->Vec<String>{vec![format!("x")]}\n' +
    'pub fn opaque(value:u8)->bool{foreign::生成 /* gap */ !(matches!(value,1u8));matches!(value,2u8)}\n' +
    '#[unknown]pub fn attributed(value:u8)->bool{matches!(value,1u8)}\n' +
    '#[cfg(unknown)]pub fn conditional()->Vec<u8>{vec![1u8]}\n#[cfg(test)]mod tests{unknown!();}\n';
  const result = sequence(files(application)); assert.equal(result.files['src/app.rs'], application); assert.equal(result.summary.distinctCandidateFunctions, 0); assert.equal(result.summary.candidateSelections, 0);
  for (const step of result.history) { const row = step.proposal.rows.find(row => row.path === 'src/app.rs'); assert.ok(['skipped', 'unchanged'].includes(row.status)); assert.equal(row.proposal?.after.source ?? application, application); }
  const aliases = files('pub fn values()->Vec<u8>{vec![1u8]}'); aliases['src/lib.rs'] = 'pub mod translation_core;#[path="app.rs"]mod first;#[path="app.rs"]mod second;';
  const ambiguous = sequence(aliases); assert.equal(ambiguous.summary.distinctCandidateFunctions, 0); assert.equal(ambiguous.files['src/app.rs'], aliases['src/app.rs']);
  assert.equal(result.sourceCstInverseIsReverseExecution, false);
});
test('detached stale coordinate hash Cargo duplicate function and undeclared source changes fail complete readback', () => {
  const result = sequence(), mutations = [
    value => { value.files['src/app.rs'] += '\n'; },
    value => { value.documents[0].sha256 = '0'.repeat(64); },
    value => { value.documents[0].meta = value.documents.at(-1).meta; },
    value => { value.history[1].inputs = value.originalRefs; },
    value => { value.history[2].beforeSha256 = value.history[0].beforeSha256; },
    value => { value.history[1].proposal.rows.find(row => row.path === 'src/app.rs').origins[0].module = ['foreign']; },
    value => { value.cargo.inputs.lock += '\n'; },
    value => { const row = value.history[1].proposal.rows.find(row => row.path === 'src/app.rs'); row.proposal.functions[0].span[0]--; },
    value => { const row = value.history[1].proposal.rows.find(row => row.path === 'src/app.rs'); row.proposal.functions.push(clone(row.proposal.functions[0])); },
    value => { const row = value.history[2].proposal.rows.find(row => row.path === 'src/app.rs'); row.proposal.after.source += '\n// undeclared\n'; },
    value => { value.history[0].proposal.rows.find(row => row.path === 'src/app.rs').proposal.inverse = value.originalFiles['src/app.rs']; },
    value => { delete value.history[1].proposal.rows.find(row => row.path === 'src/app.rs').proposal.inverse; },
    value => { value.documents.push(clone(value.documents[0])); },
  ];
  for (let at = 0; at < mutations.length; at++) { const bad = clone(result); mutations[at](bad); retain('complete-detached-negative-' + at, bad); assert.throws(() => reviewSourceBackedCoreAdoptionSequence(bad), TypeError, String(at)); }
  assert.throws(() => proposeSourceBackedCoreAdoptionSequence({files: files()}), /Cargo/u);
  let callbacks = 0; const poisoned = Object.defineProperty({}, 'src/lib.rs', {get() { callbacks++; return ''; }});
  assert.throws(() => proposeSourceBackedCoreAdoptionSequence({files: poisoned, dependencyInputs: cargo()}), /accessor/u); assert.equal(callbacks, 0);
});
test('physical read-only composition retains package workspace lock and the complete source census without installation', t => {
  const f = physical(t), beforeNames = readdirSync(f.directory).sort(), result = retain('complete-physical-source-sequence', proposePhysicalCoreAdoptionSequence(f.directory)), readback = retain('complete-physical-independent-readback', reviewPhysicalCoreAdoptionSequence(clone(result), f.directory));
  assert.deepEqual(result.physical.cargoRows.map(row => row.path), ['rust/Cargo.toml', 'Cargo.lock', 'Cargo.toml']);
  assert.equal(readback.sourceFiles, Object.keys(files()).length); assert.equal(readback.cargoFiles, 3); assert.equal(readback.summary.distinctCandidateFunctions, 3);
  for (const [path, original] of Object.entries(f.input)) assert.equal(readFileSync(join(f.directory, path), 'utf8'), original, path);
  assert.deepEqual(readdirSync(f.directory).sort(), beforeNames); assert.equal(result.applicationSourcesInstalled, false); assert.equal(result.executableCoverageGain, null);
  assert.equal(result.physical.includesAllTrackedRustOutsideProductionTree, false);
});
test('physical source additions byte changes workspace changes missing Cargo and linked roots remain refusals', t => {
  const f = physical(t, 'pub fn values()->Vec<u8>{vec![1u8]}'), result = retain('complete-original-physical-proposal', proposePhysicalCoreAdoptionSequence(f.directory));
  const added = join(f.directory, 'rust/src/added.rs'); writeFileSync(added, 'pub fn added(){}'); assert.throws(() => reviewPhysicalCoreAdoptionSequence(result, f.directory), /physical/u); rmSync(added);
  const app = join(f.directory, 'rust/src/app.rs'); writeFileSync(app, f.input['rust/src/app.rs'] + '\n'); assert.throws(() => reviewPhysicalCoreAdoptionSequence(result, f.directory), /physical/u);
  const workspace = join(f.directory, 'Cargo.toml'); writeFileSync(workspace, f.input['Cargo.toml'] + '\n'); assert.throws(() => reviewPhysicalCoreAdoptionSequence(result, f.directory), /physical/u);
  rmSync(join(f.directory, 'Cargo.lock')); assert.throws(() => proposePhysicalCoreAdoptionSequence(f.directory), /Cargo/u);
  const link = f.directory + '-linked'; symlinkSync(f.directory, link, 'dir'); t.after(() => rmSync(link)); assert.throws(() => proposePhysicalCoreAdoptionSequence(link), /unlinked/u);
});
