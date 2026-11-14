#!/usr/bin/env node
// Issue #784: measure what scripts/check-terminology.rs scans, without running
// Rust locally. The extension list, EXCLUDED_PATHS and ALLOWED_PHRASES are read
// from the Rust script itself, and its `is_excluded`, `is_scanned` and
// `violations` logic is ported, over the tracked files (`git ls-files`, or the
// tree of `--ref <git-ref>`).
// Usage: node experiments/issue-784/terminology-scan.mjs [--ref <git-ref>] [--hits]
// Prints a JSON summary, then the files with hits: hit count, longest hit line,
// and the bytes the pre-fix script would copy into its offence list (one whole
// trimmed line per hit). `--hits` prints every hit as `path:line: excerpt`.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const args = process.argv.slice(2);
const refIndex = args.indexOf('--ref');
const ref = refIndex >= 0 ? args[refIndex + 1] : null;
const printHits = args.includes('--hits');

const script = ref
  ? execFileSync('git', ['show', `${ref}:scripts/check-terminology.rs`]).toString()
  : fs.readFileSync(new URL('../../scripts/check-terminology.rs', import.meta.url), 'utf8');
const constant = (name) => {
  const body = new RegExp(`const ${name}: &\\[&str\\] = &\\[([\\s\\S]*?)\\n\\];`).exec(script);
  if (!body) throw new Error(`constant ${name} not found`);
  const withoutComments = body[1].replace(/^\s*\/\/.*$/gm, '');
  return [...withoutComments.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
};
const SCANNED = constant('SCANNED_EXTENSIONS');
const EXCLUDED = constant('EXCLUDED_PATHS');
const ALLOWED = constant('ALLOWED_PHRASES');

function allowedAt(lowered, at) {
  return ALLOWED.some((phrase) => {
    const start = Math.max(0, at - phrase.length);
    const end = Math.min(lowered.length, at + 5 + phrase.length);
    const window = lowered.slice(start, end);
    let i = window.indexOf(phrase);
    while (i >= 0) {
      if (start + i <= at && start + i + phrase.length > at) return true;
      i = window.indexOf(phrase, i + 1);
    }
    return false;
  });
}

const files = (ref
  ? execFileSync('git', ['ls-tree', '-r', '--name-only', ref], { maxBuffer: 1 << 28 })
  : execFileSync('git', ['ls-files'], { maxBuffer: 1 << 28 }))
  .toString().split('\n').filter(Boolean)
  .map((f) => './' + f)
  .filter((f) => !EXCLUDED.some((p) => f.includes(p)))
  .filter((f) => { const m = /\.[^./]+$/.exec(f); return m && SCANNED.includes(m[0].toLowerCase()); });

let scannedBytes = 0;
let totalHits = 0;
let copiedBytes = 0;
const report = [];
for (const file of files) {
  let text;
  try {
    text = ref ? execFileSync('git', ['show', `${ref}:${file.slice(2)}`], { maxBuffer: 1 << 30 }).toString() : fs.readFileSync(file, 'utf8');
  } catch { continue; }
  scannedBytes += text.length;
  if (!/graph/i.test(text)) continue;
  let hits = 0; let longest = 0; let copied = 0;
  text.split(/\r?\n/).forEach((line, number) => {
    const lowered = line.toLowerCase();
    let from = 0; let at;
    while ((at = lowered.indexOf('graph', from)) >= 0) {
      from = at + 5;
      if (allowedAt(lowered, at)) continue;
      hits++; copied += line.trim().length; longest = Math.max(longest, line.length);
      if (printHits) console.log(`${file}:${number + 1}: ${line.slice(Math.max(0, at - 60), at + 65).trim()}`);
    }
  });
  if (hits) { report.push({ file, hits, longest, copied }); totalHits += hits; copiedBytes += copied; }
}
report.sort((a, b) => b.copied - a.copied);
console.log(JSON.stringify({ files: files.length, scannedBytes, filesWithHits: report.length, totalHits, copiedBytes }, null, 0));
if (!printHits) for (const r of report.slice(0, Number(process.env.TOP ?? 40))) console.log(`${r.hits}\t${r.longest}\t${r.copied}\t${r.file}`);
