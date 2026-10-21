// Complete native source selections followed by serialized/reparsed CST rules.
import {composeCoreAscii} from './prepare-core-ascii-sources.mjs';
import {composeCoreAsciiReverse} from './prepare-core-ascii-reverse-sources.mjs';
import {composeCoreAsciiAssets} from './prepare-core-ascii-assets.mjs';
import {composeCoreAsciiBaseAssets} from './prepare-core-ascii-base-assets.mjs';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {composeSourceProofPreservation} from './prepare-source-proof-preservation.mjs';
import {composeExecutableCheckedSource} from './prepare-executable-checked-source.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource, transportConcreteSyntaxMeta, serializeConcreteSyntaxMeta, applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PROFILE = new URL('./source-profiles/source-lifetime-refusal-batches/', import.meta.url);
const MANIFEST_SHA256 = 'cff71b531956c2914177f7524fb24dd6d01b1b54d35af0da5ada72c65a66d501';
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new TypeError('Source lifetime refusal preparation: ' + message); };
function originalSources() {
  const bytes = readFileSync(new URL('manifest.json', PROFILE));
  if (hash(bytes) !== MANIFEST_SHA256) fail('complete original manifest changed');
  const manifest = JSON.parse(bytes);
  return manifest.sources.map(row => {
    const packed = readFileSync(new URL(row.archive, PROFILE));
    if (packed.length !== row.archiveBytes || hash(packed) !== row.archiveSha256) fail('complete original archive changed');
    const raw = gunzipSync(packed, {maxOutputLength: 1024 * 1024});
    if (raw.length !== row.bytes || hash(raw) !== row.sha256) fail('complete original source changed');
    const source = new TextDecoder('utf8', {fatal: true, ignoreBOM: true}).decode(raw);
    if (hash(source) !== row.sha256) fail('complete original Unicode changed');
    return {...row, source};
  });
}
function nodes(ts, file, predicate) {
  const found = []; function visit(node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); } visit(file); return found;
}
function one(rows, description) { if (rows.length !== 1) fail('one complete native selection required: ' + description); return rows[0]; }
function substitute(source, edits) {
  let after = source, end = source.length;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    if (edit.end > end || source.slice(edit.start, edit.end) !== edit.before) fail('overlapping or changed native source selection');
    after = after.slice(0, edit.start) + edit.after + after.slice(edit.end); end = edit.start;
  }
  return after;
}
function edit(file, node, after) { return {start: node.getStart(file), end: node.end, before: node.getText(file), after}; }
function languageSource(ts, path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), edits = [];
  if (file.parseDiagnostics.length) fail('complete original native grammar differs');
  if (path.endsWith('/declaration-refusals.mjs')) {
    const visit = one(nodes(ts, file, node => ts.isMethodDeclaration(node) && node.name.getText(file) === 'visitDeclaration'), 'original declaration visitor');
    const first = visit.body.statements[0];
    if (first.getText(file) !== 'const state=collectors.get(this);') fail('actual original collector state differs');
    edits.push({start: first.end, end: first.end, before: '', after: '\n    if(state?.collectSourceLifetimes&&phase===\'declaration-bodies\'&&item.k===\'fn\')state.sourceProofOrigins.set(entry.fullName,{item,path:[...path],entry});'});
    const stateCall = one(nodes(ts, file, node => ts.isCallExpression(node) && node.expression.getText(file) === 'collectors.set'), 'original collection invocation');
    if (stateCall.arguments.length !== 2 || !ts.isObjectLiteralExpression(stateCall.arguments[1])) fail('actual original collector record differs');
    const object = stateCall.arguments[1];
    edits.push({start: object.end - 1, end: object.end - 1, before: '', after: ',collectSourceLifetimes:sourceLifetimeRefusalsSelected(surface),sourceProofOrigins:sourceLifetimeRefusalsSelected(surface)?new Map():null'});
    const state = one(nodes(ts, file, node => ts.isVariableStatement(node) && node.declarationList.declarations.some(row => row.name.getText(file) === 'collectors')), 'private actual collector declaration');
    edits.push({start: state.end, end: state.end, before: '', after: '\nexport const {withSourceLifetimeRefusals,sourceLifetimeRefusalsSelected,checkSourceLifetimeRefusals}=createSourceLifetimeRefusalSupport({collectors,failedPhase,TranslationError,originalRanges:originalProjectDeclarationRefusalRanges});'});
    return "import {createSourceLifetimeRefusalSupport} from './source-lifetime-refusal-support.mjs';\n" + substitute(source, edits);
  }
  if (path.endsWith('/source-lifetimes.mjs')) {
    const method = one(nodes(ts, file, node => ts.isMethodDeclaration(node) && node.name.getText(file) === 'program'), 'complete lifetime program method');
    const loops = nodes(ts, method, node => ts.isForOfStatement(node) && node.expression.getText(file) === 'program.declarations.values()');
    if (loops.length !== 2) fail('complete original signature and body lifetime loops required');
    for (const [index, loop] of loops.entries()) {
      const condition = loop.statement;
      if (!ts.isIfStatement(condition) || condition.expression.getText(file) !== "entry.k==='fn'" || condition.elseStatement) fail('complete original function-only phase differs');
      const block = condition.thenStatement;
      const body = ts.isBlock(block) ? source.slice(block.getStart(file) + 1, block.end - 1) : block.getText(file);
      edits.push(edit(file, loop, "checkSourceLifetimeRefusals(this,program,'source-lifetime-" + (index === 0 ? 'signatures' : 'bodies') + "',entry=>{" + body + '});'));
    }
    return "import {checkSourceLifetimeRefusals} from './declaration-refusals.mjs';\n" + substitute(source, edits);
  }
  if (path === 'tools/translation/project.mjs') {
    const imported = one(file.statements.filter(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === './extensions/declaration-refusals.mjs'), 'actual collector import');
    edits.push(edit(file, imported, "import {declarationRefusals,withSourceLifetimeRefusals} from './extensions/declaration-refusals.mjs';"));
    const declaration = one(nodes(ts, file, node => ts.isVariableDeclaration(node) && node.name.getText(file) === 'nativeChecked'), 'original complete checker call');
    const call = declaration.initializer;
    if (!ts.isCallExpression(call) || call.expression.getText(file) !== 'checkProjectProgram') fail('complete original native checker call differs');
    edits.push(edit(file, call, 'withSourceLifetimeRefusals(surface,options.collectIndependentSourceLifetimes??(options.collectIndependentBodies??true),()=>'+call.getText(file)+')'));
    return substitute(source, edits);
  }
  fail('unexpected original source path');
}
const rule = (before, after, id) => ({id, edits: [{span: [0, before.length], expected: before, replacement: after}]});
export function prepareSourceLifetimeRefusalBatches({root = ROOT} = {}) {
  const ts = ownershipCompiler(); if (ts.version !== '5.9.3') fail('actual installed TypeScript 5.9.3 required');
  const inputs = originalSources(), files = [];
  for (const input of inputs) {
    const before = input.source;
    const transformed = languageSource(ts, input.path, before);
    const language = input.path === 'tools/translation/project.mjs' ? before : transformed;
    const after = transformed;
    const native = ts.createSourceFile(input.path, after, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    if (native.parseDiagnostics.length) fail('complete generated native grammar differs');
    const nativeBindings = verifyNativeCopiedSourceBindings(ts, resolve(root, input.path), after);
    const first = transportConcreteSyntaxSource(before, {language: 'JavaScript'});
    const run = applyConcreteSyntaxSubstitutions(first.document, {languageRules: [rule(before, language, 'javascript:collect-complete-independently-attributed-lifetime-phases')], repositoryRules: [rule(language, after, 'router:select-batching-only-inside-original-project-invocation')]});
    const afterMeta = serializeConcreteSyntaxMeta(run.value), last = transportConcreteSyntaxMeta(afterMeta);
    if (last.source !== after) fail('complete generated source CST differs');
    const inverse = applyConcreteSyntaxSubstitutions(last.document, {languageRules: [rule(after, before, 'javascript:restore-complete-original-lifetime-checker-and-project')], repositoryRules: []});
    if (transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source !== before) fail('complete original source inverse differs');
    let current = null; try { current = readFileSync(resolve(root, input.path), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    files.push({path: input.path, before, original: before, language, after, current, beforeMeta: first.meta, afterMeta, inverse: before, trace: run.trace, nativeBindings});
  }
  return {schema: 'source-lifetime-refusal-batch-source-v1', typescriptVersion: ts.version, inputs, files, ordinaryCheckerSelectionUnchanged: true, failedPhaseReturnsProgram: false, newAcrossInvocationCache: false, semanticAuthority: false, executableAdmission: false};
}
// A preceding birth producer retains its own complete inverse. This layer may
// join it only at the exact archived native source, never at a matching name.
export function composeSourceLifetimeRefusalBatches(prior, options = {}) {
  const plan = prepareSourceLifetimeRefusalBatches(options), sources = {...prior};
  for (const row of plan.files) {
    if (sources[row.path] && sources[row.path].after !== row.before) fail('preceding complete source equation differs: ' + row.path);
    sources[row.path] = row;
  }
  return {sources, layers: [plan]};
}
// Explicit later source layers never rewrite the three historical birth
// equations above. The current native output is checked only after composition.
export function prepareCurrentSourceLifetimeRefusalBatches(options = {}) {
  const birth = prepareSourceLifetimeRefusalBatches(options);
  const checked = composeExecutableCheckedSource(Object.fromEntries(birth.files.map(row => [row.path, row])), options);
  const preserved = composeSourceProofPreservation(checked.sources, options);
  const ascii = composeCoreAscii(preserved.sources, options);
  const reverse = composeCoreAsciiReverse(ascii.sources, options);
  const assets = composeCoreAsciiAssets(reverse.sources, options);
  const base = composeCoreAsciiBaseAssets(assets.sources, options);
  return {schema: 'current-source-lifetime-refusal-batch-source-v1', birth, layers: [birth, ...checked.layers, ...preserved.layers, ...ascii.layers, ...reverse.layers, ...assets.layers, ...base.layers], files: Object.values(base.sources), semanticAuthority: false};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode] = process.argv.slice(2); if (process.argv.length !== 3 || !['--check', '--write'].includes(mode)) fail('usage: --check|--write');
  const plan = prepareCurrentSourceLifetimeRefusalBatches();
  if (mode === '--write') {
    for (const row of plan.files) if (!plan.layers.flatMap(layer => layer.files.filter(part => part.path === row.path).flatMap(part => [part.before,part.after])).includes(row.current)) fail('current source differs from both complete original and generated source: '+row.path);
    for (const row of plan.files) { if (readFileSync(resolve(ROOT,row.path),'utf8') !== row.current) fail('current source changed before publication'); writeFileSync(resolve(ROOT, row.path), row.after); }
  }
  else if (plan.files.some(row => row.current !== row.after)) fail('complete generated lifetime collection source is stale');
  console.log(JSON.stringify({schema: plan.schema, files: plan.files.map(row => row.path), semanticAuthority: false}));
}
