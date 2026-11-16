// File-level census of a CI Clippy log: one TSV row per (reported file, lint)
// with its count, independent of how cargo interleaved crates. Also prints the
// failing test targets ("could not compile ... (test \"X\")") to stderr as
// `TARGET\t<name>` lines. Usage: node census-file-lints.mjs <ci-log>
import {readFileSync} from 'node:fs';

const lines = readFileSync(process.argv[2], 'utf8').split('\n').map(line => line.slice(29));
const rows = new Map();
const targets = new Set();
let block = null;
const close = () => {
  if (block?.file) {
    const key = `${block.file.replace(/^rust\/tests\/(?:\.\.\/)?/u, m => m)}\t${block.lint ?? '?'}`;
    rows.set(key, (rows.get(key) ?? 0) + 1);
  }
  block = null;
};
for (const line of lines) {
  const failed = line.match(/^error: could not compile `[^`]+` \(test "([^"]+)"\)/u);
  if (failed) { close(); targets.add(failed[1]); continue; }
  if (/^(error|warning)(\[\w+\])?: /u.test(line) && !/^warning: build failed/u.test(line)) {
    close();
    block = {file: null, lint: null};
    continue;
  }
  if (!block) continue;
  const at = line.match(/^\s+--> ([^:]+):/u);
  if (at && !block.file) block.file = at[1];
  const lint = line.match(/index\.html#([a-z_]+)/u);
  if (lint && !block.lint) block.lint = lint[1];
}
close();
for (const target of [...targets].sort()) console.error(`TARGET\t${target}`);
for (const [key, count] of [...rows].sort()) console.log(`${key}\t${count}`);
