#!/usr/bin/env node
// Compare the non-dev dependency declarations of two published versions of a
// crate, using the crates.io sparse index, and list the newer non-yanked
// versions in the same semver line.
//
// Usage: node experiments/issue-784/compare-index-deps.mjs <crate> <old> <new>
import { fetchIndex } from './crates-index-query.mjs';

const [name, oldV, newV] = process.argv.slice(2);
const entries = await fetchIndex(name);
const byV = new Map(entries.map((e) => [e.vers, e]));
const fmt = (d) =>
  `${d.kind ?? 'normal'} ${d.name}${d.package ? `(pkg ${d.package})` : ''} ${d.req}${
    d.optional ? ' optional' : ''
  }${d.target ? ` [${d.target}]` : ''}${d.default_features === false ? ' no-default' : ''}${
    d.features?.length ? ` +${[...d.features].sort().join(',')}` : ''
  }`;
const deps = (e) => new Set((e.deps ?? []).filter((d) => d.kind !== 'dev').map(fmt));
const a = byV.get(oldV);
const b = byV.get(newV);
if (!a || !b) throw new Error(`missing version ${!a ? oldV : newV}`);
const da = deps(a);
const db = deps(b);
console.log(`${name} ${oldV} -> ${newV}`);
console.log(`  new cksum ${b.cksum} yanked=${b.yanked} rust-version=${b.rust_version}`);
for (const x of da) if (!db.has(x)) console.log(`  - ${x}`);
for (const x of db) if (!da.has(x)) console.log(`  + ${x}`);
const fa = JSON.stringify({ ...a.features, ...a.features2 });
const fb = JSON.stringify({ ...b.features, ...b.features2 });
console.log(`  features ${fa === fb ? 'identical' : 'DIFFER'}`);
if (fa !== fb) {
  const oa = { ...a.features, ...a.features2 };
  const ob = { ...b.features, ...b.features2 };
  for (const k of new Set([...Object.keys(oa), ...Object.keys(ob)])) {
    if (JSON.stringify(oa[k]) !== JSON.stringify(ob[k])) {
      console.log(`    ${k}: ${JSON.stringify(oa[k])} -> ${JSON.stringify(ob[k])}`);
    }
  }
}
const [maj, min] = oldV.split('.');
const line = maj === '0' ? `0.${min}.` : `${maj}.`;
console.log(
  `  versions in ${line}x newer than ${oldV}: ${entries
    .filter((e) => e.vers.startsWith(line) && !e.vers.includes('-'))
    .map((e) => `${e.vers}${e.yanked ? '(yanked)' : ''}`)
    .slice(entries.filter((e) => e.vers.startsWith(line) && !e.vers.includes('-')).findIndex((e) => e.vers === oldV) + 1)
    .join(' ')}`,
);
