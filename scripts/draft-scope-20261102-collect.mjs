// DEFERRED native parser/CST invocation. Do not run during source-only drafting.
import {execFileSync} from 'node:child_process';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readSelectedGitSizeRecords} from '../tools/translation/selected-git-size-records.mjs';
import {collectDraftScopeRustObservations} from '../tools/translation/draft-scope-20261102-collector.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function collectCommittedDraftScopeRust({revision, run = (args, options) =>
  execFileSync('git', args, {cwd: root, maxBuffer: 40 * 1024 * 1024, ...options})} = {}) {
  if (typeof revision !== 'string' || !/^[a-f0-9]{40}$/u.test(revision)) throw new TypeError('Draft collector requires one immutable full SHA');
  const rows = readSelectedGitSizeRecords({run, revision,
    select: path => path.startsWith('rust/') && path.endsWith('.rs'),
    maxPaths: 2048, maxFileBytes: 8 * 1024 * 1024, maxTotalBytes: 32 * 1024 * 1024});
  const files = rows.map(row => {
    const tab = row.indexOf('\t'), [mode, , blob, bytes] = row.slice(0, tab).split(' '), path = row.slice(tab + 1);
    const original = run(['cat-file', 'blob', blob]);
    const source = original.toString('utf8');
    if (original.length !== Number(bytes) || !Buffer.from(source).equals(original)) throw new TypeError('Complete original Rust UTF-8 source differs');
    return {source, origin: {revision, path, mode, blob, bytes: Number(bytes)}};
  });
  return {scope: 'complete committed rust/**/*.rs physical selection; all cfg/producer/dependency units remain unresolved',
    revision, observations: collectDraftScopeRustObservations({files})};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new TypeError('Use one immutable full commit SHA');
  console.log(JSON.stringify(collectCommittedDraftScopeRust({revision: process.argv[2]}), null, 2));
  // The original complete production-function denominator is still UNKNOWN.
  process.exitCode = 2;
}
