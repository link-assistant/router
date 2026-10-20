import test from 'node:test';
import assert from 'node:assert/strict';
import {productionFrontierData, sha256} from '../production-frontier-data.mjs';

const bytes = value => Buffer.from(JSON.stringify(value) + '\n');
function fixture() {
  const path = 'rust/src/example.rs';
  const bodies = [
    'fn one() { /* format!("comment") */ let s = r###"format!(matches!())"###; format /*gap*/ !("{}", 1); matches!(1, 1); }',
    'fn two(x: &mut u8) { format!("{}", x); }',
    'fn three() -> u8 { 3 }',
  ];
  const source = '// Unicode 🦀 preserves byte coordinates\n' + bodies.join('\n');
  const functions = bodies.map((body, index) => {
    const start = source.indexOf(body), end = start + body.length;
    return {path, name: ['one', 'two', 'three'][index], span: {start, end, unit: 'utf16',
      byteStart: Buffer.byteLength(source.slice(0, start)), byteEnd: Buffer.byteLength(source.slice(0, end))},
      sha256: sha256(body), body, status: index === 2 ? 'executable' : 'carried',
      diagnostic: index === 2 ? null : {kind: 'module-binding', message: 'generic envelope'}};
  });
  const metaPath = 'tools/translation/meta/example.meta.json';
  const meta = bytes({items: functions.map(row => ({term: 'fn', name: row.name, span: row.span,
    sha256: row.sha256, status: row.status, diagnostic: row.diagnostic}))});
  const coverage = {scope: 'top-level fn items', productionPathRule: 'fixture',
    production: {topLevelFunctions: 3, executableFunctions: 1, carriedFunctions: 2}};
  const inventory = {kind: 'draft-translation-inventory', translatorCommit: 'old',
    functionCoverage: coverage, sources: [{source: path, bytes: Buffer.byteLength(source), sha256: sha256(source), targets: {meta: metaPath}}],
    implementationHashes: {'tools/translation/compiler.mjs': sha256('old compiler')}};
  const inventoryBytes = bytes(inventory);
  const evidence = {schema: 'complete-original-function-priority-DATA-v1', inventorySha256: sha256(inventoryBytes),
    originalFunctionCoverage: coverage, functions, sources: [{path, source, bytes: Buffer.byteLength(source), sha256: sha256(source),
      metaPath, metaBytes: meta.length, metaSha256: sha256(meta)}]};
  const diagnostic = (index, message, text) => {
    const start = source.indexOf(text, functions[index].span.start);
    return {file: path, name: functions[index].name, term: 'fn', kind: 'unsupported', message, span: {start, end: start + text.length}};
  };
  const root = {schema: 'tracked-rust-project-semantic-meta-v1', entry: path,
    sources: [{source: path, sha256: sha256(source), module: []}], executable: [], moduleDiagnostics: [],
    refused: [diagnostic(0, 'format! owner requires original context', 'format /*gap*/ !'),
      diagnostic(0, 'matches! original source contract: needs context', 'matches!(1'),
      diagnostic(1, 'mutable reference: mutation is outside the portable core', '&mut')]};
  const descriptor = {schema: 'bounded-project-meta-storage-v1', root,
    logical: {sha256: sha256('unloaded logical program')},
    components: [{field: 'checkedSemanticProgram', path: 'unloaded/program.json', bytes: 999999}]};
  const inputs = new Map([[path, Buffer.from(source)], [metaPath, meta], ['tools/translation/compiler.mjs', Buffer.from('new compiler')]]);
  return {inventory, inventoryBytes, evidence, root, descriptor, inputs,
    run() { return productionFrontierData({inventoryBytes: this.inventoryBytes, functionEvidenceBytes: bytes(this.evidence),
      projectDescriptorBytes: bytes(this.descriptor), readInput: name => this.inputs.get(name) ?? null}); }};
}

test('stored first refusals join complete source/hash/name/spans and distinct groups preserve overlap', () => {
  const input = fixture();
  input.root.sources.push({...input.root.sources[0], module: ['inline']});
  const report = input.run();
  assert.equal(report.representationLevel, 'DATA');
  assert.equal(report.freshCompilerExecuted, false);
  assert.equal(report.executableGainMeasured, 0);
  assert.equal(report.completeness.projectProductionRefusalRecords, 3);
  assert.equal(report.completeness.distinctJoinedFunctions, 2);
  assert.deepEqual(report.refusalFamilyOverlap, [{left: 'format-owner-and-context', right: 'matches-owner-and-context', functions: [0]}]);
  assert.equal(report.historicalCoverage.targetFunctions, 3);
  assert.equal(report.historicalCoverage.additionalExecutableFunctionsRequired, 2);
  assert.equal(report.staleness.compilerStatus, 'stale-stored-compiler');
  assert.equal(report.staleness.changedCompilerInputs, 1);
  assert.equal(report.refusals[0].diagnosticText, 'format /*gap*/ !');
  assert.deepEqual(report.projectDescriptor.components, fixture().descriptor.components);
  assert.equal(report.vectors.filter(row => row.role === 'stored-project-source').length, 2);
});

