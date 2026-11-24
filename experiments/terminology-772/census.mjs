// Local replica of scripts/check-terminology.rs (lint job 132867684617), run
// with Node so no Rust tooling is needed. Prints `file:line:word` per hit, where
// word is the whole token around the forbidden "graph".
// With --fix it rewrites each forbidden hit to "network" (case kept), except
// inside tokens listed in KEEP: pinned record file names and code identifiers.
// Usage: node census.mjs <repo-root> [--words|--fix]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
const KEEP = ['resolvemodulegraph', 'ordered-helper-graph-adoption-20261104', 'ordered-scalar-helper-graph-draft-20261104'];
const fix = process.argv.includes('--fix');
const word = w => w === 'GRAPH' ? 'NETWORK' : w[0] === 'G' ? 'Network' : 'network';
import { join, relative } from 'node:path';
const root = process.argv[2];
const src = readFileSync(join(root, 'scripts/check-terminology.rs'), 'utf8');
const list = name => [...src.split(`const ${name}`)[1].split('];')[0].matchAll(/"([^"]*)"/g)].map(m => m[1]);
const exts = list('SCANNED_EXTENSIONS'), excluded = list('EXCLUDED_PATHS'), allowed = list('ALLOWED_PHRASES');
const hits = [];
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name), rel = './' + relative(root, p);
    if (excluded.some(x => rel.includes(x))) continue;
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && exts.some(x => e.name.toLowerCase().endsWith(x))) {
      let text; try { text = readFileSync(p, 'utf8'); } catch { continue; }
      let changed = false;
      const out = text.split('\n').map((line, n) => {
        const low = line.toLowerCase(), edits = [];
        for (let at = low.indexOf('graph'); at >= 0; at = low.indexOf('graph', at + 5)) {
          const ok = allowed.some(ph => { const s = Math.max(0, at - ph.length); const w = low.slice(s, at + 5 + ph.length); let i = w.indexOf(ph); while (i >= 0) { if (s + i <= at && s + i + ph.length > at) return true; i = w.indexOf(ph, i + 1); } return false; });
          if (!ok) { const m = /[\w-]*$/.exec(line.slice(0, at))[0] + /^[\w-]*/.exec(line.slice(at))[0]; hits.push(`${rel}:${n + 1}:${m}`); if (!KEEP.includes(m.toLowerCase())) edits.push(at); }
        }
        for (const at of edits.reverse()) { line = line.slice(0, at) + word(line.slice(at, at + 5)) + line.slice(at + 5); changed = true; }
        return line;
      });
      if (fix && changed) writeFileSync(p, out.join('\n'));
    }
  }
}
walk(root);
if (process.argv.includes('--words')) { const c = {}; for (const h of hits) { const w = h.split(':').at(-1).toLowerCase(); c[w] = (c[w] || 0) + 1; } console.log(Object.entries(c).sort((a, b) => b[1] - a[1]).map(([w, n]) => `${n}\t${w}`).join('\n')); }
else console.log(hits.join('\n'));
console.error(`${hits.length} occurrence(s)`);
