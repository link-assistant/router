import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, renameSync, readdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {Hash, createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {prepareSourceBackedVectors, prepareSourceBackedVectorPacketIO} from '../prepare-source-backed-vectors.mjs';
import {proposeSourceBackedCoreVectorCorpus as originalCorpusProposal} from '../source-backed-core-vectors.mjs';
import {iterateSourceBackedCoreVectorCorpusPackets} from '../source-backed-vector-packets.mjs';
import {proposeSourceBackedVectorGzipPackets} from '../propose-source-backed-vector.mjs';
import {reviewSourceBackedVectorPackets} from '../review-source-backed-vector-packets.mjs';
import {inspectVectorProposalData as originalProposalInspection} from '../vector-proposal-data.mjs';
import {openVectorGzipPackets, SOURCE_VECTOR_GZIP_LIMITS} from '../vector-packet-storage.mjs';
import {SOURCE_VECTOR_PACKET_LIMITS} from '../vector-packet-io.mjs';
import {openFormattingGzipPackets, SOURCE_FORMATTING_GZIP_LIMITS} from '../formatting-packet-storage.mjs';
import {SOURCE_FORMATTING_PACKET_LIMITS} from '../formatting-packet-io.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE, ROUTER_CORE_PRIMITIVES_SOURCE, ROUTER_CORE_RANGES_SOURCE,
  ROUTER_CORE_BASE64_SOURCE, ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
let vectors = [];
const vectorRoot = process.env.ROUTER_VECTOR_CORPUS_EVIDENCE_DIR ?? mkdtempSync(join(tmpdir(), 'router-vector-corpus-evidence-'));
const retain = (kind, value) => { vectors.push({kind, value: JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? {$integer: String(item)} : item))}); return value; };
const test = (name, run) => testCase(name, {timeout: 60_000}, async t => {
  vectors = [];
  try { await run(t); }
  catch (error) { retain('complete-error', {name: error.name, message: error.message, stack: error.stack}); throw error; }
  finally {
    mkdirSync(vectorRoot, {recursive: true});
    const bytes = Buffer.from(JSON.stringify({name, vectors}) + '\n'), path = join(vectorRoot, createHash('sha256').update(name).digest('hex') + '.json.gz');
    writeFileSync(path, gzipSync(bytes, {level: 6, mtime: 0}));
  }
});
function proposeSourceBackedCoreVectorCorpus(options) { retain('complete-corpus-inputs', options); return retain('complete-materialized-proposal', originalCorpusProposal(options)); }
function inspectVectorProposalData(value) { retain('complete-independent-DATA-inspection-input', value); return originalProposalInspection(value); }
const root = new URL('../../../', import.meta.url), cli = fileURLToPath(new URL('../propose-source-backed-vector.mjs', import.meta.url));
const cargo = () => ({manifest: readFileSync(repositorySourceURL('Cargo.toml', root), 'utf8'), lock: readFileSync(repositorySourceURL('Cargo.lock', root), 'utf8')});
const core = {'src/translation_core.rs': ROUTER_FORMATTING_FACADE_SOURCE, 'src/translation_core/primitives.rs': ROUTER_CORE_PRIMITIVES_SOURCE,
  'src/translation_core/ranges.rs': ROUTER_CORE_RANGES_SOURCE, 'src/translation_core/base64.rs': ROUTER_CORE_BASE64_SOURCE,
  'src/translation_core/json_collections.rs': ROUTER_CORE_JSON_COLLECTIONS_SOURCE};
