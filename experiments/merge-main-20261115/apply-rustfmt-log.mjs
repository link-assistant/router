// Apply the `cargo fmt --check` diff printed in a downloaded GitHub Actions log.
// Rust tools must not run locally for this task, so rustfmt's own reported diff is
// replayed exactly. Every hunk's context and removed lines must match the file at the
// reported line, or the whole run fails. Nothing is written when there are mismatches.
// Usage: node apply-rustfmt-log.mjs [--dry] <log> <repository-root>
import {readFileSync, writeFileSync} from 'node:fs';
import {join, normalize} from 'node:path';

const dry = process.argv.includes('--dry');
const [log, root] = process.argv.slice(2).filter(arg => arg !== '--dry');
const STAMP = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d+Z /u;
const HEADER = /^Diff in \/home\/runner\/work\/router\/router\/(.+):(\d+):$/u;

const hunks = new Map(); // file -> [{line, old, next}]
let current = null;
for (const raw of readFileSync(log, 'utf8').split('\n')) {
  const line = raw.replace(STAMP, '').replace(/\r$/u, '');
  const header = HEADER.exec(line);
  if (header) {
    // One source can be reported through several paths, e.g. rust/tests/../src.
    const file = normalize(header[1]);
    current = {line: Number(header[2]), old: [], next: []};
    if (!hunks.has(file)) hunks.set(file, []);
    hunks.get(file).push(current);
    continue;
  }
  if (!current) continue;
  const mark = line[0], text = line.slice(1);
  if (mark === ' ') { current.old.push(text); current.next.push(text); }
  else if (mark === '-') current.old.push(text);
  else if (mark === '+') current.next.push(text);
  else if (line === '') { current.old.push(''); current.next.push(''); } // context blank line without its leading space
  else current = null;
}

let failures = 0, applied = 0;
const outputs = new Map();
for (const [file, list] of hunks) {
  const original = readFileSync(join(root, file), 'utf8');
  const lines = original.split('\n');
  // Trailing blank lines at a section end belong to the log, not the hunk.
  for (const hunk of list) while (hunk.old.length && hunk.old.at(-1) === '' && hunk.next.at(-1) === '' && lines[hunk.line - 1 + hunk.old.length - 1] !== '') { hunk.old.pop(); hunk.next.pop(); }
  const seen = new Set();
  const unique = list.filter(hunk => { const key = JSON.stringify([hunk.line, hunk.old, hunk.next]); if (seen.has(key)) return false; seen.add(key); return true; });
  for (const hunk of unique.sort((a, b) => b.line - a.line)) {
    const start = hunk.line - 1;
    const actual = lines.slice(start, start + hunk.old.length);
    // GitHub masks secret-like text as `***` in logs. Recover each masked value from
    // the file (old lines) and put it back, in order, into the reformatted lines.
    const masked = [];
    const matches = (text, index) => {
      const expected = hunk.old[index];
      if (text === expected) return true;
      if (!expected.includes('***')) return false;
      const pattern = new RegExp('^' + expected.split('***').map(part => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('(.+?)') + '$', 'u');
      const found = pattern.exec(text);
      if (!found) return false;
      masked.push(...found.slice(1));
      return true;
    };
    if (actual.length === hunk.old.length && actual.every(matches) && masked.length) {
      const recovered = [...masked];
      hunk.next = hunk.next.map(text => text.replace(/\*\*\*/gu, () => recovered.shift() ?? '***'));
      if (recovered.length) { failures++; console.error(`masked value count differs ${file}:${hunk.line}`); continue; }
      hunk.old = actual;
    }
    if (actual.length !== hunk.old.length || actual.some((text, index) => text !== hunk.old[index])) {
      failures++;
      console.error(`mismatch ${file}:${hunk.line}`);
      continue;
    }
    lines.splice(start, hunk.old.length, ...hunk.next);
    applied++;
  }
  outputs.set(file, lines.join('\n'));
}
console.log(`${hunks.size} files, ${applied} hunks applied, ${failures} mismatches`);
if (failures) process.exit(1);
if (!dry) for (const [file, text] of outputs) writeFileSync(join(root, file), text);
