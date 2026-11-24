// Resolve diff3 conflict hunks where one side only ADDED lines relative to base
// (every base line is kept, in order). Result: the other side's lines plus the
// pure additions, placed where they occurred relative to base lines.
// Usage: node resolve-additive.mjs [--dry] file...
// Prints per-file counts of resolved/remaining hunks.
import {readFileSync, writeFileSync} from 'node:fs';

const dry = process.argv.includes('--dry');
const files = process.argv.slice(2).filter(a => a !== '--dry');

// Returns additions-anchored merge when `side` == base with inserted lines, else null.
function additiveMerge(base, side, other) {
  // Greedy subsequence match of base inside side.
  let b = 0;
  const inserts = new Map(); // base index -> lines inserted before base[b]
  let pending = [];
  for (const line of side) {
    if (b < base.length && line === base[b]) {
      if (pending.length) inserts.set(b, pending), pending = [];
      b++;
    } else pending.push(line);
  }
  if (b !== base.length) return null;
  const tail = pending;
  if (!inserts.size && !tail.length) return other; // side unchanged
  // Anchor insertions: if other keeps base[b] verbatim, insert before it; else
  // insertions before base[0] go first, others go after the full other block.
  const out = [];
  const lead = inserts.get(0) ?? [];
  const rest = [...inserts.entries()].filter(([k]) => k !== 0).flatMap(([, v]) => v);
  out.push(...lead, ...other, ...rest, ...tail);
  return out;
}

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const out = [];
  let resolved = 0, remaining = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('<<<<<<< ')) { out.push(lines[i]); continue; }
    const start = i; const ours = [], base = [], theirs = [];
    let section = ours; i++;
    for (; i < lines.length && !lines[i].startsWith('>>>>>>> '); i++) {
      if (lines[i].startsWith('||||||| ')) section = base;
      else if (lines[i] === '=======' && section !== theirs) section = theirs;
      else section.push(lines[i]);
    }
    const merged = additiveMerge(base, ours, theirs) ?? additiveMerge(base, theirs, ours);
    if (merged) { out.push(...merged); resolved++; }
    else { out.push(...lines.slice(start, i + 1)); remaining++; }
  }
  if (!dry && resolved) writeFileSync(file, out.join('\n'));
  console.log(`${resolved} resolved, ${remaining} remaining: ${file}`);
}
