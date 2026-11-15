// Fixed complete compiler-source successors appended by the 2026-11-15 merge of
// `main` (v1.25.0) and the JavaScript-first repairs that followed it. DATA only:
// every row joins one exact earlier afterimage to the exact reviewed current
// source, with a full CST equation and inverse. No source or verdict is cached.
import {createHash} from 'node:crypto';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';

export const MERGE_MAIN_20261115_PACKET = 'tools/translation/source-profiles/merge-main-20261115/equations.json';
const SHA = '7198ce3d30f7f278e51cc429d77de396fd41747cad161394bad44b69cbc69171';
const SCHEMA = 'router-merge-main-compiler-source-successors-20261115-v1';
const hash = value => createHash('sha256').update(value).digest('hex');
const need = (value, message) => { if (!value) throw TypeError('Merge main 20261115 source successor: ' + message); };

function readRows(capture) {
  need(typeof capture === 'function', 'original source capture required');
  const raw = capture(MERGE_MAIN_20261115_PACKET).source;
  need(typeof raw === 'string' && Buffer.byteLength(raw) <= 1048576 && hash(raw) === SHA, 'fixed complete source packet differs');
  const data = JSON.parse(raw);
  need(data.schema === SCHEMA && data.sourceAuthority === false && data.semanticAuthority === false && Array.isArray(data.rows) && data.rows.length >= 1 && data.rows.length <= 32, 'closed merge successor cohort required');
  const paths = new Set();
  for (const row of data.rows) {
    need(row && typeof row.path === 'string' && !paths.has(row.path) && typeof row.before === 'string' && typeof row.after === 'string' && row.before !== row.after && row.inverse === row.before && hash(row.before) === row.beforeSha256 && hash(row.after) === row.afterSha256 && typeof row.reason === 'string', 'complete ordered source equation required: ' + row?.path);
    paths.add(row.path);
  }
  return data.rows;
}

function equation(row) {
  const history = transportConcreteSourceEquations([{before: row.before, after: row.after, language: 'JavaScript'}])[0];
  need(history.inverse === row.before && transportConcreteSyntaxMeta(history.beforeMeta).source === row.before && transportConcreteSyntaxMeta(history.afterMeta).source === row.after, 'whole source/CST inverse differs: ' + row.path);
  return {id: 'merge-main-20261115', path: row.path, before: row.before, after: row.after, inverse: row.before, reason: row.reason, equation: history, sourceAuthority: false, semanticAuthority: false, verification: 'UNRUN'};
}

// Returns null outside the fixed cohort, or when the current source still equals
// the earlier afterimage. Otherwise the earlier afterimage must join exactly and
// the actual current source must be the complete reviewed successor.
export function captureMergeMainSourceSuccessor20261115(capture, path, before) {
  need(typeof before === 'string', 'complete earlier afterimage required');
  const row = readRows(capture).find(item => item.path === path);
  if (!row) return null;
  const current = capture(path).source;
  if (current === before) return null;
  need(row.before === before, 'earlier afterimage must join exactly: ' + path);
  need(current === row.after, 'actual source is not its complete merge successor: ' + path);
  return equation(row);
}

// Compose an optional earlier successor with the merge successor of its afterimage.
export function composeMergeMainSourceSuccessor20261115(capture, path, before, earlier) {
  const start = earlier?.after ?? before;
  const merged = captureMergeMainSourceSuccessor20261115(capture, path, start);
  if (!merged) return earlier ?? null;
  if (!earlier) return merged;
  return {...earlier, after: merged.after, historicalAfter: earlier.after, laterHistories: [...(earlier.laterHistories ?? []), merged]};
}
