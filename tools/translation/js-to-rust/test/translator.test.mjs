import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as javascript from '../../../../packages/javascript/portable/policy.mjs';
import { buildArtifacts, regenerate, decodeFixture } from '../../../../scripts/regenerate-js-first.mjs';
import { analyzeJavaScript, translateJavaScript, TranslationError, parseMeta, emitRust, emitTypeScript } from '../translator.mjs';
import { evaluate } from '../interpreter.mjs';
import { toLino } from '../vendor/ir.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const source = readFileSync(join(ROOT, 'packages/javascript/portable/policy.mjs'), 'utf8');
const translation = translateJavaScript(source);
const fixtures = JSON.parse(readFileSync(join(ROOT, 'parity/fixtures/js-first/policy.json'), 'utf8'));
const unsupported = JSON.parse(readFileSync(join(ROOT, 'parity/fixtures/js-first/unsupported.json'), 'utf8'));

test('every independently authored fixture matches authoritative JavaScript and the IR evaluator', () => {
  const names = new Map(translation.program.map((item) => [item.name.replace(/_([a-z])/gu, (_, char) => char.toUpperCase()), item.name]));
  const covered = new Set();
  for (const fixture of fixtures.cases) {
    const args = fixture.args.map(decodeFixture);
    const expected = decodeFixture(fixture.expected);
    assert.ok(Object.is(javascript[fixture.function](...args), expected), `JavaScript: ${fixture.id}`);
    assert.ok(Object.is(evaluate(translation.program, names.get(fixture.function), args), expected), `IR: ${fixture.id}`);
    covered.add(fixture.function);
  }
  assert.deepEqual([...covered].sort(), Object.keys(javascript).sort(), 'every authoritative exported kernel has independent expectations');
});

