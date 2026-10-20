// Explicit source adoption. It neither resolves standard macro implementation
// internals nor grants the edited caller semantic/executable admission.
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
import {captureCoreMacroAdoptionBinding} from './migrate-core-formatting.mjs';
import {macroAdoptionFunctionBarriers} from './macro-adoption-function-boundary.mjs';
import {itemConfiguration, PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {transportConcreteSyntaxSource, transportConcreteSyntaxMeta, applyConcreteSyntaxSubstitutions, serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
const hash = text => createHash('sha256').update(text).digest('hex');
const fail = message => { throw new TypeError('Owned vector adoption: ' + message); };
const identifiers = token => token?.type === 'ident' && /^[A-Za-z_][A-Za-z0-9_]*!?$/u.test(token.text);
export function migrateCoreVectors(source, {rootSource = '', macroUseSources = {}, compilationProfile = PRODUCTION_PROFILE} = {}) {
  const scope = captureCoreMacroAdoptionBinding(source, {rootSource, macroUseSources, macroName: 'vec'});
  const before = transportConcreteSyntaxSource(source, {language: 'Rust'}), edits = [], functions = [], skipped = [];
  const declarations = sourceItems(source);
  for (const item of declarations) {
    if (item.term === 'opaque' && item.tokens.some(token => token.text === '!' || token.text.endsWith('!'))) fail('unresolved module-level macro producer');
  }
  for (const item of declarations) {
    if (item.term !== 'fn') continue;
    const tokens = item.tokens.filter(token => !['comment', 'string', 'char'].includes(token.type));
    const candidates = tokens.map((token, at) => ({token, at})).filter(({token, at}) =>
      (token.text === 'vec!' || token.text === 'vec' && tokens[at + 1]?.text === '!') && !['::', '.', '#'].includes(tokens[at - 1]?.text));
    if (!candidates.length) continue;
    const condition = itemConfiguration(item.tokens, compilationProfile);
    if (condition.status !== 'active') { skipped.push({name: item.name, reason: 'function compilation condition is not active', span: [item.start, item.end]}); continue; }
    // An unknown expression/statement macro or local item can emit a competing
    // textual macro in this function. Keep the complete original function.
    const fn = tokens.findIndex(token => token.text === 'fn');
    let open = -1, parameters = 0;
    for (let at = fn + 2; at < tokens.length; at++) {
      if (tokens[at].text === '(') parameters++; if (tokens[at].text === ')') parameters--;
      if (!parameters && tokens[at].text === '{') { open = at; break; }
    }
    const uncertain = tokens.slice(open + 1).some((token, index, body) =>
      ['#', 'use', 'extern', 'fn', 'mod', 'struct', 'enum', 'union', 'trait', 'impl', 'type', 'macro_rules!', 'macro'].includes(token.text) ||
      token.text !== '!' && token.text.endsWith('!') && token.text !== 'vec!' ||
      token.text === '!' && identifiers(body[index - 1]) && body[index - 1].text !== 'vec' && ['(', '[', '{'].includes(body[index + 1]?.text));
    if (open < 0 || uncertain || macroAdoptionFunctionBarriers(tokens, open, 'vec').length) { skipped.push({name: item.name, reason: 'local item or other macro producer requires original owner closure', span: [item.start, item.end]}); continue; }
    const selected = candidates.map(({token, at}) => {
      // Preserve every byte of whitespace/comments between name and bang.
      return {span: [token.start, token.end], expected: source.slice(token.start, token.end), replacement: 'crate::translation_core::' + token.text};
    });
    edits.push(...selected); functions.push({name: item.name, span: [item.start, item.end], macroCalls: selected.length});
  }
  edits.sort((a, b) => a.span[0] - b.span[0]);
  const applied = applyConcreteSyntaxSubstitutions(before.document, {
    languageRules: [{id: 'vector-adoption:retain-complete-expression-source', edits: []}],
    repositoryRules: [{id: 'router-core:adopt-owned-vector-comma-list', edits}],
  });
  const after = transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value)), mapping = [];
  let old = 0, current = 0;
  for (const edit of edits) {
    if (old < edit.span[0]) { const length = edit.span[0] - old; mapping.push({kind: 'unchanged', before: [old, edit.span[0]], after: [current, current + length]}); current += length; }
    mapping.push({kind: 'substitution', before: edit.span, after: [current, current + edit.replacement.length], expected: edit.expected, replacement: edit.replacement});
    old = edit.span[1]; current += edit.replacement.length;
  }
  if (old < source.length) mapping.push({kind: 'unchanged', before: [old, source.length], after: [current, current + source.length - old]});
  const inverse = applyConcreteSyntaxSubstitutions(applied.value, {languageRules: [], repositoryRules: [{id: 'router-core:restore-original-vector-source', edits: [{span: [0, after.source.length], expected: after.source, replacement: source}]}]});
  if (transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source !== source) fail('complete source inverse differs');
  return {schema: 'owned-vector-source-adoption-v1', before: {source, meta: before.meta, sha256: hash(source)},
    after: {source: after.source, meta: after.meta, sha256: hash(after.source)}, inverse: source, rootSource, scope,
    functions, skipped, edits, mapping, trace: applied.trace, executableAdmission: false,
    migrationSemantics: 'explicit-owned-API-adoption; original standard vec ownership/implementation is not an executable verdict',
    libraryImplementation: 'untranslated-rust-std-vec'};
}
