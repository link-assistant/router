#!/usr/bin/env node
// Verify the issue #784 Cargo.lock advisory upgrades without running Cargo.
//
// Checks:
//  1. every planned crate is locked at its target version, which is >= the
//     lowest patched version; ignored findings are in .cargo/audit.toml;
//  2. every edited package's checksum equals the crates.io sparse index cksum
//     and the release is not yanked;
//  3. every package in Cargo.lock that depends on an edited crate declares a
//     requirement (crates.io index) that the new locked version satisfies;
//  4. every edited package's own non-optional, non-dev dependencies are
//     present in its lock dependency list, each locked dependency satisfies
//     the declared requirement, and nothing listed is undeclared;
//  5. optionally (--advisory-db <dir>, an extracted RustSec advisory-db
//     checkout), every locked registry package is matched against every
//     advisory, as `cargo audit` does by version range, and any unignored
//     match is reported.
//
// Usage:
//   node experiments/issue-784/verify-lock-advisories.mjs [--advisory-db DIR]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchIndex } from './crates-index-query.mjs';
import { upgrades, ignored } from './lock-advisory-plan.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const dbIdx = args.indexOf('--advisory-db');
const advisoryDb = dbIdx >= 0 ? args[dbIdx + 1] : null;

// ---------- semver ----------
function parseVersion(s) {
  const m = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(s.trim());
  if (!m) throw new Error(`bad version ${s}`);
  return {
    major: +m[1],
    minor: m[2] === undefined ? null : +m[2],
    patch: m[3] === undefined ? null : +m[3],
    pre: m[4] ? m[4].split('.') : [],
  };
}
function cmpPre(a, b) {
  if (!a.length && !b.length) return 0;
  if (!a.length) return 1;
  if (!b.length) return -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === undefined) return -1;
    if (b[i] === undefined) return 1;
    const an = /^\d+$/.test(a[i]);
    const bn = /^\d+$/.test(b[i]);
    if (an && bn && +a[i] !== +b[i]) return +a[i] - +b[i];
    if (an !== bn) return an ? -1 : 1;
    if (!an && a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}
function cmp(a, b) {
  return (
    a.major - b.major || (a.minor ?? 0) - (b.minor ?? 0) || (a.patch ?? 0) - (b.patch ?? 0) || cmpPre(a.pre, b.pre)
  );
}
export function cmpStr(a, b) {
  return cmp(parseVersion(a), parseVersion(b));
}
// One comparator, Cargo/semver-crate semantics.
function matchesComparator(op, c, v) {
  const lowerFull = { major: c.major, minor: c.minor ?? 0, patch: c.patch ?? 0, pre: c.pre };
  switch (op) {
    case '=':
      return (
        v.major === c.major &&
        (c.minor === null || v.minor === c.minor) &&
        (c.patch === null || v.patch === c.patch) &&
        (c.minor === null || c.patch === null || cmpPre(v.pre, c.pre) === 0)
      );
    case '>':
      if (c.minor === null) return v.major > c.major;
      if (c.patch === null) return v.major > c.major || (v.major === c.major && v.minor > c.minor);
      return cmp(v, lowerFull) > 0;
    case '>=':
      return cmp(v, lowerFull) >= 0;
    case '<':
      return cmp(v, lowerFull) < 0;
    case '<=':
      if (c.minor === null) return v.major <= c.major;
      if (c.patch === null) return v.major < c.major || (v.major === c.major && v.minor <= c.minor);
      return cmp(v, lowerFull) <= 0;
    case '~':
      if (cmp(v, lowerFull) < 0) return false;
      if (c.minor === null) return v.major === c.major;
      return v.major === c.major && v.minor === c.minor;
    case '^': {
      if (cmp(v, lowerFull) < 0) return false;
      if (c.major > 0 || c.minor === null) return v.major === c.major;
      if (c.minor > 0 || c.patch === null) return v.major === 0 && v.minor === c.minor;
      return v.major === 0 && v.minor === 0 && v.patch === c.patch;
    }
    default:
      throw new Error(`op ${op}`);
  }
}
export function satisfies(versionStr, reqStr) {
  const v = parseVersion(versionStr);
  const req = reqStr.trim();
  if (req === '*' || req === '') return v.pre.length === 0;
  const comps = req.split(',').map((s) => {
    const m = /^\s*(>=|<=|=|>|<|~|\^)?\s*([0-9A-Za-z.+*-]+)\s*$/.exec(s);
    if (!m) throw new Error(`bad req ${reqStr}`);
    const raw = m[2].replace(/\.\*$/, '').replace(/\.\*$/, '');
    let op = m[1] ?? '^';
    if (/\*/.test(m[2]) && !m[1]) op = '=';
    return { op, c: parseVersion(raw) };
  });
  if (!comps.every(({ op, c }) => matchesComparator(op, c, v))) return false;
  // A pre-release only matches if some comparator names the same M.m.p with a pre-release.
  if (v.pre.length) {
    return comps.some(
      ({ c }) => c.pre.length && c.major === v.major && (c.minor ?? 0) === v.minor && (c.patch ?? 0) === v.patch,
    );
  }
  return true;
}

