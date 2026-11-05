// Deferred native parser/CST/source-checker invocation. Source draft only.
import {execFileSync} from 'node:child_process';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readSelectedGitSizeRecords} from '../tools/translation/selected-git-size-records.mjs';
import {collectDraftScopeTargetObservations} from '../tools/translation/draft-scope-20261102-target-collector.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function collectCommittedDraftScopeTargets({revision, run = (args, options) =>
  execFileSync('git', args, {cwd: root, maxBuffer: 40 * 1024 * 1024, ...options})} = {}) {
  if (typeof revision !== 'string' || !/^[a-f0-9]{40}$/u.test(revision)) throw new TypeError('Target collector requires an immutable full SHA');
  const rows = readSelectedGitSizeRecords({run, revision,
    select: path => (path.startsWith('js/') || path.startsWith('ts/')) && /\.(?:[cm]?[jt]s|[jt]sx)$/u.test(path),
    maxPaths: 4096, maxFileBytes: 8 * 1024 * 1024, maxTotalBytes: 32 * 1024 * 1024});
  const files = rows.map(row => {
    const tab = row.indexOf('\t'), [mode, , blob, bytes] = row.slice(0, tab).split(' '), path = row.slice(tab + 1);
    const original = run(['cat-file', 'blob', blob]), source = original.toString('utf8');
    if (original.length !== Number(bytes) || !Buffer.from(source).equals(original)) throw new TypeError('Complete original target UTF-8 differs');
    return {source, origin: {revision, path, mode, blob, bytes: Number(bytes)}};
  });
  return {revision, scope: 'complete committed js/ts physical source selection; production roles and export/producer closure unresolved',
    observations: collectDraftScopeTargetObservations({files})};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new TypeError('Use one immutable full commit SHA');
  console.log(JSON.stringify(collectCommittedDraftScopeTargets({revision: process.argv[2]}), null, 2));
  process.exitCode = 2;
}
