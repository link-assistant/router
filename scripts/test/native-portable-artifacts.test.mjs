import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildNativePortableArtifacts } from '../../tools/translation/js-to-rust/native-portable-artifacts.mjs';
import { regenerate } from '../regenerate-js-first.mjs';
import { parseMeta } from '../../tools/translation/js-to-rust/translator.mjs';
import { camelFromSnake } from '../../tools/translation/js-to-rust/vendor/ir.mjs';
import { loadTypeScript, regenerateNativeTypeScript } from '../../tools/translation/js-to-rust/native-typescript.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = `export const LIMIT = 3;
export function outer(input) {
  const clean = value => typeof value === 'string' ? value.trim() : null;
  return missing(clean(input));
}`;
const row = (name = 'one', text = source) => ({ path: `packages/javascript/native/${name}.mjs`, source: text });

test('bulk drafts retain refused owners and independent lexical bodies, with deterministic distinct identities', () => {
  const a = buildNativePortableArtifacts([row('two'), row()]);
  const b = buildNativePortableArtifacts([row(), row('two')]);
  assert.deepEqual([...a.artifacts], [...b.artifacts]);
  assert.deepEqual(a.manifest.topLevel, { sourceItems: 4, translatedItems: 2, unsupportedItems: 2 });
  assert.deepEqual(a.manifest.scopedFunctions, { sourceItems: 2, translatedItems: 2, unsupportedItems: 0 });
  assert.equal(a.manifest.contract.runtimeParity, false);
  const identities = a.manifest.modules.flatMap((module) => module.scopedFunctions.items.map((item) => item.name));
  assert.equal(new Set(identities).size, 2);
  for (const module of a.manifest.modules) {
    assert.equal(module.scopedFunctions.items[0].owner.status, 'unsupported');
    for (const output of module.outputs.filter((output) => output.path.endsWith('.lino'))) {
      const program = parseMeta(a.artifacts.get(output.path));
      assert.equal(program.length, output.definitions);
      assert.ok(!program.some((item) => item.name === 'outer'));
    }
  }
  assert.throws(() => buildNativePortableArtifacts([row(), row()]), /duplicate/u);
  assert.throws(() => buildNativePortableArtifacts([{ ...row(), path: 'packages/javascript/native/../escape.mjs' }]), /invalid/u);
  assert.throws(() => buildNativePortableArtifacts([row('bad', 'export function broken(')]), /incomplete scoped/u);
});

test('emitted scoped TypeScript compiles strictly and preserves independently authored full-domain observations', async () => {
  const ts = loadTypeScript(ROOT);
  const { artifacts } = buildNativePortableArtifacts([row(), row('two')]);
  const directory = mkdtempSync(join(tmpdir(), 'router-native-portable-behavior-'));
  try {
    const files = [];
    for (const [path, content] of artifacts) if (path.endsWith('.ts')) {
      const target = join(directory, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content); files.push(target);
    }
    const program = ts.createProgram(files, { strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
    assert.deepEqual(ts.getPreEmitDiagnostics(program).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), []);
    const meta = parseMeta(artifacts.get('tools/translation/js-to-rust/generated/native-portable/scoped/one.lino'));
    const name = camelFromSnake(meta[0].name);
    const text = `${artifacts.get('packages/typescript/native/portable-draft/scoped/one.ts')}\nexport { ${name} };\n`;
    const erased = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    const target = join(directory, 'target.mjs'); writeFileSync(target, erased);
    const fn = (await import(pathToFileURL(target).href))[name];
    const observations = [['\uFEFF hi \u00A0', 'hi'], ['\ud800', '\ud800'], ['', ''], [null, null], [undefined, null], [0, null], [-0, null], [NaN, null], [0n, null], [10n ** 100n, null], [Symbol('opaque'), null], [() => {}, null], [new String('boxed'), null]];
    let hooks = 0; const opaque = { toString() { hooks++; throw Error('coercion'); }, valueOf() { hooks++; throw Error('coercion'); } };
    for (const [value, expected] of [...observations, [opaque, null]]) assert.equal(fn(value), expected);
    assert.equal(hooks, 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('regeneration clears newly refused bodies and reports/removes stale drafts without mutating in check mode', { timeout: 30_000 }, () => {
  const root = mkdtempSync(join(tmpdir(), 'router-native-portable-drift-'));
  try {
    for (const path of ['packages/javascript/portable/policy.mjs', 'parity/fixtures/js-first/policy.json', 'parity/fixtures/js-first/unsupported.json']) {
      mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), readFileSync(join(ROOT, path)));
    }
    const input = join(root, row().path); mkdirSync(dirname(input), { recursive: true }); writeFileSync(input, source);
    regenerate(root);
    const target = 'packages/typescript/native/portable-draft/scoped/one.ts';
    const original = readFileSync(join(root, target), 'utf8');
    regenerateNativeTypeScript(root, { sourceRoot: ROOT });
    assert.equal(readFileSync(join(root, target), 'utf8'), original);
    assert.deepEqual(regenerateNativeTypeScript(root, { sourceRoot: ROOT, check: true }).unexpected, []);
    assert.deepEqual(regenerate(root, { check: true }).changed, []);
    writeFileSync(input, source.replace('value.trim()', 'value.unknown()'));
    assert.ok(regenerate(root, { check: true }).changed.includes(target));
    assert.equal(readFileSync(join(root, target), 'utf8'), original);
    regenerate(root);
    assert.doesNotMatch(readFileSync(join(root, target), 'utf8'), /function scoped/u);
    assert.deepEqual(regenerate(root, { check: true }).changed, []);
    rmSync(input);
    assert.ok(regenerate(root, { check: true }).changed.includes(target));
    assert.ok(existsSync(join(root, target)));
    regenerate(root);
    assert.equal(existsSync(join(root, target)), false);
    assert.deepEqual(regenerate(root, { check: true }).changed, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
