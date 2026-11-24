// Insert file-head `#![allow(clippy::<lint>)]` lines into generated translation
// core modules, one line per lint, for exactly the lints CI Clippy reported in
// that file (input: TSV of file<TAB>lint<TAB>count). Lines go after the leading
// `//!` docs and any existing inner attributes, so no item bytes change.
// Usage: node allow-generated-core-lints.mjs [--dry] <file-lints.tsv> <repo-root>
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const dry = process.argv.includes('--dry');
const [tsv, root] = process.argv.slice(2).filter(arg => arg !== '--dry');
const lints = new Map();
for (const row of readFileSync(tsv, 'utf8').split('\n')) {
  const [file, lint] = row.split('\t');
  if (!file || !/^rust\/src\/translation_[a-z_]+_core\.rs$/u.test(file) || !/^[a-z_]+$/u.test(lint ?? '')) continue;
  if (!lints.has(file)) lints.set(file, new Set());
  lints.get(file).add(lint);
}
const NOTE = '// Generated translation carrier: the translator emits these shapes to mirror the\n// JavaScript ABI. Clippy findings are fixed in its rules, not by hand (#772 ledger).';
for (const [file, set] of [...lints].sort()) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  let at = 0;
  while (at < lines.length && (lines[at].startsWith('//!') || lines[at].startsWith('#!['))) at++;
  const existing = new Set(lines.slice(0, at).flatMap(line => [...line.matchAll(/clippy::([a-z_]+)/gu)].map(match => match[1])));
  const added = [...set].sort().filter(lint => !existing.has(lint)).map(lint => `#![allow(clippy::${lint})]`);
  if (!added.length) continue;
  lines.splice(at, 0, ...NOTE.split('\n'), ...added);
  console.log(`${file}: ${added.length} lints after line ${at}`);
  if (!dry) writeFileSync(join(root, file), lines.join('\n'));
}
