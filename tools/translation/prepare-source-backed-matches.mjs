// Complete actual vector corpus machinery, specialized by native AST/CST.
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource, transportConcreteSyntaxMeta, serializeConcreteSyntaxMeta, applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TEMPLATE = 'tools/translation/source-backed-core-vectors.mjs', OUTPUT = 'tools/translation/source-backed-core-matches.mjs';
const FORMAT = 'tools/translation/migrate-core-formatting.mjs', BARRIER = 'tools/translation/macro-adoption-function-boundary.mjs';
const fail = message => { throw new TypeError('Source-backed matches preparation: ' + message); };
function native(ts, path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (file.parseDiagnostics.length) fail('complete native syntax differs: ' + path);
  return file;
}
function named(ts, file, name) {
  const rows = file.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name ||
    ts.isVariableStatement(node) && node.declarationList.declarations.some(row => ts.isIdentifier(row.name) && row.name.text === name));
  if (rows.length !== 1) fail('one complete actual declaration required: ' + name);
  return rows[0].getText(file);
}
function once(source, before, after) {
  if (source.split(before).length !== 2) fail('one actual native anchor required: ' + before);
  return source.replace(before, () => after);
}
// Positive source grammar only: it selects edits, never semantic admission.
// Delimiters and complete original literal tokens remain in the source/CST.
const LITERAL_INPUT = String.raw`
function literalMatchesFunctionHeader(tokens) {
  const fn = tokens.findIndex(token => token.text === 'fn');
  if (fn < 0 || tokens.slice(0, fn).some(token => ['async', 'unsafe', 'const', 'extern'].includes(token.text)) || tokens[fn + 2]?.text !== '(') return false;
  const scalar = new Set(['bool', 'i8', 'u8', 'i16', 'u16', 'i32', 'u32', 'i64', 'u64', 'i128', 'u128']);
  let at = fn + 3;
  while (tokens[at]?.text !== ')') {
    if (tokens[at]?.type !== 'ident' || tokens[at + 1]?.text !== ':') return false;
    at += 2;
    if (scalar.has(tokens[at]?.text)) at++;
    else {
      const borrowed = ['&', 'crate', '::', 'translation_core', '::', 'Str'];
      if (!borrowed.every((word, index) => tokens[at + index]?.text === word)) return false;
      at += borrowed.length;
    }
    if (tokens[at]?.text !== ')') { if (tokens[at++]?.text !== ',') return false; }
    if (at >= tokens.length) return false;
  }
  return tokens[at + 1]?.text === '->' && tokens[at + 2]?.text === 'bool' && tokens[at + 3]?.text === '{';
}
function literalMatchesInput(tokens, at) {
  const open = at + (tokens[at].text === 'matches!' ? 1 : 2), pairs = {'(': ')', '[': ']', '{': '}'};
  if (!Object.hasOwn(pairs, tokens[open]?.text)) return false;
  const stack = [pairs[tokens[open].text]]; let comma = -1, end = -1;
  for (let index = open + 1; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type === 'string' || token.type === 'char') continue;
    if (Object.hasOwn(pairs, token.text)) stack.push(pairs[token.text]);
    else if ([')', ']', '}'].includes(token.text)) { if (stack.pop() !== token.text) return false; if (!stack.length) { end = index; break; } }
    else if (token.text === ',' && stack.length === 1 && comma < 0) comma = index;
  }
  if (comma <= open + 1 || end < 0) return false;
  let index = comma + 1, alternatives = 0;
  if (tokens[index]?.text === '|') index++;
  while (index < end) {
    const negative = tokens[index]?.text === '-'; if (negative) index++;
    const token = tokens[index++];
    if (!token || negative && token.type !== 'number' || !(token.type === 'string' || token.type === 'number' && /^[0-9][0-9_A-Za-z]*$/u.test(token.text) || ['true', 'false'].includes(token.text))) return false;
    if (++alternatives > 256) return false;
    if (index === end || tokens[index]?.text === ',' && index + 1 === end) return true;
    if (tokens[index++]?.text !== '|') return false;
  }
  return false;
}
`;
export function prepareSourceBackedMatches({root = ROOT} = {}) {
  const inputs = [TEMPLATE, FORMAT, BARRIER].map(path => ({path, source: readFileSync(resolve(root, path), 'utf8')}));
  const ts = ownershipCompiler(); if (ts.version !== '5.9.3') fail('installed native TypeScript 5.9.3 required');
  const [template, formatter, barriers] = inputs.map(row => native(ts, row.path, row.source));
  const changes = [], names = new Map([
    ['migrateOriginalProducerVectors', 'migrateOriginalProducerMatches'], ['proposeSourceBackedCoreVectorCorpus', 'proposeSourceBackedCoreMatchesCorpus'],
    ['captureCoreMacroAdoptionBinding', 'captureOwnedMatchesAdoptionBinding'], ['macroAdoptionFunctionBarriers', 'ownedMatchesFunctionBarriers'],
  ]), literals = new Map([
    ['vec', 'matches'], ['vec!', 'matches!'], ['owned-vector-source-adoption-v1', 'owned-literal-matches-source-adoption-v1'],
    ['router-owned-source-backed-vector-corpus-proposal-v1', 'router-owned-source-backed-matches-corpus-proposal-v1'],
    ['untranslated-rust-std-vec', 'untranslated-rust-std-matches'],
    ['vector-adoption:retain-complete-expression-source', 'matches-adoption:retain-complete-expression-source'],
    ['router-core:adopt-owned-vector-comma-list', 'router-core:adopt-owned-literal-matches'],
    ['router-core:restore-original-vector-source', 'router-core:restore-original-literal-matches-source'],
    ['no bare vec macro in the supported top-level function domain', 'no bare matches macro in the supported top-level function domain'],
    ['explicit-owned-API-adoption; original standard vec ownership/implementation is not an executable verdict', 'explicit-owned-API-adoption; original standard matches ownership/implementation is not an executable verdict'],
  ]);
  function visit(node) {
    let after;
    if (ts.isIdentifier(node) && names.has(node.text)) after = names.get(node.text);
    else if (ts.isStringLiteral(node) && literals.has(node.text)) after = JSON.stringify(literals.get(node.text));
    if (after !== undefined) changes.push({start: node.getStart(template), end: node.end, after});
    else ts.forEachChild(node, visit);
  }
  for (const node of template.statements) {
    if (ts.isImportDeclaration(node) && ['./migrate-core-formatting.mjs', './macro-adoption-function-boundary.mjs'].includes(node.moduleSpecifier.text)) changes.push({start: node.getStart(template), end: node.end, after: ''});
    else visit(node);
  }
  let language = inputs[0].source;
  for (const row of changes.sort((a, b) => b.start - a.start)) language = language.slice(0, row.start) + row.after + language.slice(row.end);
  language = once(language, "!['comment', 'string', 'char'].includes(token.type)", "token.type !== 'comment'");
  language = once(language, 'if (!candidates.length) continue;', "if (!candidates.length) continue;\n    if (!literalMatchesFunctionHeader(tokens) || candidates.some(({at}) => !literalMatchesInput(tokens, at))) { skipped.push({name: item.name, reason: 'requires a scalar-input boolean function and literal scalar patterns at every selected call', span: [item.start, item.end]}); continue; }");
  const shared = ['attributeNames', 'attributes', 'sourceMap', 'binding'].map(name => named(ts, formatter, name));
  let capture = named(ts, formatter, 'captureCoreMacroAdoptionBinding');
  capture = once(capture, 'export function captureCoreMacroAdoptionBinding(', 'function captureOwnedMatchesAdoptionBinding(');
  capture = once(capture, "!['format','vec'].includes(macroName)", "macroName !== 'matches'");
  let boundary = named(ts, barriers, 'macroAdoptionFunctionBarriers');
  boundary = once(boundary, 'export function macroAdoptionFunctionBarriers(', 'function ownedMatchesFunctionBarriers(');
  boundary = once(boundary, "!['format', 'vec'].includes(family)", "family !== 'matches'");
  language += '\n' + shared.join('\n') + '\n' + capture + '\n' + boundary + '\n' + LITERAL_INPUT;
  const after = once(language, 'export function proposeSourceBackedCoreMatchesCorpus(', 'export function proposeSourceBackedCoreLiteralMatchesCorpus(');
  native(ts, OUTPUT, after); const nativeBindings = verifyNativeCopiedSourceBindings(ts, resolve(root, OUTPUT), after);
  const original = inputs.map(row => row.source).join('\n'), before = transportConcreteSyntaxSource(original, {language: 'JavaScript'});
  const rule = (a, b, id) => ({id, edits: [{span: [0, a.length], expected: a, replacement: b}]});
  const run = applyConcreteSyntaxSubstitutions(before.document, {languageRules: [rule(original, language, 'javascript:copy-complete-original-corpus-binding-and-barrier-sources')], repositoryRules: [rule(language, after, 'router:name-explicit-literal-matches-corpus-API')]}), afterMeta = serializeConcreteSyntaxMeta(run.value), output = transportConcreteSyntaxMeta(afterMeta);
  const inverse = applyConcreteSyntaxSubstitutions(output.document, {languageRules: [rule(after, original, 'javascript:restore-complete-original-vector-formatting-barrier-sources')], repositoryRules: []});
  if (output.source !== after || transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source !== original) fail('whole source inverse differs');
  let current = null; try { current = readFileSync(resolve(root, OUTPUT), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return {schema: 'source-backed-literal-matches-preparation-v1', typescriptVersion: ts.version, inputs,
    files: [{path: OUTPUT, current, original, language, after, beforeMeta: before.meta, afterMeta, inverse: original, nativeBindings, trace: run.trace}],
    originalPublicAPIsUnchanged: true, newAcrossInvocationCache: false, semanticAuthority: false, executableAdmission: false};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); if (args.length !== 1 || !['--emit', '--write', '--check'].includes(args[0])) fail('usage: --emit|--write|--check');
  const result = prepareSourceBackedMatches();
  if (args[0] === '--emit') console.log(JSON.stringify(result));
  else if (args[0] === '--write') { for (const row of result.files) writeFileSync(resolve(ROOT, row.path), row.after); }
  else { if (result.files.some(row => row.current !== row.after)) fail('generated matches corpus is stale'); console.log('Source-backed matches corpus is current.'); }
}
