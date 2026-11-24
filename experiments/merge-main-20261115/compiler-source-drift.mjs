// Report which pinned forward-output compiler sources no longer match their pinned
// (or successor) afterimage. Read-only; prints one line per drifting row.
// Usage: node experiments/merge-main-20261115/compiler-source-drift.mjs [--git-ref REF]
import {readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createReconcileSourceCapture} from '../../tools/translation/paired-sync-reconcile-20261101-support.mjs';
import {captureProtectedFlatWriterSourceSuccessor} from '../../tools/translation/protected-flat-writer-20261102-history.mjs';

const profile = JSON.parse(readFileSync('tools/translation/source-profiles/forward-output-ownership-20261101/complete-source-equations.json', 'utf8'));
const captured = createReconcileSourceCapture(process.cwd());
const ref = process.argv.includes('--git-ref') ? process.argv[process.argv.indexOf('--git-ref') + 1] : null;
const atRef = path => { try { return execFileSync('git', ['show', `${ref}:${path}`], {encoding: 'utf8', maxBuffer: 1 << 26}); } catch { return null; } };
let drift = 0;
try {
  for (const item of [...profile.files, ...profile.preparerCaseSources]) {
    let expected = item.after, note = '';
    try { const successor = captureProtectedFlatWriterSourceSuccessor(captured.capture, item.path, item.after); if (successor) { expected = successor.after; note = ' (successor)'; } }
    catch (error) { note = ' successor-error: ' + error.message; }
    const now = existsSync(item.path) ? readFileSync(item.path, 'utf8') : null;
    const original = existsSync(item.originalPath) ? readFileSync(item.originalPath, 'utf8') : null;
    const isFile = profile.files.includes(item);
    const ok = now === expected || (item.optionalGeneratedTarget && (now === null || now === item.before));
    const originalOk = original === item.before;
    if (ok && originalOk && !note.includes('error')) continue;
    drift++;
    const prior = ref ? atRef(item.path) : undefined;
    console.log(JSON.stringify({path: item.path, file: isFile, current: ok ? 'ok' : now === item.after ? 'pinned-after' : now === null ? 'missing' : 'other', originalOk, note: note.trim(), refMatchesExpected: ref ? prior === expected : undefined}));
  }
} finally { captured.close(); }
console.log(`${drift} drifting rows`);
