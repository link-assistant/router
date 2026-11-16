// Copy actual complete corpus/packet producers; no saved compiler verdicts.
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {prepareSourceBackedFormattingPackets} from './prepare-source-backed-formatting-packets.mjs';
import {prepareFormattingPacketCli} from './prepare-formatting-packet-cli.mjs';
import {transportConcreteSyntaxSource, transportConcreteSyntaxMeta, serializeConcreteSyntaxMeta, applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const VECTOR = 'tools/translation/migrate-core-vectors.mjs';
const SOURCES = ['tools/translation/source-backed-core-formatting.mjs', 'tools/translation/source-backed-formatting-packets.mjs'];
const OUTPUTS = ['tools/translation/source-backed-core-vectors.mjs', 'tools/translation/source-backed-vector-packets.mjs'];
const fail = message => { throw new TypeError('Source-backed vector preparation: ' + message); };
function parse(ts, path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (file.parseDiagnostics.length) fail('complete native syntax differs: ' + path);
  return file;
}
function once(source, before, after) {
  if (source.split(before).length !== 2) fail('one complete native source anchor required: ' + before);
  return source.replace(before, () => after);
}
function named(ts, file, name) {
  const rows = file.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name ||
    ts.isVariableStatement(node) && node.declarationList.declarations.some(row => ts.isIdentifier(row.name) && row.name.text === name));
  if (rows.length !== 1) fail('one complete actual declaration required: ' + name);
  return rows[0];
}
function substitute(source, changes) {
  let after = source;
  for (const row of changes.sort((a, b) => b.start - a.start)) {
    if (after.slice(row.start, row.end) !== row.before) fail('native span source differs');
    after = after.slice(0, row.start) + row.after + after.slice(row.end);
  }
  return after;
}
function cleanEmptyLineTrivia(ts, path, source) {
  const file = parse(ts, path, source), literals = [], changes = [];
  function visit(node) { if (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) { literals.push([node.getStart(file), node.end]); return; } ts.forEachChild(node, visit); } visit(file);
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, source);
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    if (kind !== ts.SyntaxKind.WhitespaceTrivia) continue;
    const start = scanner.getTokenPos(), end = scanner.getTextPos();
    if ((start === 0 || source[start - 1] === '\n') && ['\n', '\r', undefined].includes(source[end]) && !literals.some(span => start >= span[0] && start < span[1])) changes.push({start, end, before: source.slice(start, end), after: ''});
  }
  return substitute(source, changes);
}
const rule = (before, after, id) => ({id, edits: [{span: [0, before.length], expected: before, replacement: after}]});
const names = new Map([
  ['migrateOriginalProducerFormatting', 'migrateOriginalProducerVectors'],
  ['proposeSourceBackedCoreFormattingCorpus', 'proposeSourceBackedCoreVectorCorpus'],
  ['iterateSourceBackedCoreFormattingCorpusPackets', 'iterateSourceBackedCoreVectorCorpusPackets'],
  ['formattingPacketSame', 'vectorPacketSame'], ['formattingPacketRecord', 'vectorPacketRecord'],
  ['formattingPacketInspectionFail', 'vectorPacketInspectionFail'], ['createFormattingPacketInspection', 'createVectorPacketInspection'],
  ['verifyFormattingInputs', 'verifyVectorInputs'], ['encodeFormattingRow', 'encodeVectorRow'], ['encodedFormattingFile', 'encodedVectorFile'],
]);
const literals = new Map([
  ['format', 'vec'], ['format!', 'vec!'],
  ['router-owned-source-backed-formatting-corpus-proposal-v1', 'router-owned-source-backed-vector-corpus-proposal-v1'],
  ['untranslated-rust-std-format', 'untranslated-rust-std-vec'],
  ['no bare format macro in the supported top-level function domain', 'no bare vec macro in the supported top-level function domain'],
  ['unfinished formatting packet stream', 'unfinished vector packet stream'],
]);
export function prepareSourceBackedVectors({root = ROOT} = {}) {
  // Recheck the real formatting producer equation; stale copied templates fail.
  const prerequisite = prepareSourceBackedFormattingPackets({root});
  if (prerequisite.files.some(row => row.current !== row.after)) fail('actual formatting packet producer is stale');
  const vector = readFileSync(resolve(root, VECTOR), 'utf8'), ts = ownershipCompiler();
  if (ts.version !== '5.9.3') fail('installed native TypeScript 5.9.3 required');
  const vectorFile = parse(ts, VECTOR, vector);
  let adopter = named(ts, vectorFile, 'migrateCoreVectors').getText(vectorFile);
  adopter = once(adopter, 'export function migrateCoreVectors(', 'function migrateOriginalProducerVectors(');
  adopter = once(adopter, 'compilationProfile = PRODUCTION_PROFILE} = {})', 'compilationProfile = PRODUCTION_PROFILE, inspection} = {})');
  adopter = once(adopter, "captureCoreMacroAdoptionBinding(source, {rootSource, macroUseSources, macroName: 'vec'})", "captureCoreMacroAdoptionBinding(inspection.source, {rootSource: inspection.rootSource, macroUseSources: inspection.macroUseSources, macroName: 'vec'})");
  // Inspection blanks only privately closed attrs/inactive items, at equal
  // offsets. Binding uses that source; function identity and every edit retain
  // the complete original item including its closed leading attributes.
  adopter = once(adopter, "if (item.term === 'opaque' &&", "if (!inspection.inactiveItemSpans.some(span => item.start >= span[0] && item.end <= span[1]) && item.term === 'opaque' &&");
  adopter = once(adopter, "if (item.term !== 'fn') continue;", "if (item.term !== 'fn' || inspection.inactiveItemSpans.some(span => item.start >= span[0] && item.end <= span[1])) continue;");
  const helper = named(ts, vectorFile, 'identifiers').getText(vectorFile), files = [], inputs = [{path: VECTOR, source: vector}];
  for (let at = 0; at < SOURCES.length; at++) {
    const source = readFileSync(resolve(root, SOURCES[at]), 'utf8'), file = parse(ts, SOURCES[at], source);
    inputs.push({path: SOURCES[at], source});
    const changes = [], removed = new Set(['attributeNames', 'attributes', 'sourceMap', 'binding']);
    function visit(node) {
      if (ts.isIdentifier(node) && names.has(node.text)) changes.push({start: node.getStart(file), end: node.end, before: node.getText(file), after: names.get(node.text)});
      else if (ts.isStringLiteral(node) && literals.has(node.text)) changes.push({start: node.getStart(file), end: node.end, before: node.getText(file), after: JSON.stringify(literals.get(node.text))});
      else ts.forEachChild(node, visit);
    }
    for (const node of file.statements) {
      const name = ts.isFunctionDeclaration(node) ? node.name?.text : ts.isVariableStatement(node) && node.declarationList.declarations.length === 1 ? node.declarationList.declarations[0].name.text : null;
      if (removed.has(name) || name === 'migrateOriginalProducerFormatting') {
        changes.push({start: node.getStart(file), end: node.end, before: node.getText(file), after: name === 'migrateOriginalProducerFormatting' ? helper + '\n' + adopter : ''});
      } else visit(node);
    }
    const imports = "import {captureCoreMacroAdoptionBinding} from './migrate-core-formatting.mjs';\n" +
      (at === 0 ? "import {itemConfiguration} from './cfg-profile.mjs';\n" : '');
    const copied = once(substitute(source, changes), 'inspection:inspection.forModule(path,scope)', 'compilationProfile:graph.compilationProfile,inspection:inspection.forModule(path,scope)');
    const language = '// Generated from complete actual vector and formatting corpus producers.\n' + imports + copied;
    // Public naming is the repository phase; original formatting APIs are untouched.
    const publicName = at === 0 ? 'proposeSourceBackedCoreVectorCorpus' : 'iterateSourceBackedCoreVectorCorpusPackets';
    const detached = once(language, 'export function ' + publicName + '(', 'export function originalVectorCorpusDraft(');
    const after = cleanEmptyLineTrivia(ts, OUTPUTS[at], once(detached, 'export function originalVectorCorpusDraft(', 'export function ' + publicName + '('));
    parse(ts, OUTPUTS[at], after);
    const nativeBindings = verifyNativeCopiedSourceBindings(ts, resolve(root, OUTPUTS[at]), after);
    const original = vector + '\n' + source, before = transportConcreteSyntaxSource(original, {language: 'JavaScript'});
    const run = applyConcreteSyntaxSubstitutions(before.document, {languageRules: [rule(original, detached, 'javascript:copy-actual-vector-adopter-and-complete-private-corpus-machinery')], repositoryRules: [rule(detached, after, 'router:name-distinct-vector-corpus-data-api')]});
    const afterMeta = serializeConcreteSyntaxMeta(run.value), last = transportConcreteSyntaxMeta(afterMeta);
    if (last.source !== after) fail('complete generated CST differs');
    const inverse = applyConcreteSyntaxSubstitutions(last.document, {languageRules: [rule(after, original, 'javascript:restore-complete-vector-and-formatting-source-inputs')], repositoryRules: []});
    if (transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source !== original) fail('whole source inverse differs');
    let current = null; try { current = readFileSync(resolve(root, OUTPUTS[at]), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    files.push({path: OUTPUTS[at], current, original, language: detached, after, beforeMeta: before.meta, afterMeta, inverse: original, trace: run.trace, nativeBindings});
  }
  return {schema: 'source-backed-vector-source-preparation-v1', typescriptVersion: ts.version, inputs, files,
    originalPublicAPIsUnchanged: true, freshPrivateInspection: true, newAcrossInvocationCache: false, semanticAuthority: false, executableAdmission: false};
}

const IO_SOURCES = ['tools/translation/formatting-packet-io.mjs', 'tools/translation/formatting-packet-storage.mjs',
  'tools/translation/propose-source-backed-formatting.mjs', 'tools/translation/review-source-backed-formatting-packets.mjs'];
const ioNames = new Map([
  ['SOURCE_FORMATTING_PACKET_LIMITS', 'SOURCE_VECTOR_PACKET_LIMITS'], ['SOURCE_FORMATTING_GZIP_LIMITS', 'SOURCE_VECTOR_GZIP_LIMITS'],
  ['formattingPacketIO', 'vectorPacketIO'], ['formattingDependencies', 'vectorDependencies'], ['formattingStage', 'vectorStage'],
  ['encodeFormattingGzipPacket', 'encodeVectorGzipPacket'], ['prepareFormattingGzipIndex', 'prepareVectorGzipIndex'],
  ['openFormattingGzipPackets', 'openVectorGzipPackets'], ['proposeSourceBackedFormattingGzipPackets', 'proposeSourceBackedVectorGzipPackets'],
  ['reviewSourceBackedFormattingPackets', 'reviewSourceBackedVectorPackets'],
  ['iterateSourceBackedCoreFormattingCorpusPackets', 'iterateSourceBackedCoreVectorCorpusPackets'],
]);
export function prepareSourceBackedVectorPacketIO({root = ROOT} = {}) {
  const prerequisite = prepareFormattingPacketCli({root});
  if (prerequisite.files.some(row => row.current !== row.after)) fail('actual bounded formatting IO/storage source equation is stale');
  const ts = ownershipCompiler(); if (ts.version !== '5.9.3') fail('installed native TypeScript 5.9.3 required');
  const inputs = [], files = [];
  for (let at = 0; at < IO_SOURCES.length; at++) {
    const input = IO_SOURCES[at], path = input.replaceAll('formatting', 'vector'), original = readFileSync(resolve(root, input), 'utf8');
    inputs.push({path: input, source: original});
    const parsed = parse(ts, input, original), changes = [];
    function walk(node) {
      if (ts.isIdentifier(node) && ioNames.has(node.text)) changes.push({start: node.getStart(parsed), end: node.end, before: node.getText(parsed), after: ioNames.get(node.text)});
      else if (ts.isStringLiteral(node) && /formatting|Formatting/u.test(node.text)) changes.push({start: node.getStart(parsed), end: node.end,
        before: node.getText(parsed), after: JSON.stringify(node.text.replaceAll('formatting', 'vector').replaceAll('Formatting', 'Vector'))});
      else ts.forEachChild(node, walk);
    }
    walk(parsed);
    let language = '// Generated complete bounded vector DATA transport; prepare-source-backed-vectors.mjs owns this file.\n' + substitute(original, changes);
    if (at === 2) {
      language = "import {inspectVectorProposalData} from './vector-proposal-data.mjs';\n" + language;
      language = once(language, 'IO.assertAdoptionInverse(proposal);', 'IO.assertAdoptionInverse(proposal);inspectVectorProposalData(proposal);');
    } else if (at === 3) {
      language = "import {inspectVectorProposalData} from './vector-proposal-data.mjs';\n" + language;
      language = once(language, 'function proposalInverse(row){', 'function proposalInverse(row){\n inspectVectorProposalData(row);');
      language = once(language, 'metadata.values.semanticAdmission!==false||', "metadata.values.semanticAdmission!==false||metadata.values.libraryImplementation!=='untranslated-rust-std-vec'||");
    }
    // Copy all original validation first, then select distinct vector names and
    // exact schemas. Quotas and final physical source/Cargo joins are unchanged.
    const schema = at === 0 ? 'router-source-backed-vector-incomplete-v1' : at === 1 ? 'router-source-backed-vector-gzip-storage-v1' : at === 2 ? 'router-source-backed-vector-packets-v1' : 'router-source-backed-vector-readback-v1';
    const provisional = once(language, JSON.stringify(schema), JSON.stringify('original-vector-packet-data-schema'));
    const after = once(provisional, JSON.stringify('original-vector-packet-data-schema'), JSON.stringify(schema));
    parse(ts, path, after);
    const nativeBindings = verifyNativeCopiedSourceBindings(ts, resolve(root, path), after), before = transportConcreteSyntaxSource(original, {language: 'JavaScript'});
    const run = applyConcreteSyntaxSubstitutions(before.document, {languageRules: [rule(original, provisional, 'javascript:copy-complete-actual-bounded-writer-and-independent-reader')], repositoryRules: [rule(provisional, after, 'router:bind-distinct-vector-data-schemas-and-source-partitions')]});
    const afterMeta = serializeConcreteSyntaxMeta(run.value), last = transportConcreteSyntaxMeta(afterMeta);
    if (last.source !== after) fail('complete bounded vector source differs');
    const inverse = applyConcreteSyntaxSubstitutions(last.document, {languageRules: [rule(after, original, 'javascript:restore-complete-original-formatting-io-source')], repositoryRules: []});
    if (transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source !== original) fail('complete bounded source inverse differs');
    let current = null; try { current = readFileSync(resolve(root, path), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    files.push({path, current, original, language: provisional, after, beforeMeta: before.meta, afterMeta, inverse: original, trace: run.trace, nativeBindings});
  }
  return {schema: 'source-backed-vector-packet-io-source-v1', typescriptVersion: ts.version, inputs, files,
    allOriginalAPIsUnchanged: true, allOriginalStorageBoundsUnchanged: true, newAcrossInvocationCache: false, sourceAuthority: false, semanticAdmission: false};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--check', '--write'].includes(args[0])) fail('usage: --check|--write');
  for (const prepare of [prepareSourceBackedVectors, prepareSourceBackedVectorPacketIO]) {
    const plan = prepare();
    if (args[0] === '--write') for (const row of plan.files) writeFileSync(resolve(ROOT, row.path), row.after);
    else if (plan.files.some(row => row.current !== row.after)) fail('generated vector corpus/IO producer is stale');
    console.log(JSON.stringify({schema: plan.schema, files: plan.files.map(row => row.path), semanticAuthority: false}));
  }
}
