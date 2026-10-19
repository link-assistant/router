import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { translateSource, sha256 } from '../translate.mjs';
import { regenerate, trackedSource } from '../bulk.mjs';
import { parseProgram, serializeProgram } from '../semantic-meta.mjs';
import { parseRust, checkProgram } from '../extensions/data.mjs';
import {loadJavaScript as load} from './artifact-loader.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const cases = JSON.parse(readFileSync(new URL('../fixtures/portable-cases.json', import.meta.url)));
const value = input => Array.isArray(input) ? input.map(value) : input && typeof input === 'object' ? Object.fromEntries(Object.entries(input).map(([key, item]) => [key, value(item)])) : typeof input === 'string' && /^-?\d+n$/u.test(input) ? BigInt(input.slice(0, -1)) : input;

for (const fixture of cases) test(`${fixture.name}`, async () => {
  const result = translateSource(fixture.source);
  assert.equal(result.ir.counts.carried, 0);
  const { translated } = await load(result.javascript);
  for (const call of fixture.calls) {
    if (call.throws) assert.throws(() => translated[call.name](...call.args.map(value)), { name: call.throws, ...(call.message ? { message: call.message } : {}) });
    else assert.deepEqual(translated[call.name](...call.args.map(value)), value(call.expected));
  }
  for (const [name, expected] of Object.entries(fixture.constants ?? {})) assert.equal(translated[name], value(expected));
});

test('unimplemented async and side effects remain source-bearing diagnostics', async () => {
  const source = 'pub async fn send() { println!("sent"); } fn secret() -> String { std::fs::read_to_string("secret").unwrap() }';
  const result = translateSource(source);
  assert.equal(result.ir.counts.executable, 0);
  assert.equal(result.ir.counts.carried, 2);
  assert.deepEqual((await load(result.javascript)).translated, {});
  assert.equal(result.ir.items.map(item => item.source).join(''), source);
  assert.ok(result.ir.items.filter(item => item.status === 'carried').every(item => item.diagnostic?.span));
});

test('duplicate definitions and dependents are never executable', async () => {
  const result = translateSource('fn duplicate() -> u64 { 1 } fn duplicate() -> u64 { 2 } pub fn caller() -> u64 { duplicate() }');
  assert.equal(result.ir.counts.executable, 0);
  assert.deepEqual((await load(result.javascript)).translated, {});
  assert.equal(result.ir.items.filter(item => item.name === 'duplicate').length, 2);
});

test('typed constructors validate inputs and freeze records with ordinary proto-named fields', async () => {
  const result = translateSource('pub enum State { Ready, Waiting(u8) } pub struct Weird { __proto__: u64 } pub fn field(value: Weird) -> u64 { value.__proto__ }');
  assert.equal(result.ir.counts.executableTypes, 2);
  assert.equal(result.ir.counts.executableConstructors, 3);
  const { translated } = await load(result.javascript);
  const record = translated.Weird(9n);
  assert.ok(Object.isFrozen(record));
  assert.ok(Object.hasOwn(record, '__proto__'));
  assert.equal(Object.getPrototypeOf(record), Object.prototype);
  assert.equal(translated.field(record), 9n);
  assert.deepEqual(translated.State.Ready(), { $: 'Ready' });
  assert.deepEqual(translated.State.Waiting(255n), { $: 'Waiting', field0: 255n });
  assert.throws(() => translated.State.Waiting(256n), RangeError);
  assert.throws(() => translated.State.Waiting('wrong'), TypeError);
  assert.throws(() => { record.__proto__ = 4n; }, TypeError);
});

test('semantic target input round-trips declaration links without source bodies', () => {
  const checked = checkProgram(parseRust('fn double(n: u64) -> u64 { n + n } fn main() {}'));
  const serialized = serializeProgram(checked);
  const reparsed = parseProgram(serialized);
  assert.equal(serializeProgram(reparsed), serialized);
  assert.equal(reparsed.declarations.get('double').body.k, 'binary');
  assert.equal(reparsed.declarations.get('double').body.semantics, 'checked');
  assert.ok(!serialized.includes('fn double'));
  assert.throws(() => parseProgram(serialized.replace('checked-rust-semantic-meta-v1', 'opaque-source')), /invalid checked Rust semantic meta/u);
  assert.throws(() => parseProgram(serialized + ' '), /noncanonical/u);
});

test('scalar slice domain rejects holes and accessor data without invoking user validation or iteration', async () => {
  const { translated } = await load(translateSource('pub fn total(v: &[u8]) -> u8 { v.iter().copied().sum() }').javascript);
  assert.throws(() => translated.total(new Array(1)), TypeError);
  let hits = 0;
  const getter = []; Object.defineProperty(getter, 0, { get() { hits++; return 1n; } });
  assert.throws(() => translated.total(getter), TypeError);
  assert.equal(hits, 0);
  const invalid = ['wrong']; invalid.every = () => true;
  assert.throws(() => translated.total(invalid), TypeError);
  const values = [2n, 3n]; values[Symbol.iterator] = function* () { throw new Error('user iterator'); };
  assert.equal(translated.total(values), 5n);
});