// ---------- Cargo.lock ----------
function parseLock(text) {
  const pkgs = [];
  for (const block of text.split('[[package]]').slice(1)) {
    const get = (k) => new RegExp(`^${k} = "([^"]*)"`, 'm').exec(block)?.[1];
    const depsBlock = /^dependencies = \[\n([\s\S]*?)^\]/m.exec(block)?.[1] ?? '';
    const deps = [...depsBlock.matchAll(/^ "([^"]+)",$/gm)].map((m) => m[1]);
    pkgs.push({ name: get('name'), version: get('version'), source: get('source'), checksum: get('checksum'), deps });
  }
  return pkgs;
}
const lock = parseLock(readFileSync(join(root, 'Cargo.lock'), 'utf8'));
const byName = new Map();
for (const p of lock) byName.set(p.name, [...(byName.get(p.name) ?? []), p]);
// Resolve a lock dependency string ("name" or "name version") to a package.
function resolveDep(s) {
  const [name, version] = s.split(' ');
  const cands = byName.get(name) ?? [];
  if (version) return cands.find((p) => p.version === version);
  if (cands.length !== 1) throw new Error(`ambiguous lock dep ${s}`);
  return cands[0];
}

const auditToml = readFileSync(join(root, '.cargo/audit.toml'), 'utf8');
const ignoreIds = new Set(
  [...(/ignore = \[([\s\S]*?)\]/.exec(auditToml)?.[1] ?? '').matchAll(/^\s*"(RUSTSEC-\d{4}-\d{4})",/gm)].map(
    (m) => m[1],
  ),
);

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`FAIL ${msg}`);
};
const ok = (msg) => console.log(`ok   ${msg}`);

const indexCache = new Map();
async function indexEntry(name, version) {
  if (!indexCache.has(name)) indexCache.set(name, await fetchIndex(name));
  return indexCache.get(name).find((e) => e.vers === version);
}
const realName = (d) => d.package ?? d.name;

// 1 + 2: versions, fixes, checksums
for (const u of upgrades) {
  const pkgs = byName.get(u.name) ?? [];
  const p = pkgs.find((x) => x.version === u.to);
  if (!p) {
    fail(`${u.name}: not locked at ${u.to} (locked: ${pkgs.map((x) => x.version).join(', ')})`);
    continue;
  }
  for (const other of pkgs) {
    if (other !== p && cmpStr(other.version, u.fixed) < 0 && cmpStr(other.version.split('.')[0], u.fixed.split('.')[0]) === 0)
      fail(`${u.name}: another locked version ${other.version} is below ${u.fixed}`);
  }
  if (cmpStr(p.version, u.fixed) >= 0) ok(`${u.name} ${p.version} >= ${u.fixed} (${u.ids.join(', ')})`);
  else fail(`${u.name} ${p.version} < ${u.fixed}`);
  const e = await indexEntry(u.name, u.to);
  if (!e) fail(`${u.name} ${u.to} missing from crates.io index`);
  else if (e.yanked) fail(`${u.name} ${u.to} is yanked`);
  else if (e.cksum !== p.checksum) fail(`${u.name} ${u.to} checksum ${p.checksum} != index ${e.cksum}`);
  else ok(`${u.name} ${u.to} checksum matches index (${e.cksum.slice(0, 16)}...)`);
}
for (const g of ignored) {
  const p = (byName.get(g.name) ?? []).find((x) => x.version === g.version);
  const allIgnored = g.ids.every((id) => ignoreIds.has(id));
  if (!p) ok(`${g.name} ${g.version} no longer locked; ignore entry may be removable`);
  else if (allIgnored) ok(`${g.name} ${g.version} < ${g.fixed} but ${g.ids.join(', ')} ignored in .cargo/audit.toml`);
  else fail(`${g.name} ${g.version} < ${g.fixed} and not ignored`);
}