test('opaque-aware token occurrence ranking excludes comments/raw strings and retains whitespace macro spans', () => {
  const report = fixture().run();
  const format = report.tokenUsage.find(row => row.key === 'format!');
  assert.equal(format.occurrences, 2);
  assert.deepEqual(format.functions, [0, 1]);
  assert.equal(report.tokenUsage.find(row => row.key === 'matches!').occurrences, 1);
  assert.deepEqual(report.tokenUsage.find(row => row.key === '& mut').functions, [1]);
  const use = report.functions[0].tokenUses.find(row => row.key === 'format!');
  assert.equal(report.sources[0].retainedProductionSource.slice(use.span.start, use.span.end), 'format /*gap*/ !');
  assert.equal(report.tokenUsageOverlap.find(row => row.left === 'format!' && row.right === 'matches!').functions.length, 1);
});

test('current source changes and missing compiler bytes remain explicit; repeat calls read afresh', () => {
  const input = fixture();
  input.inputs.set('rust/src/example.rs', Buffer.from('changed current source'));
  input.inputs.delete('tools/translation/compiler.mjs');
  const before = input.run();
  assert.equal(before.staleness.changedSourceInputs, 1);
  assert.equal(before.staleness.compilerStatus, 'incomplete-current-inputs');
  assert.equal(before.staleness.missingCompilerInputs, 1);
  input.inputs.set('tools/translation/compiler.mjs', Buffer.from('old compiler'));
  assert.equal(input.run().staleness.compilerStatus, 'hashes-match-no-fresh-verdict');
});

test('stored source mismatch and name/span mismatch never issue function joins', () => {
  const input = fixture();
  input.root.sources[0].sha256 = sha256('different historical source');
  assert.equal(input.run().completeness.joinedRefusalRecords, 0);
  input.root.sources[0].sha256 = input.evidence.sources[0].sha256;
  input.root.refused[0].name = 'unrelated';
  input.root.refused[1].span.end = 999999;
  const report = input.run();
  assert.equal(report.completeness.joinedRefusalRecords, 1);
  assert.deepEqual(report.completeness.unjoinedRefusalRecords, [0, 1]);
});

test('forged inventory identity, omitted source and modified body/span/status fail complete metadata joins', () => {
  const invalid = [
    input => { input.evidence.inventorySha256 = sha256('forged'); },
    input => { input.evidence.sources = []; },
    input => { input.evidence.functions[0].body += ' '; },
    input => { input.evidence.functions[0].span.byteStart++; },
    input => { input.evidence.functions[0].status = 'executable'; input.evidence.functions[2].status = 'carried'; },
    input => { input.evidence.functions[1] = structuredClone(input.evidence.functions[0]); },
    input => { input.inputs.delete(input.evidence.sources[0].metaPath); },
    input => { input.root.sources.push(structuredClone(input.root.sources[0])); },
    input => { input.root.sources.push({...input.root.sources[0], module: ['inline'], sha256: sha256('conflicting source')}); },
  ];
  for (const mutate of invalid) {
    const input = fixture(); mutate(input);
    assert.throws(() => input.run(), /Production frontier DATA:/u);
  }
});

test('complete current vectors retain all inputs while project program components stay unread', () => {
  const input = fixture(), reads = [];
  const report = productionFrontierData({inventoryBytes: input.inventoryBytes, functionEvidenceBytes: bytes(input.evidence),
    projectDescriptorBytes: bytes(input.descriptor), readInput: name => { reads.push(name); return input.inputs.get(name) ?? null; }});
  assert.deepEqual(reads.sort(), ['rust/src/example.rs', 'tools/translation/compiler.mjs', 'tools/translation/meta/example.meta.json']);
  assert.deepEqual(report.vectors.map(row => row.role).sort(), ['inventory-source', 'stored-compiler-input', 'stored-project-source', 'stored-source-metadata']);
  assert.equal(report.sources[0].observedSource, input.evidence.sources[0].source);
  assert.equal(report.functions.length, 3);
  assert.equal(report.runtimeParity, false);
  assert.equal(report.semanticAuthority, false);
});