test('calls of a carried function stay carried transitively', () => {
  const result = translateSource('fn missing() -> u64 { extern_call() } fn middle() -> u64 { missing() } fn top() -> u64 { middle() }');
  assert.equal(result.ir.counts.executable, 0);
  assert.equal(result.ir.counts.carried, 3);
});

test('bounded generic lowering rejects non-exhaustiveness, aggregate mutation, callback capture exits and missing inference', async () => {
  const sources = [
    'fn bad(v: Option<u64>) -> u64 { match v { Some(x) => x } }',
    'fn bad() -> Vec<u64> { let mut v = Vec::new(); v.push(1); v }',
    'fn bad(v: &[u64]) -> Vec<u64> { v.iter().map(move |x| x + 1).collect() }',
    'fn bad(v: &[u64]) -> Vec<u64> { v.iter().map(|x| { return x; }).collect() }',
    'fn bad(v: &[u64]) -> Vec<u64> { let mut x: u64 = 1; v.iter().map(|x| { x += 1; x }).collect() }',
    'fn bad(v: &[u64]) -> usize { let i = v.iter(); i.count() + i.count() }',
    'fn bad(v: &[u64]) -> u64 { for &mut x in v { x += 1; } 0 }',
    'fn bad() -> usize { let values = [1u8; 18446744073709551615]; values.len() }',
    'fn bad() -> usize { for value in true..false {} 0 }',
    'fn bad(v: u64) -> usize { for value in v.. {} 0 }',
    'fn bad() -> u64 { None.unwrap_or(1) }',
    'fn bad() -> u64 { panic!("must abort"); 7 }',
    'fn bad(v: u64) -> u64 { v = 9; v }',
    'fn bad(v: u64) -> u64 { let v = v; v += 1; v }',
    'fn bad(v: u64) -> u64 { break; v }',
    'fn bad(v: u64) -> u64 { while true { unknown_effect(); } v }',
    'fn bad(v: u64) -> u64 { let x: u64 = { return 7; }; x }',
  ];
  for (const source of sources) {
    const result = translateSource(source);
    assert.equal(result.ir.counts.executableFunctions, 0);
    assert.deepEqual((await load(result.javascript)).translated, {});
    assert.equal(result.ir.items.map(item => item.source).join(''), source);
    assert.ok(result.ir.items.find(item => item.term === 'fn').diagnostic?.span);
  }
});

test('raw and cooked CRLF and continuation literals preserve source while normalizing values', async () => {
  const source = 'pub fn raw() -> String { r#"a\r\nb"#.to_string() } pub fn cooked() -> String { "a\r\nb".to_owned() } pub fn continuation() -> String { "a\\\r\n  \t b".to_string() }';
  const result = translateSource(source);
  assert.equal(result.ir.counts.executableFunctions, 3);
  assert.equal(result.ir.items.map(item => item.source).join(''), source);
  const { translated } = await load(result.javascript);
  assert.equal(translated.raw(), 'a\nb');
  assert.equal(translated.cooked(), 'a\nb');
  assert.equal(translated.continuation(), 'ab');
  const invalid = translateSource('fn invalid() -> String { r#"bare\rreturn"#.to_string() }');
  assert.equal(invalid.ir.counts.executableFunctions, 0);
  assert.match(invalid.ir.items.find(item => item.name === 'invalid').diagnostic.message, /bare carriage return/u);
});

test('Rust trim preserves NEL and BOM whitespace differences independently from JS trim', async () => {
  const result = translateSource('pub fn trim(value: &str) -> String { value.trim().to_string() }');
  assert.equal(result.ir.counts.executable, 1);
  const { translated } = await load(result.javascript);
  assert.equal(translated.trim('\u0085x\u0085'), 'x');
  assert.equal(translated.trim('\ufeffx\ufeff'), '\ufeffx\ufeff');
  assert.equal(translated.trim('\u200bx\u200b'), '\u200bx\u200b');
  const whitespace = '\u0009\u000a\u000b\u000c\u000d\u0020\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000';
  assert.equal(translated.trim(whitespace + 'x' + whitespace), 'x');
  assert.equal(translated.trim(whitespace), '');
  assert.throws(() => translated.trim('\ud800'), { name: 'TypeError' });
});

test('vendored implementations match the pinned integrity inventory', () => {
  const vendor = join(root, 'tools/translation/vendor');
  const lock = JSON.parse(readFileSync(join(vendor, 'upstream-lock.json')));
  for (const [path, hash] of Object.entries(lock.files)) assert.equal(sha256(readFileSync(join(vendor, path))), hash, path);
});

