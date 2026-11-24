// Insert crate-root `#![allow(clippy::<lint>)]` lines into drafted integration
// test targets (rust/tests/<target>.rs), one per lint CI Clippy reported in
// that crate: in the root file itself or in any file it pulls in through
// `#[path = "..."]` or `include!("...")` (followed recursively). Included
// fixtures and cores stay byte-identical; only crate roots are edited, after
// their leading `//!` docs and inner attributes, so no item bytes change.
// Usage: node allow-drafted-test-lints.mjs [--dry] <file-lints.tsv> <targets.txt> <repo-root>
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';

const dry = process.argv.includes('--dry');
const [tsv, targetList, root] = process.argv.slice(2).filter(arg => arg !== '--dry');
const fileLints = new Map();
for (const row of readFileSync(tsv, 'utf8').split('\n')) {
  const [file, lint] = row.split('\t');
  if (!file || !/^[a-z_]+$/u.test(lint ?? '')) continue;
  const key = relative(root, resolve(root, file));
  if (!fileLints.has(key)) fileLints.set(key, new Set());
  fileLints.get(key).add(lint);
}
const targets = readFileSync(targetList, 'utf8').split('\n').filter(Boolean).map(line => line.split('\t')[1]);

function closure(file, seen = new Set()) {
  if (seen.has(file) || !existsSync(join(root, file))) return seen;
  seen.add(file);
  const text = readFileSync(join(root, file), 'utf8');
  for (const match of text.matchAll(/#\[path\s*=\s*"([^"]+)"\]|include!\(\s*"([^"]+)"\s*\)/gu)) {
    closure(relative(root, resolve(root, dirname(file), match[1] ?? match[2])), seen);
  }
  return seen;
}

const NOTE = '// Drafted translation oracle: these shapes mirror the JavaScript source the\n// translator read. Clippy findings are fixed in its rules, not by hand (#772 ledger).';
const claimed = new Set();
let total = 0;
for (const target of targets) {
  const file = `rust/tests/${target}.rs`;
  const files = closure(file);
  const set = new Set();
  for (const member of files) for (const lint of fileLints.get(member) ?? []) set.add(lint), claimed.add(member);
  if (!set.size) { console.error(`no reported lint resolves into ${file}`); process.exitCode = 1; continue; }
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  let at = 0, depth = 0;
  while (at < lines.length) {
    const line = lines[at];
    if (depth === 0 && !(line.startsWith('//!') || line.startsWith('#!['))) break;
    for (const char of line) depth += char === '[' ? 1 : char === ']' ? -1 : 0;
    at++;
  }
  const existing = new Set(lines.slice(0, at).flatMap(line => [...line.matchAll(/clippy::([a-z_]+)/gu)].map(match => match[1])));
  const added = [...set].sort().filter(lint => !existing.has(lint)).map(lint => `#![allow(clippy::${lint})]`);
  if (!added.length) continue;
  lines.splice(at, 0, ...NOTE.split('\n'), ...added);
  total += added.length;
  console.log(`${file}: ${added.length} lints after line ${at}`);
  if (!dry) writeFileSync(join(root, file), lines.join('\n'));
}
for (const file of fileLints.keys()) if (!claimed.has(file)) { console.error(`unclaimed: ${file}`); process.exitCode = 1; }
console.log(`targets ${targets.length}, allow lines ${total}`);
