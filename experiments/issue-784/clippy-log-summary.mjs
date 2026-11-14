// Lists unique clippy/rustc diagnostics (file:line:col, lint, message) from a cleaned CI log.
import fs from 'node:fs';
const lines = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const seen = new Map();
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^(error|warning)(\[[^\]]+\])?: (.*)$/);
  if (!m || /could not compile|build failed|aborting/.test(m[3])) continue;
  let loc = '', lint = '';
  for (let j = i + 1; j < Math.min(i + 60, lines.length); j++) {
    if (/^(error|warning)(\[|:)/.test(lines[j])) break;
    const l = lines[j].match(/^\s*--> (.*)$/); if (l && !loc) loc = l[1];
    const n = lines[j].match(/#\[(?:deny|warn)\((.*?)\)\]` on by default|`-D ([a-z:_-]+)` implied|lint (clippy::[a-z_]+)|index\.html#([a-z_]+)/);
    if (n && !lint) lint = n[1] || n[2] || n[3] || n[4];
  }
  const key = `${loc} ${lint}`;
  if (!seen.has(key)) seen.set(key, `${loc}\t${lint}\t${m[3]}`);
}
console.log([...seen.values()].sort().join('\n'));
console.error(`${seen.size} unique`);
