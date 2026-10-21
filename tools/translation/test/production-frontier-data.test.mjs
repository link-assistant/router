import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {productionFrontierData, sha256} from '../production-frontier-data.mjs';

const bytes = value => Buffer.from(JSON.stringify(value) + '\n');
const producer = readFileSync(new URL('../project.mjs', import.meta.url));
function fixture() {
  const path = 'rust/src/example.rs';
  const bodies = [
    'fn one() { /* format!("comment") */ let s = r###"format!(matches!())"###; format /*gap*/ !("{}", 1); matches!(1, 1); }',
    'fn two(x: &mut u8) { format!("{}", x); }',
    'fn three() -> u8 { 3 }',
  ];
  const source = '// Unicode 🦀 preserves byte coordinates\n' + bodies.join('\n') + '\nmod inner { const X: u8 = 1; }';
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
    implementationHashes: {'tools/translation/compiler.mjs': sha256('old compiler'), 'tools/translation/project.mjs': sha256(producer)}};
  const inventoryBytes = bytes(inventory);
  const evidence = {schema: 'complete-original-function-priority-DATA-v1', inventorySha256: sha256(inventoryBytes),
    originalFunctionCoverage: coverage, functions, sources: [{path, source, bytes: Buffer.byteLength(source), sha256: sha256(source),
      metaPath, metaBytes: meta.length, metaSha256: sha256(meta)}]};
  const diagnostic = (index, message, text) => {
    const start = source.indexOf(text, functions[index].span.start);
    return {file: path, name: functions[index].name, term: 'fn', kind: 'unsupported', message, span: {start, end: start + text.length}};
  };
  const root = {schema: 'tracked-rust-project-semantic-meta-v1', entry: path,
    sources: [{source: path, sha256: sha256(source), module: []}], executable: [], moduleEdges: [], moduleDiagnostics: [],
    refused: [diagnostic(0, 'format! owner requires original context', 'format /*gap*/ !'),
      diagnostic(0, 'matches! original source contract: needs context', 'matches!(1'),
      diagnostic(1, 'mutable reference: mutation is outside the portable core', '&mut')]};
  const descriptor = {schema: 'bounded-project-meta-storage-v1', root,
    logical: {sha256: sha256('unloaded logical program')},
    components: [{field: 'checkedSemanticProgram', path: 'unloaded/program.json', bytes: 999999}]};
  const inputs = new Map([[path, Buffer.from(source)], [metaPath, meta], ['tools/translation/compiler.mjs', Buffer.from('new compiler')],
    ['tools/translation/project.mjs', producer]]);
  return {inventory, inventoryBytes, evidence, root, descriptor, inputs,
    run(overrides = {}) { return productionFrontierData({inventoryBytes: this.inventoryBytes, functionEvidenceBytes: bytes(this.evidence),
      projectDescriptorBytes: bytes(this.descriptor), readInput: name => this.inputs.get(name) ?? null, ...overrides}); }};
}

function globalFixture() {
  const input = fixture(), source = '// 🦀 global-coordinate prefix\nmod original;\n#[path="example.rs"] mod alias;';
  const path = 'rust/src/lib.rs', metaPath = 'tools/translation/meta/lib.meta.json', meta = bytes({items: []});
  input.inventory.sources.push({source: path, bytes: Buffer.byteLength(source), sha256: sha256(source), targets: {meta: metaPath}});
  input.evidence.sources.push({path, source, bytes: Buffer.byteLength(source), sha256: sha256(source), metaPath, metaBytes: meta.length, metaSha256: sha256(meta)});
  input.inputs.set(path, Buffer.from(source)); input.inputs.set(metaPath, meta);
  input.root.entry = path;
  input.root.sources = [{source: path, sha256: sha256(source), module: []}, {...input.root.sources[0], module: ['original']}];
  input.root.moduleEdges = [{from: path, to: 'rust/src/example.rs', module: ['original'], pathSelection: {inline: false}}];
  input.root.refused.forEach(row => { row.module = ['original']; });
  const row = input.root.refused[0]; delete row.module; row.name = 'original.one';
  input.expectedOffset = source.length + 1;
  row.span = {start: row.span.start + input.expectedOffset, end: row.span.end + input.expectedOffset};
  input.inventoryBytes = bytes(input.inventory); input.evidence.inventorySha256 = sha256(input.inventoryBytes);
  return input;
}