test('strict generated TypeScript compiles and executes all the same authored fixtures', () => {
  const output = mkdtempSync(join(tmpdir(), 'router-js-first-ts-'));
  try {
    const localCompiler = join(ROOT, 'packages/javascript/node_modules/.bin/tsc');
    execFileSync(existsSync(localCompiler) ? localCompiler : 'tsc', [
      '--strict', '--skipLibCheck', '--target', 'ES2022', '--module', 'commonjs', '--outDir', output,
      join(ROOT, 'packages/typescript/native/js-first-policy.ts'),
    ], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    const generated = createRequire(import.meta.url)(join(output, 'js-first-policy.js'));
    for (const fixture of fixtures.cases) assert.ok(Object.is(generated[fixture.function](...fixture.args.map(decodeFixture)), decodeFixture(fixture.expected)), `TypeScript: ${fixture.id}`);
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

test('both targets emit only after reparsing and checking the serialized meta-language IR', () => {
  const program = parseMeta(translation.meta);
  assert.equal(`${program.map(toLino).join('\n')}\n`, translation.meta);
  assert.equal(emitRust(program), translation.rust);
  assert.equal(emitTypeScript(program), translation.typescript);
  assert.match(translation.meta, /\(while /u);
  assert.match(translation.rust, /encode_utf16\(\)\.count\(\)/u);
  assert.match(translation.rust, /fn js_min/u);
});

test('serialized meta rejects duplicate globals and definitions with missing returns', () => {
  assert.throws(() => parseMeta(translation.meta + translation.meta), /duplicate meta-language definition/u);
  assert.throws(() => parseMeta('(function incomplete (parameters) (returns number) (body))'), /path without a return/u);
});

test('the frontend refuses invalid numeric and string literal syntax', () => {
  for (const literal of ['01', '0_1', '1__0']) {
    assert.throws(() => translateJavaScript(`/** @returns {number} */ export function malformed() { return ${literal}; }`), TranslationError);
  }
  assert.throws(() => translateJavaScript('/** @returns {string} */ export function malformed() { return "line\nbreak"; }'), TranslationError);
});

test('generic source edits change the AST/IR and both emitted target programs', () => {
  const original = '/** @param {number} n @returns {number} */ export function unrelatedKernel(n) { const bias = 7; return n * 3 + bias; }';
  const altered = original.replace('n * 3', 'n * 5');
  const first = translateJavaScript(original);
  const second = translateJavaScript(altered);
  assert.notEqual(first.meta, second.meta);
  assert.notEqual(first.rust, second.rust);
  assert.notEqual(first.typescript, second.typescript);
  assert.equal(evaluate(first.program, 'unrelated_kernel', [2]), 13);
  assert.equal(evaluate(second.program, 'unrelated_kernel', [2]), 17);
  assert.match(second.rust, /n \* 5\.0/u);
});

test('branches, mutable loops, constants, conditional expressions and sibling calls are actual AST translations', () => {
  const input = `export const SCALE = 2;
/** @param {number} n @returns {number} */
export function derived(n) { let result = 0; let index = 0; while (index < n) { result = result + SCALE; index = index + 1; } return result; }
/** @param {boolean} yes @param {number} n @returns {number} */
export function chosen(yes, n) { return yes ? derived(n) : -1; }`;
  const result = translateJavaScript(input);
  assert.equal(evaluate(result.program, 'chosen', [true, 3]), 6);
  assert.equal(evaluate(result.program, 'chosen', [false, 3]), -1);
  assert.match(result.rust, /pub const SCALE: f64 = 2\.0/u);
  assert.match(result.typescript, /let index = 0/u);
});

test('unsupported constructs yield named diagnostics and no opaque source envelope', () => {
  for (const fixture of unsupported) {
    const analyzed = analyzeJavaScript(fixture.source);
    assert.equal(analyzed.diagnostics[0].kind, fixture.kind, fixture.source);
    assert.equal(analyzed.program.length, 0);
    assert.throws(() => translateJavaScript(fixture.source), (error) => error instanceof TranslationError && error.diagnostic.kind === fixture.kind);
  }
  assert.throws(() => translateJavaScript('/** @returns {string} */ export function bad() { return "\ud800"; }'), TranslationError);
});

test('unsupported dependencies are removed transitively from executable coverage', () => {
  const input = `/** @returns {number} */ export function depends() { return bad(); }
/** @returns {number} */ export function bad() { return missing(); }
/** @returns {number} */ export function independent() { return 3; }`;
  const analyzed = analyzeJavaScript(input);
  assert.deepEqual(analyzed.program.map((item) => item.name), ['independent']);
  assert.equal(analyzed.diagnostics.length, 2);
});

test('regeneration is deterministic and the committed artifacts are current', () => {
  const artifacts = buildArtifacts(ROOT);
  assert.deepEqual([...artifacts], [...buildArtifacts(ROOT)]);
  assert.match(artifacts.get('src/generated_js_first/policy.rs'), /\(-0\.0_f64\)\.to_bits\(\)/u);
  assert.deepEqual(regenerate(ROOT, { check: true }).changed, []);
});

test('regenerate-and-diff rejects modified source and modified generated artifacts', () => {
  const root = mkdtempSync(join(tmpdir(), 'router-js-first-drift-'));
  try {
    for (const path of ['packages/javascript/portable/policy.mjs', 'parity/fixtures/js-first/policy.json', 'parity/fixtures/js-first/unsupported.json']) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), readFileSync(join(ROOT, path)));
    }
    regenerate(root);
    assert.deepEqual(regenerate(root, { check: true }).changed, []);
    writeFileSync(join(root, 'packages/typescript/native/js-first-policy.ts'), 'stale target\n');
    assert.ok(regenerate(root, { check: true }).changed.includes('packages/typescript/native/js-first-policy.ts'));
    regenerate(root);
    writeFileSync(join(root, 'packages/javascript/portable/policy.mjs'), source.replace('expires + skew', 'expires - skew'));
    const changed = regenerate(root, { check: true }).changed;
    assert.ok(changed.includes('src/generated_js_first/policy.rs'));
    assert.ok(changed.includes('packages/typescript/native/js-first-policy.ts'));
    assert.ok(changed.includes('parity/js-first-translation.json'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('unchanged reused frontend support files match the pinned original hashes', () => {
  const provenance = JSON.parse(readFileSync(join(ROOT, 'tools/translation/js-to-rust/provenance.json'), 'utf8'));
  for (const file of provenance.files.filter((file) => file.adaptations.length === 0)) {
    const bytes = readFileSync(join(ROOT, 'tools/translation/js-to-rust', file.local));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.originalSha256);
  }
});
