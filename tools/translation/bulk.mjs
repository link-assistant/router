import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { translateSource, json, PIN, sha256 } from './translate.mjs';
import { translateProject } from './project.mjs';
import {PRODUCTION_PROFILE,compilationProfile} from './cfg-profile.mjs';
import { effectRuntimeAssets } from './effect-assets.mjs';
import {hostRuntimeAssets} from './host-assets.mjs';
import {deriveDependencyProfile} from './derive-dependencies.mjs';

export const OUTPUT_ROOTS = ['tools/translation/meta', 'packages/javascript/generated/rust-draft', 'packages/typescript/generated/rust-draft', 'tools/translation/projects', 'packages/javascript/generated/rust-project', 'packages/typescript/generated/rust-project'];
// Sparse workers still translate the complete tracked census. A missing
// skip-worktree file is read from this checkout's immutable HEAD, never omitted.
// Missing ordinary working files must continue to fail rather than resurrecting
// a user's deletion. NUL-delimited ls-files output handles unusual path names.
export function trackedSource(root, path) {
  const absolute = join(root, path);
  if (existsSync(absolute)) return readFileSync(absolute, 'utf8');
  const records = execFileSync('git', ['ls-files', '-v', '-z', '--', path], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  if (!records.some(record => record.startsWith('S ') && record.slice(2) === path)) return readFileSync(absolute, 'utf8');
  return execFileSync('git', ['show', `HEAD:${path}`], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}
function files(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(root, entry.name)) : [join(root, entry.name)]);
}