// 3: dependents' requirements
const edited = new Map(upgrades.map((u) => [u.name, u.to]));
for (const p of lock) {
  if (!p.source?.startsWith('registry+')) continue;
  for (const ds of p.deps) {
    const dep = resolveDep(ds);
    if (!dep || edited.get(dep.name) !== dep.version) continue;
    const e = await indexEntry(p.name, p.version);
    const reqs = (e?.deps ?? []).filter((d) => d.kind !== 'dev' && realName(d) === dep.name).map((d) => d.req);
    if (!reqs.length) fail(`${p.name} ${p.version} lists ${dep.name} in lock but index declares no such dependency`);
    else if (reqs.some((r) => satisfies(dep.version, r)))
      ok(`${p.name} ${p.version} requires ${dep.name} ${reqs.join(' | ')}; ${dep.version} satisfies`);
    else fail(`${p.name} ${p.version} requires ${dep.name} ${reqs.join(' | ')}; ${dep.version} does not satisfy`);
  }
}
// Workspace member: check rust/Cargo.toml direct requirements on edited crates.
const manifest = readFileSync(join(root, 'rust/Cargo.toml'), 'utf8');
for (const [name, version] of edited) {
  const m = new RegExp(`^${name.replace(/-/g, '[-_]')} = (?:"([^"]+)"|\\{[^}]*version = "([^"]+)")`, 'm').exec(manifest);
  if (!m) continue;
  const req = m[1] ?? m[2];
  if (satisfies(version, req)) ok(`rust/Cargo.toml requires ${name} "${req}"; ${version} satisfies`);
  else fail(`rust/Cargo.toml requires ${name} "${req}"; ${version} does not satisfy`);
}

// 4: edited packages' own dependencies
for (const [name, version] of edited) {
  const p = (byName.get(name) ?? []).find((x) => x.version === version);
  if (!p) continue; // already reported in check 1
  const e = await indexEntry(name, version);
  const declared = (e?.deps ?? []).filter((d) => d.kind !== 'dev');
  const lockDeps = p.deps.map(resolveDep);
  for (const d of declared) {
    const ld = lockDeps.find((x) => x?.name === realName(d));
    if (!ld) {
      if (!d.optional) fail(`${name} ${version}: required dependency ${realName(d)} ${d.req} not in its lock deps`);
      continue;
    }
    if (!satisfies(ld.version, d.req)) fail(`${name} ${version}: ${realName(d)} ${ld.version} !~ ${d.req}`);
  }
  for (const ld of lockDeps) {
    if (!ld) {
      fail(`${name} ${version}: unresolvable lock dependency`);
      continue;
    }
    const decl = declared.filter((d) => realName(d) === ld.name);
    if (!decl.length) fail(`${name} ${version}: lock lists ${ld.name} which the release no longer declares`);
    else if (!decl.some((d) => satisfies(ld.version, d.req)))
      fail(`${name} ${version}: locked ${ld.name} ${ld.version} matches none of ${decl.map((d) => d.req).join(' | ')}`);
  }
  ok(`${name} ${version}: lock dependency list consistent with index (${p.deps.join(', ') || 'none'})`);
}

// 5: advisory-db scan
if (advisoryDb) {
  const crates = join(advisoryDb, 'crates');
  if (!existsSync(crates)) throw new Error(`${crates} not found`);
  let checked = 0;
  for (const p of lock) {
    if (!p.source?.startsWith('registry+')) continue;
    const dir = join(crates, p.name);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const text = readFileSync(join(dir, f), 'utf8');
      const toml = /```toml\n([\s\S]*?)\n```/.exec(text)?.[1] ?? '';
      const id = /^id = "([^"]+)"/m.exec(toml)?.[1];
      if (/^withdrawn = /m.test(toml)) continue;
      const list = (key) => {
        const m = new RegExp(`^${key} = \\[([\\s\\S]*?)\\]`, 'm').exec(toml.split('[versions]')[1] ?? '');
        return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
      };
      checked++;
      const patched = list('patched');
      const unaffected = list('unaffected');
      const safe = [...patched, ...unaffected].some((r) => satisfies(p.version, r));
      if (safe) continue;
      const kind = /^informational = "([^"]+)"/m.exec(toml)?.[1] ?? 'vulnerability';
      if (ignoreIds.has(id)) ok(`advisory ${id} (${kind}) matches ${p.name} ${p.version}, ignored in audit.toml`);
      else fail(`advisory ${id} (${kind}) matches ${p.name} ${p.version}; patched ${JSON.stringify(patched)}`);
    }
  }
  ok(`advisory-db scan: evaluated ${checked} advisory/package pairs`);
}

// 6: optionally (--check-yanked), every locked registry package is published
// and not yanked; `cargo audit` reports yanked crates as warnings, which this
// project's `deny = ["warnings"]` turns into failures.
if (args.includes('--check-yanked')) {
  const registry = lock.filter((p) => p.source?.startsWith('registry+'));
  const queue = [...registry];
  let yanked = 0;
  await Promise.all(
    Array.from({ length: 16 }, async () => {
      while (queue.length) {
        const p = queue.shift();
        const e = await indexEntry(p.name, p.version);
        if (!e) fail(`${p.name} ${p.version} not found in crates.io index`);
        else if (e.yanked) {
          yanked++;
          fail(`${p.name} ${p.version} is yanked`);
        } else if (e.cksum !== p.checksum) fail(`${p.name} ${p.version} checksum differs from index`);
      }
    }),
  );
  if (!yanked) ok(`yanked check: none of ${registry.length} registry packages is yanked; all checksums match`);
}

console.log(failures ? `\n${failures} failure(s)` : '\nall checks passed');
process.exit(failures ? 1 : 0);