test('stored first refusals join complete source/hash/name/spans and distinct groups preserve overlap', () => {
  const input = fixture();
  input.root.sources.push({...input.root.sources[0], module: ['inner']});
  input.root.moduleEdges.push({from: input.root.entry, to: input.root.entry, module: ['inner'], kind: 'original-inline-module',
    span: {start: input.evidence.sources[0].source.indexOf('mod inner'), end: input.evidence.sources[0].source.length}, pathSelection: {inline: true}});
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
  assert.deepEqual(reads.sort(), ['rust/src/example.rs', 'tools/translation/compiler.mjs', 'tools/translation/meta/example.meta.json', 'tools/translation/project.mjs']);
  assert.deepEqual(report.vectors.map(row => row.role).sort(), ['inventory-source', 'stored-compiler-input', 'stored-compiler-input', 'stored-project-source', 'stored-source-metadata']);
  assert.equal(report.sources[0].observedSource, input.evidence.sources[0].source);
  assert.equal(report.functions.length, 3);
  assert.equal(report.runtimeParity, false);
  assert.equal(report.semanticAuthority, false);
});

test('qualified semantic diagnostics normalize pinned project-global UTF16 spans without replacing original coordinates', () => {
  const input = globalFixture(), report = input.run(), join = report.refusals[0].coordinateJoins[0];
  assert.equal(report.producerCoordinates.status, 'pinned-historical-producer-equations');
  assert.equal(report.projectCoordinates[1].globalOffset, input.expectedOffset);
  assert.equal(report.completeness.joinedRefusalRecords, 3);
  assert.deepEqual(join.originalSpan, input.root.refused[0].span);
  assert.equal(join.normalizedSpan.start, join.originalSpan.start - input.expectedOffset);
  assert.equal(join.originalName, 'original.one'); assert.equal(join.normalizedName, 'one');
  assert.deepEqual(join.module, ['original']); assert.equal(join.functionIndex, 0);
  assert.equal(report.refusals[0].diagnosticText, 'format /*gap*/ !');
  input.root.refused[0].span = {start: input.expectedOffset + input.evidence.functions[0].span.start - 1,
    end: input.expectedOffset + input.evidence.functions[0].span.start - 1};
  assert.equal(input.run().refusals[0].join, 'no-inventory-function');
  input.root.refused[0].name = 'unrelated.one';
  assert.equal(input.run().refusals[0].functions.length, 0);
});

test('inline contexts reuse parent offsets and bound scopes while external aliases retain their own offsets', () => {
  const input = globalFixture(), original = input.root.sources[1], source = input.evidence.sources[0].source;
  input.root.sources.push({...original, module: ['original', 'inner']}, {...original, module: ['alias']});
  input.root.moduleEdges.push({from: original.source, to: original.source, module: ['original', 'inner'], kind: 'original-inline-module',
    span: {start: source.indexOf('mod inner'), end: source.length}, pathSelection: {inline: true}},
  {from: input.root.entry, to: original.source, module: ['alias'], pathSelection: {inline: false}});
  const row = input.root.refused[0], delta = source.length + 1;
  input.root.refused.push({...row, name: 'alias.one', span: {start: row.span.start + delta, end: row.span.end + delta}},
    {...row, name: 'original.inner.one'}, {...row, kind: 'ambiguous'});
  const report = input.run();
  assert.equal(report.projectCoordinates[2].globalOffset, input.expectedOffset);
  assert.equal(report.projectCoordinates[3].globalOffset, input.expectedOffset + delta);
  assert.deepEqual(report.refusals[3].functions, [0]);
  assert.deepEqual(report.refusals[3].coordinateJoins[0].module, ['alias']);
  assert.equal(report.refusals[4].functions.length, 0);
  assert.equal(report.refusals[5].join, 'ambiguous-stored-owner');
  assert.equal(report.completeness.distinctJoinedFunctions, 2);
});

test('a changed producer cannot normalize global coordinates; an explicit pinned historical producer can', () => {
  const input = globalFixture(); input.inputs.set('tools/translation/project.mjs', Buffer.from('different current producer'));
  const refused = input.run();
  assert.equal(refused.producerCoordinates.status, 'unavailable-or-unsupported-producer-equations');
  assert.equal(refused.refusals[0].functions.length, 0);
  const historical = input.run({historicalProjectProducerBytes: producer});
  assert.equal(historical.completeness.joinedRefusalRecords, 3);
  assert.equal(historical.staleness.changedCompilerInputs, 2);
  const repeated = Buffer.concat([producer, Buffer.from('\n// let offset = 0;\n')]);
  input.inventory.implementationHashes['tools/translation/project.mjs'] = sha256(repeated);
  input.inventoryBytes = bytes(input.inventory); input.evidence.inventorySha256 = sha256(input.inventoryBytes);
  assert.equal(input.run({historicalProjectProducerBytes: repeated}).producerCoordinates.status, 'unavailable-or-unsupported-producer-equations');
});