export function regenerate({ root, check = false, sources, entries, compilationProfile:profileInput=PRODUCTION_PROFILE } = {}) {
  root = resolve(root);
  const profile=compilationProfile(profileInput);
  // Standalone fixture roots without Cargo have no registered derive owner.
  // A real Cargo root must verify every consumed dependency input.
  const deriveProfile=deriveDependencyProfile({manifest:existsSync(join(root,'Cargo.toml'))?trackedSource(root,'Cargo.toml'):null,lock:existsSync(join(root,'Cargo.lock'))?trackedSource(root,'Cargo.lock'):null}),deriveDependencies=deriveProfile.proof;
  const paths = (sources ?? execFileSync('git', ['ls-files', '-z', '--', '*.rs'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)).sort();
  const expected = new Map();
  const assets = effectRuntimeAssets();
  const hostAssets=hostRuntimeAssets();
  for (const output of [OUTPUT_ROOTS[1], OUTPUT_ROOTS[2], OUTPUT_ROOTS[4], OUTPUT_ROOTS[5]]) {
    expected.set(`${output}/runtime/effects.mjs`, assets.javascript);
    if (output.startsWith('packages/typescript/')) expected.set(`${output}/runtime/effects.d.mts`, assets.declarations);
    for(const [path,content] of hostAssets)if(output.startsWith('packages/typescript/')||!path.endsWith('.d.mts'))expected.set(`${output}/runtime/${path}`,content);
  }
  const inventory = [];
  const diagnostics = new Map();
  const coverage = () => ({ topLevelFunctions: 0, executableFunctions: 0, carriedFunctions: 0, refusalCategories: {} });
  const functionCoverage = { scope: 'top-level fn items; nested declarations inside carried enclosing items are excluded', productionPathRule: 'src/ paths excluding names containing tests or test_support', all: coverage(), production: coverage() };
  const totals = { sources: paths.length, executable: 0, executableFunctions: 0, executableConstants: 0, executableTypes: 0, executableConstructors: 0, carried: 0, preserved: 0 };
  const projects = [], projectDeclarations = [], projectSourceScopes=[];
  for (const entry of entries ?? ['src/lib.rs', 'src/main.rs'].filter(path => paths.includes(path))) {
    const result = translateProject({ entry, paths, readSource: path => trackedSource(root, path),compilationProfile:profile,deriveDependencies });
    result.meta.deriveDependencyProfile={available:!!deriveDependencies,digest:deriveDependencies?.digest??null,diagnostics:deriveProfile.diagnostics};
    projectDeclarations.push(...result.executableDeclarations);projectSourceScopes.push(...result.sourceScopes);
    const stem = entry.replace(/\.rs$/u, '');
    const targets = { meta: `${OUTPUT_ROOTS[3]}/${stem}.meta.json`, javascript: `${OUTPUT_ROOTS[4]}/${stem}.mjs`, typescript: `${OUTPUT_ROOTS[5]}/${stem}.ts` };
    expected.set(targets.meta, json(result.meta)); expected.set(targets.javascript, result.javascript); expected.set(targets.typescript, result.typescript);
    projects.push({ entry, status: 'partial', runtimeParity: false, sources: result.meta.sources.length, moduleEdges: result.meta.moduleEdges.length, moduleDiagnostics: result.meta.moduleDiagnostics.length, executableFunctions: result.meta.executable.filter(item => item.term === 'fn').length, executableConstants: result.meta.executable.filter(item => item.term === 'const').length, checkedMethods: result.meta.checkedMethods?.length ?? 0, refused: result.meta.refused.length, unloweredItems: result.meta.unloweredItems.length, targets });
  }
  for (const path of paths) {
    if (path.split('/').includes('..') || path.startsWith('/')) throw new Error(`source must be repository relative: ${path}`);
    const source = trackedSource(root, path);
    const result = translateSource(source, path, { projectDeclarations,projectSourceScopes });
    const stem = path.replace(/\.rs$/u, '');
    const targets = { meta: `${OUTPUT_ROOTS[0]}/${stem}.meta.json`, javascript: `${OUTPUT_ROOTS[1]}/${stem}.mjs`, typescript: `${OUTPUT_ROOTS[2]}/${stem}.ts` };
    expected.set(targets.meta, json(result.ir));
    expected.set(targets.javascript, result.javascript);
    expected.set(targets.typescript, result.typescript);
    inventory.push({ source: path, sha256: result.ir.sourceSha256, bytes: result.ir.sourceBytes, ...result.ir.counts, runtimeParity: false, targets });
    for (const key of ['executable', 'executableFunctions', 'executableConstants', 'executableTypes', 'executableConstructors', 'carried', 'preserved']) totals[key] += result.ir.counts[key];
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
  const implementation = ['tools/translation/translate.mjs', 'tools/translation/checked-types.mjs', 'tools/translation/checked-coercions.mjs', 'tools/translation/rust-structure.mjs', 'tools/translation/bulk.mjs', 'tools/translation/cfg-profile.mjs', 'tools/translation/project.mjs', 'tools/translation/project-copy.mjs', 'tools/translation/project-nominal.mjs', 'tools/translation/semantic-meta.mjs', 'tools/translation/effect-assets.mjs', 'tools/translation/host-assets.mjs', 'tools/translation/type-layout.mjs', 'tools/translation/type-layout-runtime.mjs', 'tools/translation/pattern-bindings.mjs', 'tools/translation/pattern-syntax.mjs', 'tools/translation/monomorphic.mjs', 'tools/translation/macro-provenance.mjs', 'tools/translation/module-bindings.mjs', 'tools/translation/registered-bindings.mjs', 'tools/translation/source-scopes.mjs', 'tools/translation/impl-resolver.mjs', ...readdirSync(new URL('./extensions/', import.meta.url)).filter(name => name.endsWith('.mjs')).map(name => `tools/translation/extensions/${name}`)];
  const translatorRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  // Namespace authority consumes the exact offline dependency source bytes,
  // not only descriptors containing their expected digests.
  implementation.push(...['derive-dependencies.mjs','derive-footprints.mjs','derive-helper-paths.mjs','derive-builtin-default.mjs','derive-inputs.mjs','derive-layout.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push('tools/translation/copy-trait-owners.mjs');
  implementation.push('tools/translation/source-module-views.mjs');
  implementation.push(...['namespace-census.mjs','namespace-standard.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push(...['rust-std-lib-1.89.0.rs.gz','rust-alloc-lib-1.89.0.rs.gz','rust-alloc-fmt-1.89.0.rs.gz'].map(name=>`tools/translation/source-profiles/namespace-standard/${name}`));
  implementation.push(...['tool-attributes.mjs','tool-attribute-layout.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push(...['rust-resolve-macros-1.89.0.rs.gz','rust-resolve-ident-1.89.0.rs.gz','rust-builtin-attrs-1.89.0.rs.gz'].map(name=>`tools/translation/source-profiles/tool-attributes/${name}`));
  implementation.push(...['rust-marker-1.89.0.rs.gz','rust-fmt-1.89.0.rs.gz','rust-path-1.89.0.rs.gz'].map(name=>`tools/translation/source-profiles/copy-standard/${name}`));
  implementation.push(...['rust-lexer-1.89.0.rs.gz','rust-dec2flt-1.89.0.rs.gz'].map(name=>`tools/translation/source-profiles/floating-standard/${name}`));
  implementation.push('tools/translation/derive-success-frontier.mjs');
  implementation.push(...['macro-token-trees.mjs','macro-fragments.mjs','macro-items.mjs','declarative-macros.mjs','declarative-source-profile.mjs','declarative-closure.mjs','declarative-owner-frontier.mjs'].map(name=>`tools/translation/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/declarative/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/declarative/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/derive/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/derive/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/primitive-float/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/primitive-float/${name}`));
  implementation.push(...readdirSync(new URL('./source-profiles/utf16-fixed-f64/',import.meta.url)).sort().map(name=>`tools/translation/source-profiles/utf16-fixed-f64/${name}`));
  const implementationHashes = Object.fromEntries(implementation.map(path => [path, sha256(readFileSync(join(translatorRoot, path)))]));
  const manifest = { schemaVersion: 1, kind: 'draft-translation-inventory', runtimeParity: false, compilationProfile:profile, compilationProfileScope:'resolved tracked crate contexts; unmatched standalone source conditions remain unknown', translatorCommit: PIN, implementationHashes, totals, functionCoverage, diagnosticCounts: Object.fromEntries([...diagnostics].sort(([a], [b]) => a.localeCompare(b))), sources: inventory, projects };
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