const files = (source = 'pub fn values()->Vec<u8>{vec![1u8,2u8]}', parent = 'pub mod translation_core;pub mod app;', extra = {}) => ({'src/lib.rs': parent, 'src/app.rs': source, ...core, ...extra});
function fixture(t, input = files(), dependencies) {
  retain('complete-physical-fixture-inputs', {files: input, dependencies});
  const directory = mkdtempSync(join(tmpdir(), 'router-vector-corpus-')), sourceRoot = join(directory, 'source'), output = join(directory, 'packets');
  t.after(() => rmSync(directory, {recursive: true, force: true}));
  for (const [path, text] of Object.entries(input)) { const target = join(sourceRoot, path); mkdirSync(dirname(target), {recursive: true}); writeFileSync(target, text); }
  if (dependencies) { writeFileSync(join(sourceRoot, 'Cargo.toml'), dependencies.manifest); writeFileSync(join(sourceRoot, 'Cargo.lock'), dependencies.lock); }
  return {directory, sourceRoot, output, files: input};
}
function physicalInputs(root) {
  const rows = []; const walk = path => { for (const entry of readdirSync(path, {withFileTypes: true})) { const target = join(path, entry.name); if (entry.isDirectory()) walk(target); else if (entry.isFile()) rows.push({path: target.slice(root.length + 1), source: readFileSync(target, 'utf8')}); } }; walk(root); return rows;
}
function collect(options) {
  retain('complete-detached-inputs', options);
  const stream = iterateSourceBackedCoreVectorCorpusPackets(options), groups = new Map(); let completion;
  for (;;) { const next = stream.next(); if (next.done) { completion = next.value; break; } const row = next.value, rows = groups.get(row.section) ?? []; assert.equal(row.ordinal, rows.length); rows.push(JSON.parse(row.text)); groups.set(row.section, rows); }
  stream.verify(); retain('complete-detached-sections', [...groups]); retain('complete-detached-completion', completion); const metadata = groups.get('metadata')[0], fields = {inputs: groups.get('inputs'), rows: groups.get('rows'), bindingInspections: groups.get('binding-inspections') ?? [], moduleEdges: groups.get('module-edges')[0], moduleDiagnostics: groups.get('module-diagnostics')[0]};
  return {completion, proposal: Object.fromEntries(metadata.keys.map(key => [key, Object.hasOwn(metadata.values, key) ? metadata.values[key] : fields[key]]))};
}
function reconstruct(output) {
  const reader = openVectorGzipPackets(output), all = new Map(); for (const reference of reader.index.packets) all.set(reference.path, reader.read(reference).toString('utf8')); reader.verify(); retain('complete-independent-archive-index', reader.index); retain('complete-independent-archive-packet-readback', [...all]);
  const packet = reader.index.stages[0].packets, parse = reference => JSON.parse(all.get(reference.path)), metadata = parse(packet.metadata), fields = {rows: packet.rows.map(parse), inputs: packet.inputs.map(parse), bindingInspections: packet.bindingInspections.map(parse), moduleEdges: parse(packet.moduleEdges), moduleDiagnostics: parse(packet.moduleDiagnostics)};
  return {index: reader.index, proposal: Object.fromEntries(metadata.keys.map(key => [key, Object.hasOwn(metadata.values, key) ? metadata.values[key] : fields[key]]))};
}
const app = proposal => proposal.rows.find(row => row.path === 'src/app.rs');
function inverses(proposal) {
  for (const row of proposal.rows) if (row.proposal) {
    const value = row.proposal; inspectVectorProposalData(value); assert.equal(transportConcreteSyntaxMeta(value.before.meta).source, value.before.source); assert.equal(transportConcreteSyntaxMeta(value.after.meta).source, value.after.source);
    let source = value.after.source; for (const part of [...value.mapping].reverse()) if (part.kind === 'substitution') source = source.slice(0, part.after[0]) + part.expected + source.slice(part.after[1]); assert.equal(source, value.before.source);
  }
  for (const row of proposal.bindingInspections) { assert.equal(row.before.source.length, row.after.source.length); assert.equal(row.inverse, row.before.source); assert.equal(transportConcreteSyntaxMeta(row.before.meta).source, row.before.source); }
}
test('actual native corpus and bounded transport producers retain complete source inverses and every original quota', () => {
  assert.deepEqual(SOURCE_VECTOR_PACKET_LIMITS, SOURCE_FORMATTING_PACKET_LIMITS); assert.deepEqual(SOURCE_VECTOR_GZIP_LIMITS, SOURCE_FORMATTING_GZIP_LIMITS);
  for (const prepared of [retain('complete-native-corpus-source-proposal', prepareSourceBackedVectors()), retain('complete-native-transport-source-proposal', prepareSourceBackedVectorPacketIO())]) {
    assert.equal(prepared.typescriptVersion, '5.9.3'); assert.equal(prepared.newAcrossInvocationCache, false);
    for (const row of prepared.files) { assert.equal(row.current, row.after); assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source, row.original); assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source, row.after); assert.equal(row.inverse, row.original); assert.deepEqual(row.trace.map(row => row.phase), ['language', 'repository']); assert.deepEqual(row.nativeBindings.unboundIdentifiers, []); }
  }
});
test('whole original derived module Cargo inactive items and Unicode survive corpus packets archive readback and strict targets', async t => {
  const source = '\uFEFF#[derive(Clone,Copy)]pub struct Marker{value:u8}\r\n#[allow(dead_code)]pub fn values()->Vec<u8>{vec /* 😀 */ ![1u8,2u8]}\r\npub fn names()->Vec<&\'static str>{vec!["😀","a"]}\r\n#[cfg(test)]mod tests{unknown!();}', input = files(source), dependencyInputs = cargo(), options = {files: input, dependencyInputs};
  const materialized = proposeSourceBackedCoreVectorCorpus(options), streamed = collect(options), f = fixture(t, input, dependencyInputs), receipt = proposeSourceBackedVectorGzipPackets({root: f.sourceRoot, output: f.output}), readback = reconstruct(f.output), review = reviewSourceBackedVectorPackets(f.output);
  assert.deepEqual(streamed.proposal, JSON.parse(JSON.stringify(materialized))); assert.deepEqual(readback.proposal, streamed.proposal); assert.equal(materialized.summary.selectedFunctions, 2); assert.equal(review.summary.selectedFunctions, 2); assert.equal(review.executableCoverageGain, null); assert.equal(review.semanticAdmission, false); assert.equal(receipt.changedFiles, 1); inverses(materialized);
  const selected = app(materialized); assert.equal(selected.proposal.before.source.slice(...selected.proposal.functions[0].span).startsWith('#[allow(dead_code)]'), true); assert.ok(selected.proposal.after.source.startsWith('\uFEFF#[derive(Clone,Copy)]')); assert.ok(selected.proposal.after.source.includes('vec /* 😀 */ !')); assert.ok(selected.proposal.after.source.endsWith('#[cfg(test)]mod tests{unknown!();}'));
  for (const [path, original] of Object.entries(input)) assert.equal(readFileSync(join(f.sourceRoot, path), 'utf8'), original);
  const adopted = {...input, 'src/app.rs': selected.proposal.after.source}, translated = translateProject({entry: 'src/lib.rs', paths: Object.keys(adopted), readSource: path => adopted[path], deriveDependencies: loadDeriveDependencyProof(dependencyInputs)});
  retain('complete-adopted-original-project', adopted); retain('complete-adopted-target-result', translated);
  assert.ok(translated.meta.executable.some(row => row.name === 'app.values')); assert.ok(translated.meta.executable.some(row => row.name === 'app.names'));
  await verifyTypedTargets(translated, api => { assert.deepEqual(api['app.values'](), [1n, 2n]); assert.deepEqual(api['app.names'](), ['😀', 'a']); }, {childTimeoutMs: 20_000});
});
test('complete module ancestor imported producer cfg and body macro barriers retain refusals without touching source bytes', () => {
  const body = 'pub fn values()->Vec<u8>{vec![1u8]}';
  for (const source of ['#[unknown]' + body, 'use foreign::*;' + body, 'use foreign::vec;' + body, 'unknown!();' + body, '#[derive(Unknown)]pub struct Marker;' + body]) {
    const proposal = proposeSourceBackedCoreVectorCorpus({files: files(source), dependencyInputs: cargo()}); assert.equal(app(proposal).status, 'skipped', source); assert.equal(proposal.inputs.find(row => row.path === 'src/app.rs').source, source); inverses(proposal);
  }
  for (const source of ['pub fn values()->Vec<u8>{emit!(vec![1u8])}', 'pub fn values()->Vec<u8>{emit /* gap */ !();vec![1u8]}', 'pub fn values()->Vec<u8>{macro_rules! vec{()=>{custom}}vec![1u8]}', 'pub fn values()->Vec<u8>{use foreign::vec;vec![1u8]}', 'pub fn values()->Vec<u8>{foreign::vec!(vec![1u8]);vec![2u8]}', 'pub fn values()->Vec<u8>{foreign::vec /* 😀 */ !(vec![1u8]);vec![2u8]}', 'pub fn values()->Vec<u8>{foreign::生成 /* gap */ !(vec![1u8]);vec![2u8]}']) {
    const proposal = proposeSourceBackedCoreVectorCorpus({files: files(source)}); assert.equal(proposal.summary.selectedFunctions, 0, source); assert.equal(app(proposal).proposal?.after.source ?? source, source); inverses(proposal);
  }
  const parent = 'pub mod translation_core;#[macro_use]mod macros;pub mod app;', imported = files(body, parent, {'src/macros.rs': 'macro_rules! vec{()=>{custom}}'}), blocked = proposeSourceBackedCoreVectorCorpus({files: imported}); assert.equal(app(blocked).status, 'skipped');
  const uncertain = proposeSourceBackedCoreVectorCorpus({files: files(body, 'pub mod translation_core;#[cfg(unknown)]pub mod app;')}); assert.equal(app(uncertain).status, 'skipped');
});
test('distinct function identities partition edits and ambiguous physical origins or inactive nested functions never inflate counts', () => {
  const source = 'pub fn same()->Vec<u8>{let a=vec![1u8];vec![2u8]}#[cfg(test)]pub fn inactive()->Vec<u8>{vec![3u8]}mod nested{pub fn hidden()->Vec<u8>{vec![4u8]}}';
  const input = files(source, 'pub mod translation_core;pub mod app;pub mod other;', {'src/other.rs': 'pub fn same()->Vec<u8>{vec![5u8]}'}), proposal = proposeSourceBackedCoreVectorCorpus({files: input});
  assert.equal(proposal.summary.selectedFunctions, 2); assert.equal(app(proposal).proposal.functions[0].macroCalls, 2); assert.equal(app(proposal).untouchedInlineModules.length, 1); inverses(proposal);
  const configured = {files: files('#[cfg(enabled)]pub fn configured()->Vec<u8>{vec![1u8]}'), compilationProfile: {schemaVersion: 1, flags: {enabled: true, test: false}, values: {}, closedKeys: []}}, active = proposeSourceBackedCoreVectorCorpus(configured);
  assert.equal(active.summary.selectedFunctions, 1); assert.equal(app(active).proposal.functions[0].name, 'configured'); assert.deepEqual(collect(configured).proposal, JSON.parse(JSON.stringify(active))); inverses(active);
  const value = app(proposal).proposal, duplicate = structuredClone(value); duplicate.functions.push(structuredClone(duplicate.functions[0])); assert.throws(() => inspectVectorProposalData(duplicate), /duplicate/);
  const changed = structuredClone(value); changed.functions[0].span[0]++; assert.throws(() => inspectVectorProposalData(changed), /selection/);
  const alias = structuredClone(value); alias.edits[0].replacement = 'foreign::vec!'; assert.throws(() => inspectVectorProposalData(alias), /API tokens/);
  const stale = structuredClone(value); stale.before.sha256 = '0'.repeat(64); assert.throws(() => inspectVectorProposalData(stale), /hash/);
  const hidden = structuredClone(value); hidden.edits.pop(); hidden.functions[0].macroCalls--; assert.throws(() => inspectVectorProposalData(hidden), /outside original vector/);
  const schema = structuredClone(value); schema.schema = 'router-core-formatting-migration-v1'; assert.throws(() => inspectVectorProposalData(schema), /distinct/);
  const shared = files('pub fn same()->Vec<u8>{vec![1u8]}', 'pub mod translation_core;#[path="app.rs"]mod first;#[path="app.rs"]mod second;'); const ambiguous = proposeSourceBackedCoreVectorCorpus({files: shared}); assert.equal(app(ambiguous).status, 'skipped'); assert.equal(ambiguous.summary.selectedFunctions, 0);
});
test('complete detached streams refuse unfinished copied own-data and between-packet original source or Cargo mutations', () => {
  const early = iterateSourceBackedCoreVectorCorpusPackets({files: files()}); assert.throws(() => early.verify(), /unfinished/); early.next(); early.return(); assert.throws(() => early.verify(), /unfinished/);
  let callbacks = 0; const hostile = Object.defineProperty({}, 'src/lib.rs', {get() { callbacks++; return ''; }}); assert.throws(() => iterateSourceBackedCoreVectorCorpusPackets({files: hostile}), /own/); assert.equal(callbacks, 0);
  for (const target of ['files', 'Cargo', 'options']) {
    const input = files(), dependencyInputs = cargo(), options = {files: input, dependencyInputs}, stream = iterateSourceBackedCoreVectorCorpusPackets(options); stream.next();
    if (target === 'files') input['src/app.rs'] += '\n'; else if (target === 'Cargo') dependencyInputs.lock += '\n'; else options.entry = 'src/app.rs';
    assert.throws(() => { for (;;) if (stream.next().done) break; stream.verify(); }, /changed/); stream.return();
  }
});
test('actual vector CLI full independent readback rejects other schemas corrupted packets unlisted entries and physical overlap', t => {
  const f = fixture(t), receipt = JSON.parse(execFileSync(process.execPath, [cli, '--root', f.sourceRoot, '--output', f.output, '--packet-storage', 'gzip'], {encoding: 'utf8', timeout: 20_000})), review = JSON.parse(execFileSync(process.execPath, [cli, '--review', f.output], {encoding: 'utf8', timeout: 20_000}));
  retain('complete-CLI-receipt', receipt); retain('complete-CLI-readback', review); reconstruct(f.output);
  assert.equal(receipt.schema, 'router-source-backed-vector-packets-v1'); assert.equal(review.schema, 'router-source-backed-vector-readback-v1'); assert.equal(review.packetCount, receipt.packetCount); assert.equal(review.sourceFiles, Object.keys(f.files).length); assert.throws(() => openFormattingGzipPackets(f.output), /unsupported|fixed|formatting/);
  const stored = JSON.parse(readFileSync(join(f.output, 'packet-storage.json'), 'utf8')).packets[0], path = join(f.output, stored.file), original = readFileSync(path), changed = Buffer.from(original); changed[0] ^= 1; retain('complete-corrupted-packet-bytes', {stored, original, changed}); writeFileSync(path, changed); assert.throws(() => reviewSourceBackedVectorPackets(f.output), /digest|changed/); writeFileSync(path, original); writeFileSync(join(f.output, 'unlisted'), 'extra'); assert.throws(() => reviewSourceBackedVectorPackets(f.output), /unlisted|inventory/);
  assert.throws(() => proposeSourceBackedVectorGzipPackets({root: f.sourceRoot, output: join(f.sourceRoot, 'forbidden')}), /overlaps/); assert.equal(existsSync(join(f.sourceRoot, 'forbidden')), false);
});
test('actual source and all package lock workspace Cargo inputs rejoin before bounded vector publication', t => {
  for (const target of ['source', 'Cargo', 'workspace']) {
    const f = fixture(t, files(), cargo()); if (target === 'workspace') { mkdirSync(join(f.sourceRoot, 'rust')); renameSync(join(f.sourceRoot, 'src'), join(f.sourceRoot, 'rust/src')); renameSync(join(f.sourceRoot, 'Cargo.toml'), join(f.sourceRoot, 'rust/Cargo.toml')); writeFileSync(join(f.sourceRoot, 'Cargo.toml'), '[workspace]\nmembers = ["rust"]\n'); }
    const prior = Object.getOwnPropertyDescriptor(Hash.prototype, 'update'); let changed = false;
    try { Object.defineProperty(Hash.prototype, 'update', {...prior, value: function (...args) { if (!changed && existsSync(join(f.output, 'vector/metadata.json.gz'))) { changed = true; const path = join(f.sourceRoot, target === 'source' ? 'src/app.rs' : target === 'Cargo' ? 'Cargo.lock' : 'Cargo.toml'); writeFileSync(path, readFileSync(path, 'utf8') + '\n'); } return Reflect.apply(prior.value, this, args); }}); assert.throws(() => proposeSourceBackedVectorGzipPackets({root: f.sourceRoot, output: f.output}), /complete source file changed|complete optional Cargo input changed/); } finally { Object.defineProperty(Hash.prototype, 'update', prior); }
    assert.equal(changed, true); assert.equal(existsSync(join(f.output, 'index.json')), false); assert.equal(existsSync(join(f.output, 'packet-storage.json')), false); const failure = JSON.parse(readFileSync(join(f.output, 'failure.json'), 'utf8')); retain('complete-physical-publication-refusal', {target, failure, finalPhysicalInputs: physicalInputs(f.sourceRoot)}); assert.equal(failure.schema, 'router-source-backed-vector-incomplete-v1'); assert.equal(failure.complete, false); assert.throws(() => openVectorGzipPackets(f.output));
  }
});
