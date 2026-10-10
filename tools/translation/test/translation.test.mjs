import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { translateSource, sha256 } from '../translate.mjs';
import { regenerate } from '../bulk.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const cases = JSON.parse(readFileSync(new URL('../fixtures/portable-cases.json', import.meta.url)));
const value = input => typeof input === 'string' && /^-?\d+n$/u.test(input) ? BigInt(input.slice(0, -1)) : input;
const load = async code => import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

for (const fixture of cases) test(fixture.name, async () => {
  const result = translateSource(fixture.source);
  assert.equal(result.ir.counts.carried, 0);
  const { translated } = await load(result.javascript);
  for (const call of fixture.calls) {
    if (call.throws) assert.throws(() => translated[call.name](...call.args.map(value)), { name: call.throws });
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

test('calls of a carried function stay carried transitively', () => {
  const result = translateSource('fn missing() -> u64 { extern_call() } fn middle() -> u64 { missing() } fn top() -> u64 { middle() }');
  assert.equal(result.ir.counts.executable, 0);
  assert.equal(result.ir.counts.carried, 3);
});

test('Rust trim is carried instead of acquiring JavaScript whitespace semantics', () => {
  const result = translateSource('pub fn trim(value: &str) -> String { value.trim().to_string() }');
  assert.equal(result.ir.counts.executable, 0);
  assert.match(result.ir.items[0].diagnostic.message, /trim/u);
});

test('vendored implementations match the pinned integrity inventory', () => {
  const vendor = join(root, 'tools/translation/vendor');
  const lock = JSON.parse(readFileSync(join(vendor, 'upstream-lock.json')));
  for (const [path, hash] of Object.entries(lock.files)) assert.equal(sha256(readFileSync(join(vendor, path))), hash, path);
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
    writeFileSync(join(sandbox, 'packages/javascript/generated/rust-draft/unexpected.mjs'), '');
    rmSync(join(sandbox, 'packages/typescript/generated/rust-draft/sample.ts'));
    const meta = join(sandbox, 'tools/translation/meta/sample.meta.json');
    const ir = JSON.parse(readFileSync(meta));
    ir.items.find(item => item.semantic).semantic.checkedIR.body.value = false;
    writeFileSync(meta, JSON.stringify(ir));
    const errors = regenerate({ ...options, check: true }).failures;
    assert.ok(errors.includes('unexpected: packages/javascript/generated/rust-draft/unexpected.mjs'));
    assert.ok(errors.includes('missing: packages/typescript/generated/rust-draft/sample.ts'));
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
    const source = readFileSync(join(root, entry.source), 'utf8');
    assert.equal(ir.items.map(item => item.source).join(''), source, entry.source);
    assert.equal(ir.sourceSha256, sha256(source), entry.source);
    const module = await import(pathToFileURL(join(root, entry.targets.javascript)));
    assert.equal(Object.keys(module.translated).length, entry.executable, entry.source);
    assert.equal(module.provenance.runtimeParity, false);
  }
});
