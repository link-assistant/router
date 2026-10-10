import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { translateSource, json, PIN, sha256 } from './translate.mjs';

export const OUTPUT_ROOTS = ['tools/translation/meta', 'packages/javascript/generated/rust-draft', 'packages/typescript/generated/rust-draft'];
function files(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(root, entry.name)) : [join(root, entry.name)]);
}

export function regenerate({ root, check = false, sources } = {}) {
  root = resolve(root);
  const paths = (sources ?? execFileSync('git', ['ls-files', '-z', '--', '*.rs'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)).sort();
  const expected = new Map();
  const inventory = [];
  const diagnostics = new Map();
  const totals = { sources: paths.length, executable: 0, carried: 0, preserved: 0 };
  for (const path of paths) {
    if (path.split('/').includes('..') || path.startsWith('/')) throw new Error(`source must be repository relative: ${path}`);
    const source = readFileSync(join(root, path), 'utf8');
    const result = translateSource(source, path);
    const stem = path.replace(/\.rs$/u, '');
    const targets = { meta: `${OUTPUT_ROOTS[0]}/${stem}.meta.json`, javascript: `${OUTPUT_ROOTS[1]}/${stem}.mjs`, typescript: `${OUTPUT_ROOTS[2]}/${stem}.ts` };
    expected.set(targets.meta, json(result.ir));
    expected.set(targets.javascript, result.javascript);
    expected.set(targets.typescript, result.typescript);
    inventory.push({ source: path, sha256: result.ir.sourceSha256, bytes: result.ir.sourceBytes, ...result.ir.counts, runtimeParity: false, targets });
    for (const key of ['executable', 'carried', 'preserved']) totals[key] += result.ir.counts[key];
    for (const item of result.ir.items) if (item.diagnostic) {
      const key = `${item.diagnostic.kind}: ${item.diagnostic.message}`;
      diagnostics.set(key, (diagnostics.get(key) ?? 0) + 1);
    }
  }
  const implementation = ['tools/translation/translate.mjs', 'tools/translation/rust-structure.mjs', 'tools/translation/bulk.mjs'];
  const translatorRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const implementationHashes = Object.fromEntries(implementation.map(path => [path, sha256(readFileSync(join(translatorRoot, path)))]));
  const manifest = { schemaVersion: 1, kind: 'draft-translation-inventory', runtimeParity: false, translatorCommit: PIN, implementationHashes, totals, diagnosticCounts: Object.fromEntries([...diagnostics].sort(([a], [b]) => a.localeCompare(b))), sources: inventory };
  expected.set('parity/rust-source-inventory.json', json(manifest));
  const failures = [];
  for (const [path, content] of expected) {
    const target = join(root, path);
    if (check) {
      if (!existsSync(target)) failures.push(`missing: ${path}`);
      else if (readFileSync(target, 'utf8') !== content) failures.push(`stale: ${path}`);
    } else { mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content); }
  }
  for (const output of OUTPUT_ROOTS) for (const target of files(join(root, output))) {
    const relative = target.slice(root.length + 1);
    if (!expected.has(relative)) {
      if (check) failures.push(`unexpected: ${relative}`);
      else unlinkSync(target);
    }
  }
  return { manifest, failures };
}
