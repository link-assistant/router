// Independent source/count transport checks. No type or executable authority.
import {createHash} from 'node:crypto';
import {sourceItems, rustTokens} from './rust-structure.mjs';
const fail = message => { throw new TypeError('Vector proposal DATA: ' + message); };
export function inspectVectorProposalData(row) {
  if (row?.schema !== 'owned-vector-source-adoption-v1' || row.executableAdmission !== false || row.libraryImplementation !== 'untranslated-rust-std-vec' ||
      typeof row.before?.source !== 'string' || typeof row.after?.source !== 'string' || !Array.isArray(row.functions) || !Array.isArray(row.edits)) fail('distinct complete vector source proposal required');
  const hash = value => createHash('sha256').update(value).digest('hex');
  const source = row.before.source;
  if (row.before.sha256 !== hash(source) || row.after.sha256 !== hash(row.after.source) || row.inverse !== source) fail('complete source hash/inverse differs');
  const originals = sourceItems(source).filter(item => item.term === 'fn'), tokens = rustTokens(source).filter(token => token.type !== 'comment'), selected = new Set();
  let calls = 0;
  for (const fn of row.functions) {
    if (!Array.isArray(fn.span) || fn.span.length !== 2 || !Number.isSafeInteger(fn.span[0]) || !Number.isSafeInteger(fn.span[1])) fail('complete original function coordinates required');
    const matches = originals.filter(item => item.name === fn.name && item.start === fn.span[0] && item.end === fn.span[1]), identity = JSON.stringify([fn.name, fn.span]);
    if (matches.length !== 1 || selected.has(identity)) fail('ambiguous or duplicate original function selection'); selected.add(identity);
    const edits = row.edits.filter(edit => edit.span?.[0] >= fn.span[0] && edit.span?.[1] <= fn.span[1]);
    if (!edits.length || fn.macroCalls !== edits.length) fail('distinct function macro/edit census differs'); calls += edits.length;
  }
  if (calls !== row.edits.length) fail('edits do not partition selected original functions');
  let end = 0;
  for (const edit of row.edits) {
    if (!Array.isArray(edit.span) || edit.span.length !== 2 || !Number.isSafeInteger(edit.span[0]) || !Number.isSafeInteger(edit.span[1]) || edit.span[0] < end || edit.span[1] > source.length ||
        !['vec', 'vec!'].includes(edit.expected) || source.slice(...edit.span) !== edit.expected || edit.replacement !== 'crate::translation_core::' + edit.expected) fail('only original bare vector API tokens may change');
    const at = tokens.findIndex(token => token.start === edit.span[0] && token.end === edit.span[1] && token.text === edit.expected);
    if (at < 0 || ['::', '.', '#'].includes(tokens[at - 1]?.text) || edit.expected === 'vec' && tokens[at + 1]?.text !== '!') fail('actual original bare macro token association differs'); end = edit.span[1];
  }
  let rebuilt = source;
  for (const edit of [...row.edits].reverse()) rebuilt = rebuilt.slice(0, edit.span[0]) + edit.replacement + rebuilt.slice(edit.span[1]);
  if (rebuilt !== row.after.source) fail('complete after source contains a change outside original vector API tokens');
  return {distinctFunctions: selected.size, macroCalls: calls, semanticAdmission: false};
}