test('TypeScript annotations never rewrite function-like source string data', async () => {
  const result = translateSource('const TEXT: &str = "function misleading(value)"; pub fn echo(value: &str) -> String { value.to_string() }');
  assert.ok(result.typescript.includes('"function misleading(value)"'));
  assert.ok(result.typescript.includes('function echo(value: string)'));
  assert.equal((await load(result.javascript)).translated.TEXT, 'function misleading(value)');
});

test('TypeScript integer division helpers retain BigInt arithmetic types', () => {
  const result = translateSource('pub fn quotient(value: i64, divisor: i64) -> i64 { value / divisor } pub fn abort() -> u64 { panic!("stop") }');
  assert.match(result.typescript, /function ml_divide\(a: bigint, b: bigint, rounding: string, zero: string \| null, remainder: boolean, bounds: \[bigint, bigint, string\] \| null\)/u);
  assert.match(result.typescript, /function ml_abort\(message: string\): never/u);
});

test('raw strings, nested comments, lifetimes, Unicode and char escapes retain exact boundaries', () => {
  const source = '/* outside /* inside */ tail */\nconst TEXT: &str = r###"} ; \\" raw"###;\nfn plain() -> bool { true }\nconst C: char = \'\\u{1f600}\';\n// café 😀\n';
  const result = translateSource(source);
  assert.equal(result.ir.items.map(item => item.source).join(''), source);
  assert.equal(result.ir.sourceSha256, sha256(source));
  for (const item of result.ir.items) {
    assert.equal(source.slice(item.span.start, item.span.end), item.source);
    assert.equal(Buffer.from(source).subarray(item.span.byteStart, item.span.byteEnd).toString(), item.source);
    assert.equal(item.sha256, sha256(item.source));
  }
  assert.equal(result.ir.items.find(item => item.name === 'plain').status, 'executable');
});

test('regeneration rejects stale, missing, unexpected and tampered semantic fields', () => {
  const sandbox = mkdtempSync(join(tmpdir(), 'router-translation-'));
  try {
    mkdirSync(join(sandbox, 'tools/translation'), { recursive: true });
    for (const name of ['translate.mjs', 'bulk.mjs', 'rust-structure.mjs']) writeFileSync(join(sandbox, 'tools/translation', name), readFileSync(join(root, 'tools/translation', name)));
    writeFileSync(join(sandbox, 'sample.rs'), 'pub fn truth() -> bool { true }');
    const options = { root: sandbox, sources: ['sample.rs'] };
    assert.deepEqual(regenerate(options).failures, []);
    assert.deepEqual(regenerate({ ...options, check: true }).failures, []);
    writeFileSync(join(sandbox, 'js/generated/rust-draft/unexpected.mjs'), '');
    rmSync(join(sandbox, 'ts/generated/rust-draft/sample.ts'));
    const meta = join(sandbox, 'tools/translation/meta/sample.meta.json');
    const ir = JSON.parse(readFileSync(meta));
    ir.items.find(item => item.semantic).semantic.checkedIR.body.value = false;
    writeFileSync(meta, JSON.stringify(ir));
    const errors = regenerate({ ...options, check: true }).failures;
    assert.ok(errors.includes('unexpected: js/generated/rust-draft/unexpected.mjs'));
    assert.ok(errors.includes('missing: ts/generated/rust-draft/sample.ts'));
    assert.ok(errors.includes('stale: tools/translation/meta/sample.meta.json'));
    regenerate(options);
    writeFileSync(join(sandbox, 'sample.rs'), 'pub fn truth() -> bool { false }');
    assert.ok(regenerate({ ...options, check: true }).failures.some(error => error.startsWith('stale:')));
  } finally { rmSync(sandbox, { recursive: true, force: true }); }
});

test('all tracked Rust artifacts reconstruct source and all generated JS modules load', async () => {
  const inventory = JSON.parse(readFileSync(join(root, 'parity/rust-source-inventory.json')));
  const tracked = execFileSync('git', ['ls-files', '-z', '--', '*.rs'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean).sort();
  assert.deepEqual(inventory.sources.map(item => item.source), tracked);
  assert.equal(inventory.runtimeParity, false);
  for (const entry of inventory.sources) {
    const ir = JSON.parse(readFileSync(join(root, entry.targets.meta)));
    const source = trackedSource(root, entry.source);
    assert.equal(ir.items.map(item => item.source).join(''), source, entry.source);
    assert.equal(ir.sourceSha256, sha256(source), entry.source);
    let module;
    try { module = await import(pathToFileURL(join(root, entry.targets.javascript))); }
    catch (cause) { throw new Error(`Generated JavaScript failed to load for ${entry.source}: ${entry.targets.javascript}`, { cause }); }
    assert.equal(Object.keys(module.translated).length, entry.executable, entry.source);
    assert.equal(module.provenance.runtimeParity, false);
  }
});
