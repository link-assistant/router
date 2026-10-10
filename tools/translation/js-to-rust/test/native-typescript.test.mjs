import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { loadTypeScript, parseNativeJavaScript, emitNativeTypeScript, runtimeAST, compileNativeTypeScript, regenerateNativeTypeScript, reconstructSyntax, sourceModules } from '../native-typescript.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SOURCE = process.env.ROUTER_NATIVE_TS_SOURCE_ROOT ? resolve(process.env.ROUTER_NATIVE_TS_SOURCE_ROOT) : ROOT;

test('independent runtime fixture preserves optional chains, receivers, getters, evaluation order and literal data', async () => {
  const ts = loadTypeScript(SOURCE);
  const source = `export async function exercise() {
    let hits = 0; const absent = null; let grouped = false;
    const receiver = { value: 3, get slot() { hits++; return this; }, method(extra = 1) { return this.value + extra; } };
    const short = absent?.foo.bar;
    try { (absent?.foo).bar; } catch (error) { grouped = true; }
    const observed = receiver.slot.method(); const optional = receiver?.method?.(2);
    const order = []; const record = n => { order.push(n); return n; };
    const decision = false && record(1) || true && record(2);
    const literal = String.raw\`line\\n\${7n}\`;
    const regex = /\\u{1F600}/u.test('😀');
    return { hits, grouped, short: short === undefined, observed, optional, order, decision, literal, regex, awaited: await Promise.resolve(11) };
  }`;
  const meta = JSON.parse(JSON.stringify(parseNativeJavaScript(ts, 'fixture.mjs', source)));
  const output = emitNativeTypeScript(ts, meta);
  const erased = ts.transpileModule(output.text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true } }).outputText;
  assert.deepEqual(runtimeAST(ts, erased), runtimeAST(ts, source));
  assert.notDeepEqual(runtimeAST(ts, 'x?.foo.bar;'), runtimeAST(ts, '(x?.foo).bar;'));
  const directory = mkdtempSync(join(tmpdir(), 'router-native-ts-observations-'));
  try {
    writeFileSync(join(directory, 'source.mjs'), source);
    writeFileSync(join(directory, 'target.mjs'), erased);
    const expected = { hits: 1, grouped: true, short: true, observed: 4, optional: 5, order: [2], decision: 2, literal: 'line\\n7', regex: true, awaited: 11 };
    const original = await import(pathToFileURL(join(directory, 'source.mjs')).href);
    const translated = await import(pathToFileURL(join(directory, 'target.mjs')).href);
    assert.deepEqual(await original.exercise(), expected);
    assert.deepEqual(await translated.exercise(), expected);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('every native JavaScript module has a structured syntax AST and executable TS draft', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'tools/translation/js-to-rust/generated/native-typescript/manifest.json'), 'utf8'));
  assert.deepEqual(manifest.modules.map((row) => row.source), sourceModules(SOURCE));
  for (const row of manifest.modules) {
    const meta = JSON.parse(readFileSync(join(ROOT, row.meta), 'utf8'));
    assert.equal(meta.schema, 'native-js-syntax-ast-v1');
    assert.ok(Array.isArray(meta.tree));
    assert.ok(meta.nodes > 0);
    assert.equal('source' in meta, false, 'no opaque file source field');
    const source = readFileSync(join(ROOT, row.target), 'utf8');
    assert.doesNotMatch(source, /@ts-(?:nocheck|ignore|expect-error)/u);
    assert.doesNotMatch(source, /from ['"]\.{1,2}\/[^'"]+\.mjs['"]/u);
    assert.ok(reconstructSyntax(meta).length > 0);
  }
});

test('strict compiler checks the entire generated native package', () => {
  const result = compileNativeTypeScript(ROOT, { sourceRoot: SOURCE });
  assert.ok(result.files >= sourceModules(SOURCE).length);
});

