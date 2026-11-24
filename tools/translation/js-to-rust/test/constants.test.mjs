import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeJavaScript, translateJavaScript, parseMeta, TranslationError } from '../translator.mjs';
import { evaluate } from '../interpreter.mjs';

test('closed primitive initializers retain AST and emit static Rust constants', async () => {
  const source = `export const sizeLimit = 4 * 1024 * 1024, LABEL = 'pre' + 'fix';
export const MATCH = 'same' === 'same', NEGATIVE_ZERO = -0, NAN = 0 / 0, INFINITE = 1 / 0;
/** @returns {number} */ export function readLimit() { return sizeLimit; }
/** @returns {string} */ export function readLabel() { return LABEL; }`;
  const result = translateJavaScript(source);
  assert.equal(result.items.length, 8);
  assert.match(result.meta, /\(binary multiply/u);
  assert.match(result.meta, /\(binary add/u);
  assert.deepEqual(parseMeta(result.meta), result.program);
  assert.match(result.rust, /const size_limit: f64 = 4194304\.0;/u);
  assert.match(result.rust, /const LABEL: &str = "prefix";/u);
  assert.match(result.rust, /const MATCH: bool = true;/u);
  assert.match(result.rust, /const NEGATIVE_ZERO: f64 = -0\.0;/u);
  assert.match(result.rust, /const NAN: f64 = f64::NAN;/u);
  assert.match(result.rust, /const INFINITE: f64 = f64::INFINITY;/u);
  assert.match(result.typescript, /export const sizeLimit: number/u);
  const original = await import(`data:text/javascript,${encodeURIComponent(source)}`);
  assert.equal(original.sizeLimit, 4194304);
  assert.equal(original.LABEL, 'prefix');
  assert.equal(original.MATCH, true);
  assert.ok(Object.is(original.NEGATIVE_ZERO, -0));
  assert.ok(Number.isNaN(original.NAN));
  assert.equal(original.INFINITE, Infinity);
  assert.equal(evaluate(result.program, 'read_limit', []), original.readLimit());
  assert.equal(evaluate(result.program, 'read_label', []), original.readLabel());
});

test('mixed declarators count unsupported members independently with exact spans', () => {
  const source = `export const SIZE = 1024 * 1024, children = new Map([['a', 'b']]), MAX = 12;
/** @returns {number} */ export function independent() { return MAX; }`;
  const result = analyzeJavaScript(source);
  assert.equal(result.items.length, 4);
  assert.deepEqual(result.program.map(item => item.name), ['SIZE', 'MAX', 'independent']);
  assert.equal(result.diagnostics.length, 1);
  const span = result.diagnostics[0].span;
  assert.equal(source.slice(span.start, span.end), "children = new Map([['a', 'b']])");
  assert.throws(() => translateJavaScript(source), TranslationError);
});

test('dynamic, mixed-type and unreachable non-closed initializers remain refused', () => {
  for (const source of [
    'export const VALUE = missing;',
    'export const VALUE = true + 1;',
    'export const VALUE = true ? 1 : missing;',
    'export const VALUE = Math.abs(-1);',
    'export const VALUE = [1, 2];',
    'export const first = 1, second = first;',
  ]) assert.throws(() => translateJavaScript(source), TranslationError, source);
  assert.throws(() => parseMeta('(constant VALUE (type number) (value (variable missing)))'));
});
