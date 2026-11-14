#!/usr/bin/env node
// Apply the `cargo fmt --all -- --check` diff recorded in a CI job log.
//
// Local Rust tools (including rustfmt) are forbidden by AGENTS.md, so the
// formatter runs only in CI. Its check output is a complete hunk list:
// `Diff in <path>:<line>:` followed by ` `, `-` and `+` lines. GitHub masks
// secret-looking substrings as `***`; masked original/context lines are matched
// as wildcards against the local file and the recovered text is substituted
// into the replacement lines. Any mismatch aborts without writing anything.
//
// Usage: node apply-rustfmt-check-log.mjs <job.log> <repo-root> [--dry-run]
import fs from 'node:fs';
import path from 'node:path';

const [logPath, root, flag] = process.argv.slice(2);
if (!logPath || !root) throw new Error('usage: apply-rustfmt-check-log.mjs <job.log> <repo-root> [--dry-run]');
const runnerRoot = '/home/runner/work/router/router/';
const stamp = /^(?:[^\t]*\t[^\t]*\t)?﻿?\d{4}-\d\d-\d\dT[\d:.]+Z ?/;
const hunks = [];
let current = null;
for (const raw of fs.readFileSync(logPath, 'utf8').split('\n')) {
  if (!stamp.test(raw)) continue;
  const line = raw.replace(stamp, '').replace(/\x1b\[[0-9;]*m/g, '');
  const header = /^Diff in (.+):(\d+):$/.exec(line);
  if (header) {
    if (!header[1].startsWith(runnerRoot)) throw new Error(`unexpected path ${header[1]}`);
    current = { file: header[1].slice(runnerRoot.length), start: Number(header[2]), lines: [] };
    hunks.push(current);
    continue;
  }
  if (!current) continue;
  // rustfmt prints empty context lines without the leading space.
  if (line === '') { current.lines.push(' '); continue; }
  const marker = line[0];
  if (marker !== ' ' && marker !== '-' && marker !== '+') { current = null; continue; }
  current.lines.push(line);
}
// Trailing blank placeholder lines added above are only valid as context; trim them.
for (const hunk of hunks) while (hunk.lines.length && hunk.lines.at(-1) === ' ') hunk.lines.pop();

const wildcard = text => new RegExp(`^${text.split('***').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)')}$`);
const byFile = new Map();
for (const hunk of hunks) byFile.set(hunk.file, [...(byFile.get(hunk.file) ?? []), hunk]);
let applied = 0;
let masked = 0;
const outputs = new Map();
for (const [file, list] of byFile) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const original = source.split('\n');
  const result = [];
  let cursor = 0;
  for (const hunk of list.sort((a, b) => a.start - b.start)) {
    const startIndex = hunk.start - 1;
    if (startIndex < cursor) throw new Error(`${file}:${hunk.start}: overlapping hunk`);
    result.push(...original.slice(cursor, startIndex));
    let index = startIndex;
    const recovered = [];
    for (const entry of hunk.lines) {
      const text = entry.slice(1);
      if (entry[0] === '+') {
        let value = text;
        if (value.includes('***')) {
          if (!recovered.length) throw new Error(`${file}:${hunk.start}: cannot recover masked replacement ${value}`);
          value = value.replace(/\*\*\*/g, () => { masked++; return recovered.shift() ?? (() => { throw new Error(`${file}:${hunk.start}: masked value exhausted`); })(); });
        }
        result.push(value);
        continue;
      }
      const actual = original[index];
      if (actual === undefined) throw new Error(`${file}:${hunk.start}: hunk beyond end of file`);
      if (text.includes('***')) {
        const match = wildcard(text).exec(actual);
        if (!match) throw new Error(`${file}:${index + 1}: masked line mismatch\n  log:   ${text}\n  local: ${actual}`);
        if (entry[0] === '-') recovered.push(...match.slice(1));
      } else if (actual !== text) {
        throw new Error(`${file}:${index + 1}: line mismatch\n  log:   ${JSON.stringify(text)}\n  local: ${JSON.stringify(actual)}`);
      }
      if (entry[0] === ' ') result.push(actual);
      index++;
    }
    if (recovered.length) throw new Error(`${file}:${hunk.start}: ${recovered.length} unused masked values`);
    cursor = index;
    applied++;
  }
  result.push(...original.slice(cursor));
  outputs.set(file, result.join('\n'));
}
if (flag !== '--dry-run') for (const [file, text] of outputs) fs.writeFileSync(path.join(root, file), text);
console.log(`${flag === '--dry-run' ? 'Verified' : 'Applied'} ${applied}/${hunks.length} hunks in ${outputs.size} files; recovered ${masked} masked values.`);
