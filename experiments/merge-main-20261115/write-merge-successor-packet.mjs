// Write tools/translation/source-profiles/merge-main-20261115/equations.json:
// one complete successor row per forward-output compiler source whose current bytes
// differ from its pinned afterimage (20261101 chronology, or 20261104 producer row).
// Prints the packet SHA-256 for tools/translation/merge-main-20261115-source-history.mjs.
// Usage: node experiments/merge-main-20261115/write-merge-successor-packet.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
const read = path => readFileSync(path, 'utf8');
const MERGE = '4f812e5ea'; // Merge origin/main (v1.25.0) into issue-772-translator-throughput
const atFirstParent = path => { try { return execFileSync('git', ['show', `${MERGE}^1:${path}`], {encoding: 'utf8', maxBuffer: 1 << 26}); } catch { return null; } };
const chronology = JSON.parse(read('tools/translation/source-profiles/forward-output-ownership-20261101/complete-source-equations.json'));
const producer = JSON.parse(read('tools/translation/source-profiles/physical-language-output-adoption-20261104/equations.json'));
const producerAfter = new Map(producer.rows.slice(0, 2).map(row => [row.path, row.after]));
// These two keep their own protected flat-writer successor and are not part of this cohort.
const PROTECTED = new Set(['tools/translation/forward-output-ownership-20261101-flat-source-install.mjs', 'tools/translation/forward-output-ownership-20261101-source-history.mjs']);
const rows = [];
for (const item of chronology.files) {
  if (PROTECTED.has(item.path)) continue;
  const before = producerAfter.get(item.path) ?? item.after;
  const after = read(item.path);
  if (after === before) continue;
  const reason = atFirstParent(item.path) === before
    ? 'merge of main v1.25.0 (4f812e5ea) and its JavaScript-first repairs'
    : 'branch drift already present before the 4f812e5ea merge, carried through it';
  rows.push({path: item.path, reason, before, after, inverse: before, beforeSha256: hash(before), afterSha256: hash(after)});
}
const packet = JSON.stringify({schema: 'router-merge-main-compiler-source-successors-20261115-v1', sourceAuthority: false, semanticAuthority: false, rows}, null, 1) + '\n';
writeFileSync('tools/translation/source-profiles/merge-main-20261115/equations.json', packet);
console.log(JSON.stringify({rows: rows.length, bytes: Buffer.byteLength(packet), sha256: hash(packet)}));
