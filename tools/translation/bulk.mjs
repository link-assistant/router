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
  const coverage = () => ({ topLevelFunctions: 0, executableFunctions: 0, carriedFunctions: 0, refusalCategories: {} });
  const functionCoverage = { scope: 'top-level fn items; nested declarations inside carried enclosing items are excluded', productionPathRule: 'src/ paths excluding names containing tests or test_support', all: coverage(), production: coverage() };
  const totals = { sources: paths.length, executable: 0, executableFunctions: 0, executableConstants: 0, carried: 0, preserved: 0 };
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
    for (const key of ['executable', 'executableFunctions', 'executableConstants', 'carried', 'preserved']) totals[key] += result.ir.counts[key];
    for (const item of result.ir.items) if (item.diagnostic) {
      const key = `${item.diagnostic.kind}: ${item.diagnostic.message}`;
      diagnostics.set(key, (diagnostics.get(key) ?? 0) + 1);
    }
    for (const item of result.ir.items.filter(item => item.term === 'fn')) {
      const groups = [functionCoverage.all];
      if (path.startsWith('src/') && !/tests|test_support/u.test(path)) groups.push(functionCoverage.production);
      for (const group of groups) {
        group.topLevelFunctions++;
        if (item.status === 'executable') { group.executableFunctions++; continue; }
        group.carriedFunctions++;
        const message = item.diagnostic?.message ?? 'missing diagnostic';
        const category = /\basync\b/u.test(message) ? 'async or effects'
          : /mutable|mutation|for loop/u.test(message) ? 'mutation or iteration'
            : /closure|method iter|method map|higher-order/u.test(message) ? 'closures or iterator methods'
              : /unknown type|type .+generic|generic function|turbofish/u.test(message) ? 'unresolved or generic types'
                : /unknown name|unknown function|called function/u.test(message) ? 'unresolved declaration or carried dependency'
                  : /tuple|destructuring/u.test(message) ? 'tuples or destructuring'
                    : /#\[|attributes|conditional/u.test(message) ? 'attributes or compilation conditions'
                      : /^method /u.test(message) ? 'other unsupported methods'
                        : item.diagnostic?.kind ?? 'missing diagnostic';
        group.refusalCategories[category] = (group.refusalCategories[category] ?? 0) + 1;
      }
    }
  }
  const implementation = ['tools/translation/translate.mjs', 'tools/translation/rust-structure.mjs', 'tools/translation/bulk.mjs', ...readdirSync(new URL('./extensions/', import.meta.url)).filter(name => name.endsWith('.mjs')).map(name => `tools/translation/extensions/${name}`)];
  const translatorRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const implementationHashes = Object.fromEntries(implementation.map(path => [path, sha256(readFileSync(join(translatorRoot, path)))]));
  const manifest = { schemaVersion: 1, kind: 'draft-translation-inventory', runtimeParity: false, translatorCommit: PIN, implementationHashes, totals, functionCoverage, diagnosticCounts: Object.fromEntries([...diagnostics].sort(([a], [b]) => a.localeCompare(b))), sources: inventory };
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
