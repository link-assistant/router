#!/usr/bin/env node
// Rewrite Cargo.lock for the issue #784 advisory upgrades without running
// Cargo: for each planned crate, replace the [[package]] version and checksum
// (checksum taken from the crates.io sparse index `cksum` field) and any
// disambiguated "name version" references in other packages' dependency
// lists. Idempotent: entries already at the target version are left alone.
//
// Usage: node experiments/issue-784/apply-lock-advisory-upgrades.mjs [Cargo.lock]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fetchIndex } from './crates-index-query.mjs';
import { upgrades } from './lock-advisory-plan.mjs';

const lockPath = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '../../Cargo.lock');
let lock = readFileSync(lockPath, 'utf8');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const u of upgrades) {
  const entry = (await fetchIndex(u.name)).find((e) => e.vers === u.to);
  if (!entry) throw new Error(`${u.name} ${u.to} not in index`);
  if (entry.yanked) throw new Error(`${u.name} ${u.to} is yanked`);
  const header = new RegExp(
    `\\[\\[package\\]\\]\\nname = "${esc(u.name)}"\\nversion = "${esc(u.from)}"\\nsource = "registry\\+https://github.com/rust-lang/crates.io-index"\\nchecksum = "[0-9a-f]{64}"\\n`,
  );
  const replacement =
    `[[package]]\nname = "${u.name}"\nversion = "${u.to}"\n` +
    `source = "registry+https://github.com/rust-lang/crates.io-index"\nchecksum = "${entry.cksum}"\n`;
  if (header.test(lock)) {
    lock = lock.replace(header, replacement);
    console.log(`${u.name} ${u.from} -> ${u.to} checksum ${entry.cksum}`);
  } else if (lock.includes(replacement)) {
    console.log(`${u.name} already at ${u.to}`);
  } else {
    throw new Error(`${u.name} ${u.from}: [[package]] entry not found`);
  }
  const ref = new RegExp(`^ "${esc(u.name)} ${esc(u.from)}",$`, 'gm');
  const n = (lock.match(ref) ?? []).length;
  if (n) {
    lock = lock.replace(ref, ` "${u.name} ${u.to}",`);
    console.log(`  updated ${n} dependency reference(s) "${u.name} ${u.from}" -> "${u.name} ${u.to}"`);
  }
}
writeFileSync(lockPath, lock);
