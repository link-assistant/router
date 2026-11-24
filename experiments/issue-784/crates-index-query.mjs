#!/usr/bin/env node
// Query the crates.io sparse index for one or more crates and print each
// version's yanked flag, checksum, rust-version and dependency list.
//
// Usage: node experiments/issue-784/crates-index-query.mjs <crate>[@<prefix>] ...
//   e.g. rustls@0.23. quinn-proto@0.11. zstd
// Only versions whose number starts with <prefix> are printed (all if omitted).

export function indexPath(name) {
  const n = name.toLowerCase();
  if (n.length === 1) return `1/${n}`;
  if (n.length === 2) return `2/${n}`;
  if (n.length === 3) return `3/${n[0]}/${n}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n}`;
}

export async function fetchIndex(name) {
  const url = `https://index.crates.io/${indexPath(name)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'lockfile-audit-script' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const text = await res.text();
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

async function main() {
  for (const arg of process.argv.slice(2)) {
    const [name, prefix = ''] = arg.split('@');
    const entries = await fetchIndex(name);
    console.log(`=== ${name} (${entries.length} versions)`);
    for (const e of entries) {
      if (!e.vers.startsWith(prefix)) continue;
      console.log(
        `${e.vers}${e.yanked ? ' [YANKED]' : ''} cksum=${e.cksum} rust-version=${e.rust_version ?? '-'}`,
      );
      for (const d of e.deps ?? []) {
        const real = d.package ? ` (package ${d.package})` : '';
        console.log(
          `    ${d.kind ?? 'normal'} ${d.name}${real} ${d.req}${d.optional ? ' optional' : ''}${
            d.target ? ` target=${d.target}` : ''
          }${d.default_features === false ? ' no-default' : ''}${
            d.features?.length ? ` features=${d.features.join(',')}` : ''
          }`,
        );
      }
      const feats = { ...(e.features ?? {}), ...(e.features2 ?? {}) };
      if (process.env.SHOW_FEATURES) console.log(`    features: ${JSON.stringify(feats)}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
