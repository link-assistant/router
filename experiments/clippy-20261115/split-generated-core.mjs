// Splits a generated translation core that exceeds the repository's 1,000-line
// limit (scripts/check-file-size.rs, lint job 132857629710) into out-of-line
// child modules without changing its public API. The parent keeps its header,
// its private helpers and the leading functions; each child takes the run of
// top-level items that starts at the named function and ends before the next
// cut, and re-enters the parent's scope with `use super::*`. The parent
// re-exports every child with `pub use child::*`, so `crate::<core>::<fn>`
// paths stay valid for every caller and test.
//
// Usage: node split-generated-core.mjs <rust/src/core.rs> <child>=<first fn> ...
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const [file, ...cuts] = process.argv.slice(2);
if (!file || !cuts.length) throw new Error('usage: <core.rs> <child>=<first fn> ...');
const core = basename(file, '.rs');
const lines = readFileSync(file, 'utf8').split('\n');
if (lines.at(-1) !== '') throw new Error('trailing newline required');
lines.pop();

// The item starts at its leading attribute and doc lines, not at `pub fn`.
function itemStart(name) {
  const at = lines.findIndex(line => new RegExp(`^pub fn ${name}\\b`).test(line));
  if (at < 0) throw new Error(`no top-level pub fn ${name}`);
  let start = at;
  while (start > 0 && /^(#\[|\/\/\/)/.test(lines[start - 1])) start -= 1;
  if (lines[start - 1] !== '') throw new Error(`${name} is not preceded by a blank line`);
  return start;
}

const parts = cuts.map(cut => {
  const [child, first] = cut.split('=');
  if (!/^[a-z][a-z0-9_]*$/.test(child) || !first) throw new Error(`bad cut ${cut}`);
  return { child, start: itemStart(first) };
});
for (let i = 1; i < parts.length; i += 1) {
  if (parts[i].start <= parts[i - 1].start) throw new Error('cuts must be in source order');
}

// Header: the inner doc, comments and inner attributes before the first item.
let header = 0;
while (/^(\/\/|#!\[)/.test(lines[header])) header += 1;
const parentLines = lines.slice(0, parts[0].start - 1);
const children = parts.map((part, i) => ({
  child: part.child,
  body: lines.slice(part.start, i + 1 < parts.length ? parts[i + 1].start - 1 : lines.length),
}));

const names = children.map(({ child }) => child).sort();
const parent = [
  ...parentLines.slice(0, header),
  '#![allow(clippy::wildcard_imports)]',
  ...parentLines.slice(header, header + (parentLines[header].startsWith('use ') ? 2 : 0)),
  ...names.map(name => `mod ${name};`),
  ...names.map(name => `pub use ${name}::*;`),
  '',
  ...parentLines.slice(header + (parentLines[header].startsWith('use ') ? 2 : 0)),
];
// A leading `use` line keeps its blank separator before the module block.
const out = { [file]: parent };
mkdirSync(join(dirname(file), core), { recursive: true });
for (const { child, body } of children) {
  out[join(dirname(file), core, `${child}.rs`)] = [
    `//! Part of the generated \`${core}\` carrier, split out to keep each file`,
    '//! under the 1,000-line limit; the parent re-exports every item unchanged.',
    '#![allow(clippy::wildcard_imports)]',
    'use super::*;',
    '',
    ...body,
  ];
}
for (const [path, text] of Object.entries(out)) {
  if (text.length > 1000) throw new Error(`${path} still has ${text.length} lines`);
  if (text.some(line => line.length > 100)) throw new Error(`${path} has a line over 100 chars`);
  writeFileSync(path, `${text.join('\n')}\n`);
  console.log(`${path}\t${text.length}`);
}
