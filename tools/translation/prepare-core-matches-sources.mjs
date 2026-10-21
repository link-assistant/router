// Native source composition for an explicit owned compatibility operation.
import {composeCoreAscii} from './prepare-core-ascii-sources.mjs';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {composePrimitiveIdentityBoundary} from './prepare-primitive-identity-boundary.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {sourceItems, rustTokens} from './rust-structure.mjs';
import {transportConcreteSyntaxSource, transportConcreteSyntaxMeta, serializeConcreteSyntaxMeta, applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FIXTURE = 'tools/translation/test/fixtures/owned-matches-original-inputs.json.gz';
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = message => { throw new TypeError('Owned matches preparation: ' + message); };
function native(ts, path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (file.parseDiagnostics.length) fail('complete native syntax differs: ' + path);
  return file;
}
function named(ts, file, name) {
  const rows = file.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name ||
    ts.isVariableStatement(node) && node.declarationList.declarations.some(row => ts.isIdentifier(row.name) && row.name.text === name));
  if (rows.length !== 1) fail('one complete native declaration required: ' + name);
  return rows[0];
}
function once(source, before, after) {
  if (source.split(before).length !== 2) fail('one complete native source anchor required: ' + before);
  return source.replace(before, () => after);
}
function proposal(path, source, language, after, type = 'JavaScript') {
  const before = transportConcreteSyntaxSource(source, {language: type});
  const rule = (a, b, id) => ({id, edits: [{span: [0, a.length], expected: a, replacement: b}]});
  const run = applyConcreteSyntaxSubstitutions(before.document, {
    languageRules: [rule(source, language, type.toLowerCase() + ':copy-complete-checked-owned-matches-source')],
    repositoryRules: [rule(language, after, 'router:compose-explicit-owned-matches-API')],
  });
  const afterMeta = serializeConcreteSyntaxMeta(run.value), output = transportConcreteSyntaxMeta(afterMeta);
  const inverse = applyConcreteSyntaxSubstitutions(output.document, {
    languageRules: [rule(after, source, type.toLowerCase() + ':restore-complete-owned-matches-input')], repositoryRules: [],
  });
  if (output.source !== after || transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source !== source) fail('complete source equation differs');
  return {path, before: source, language, after, beforeMeta: before.meta, afterMeta, inverse: source,
    beforeSha256: hash(source), afterSha256: hash(after), trace: run.trace};
}
const RUNTIME = String.raw`
const fail = (message, span) => { throw unsupported('Router compatibility matches', message, span); };
export function parseRouterCoreMatches(parser, path) {
  const c = parser.cursor;
  if (!['crate', '::', 'translation_core', '::'].every((word, index) => c.is(word, index)) ||
      c.peek().kind !== 'identifier' || c.peek(2).kind !== 'identifier' || c.peek(4).value !== 'matches') return null;
  const name = c.peek(4), separate = name.kind === 'identifier' && c.is('!', 5);
  if (name.kind !== 'macro' && !separate) return null;
  const first = c.peek(), sourceTokens = c.tokens, start = c.index, width = separate ? 6 : 5;
  const macro = separate ? {...name, kind: 'macro', end: c.peek(5).end} : name;
  const location = {start: first.start, end: macro.end};
  let proof;
  try { proof = requireRouterCoreFacade(parser); }
  catch (error) { if (!(error instanceof TypeError)) throw error; fail(error.message, location); }
  c.index += width;
  const node = createRulePipeline([
    {phase: 'language', rules: [{id: 'literal-matches:existing-ordered-source-pattern-parser', apply: () => parseOriginalOwnedMatchesBody(parser, {...macro, start: first.start}, path)}]},
    {phase: 'repository', rules: [{id: 'router-core:qualified-owned-literal-matches', apply: node => {
      if (node.rows[0].guard) fail('guarded patterns require a separate owned domain', node.span);
      let cells = 0;
      const literal = pattern => {
        if (++cells > ORDERED_MATCH_PROFILE.alternativeLimit) fail('literal alternative bound exceeded', pattern.span);
        if (pattern.k === 'or') { for (const child of pattern.alternatives) literal(child); return; }
        if (!['numLit', 'boolLit', 'strLit'].includes(pattern.k)) fail('requires literal scalar patterns without bindings', pattern.span);
      };
      literal(node.rows[0].pattern);
      node.sourceMacro = {name: 'matches', owner: 'owned-router-compatibility', profile: ORDERED_MATCH_PROFILE.id,
        span: node.span, compatibilityCore: {id: 'router-core-literal-matches-v1', symbol: 'crate::translation_core::matches',
          facadeSha256: ROUTER_FORMATTING_FACADE_SHA256, libraryImplementation: 'untranslated-rust-std-matches',
          domain: 'existing-checked-scalar-literal-patterns-without-guards'}};
      return {...node, constEligible: false};
    }}]},
  ]).run(null).value;
  try { requireRouterCoreFacadeCurrent(parser, proof); }
  catch (error) { if (!(error instanceof TypeError)) throw error; fail(error.message, node.span); }
  if (parser.cursor !== c || c.tokens !== sourceTokens || c.index <= start + width || sourceTokens[start] !== first || sourceTokens[start + 4] !== name) fail('original qualified source call changed', node.span);
  return node;
}
`;
export const CORE_MATCHES_ORACLE_SOURCE = `//! Native compatibility oracle; CI only after the complete JavaScript gate.
use link_assistant_router::translation_core;

#[test]
fn literal_patterns_preserve_value_and_subject_order() {
    assert!(translation_core::matches!("--config", "-c" | "--config"));
    assert!(!translation_core::matches!("😀", "-c" | "--config"));
    assert!(translation_core::matches!(255_u8, 0_u8 | 255_u8));
    assert!(translation_core::matches!(true, true));
    let mut calls = 0;
    let selected = translation_core::matches!(
        {
            calls += 1;
            7_u8
        },
        3_u8 | 7_u8
    );
    assert!(selected);
    assert_eq!(calls, 1);
}
`;
export function prepareCoreMatchesSources({facade, sourceData, hostSource, orderedSource, applicationSource}) {
  for (const source of [facade, sourceData, hostSource, orderedSource, applicationSource]) if (typeof source !== 'string' || source.length > 2_000_000) fail('complete bounded original sources required');
  if (facade.includes('__router_translation_core_matches') || hostSource.includes('parseRouterCoreMatches')) fail('fresh original matches extension required');
  const ts = ownershipCompiler(); if (ts.version !== '5.9.3') fail('installed native TypeScript 5.9.3 required');
  const dataFile = native(ts, 'router-core-source-data.mjs', sourceData), hostFile = native(ts, 'host-contracts.mjs', hostSource), ordered = native(ts, 'ordered-matches.mjs', orderedSource);
  const dataFields = dataFile.statements.filter(ts.isVariableStatement).flatMap(row => [...row.declarationList.declarations]);
  const field = name => {
    const rows = dataFields.filter(row => ts.isIdentifier(row.name) && row.name.text === name);
    if (rows.length !== 1 || !ts.isStringLiteral(rows[0].initializer)) fail('one actual source DATA literal required: ' + name);
    return rows[0].initializer;
  };
  const oldSource = field('ROUTER_FORMATTING_FACADE_SOURCE'), oldHash = field('ROUTER_FORMATTING_FACADE_SHA256');
  if (oldSource.text !== facade || oldHash.text !== hash(facade)) fail('complete original facade/DATA differs');
  const wrappers = sourceItems(facade).filter(item => item.term === 'macro_rules!' && item.name === '__router_translation_core_format');
  if (wrappers.length !== 1) fail('one complete actual format wrapper required');
  const originalWrapper = facade.slice(wrappers[0].start, wrappers[0].end), tokens = rustTokens(originalWrapper), edits = [];
  for (let at = 0; at < tokens.length; at++) {
    const token = tokens[at];
    if (token.text === '__router_translation_core_format') edits.push({span: [token.start, token.end], expected: token.text, replacement: '__router_translation_core_matches'});
    if (token.text === 'format!' && tokens.slice(at - 3, at).map(row => row.text).join('') === '::std::') edits.push({span: [token.start, token.end], expected: token.text, replacement: 'matches!'});
  }
  if (edits.length !== 2) fail('actual wrapper name and absolute std delegate required');
  const wrapperMeta = transportConcreteSyntaxSource(originalWrapper, {language: 'Rust'});
  const wrapperRun = applyConcreteSyntaxSubstitutions(wrapperMeta.document, {languageRules: [], repositoryRules: [{id: 'router-core:derive-owned-literal-matches-wrapper', edits}]});
  const wrapper = transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(wrapperRun.value)).source;
  const nextFacade = facade + '\n' + wrapper + '\n\n/// Test scalar literal patterns; translation checks every subject and alternative.\npub use crate::__router_translation_core_matches as matches;\n';
  const classes = hostFile.statements.filter(row => ts.isClassDeclaration(row) && row.name?.text === 'HostRustParser');
  const methods = classes.length === 1 ? classes[0].members.filter(row => ts.isMethodDeclaration(row) && row.name.getText(hostFile) === 'primary') : [];
  if (methods.length !== 1 || !methods[0].body || methods[0].parameters.map(row => row.name.getText(hostFile)).join(',') !== 'path,options') fail('complete actual Host primary required');
  const at = methods[0].body.getStart(hostFile) + 1;
  const host = "import {parseRouterCoreMatches} from '../router-core-matches.mjs';" + hostSource.slice(0, at) + 'const coreMatches=parseRouterCoreMatches(this,path);if(coreMatches)return coreMatches;' + hostSource.slice(at);
  if (host.split('\n').length > 1000) fail('Host source must retain fewer than 1000 lines');
  const replace = (source, changes) => {
    let output = source;
    for (const row of changes.sort((a, b) => b.start - a.start)) output = output.slice(0, row.start) + row.after + output.slice(row.end);
    return output;
  };
  const data = replace(sourceData, [oldSource, oldHash].map((node, index) => ({start: node.getStart(dataFile), end: node.end, after: JSON.stringify(index ? hash(nextFacade) : nextFacade)})));
  const declarations = ['tokens', 'sourcePattern', 'parseStandardMatchesManual'].map(name => named(ts, ordered, name).getText(ordered));
  // Reuse the complete existing parser body and helpers. Standard ownership
  // remains in its original entry point; only this explicit owned path uses it.
  declarations[2] = once(declarations[2], 'export function parseStandardMatchesManual(', 'function parseOriginalOwnedMatchesBody(');
  const runtime = "// Generated from complete ordered-match source; prepare-core-matches-sources.mjs owns this file.\n" +
    "import {typeError,unsupported} from './vendor/meta-language/translation/diagnostics.js';\n" +
    "import {ORDERED_MATCH_PROFILE} from './extensions/ordered-matches.mjs';\n" +
    "import {createRulePipeline} from './rule-pipeline.mjs';\n" +
    "import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent,ROUTER_FORMATTING_FACADE_SHA256} from './router-core-formatting.mjs';\n" + declarations.join('\n') + '\n' + RUNTIME;
  const originalFunctions = ['codex_root_option_takes_value', 'codex_root_boolean_option'].map(name => {
    const selected = sourceItems(applicationSource).filter(item => item.term === 'fn' && item.name === name);
    if (selected.length !== 1) fail('one complete actual application function required: ' + name);
    const item = selected[0], source = applicationSource.slice(item.start, item.end), calls = rustTokens(source).filter(token => token.text === 'matches!');
    if (calls.length !== 1) fail('one actual literal matches call required: ' + name);
    const token = calls[0], after = source.slice(0, token.start) + 'crate::translation_core::' + source.slice(token.start);
    return {name, span: [item.start, item.end], source, after, sha256: hash(source)};
  });
  // This tail contains no escapes. Keep Unicode in an ordinary template so
  // native engines produce identical Rust source rather than raw tag spelling.
  const oracle = CORE_MATCHES_ORACLE_SOURCE + '\n// Complete original production functions; only the explicit macro API is adopted.\n' + originalFunctions.map(row => row.after).join('\n\n') + `

#[test]
fn complete_original_client_launch_option_predicates() {
    let values = [
        "-c",
        "--config",
        "--enable",
        "--disable",
        "-i",
        "--image",
        "-m",
        "--model",
        "--local-provider",
        "--profile",
        "-s",
        "--sandbox",
        "-a",
        "--ask-for-approval",
        "-C",
        "--cd",
        "--add-dir",
    ];
    let flags = [
        "--oss",
        "--search",
        "--full-auto",
        "--dangerously-bypass-approvals-and-sandbox",
        "--no-alt-screen",
        "-h",
        "--help",
        "-V",
        "--version",
    ];
    for value in values {
        assert!(codex_root_option_takes_value(value));
        assert!(!codex_root_boolean_option(value));
    }
    for value in flags {
        assert!(codex_root_boolean_option(value));
        assert!(!codex_root_option_takes_value(value));
    }
    for value in ["", "--missing", "😀"] {
        assert!(!codex_root_option_takes_value(value));
        assert!(!codex_root_boolean_option(value));
    }
}
`;
  const rows = [proposal('rust/src/translation_core.rs', facade, facade, nextFacade, 'Rust'),
    proposal('tools/translation/router-core-source-data.mjs', sourceData, sourceData, data),
    proposal('tools/translation/extensions/host-contracts.mjs', hostSource, hostSource, host),
    proposal('tools/translation/router-core-matches.mjs', orderedSource, runtime, runtime),
    proposal('rust/tests/translation_core_matches.rs', applicationSource, oracle, oracle, 'Rust')];
  for (const row of rows.filter(row => row.path.endsWith('.mjs'))) { native(ts, row.path, row.after); row.nativeBindings = verifyNativeCopiedSourceBindings(ts, resolve(ROOT, row.path), row.after); }
  return {schema: 'owned-matches-complete-source-preparation-v1', typescriptVersion: ts.version,
    inputs: {facade, sourceData, hostSource, orderedSource, applicationSource}, originalFunctions, files: rows, wrapper: {before: originalWrapper, after: wrapper, edits},
    oldStandardMatchesOwnershipUnchanged: true, newAcrossInvocationCache: false, semanticAuthority: false, executableAdmission: false};
}
export function prepareCurrentCoreMatchesSources({root = ROOT} = {}) {
  const original = JSON.parse(gunzipSync(readFileSync(resolve(root, FIXTURE)), {maxOutputLength: 2_000_000}));
  if (original.schema !== 'owned-matches-complete-original-inputs-v1' || readFileSync(resolve(root, 'tools/translation/extensions/ordered-matches.mjs'), 'utf8') !== original.inputs.orderedSource) fail('complete original parser source fixture is stale');
  if (original.inputs.applicationSource !== original.production.application.source || hash(original.inputs.applicationSource) !== original.production.application.sha256 || readFileSync(resolve(root, original.production.application.path), 'utf8') !== original.inputs.applicationSource) fail('complete actual application function source is stale');
  const result = prepareCoreMatchesSources(original.inputs);
  for (const row of result.files) { try { row.current = readFileSync(resolve(root, row.path), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; row.current = null; } }
  return result;
}
// An explicit later layer keeps the original vector producer/API and its
// complete birth equation intact. Consumers compare this composed result to
// current files instead of silently omitting overlapping output checks.
export function composeCurrentCoreMatchesSources(prior, {root = ROOT} = {}) {
  const result = prepareCurrentCoreMatchesSources({root}), sources = {...prior};
  for (const row of result.files) {
    if (Object.hasOwn(prior, row.path) && prior[row.path].after !== row.before) fail('original vector output differs from complete matches layer input: ' + row.path);
    sources[row.path] = {...row};
  }
  return {sources, layers: [result], historicalSources: prior};
}
// Preserve the complete original matches birth. The installed Host additionally
// includes the explicit original-primitive identity boundary source layer.
export function prepareCurrentCoreMatchesComposition(options = {}) {
  const birth = prepareCurrentCoreMatchesSources(options);
  const boundary = composePrimitiveIdentityBoundary(Object.fromEntries(birth.files.map(row => [row.path, row])), options);
  const ascii = composeCoreAscii(boundary.sources, options);
  return {schema: 'current-owned-matches-source-composition-v1', birth, layers: [birth, ...boundary.layers, ...ascii.layers], files: Object.values(ascii.sources), semanticAuthority: false};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); if (args.length !== 1 || !['--write', '--check', '--emit'].includes(args[0])) fail('usage: --write|--check|--emit');
  const result = prepareCurrentCoreMatchesComposition();
  if (args[0] === '--emit') console.log(JSON.stringify(result));
  else if (args[0] === '--write') {
    for (const row of result.files) if (!result.layers.flatMap(layer => layer.files.filter(part => part.path === row.path).flatMap(part => [part.before,part.after])).includes(row.current) || readFileSync(resolve(ROOT,row.path),'utf8') !== row.current) fail('complete current source differs from actual composed equations');
    for (const row of result.files) writeFileSync(resolve(ROOT, row.path), row.after);
  }
  else { if (result.files.some(row => row.current !== row.after)) fail('generated source is stale'); console.log('Owned matches sources are current.'); }
}
