import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { translateSource } = await load('tools/translation/translate.mjs');
const { translateJavaScript, parseMeta, emitTypeScript, analyzeJavaScript } = await load('tools/translation/js-to-rust/translator.mjs');
const { evaluate } = await load('tools/translation/js-to-rust/interpreter.mjs');
const moduleFor = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('forward translation executes fixed-width arithmetic, boundary branches and overflow refusal', async () => {
  const result = translateSource('pub fn add(a: u8, b: u8) -> u8 { a + b }\npub fn cap(value: u32) -> u32 { if value > 10 { 10 } else { value } }', 'acceptance.rs');
  const { translated } = await moduleFor(result.javascript);
  assert.equal(translated.add(7n, 5n), 12n);
  assert.equal(translated.add(0n, 255n), 255n);
  assert.throws(() => translated.add(255n, 1n));
  assert.equal(translated.cap(0n), 0n);
  assert.equal(translated.cap(10n), 10n);
  assert.equal(translated.cap(11n), 10n);
  assert.equal(translated.cap(4_294_967_295n), 10n);
});

test('forward carried functions and their callers are absent from the executable interface', async () => {
  const result = translateSource('pub fn unsafe_io() -> u32 { std::fs::write("/tmp/not-authorized", "x").unwrap(); 1 }\npub fn dependent() -> u32 { unsafe_io() }\npub fn safe() -> u32 { 7 }', 'unsupported.rs');
  const { translated } = await moduleFor(result.javascript);
  assert.equal(translated.safe(), 7n);
  assert.equal(Object.hasOwn(translated, 'unsafe_io'), false);
  assert.equal(Object.hasOwn(translated, 'dependent'), false);
  assert.equal(result.ir.runtimeParity, false);
  assert.ok(result.ir.items.find(item => item.name === 'unsafe_io').diagnostic);
});

const reverseFixture = `
/** @param {number} input @param {number} limit @returns {number} */
export function bound(input, limit) { return Math.min(Math.max(input, 0), limit); }
/** @param {string} value @returns {number} */
export function units(value) { return value.length; }
/** @param {number} value @returns {number} */
export function triangle(value) { let total = 0; let left = Math.max(0, Math.floor(value)); while (left > 0) { total = total + left; left = left - 1; } return total; }
/** @param {boolean} enabled @param {number} value @returns {boolean} */
export function guarded(enabled, value) { return enabled && 1 / value > 0; }
`;
test('reverse serialized meta preserves authored results, NaN, negative zero, Unicode and control flow', async () => {
  const translated = translateJavaScript(reverseFixture);
  const source = await moduleFor(reverseFixture);
  const program = parseMeta(translated.meta);
  // Independent expected observations exercise the checked serialized IR;
  // Rust execution is intentionally deferred to the gated CI fixture runner.
  for (const [name, inputs, expected] of [
    ['bound', [-5, 10], 0], ['bound', [15, 10], 10], ['bound', [NaN, 10], NaN],
    ['bound', [-0, 0], 0], ['units', ['A🙂é'], 4], ['units', [''], 0],
    ['triangle', [4.9], 10], ['triangle', [-3], 0],
    ['guarded', [false, 0], false], ['guarded', [true, 2], true], ['guarded', [true, -2], false],
  ]) {
    assert.ok(Object.is(source[name](...inputs), expected), `${name}: authored source fixture`);
    assert.ok(Object.is(evaluate(program, name, inputs), expected), `${name}: serialized meta observation`);
  }
  assert.equal(emitTypeScript(program), translated.typescript);
});

test('reverse source capabilities and dependent unsupported calls fail before producing Rust', () => {
  for (const source of [
    'import fs from "node:fs"; fs.writeFileSync("/tmp/not-authorized", "x");',
    'export async function write() { await fetch("https://example.invalid"); }',
    '/** @param {number} a @returns {number} */ export function dynamic(a) { return eval("a+1"); }',
    '/** @param {number} a @returns {number} */ export function unknown(a) { return missing(a); }',
    'export class Secret { constructor() {} }',
    '/** @param {number} a @returns {number} */ export function coercion(a) { return a == "1" ? 1 : 0; }',
  ]) assert.throws(() => translateJavaScript(source), error => error.name === 'TranslationError' && typeof error.diagnostic?.message === 'string');
  const result = analyzeJavaScript('/** @param {number} a @returns {number} */ export function bad(a) { return missing(a); }\n/** @param {number} a @returns {number} */ export function caller(a) { return bad(a); }');
  assert.throws(() => evaluate(result.program, 'caller', [1]), /unknown function/);
});