test('regeneration rejects stale, missing, and unexpected TS, meta, and asset artifacts', () => {
  assert.deepEqual(regenerateNativeTypeScript(ROOT, { sourceRoot: SOURCE, check: true }).changed, []);
  const directory = mkdtempSync(join(tmpdir(), 'router-native-ts-drift-'));
  try {
    regenerateNativeTypeScript(directory, { sourceRoot: SOURCE });
    const target = join(directory, 'packages/typescript/native/core.ts');
    writeFileSync(target, 'stale\n');
    rmSync(join(directory, 'packages/typescript/catalog.json'));
    writeFileSync(join(directory, 'packages/typescript/native/unexpected.ts'), 'export const stale = true;\n');
    writeFileSync(join(directory, 'packages/typescript/unexpected.ts'), 'export const stale = true;\n');
    const result = regenerateNativeTypeScript(directory, { sourceRoot: SOURCE, check: true });
    assert.ok(result.changed.includes('packages/typescript/native/core.ts'));
    assert.ok(result.changed.includes('packages/typescript/catalog.json'));
    assert.ok(result.unexpected.includes('packages/typescript/native/unexpected.ts'));
    assert.ok(result.unexpected.includes('packages/typescript/unexpected.ts'));
    regenerateNativeTypeScript(directory, { sourceRoot: SOURCE });
    assert.equal(existsSync(join(directory, 'packages/typescript/native/unexpected.ts')), false);
    assert.equal(existsSync(join(directory, 'packages/typescript/unexpected.ts')), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('compiled TypeScript executes the shared native runtime fixture suite in Node and Bun', { timeout: 60000 }, (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'router-native-ts-runtime-'));
  try {
    const outDir = join(directory, 'packages/javascript');
    compileNativeTypeScript(ROOT, { sourceRoot: SOURCE, outDir, emit: true });
    // Existing fixtures use .mjs module paths. These copies contain compiled
    // TypeScript JavaScript, not original native JavaScript or Rust fallbacks.
    for (const folder of ['native', 'portable']) for (const name of readdirSync(join(outDir, folder))) if (name.endsWith('.js')) cpSync(join(outDir, folder, name), join(outDir, folder, name.replace(/\.js$/u, '.mjs')));
    cpSync(join(SOURCE, 'parity/fixtures'), join(directory, 'parity/fixtures'), { recursive: true });
    cpSync(join(SOURCE, 'openapi'), join(directory, 'openapi'), { recursive: true });
    mkdirSync(join(outDir, 'test'), { recursive: true });
    const tests = [];
    for (const name of readdirSync(join(SOURCE, 'packages/javascript/test'))) if (/^native-.*\.(?:mjs|js)$/u.test(name)) {
      cpSync(join(SOURCE, 'packages/javascript/test', name), join(outDir, 'test', name));
      if (/\.test\.(?:mjs|js)$/u.test(name)) tests.push(join(outDir, 'test', name));
    }
    const original = tests.map((path) => join(SOURCE, 'packages/javascript/test', path.slice(path.lastIndexOf('/') + 1)));
    const nodeArgs = ['--test', '--test-reporter=tap'];
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    const run = (binary, args, cwd) => {
      try { return execFileSync(binary, args, { cwd, env, encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024, stdio: 'pipe' }); }
      catch (error) {
        const lines = String(error.stdout ?? '').split('\n');
        const failures = lines.flatMap((line, index) => line.startsWith('not ok') ? lines.slice(index, index + 18) : []).join('\n');
        throw new Error(`Native runtime fixture failure:\n${failures || String(error.stderr ?? error.message).slice(-6000)}`);
      }
    };
    const baseline = run(process.execPath, [...nodeArgs, ...original], SOURCE);
    const compiled = run(process.execPath, [...nodeArgs, ...tests], directory);
    const count = (text) => Number(/# pass (\d+)/u.exec(text)?.[1]);
    assert.ok(count(compiled) >= 30, 'runtime assertions include core, auth/budgets, provider store, HTTP/protocol/SSE and resources');
    assert.equal(count(compiled), count(baseline), 'source and compiled target execute the same shared runtime expectations');
    context.diagnostic(`${count(compiled)} shared expectations passed against source JavaScript and compiled TypeScript in Node.`);
    // Bun is required in CI when available; local Node-only installations still
    // run all expectations and the strict compiler, without a hidden skip.
    try { execFileSync('bun', ['--version'], { stdio: 'pipe' }); }
    catch (error) { if (error.code === 'ENOENT') { context.diagnostic('Bun is unavailable locally; CI installs Bun and requires its compiled-runtime run.'); return; } throw error; }
    run('bun', ['test', ...tests], directory);
    context.diagnostic('The compiled TypeScript native runtime fixture suite also passed in Bun.');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
