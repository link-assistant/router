import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveModuleGraph, translateProject } from '../project.mjs';
import { translateSource } from '../translate.mjs';

const project = files => ({ entry: 'src/lib.rs', paths: Object.keys(files), readSource: path => { assert.ok(Object.hasOwn(files, path)); return files[path]; } });
const load = text => import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));

test('tracked module edges and scoped aliases execute checked sibling and parent calls', async () => {
  const result = translateProject(project({
    'src/lib.rs': 'pub mod math; pub mod nested; pub fn root(v: u8) -> u8 { math::increment(v) }',
    'src/math.rs': 'pub const OFFSET: u8 = 2; pub fn increment(v: u8) -> u8 { v + OFFSET }',
    'src/nested/mod.rs': 'pub mod child; use crate::math::increment as plus; pub fn parent(v: u8) -> u8 { plus(v) }',
    'src/nested/child.rs': 'use super::parent; pub fn run(v: u8) -> u8 { parent(v) + crate::math::OFFSET }',
  }));
  assert.equal(result.meta.moduleEdges.length, 3);
  assert.deepEqual(result.meta.moduleDiagnostics, []);
  assert.deepEqual(result.meta.refused, []);
  const { translated } = await load(result.javascript);
  assert.equal(translated.root(3n), 5n);
  assert.equal(translated['nested.child.run'](3n), 7n);
  assert.equal(translated['math.OFFSET'], 2n);
  assert.throws(() => translated['nested.child.run'](253n), RangeError);
  assert.equal(result.meta.runtimeParity, false);
  assert.ok(!JSON.stringify(result.meta.targetSemanticProgram).includes('pub fn'));
  const source = 'use super::parent; pub fn run(v: u8) -> u8 { parent(v) + crate::math::OFFSET }';
  const perFile = translateSource(source, 'src/nested/child.rs', { projectDeclarations: result.executableDeclarations });
  assert.equal(perFile.ir.counts.executableFunctions, 1);
  const artifact = await load(perFile.javascript);
  assert.equal(artifact.translated.run(3n), 7n);
  assert.ok(perFile.ir.items.find(item => item.name === 'run').semantic.project);
  const directory = mkdtempSync(join(tmpdir(), 'router-project-ts-'));
  try {
    const path = join(directory, 'project.ts'); writeFileSync(path, result.typescript);
    execFileSync(process.env.ROUTER_TRANSLATION_TSC ?? 'tsc', ['--strict', '--noEmit', '--target', 'ES2022', '--module', 'ESNext', '--skipLibCheck', path], { stdio: 'pipe' });
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('duplicate project declarations and their callers stay carried', async () => {
  const result = translateProject(project({ 'src/lib.rs': 'pub mod child; pub fn caller() -> u64 { child::same() }', 'src/child.rs': 'pub fn same() -> u64 { 1 } pub fn same() -> u64 { 2 }' }));
  assert.deepEqual((await load(result.javascript)).translated, {});
  assert.equal(result.meta.refused.filter(item => item.kind === 'ambiguous').length, 2);
});

test('project checking carries external effects and every transitive caller', async () => {
  const result = translateProject(project({
    'src/lib.rs': 'pub mod remote; pub fn good(v: u64) -> u64 { v + 1 } pub fn caller() -> String { remote::fetch() }',
    'src/remote.rs': 'pub fn fetch() -> String { std::fs::read_to_string("secret").unwrap() } pub fn middle() -> String { fetch() }',
  }));
  const { translated } = await load(result.javascript);
  assert.deepEqual(Object.keys(translated), ['good']);
  assert.equal(translated.good(4n), 5n);
  assert.deepEqual(result.meta.refused.filter(item => item.term === 'fn').map(item => item.name).sort(), ['caller', 'fetch', 'remote.middle'].sort());
});

test('imported immutable layouts retain constructor tags and cross-file fields', async () => {
  const files = { 'src/lib.rs': 'pub mod model; use crate::model::Record; pub fn amount(value: Record) -> u8 { value.amount } pub fn make(amount: u8) -> Record { Record { amount } }', 'src/model.rs': 'pub struct Record { pub amount: u8 }' };
  const result = translateProject(project(files));
  assert.deepEqual(result.meta.refused, []);
  const { translated } = await load(result.javascript);
  const record = translated.make(9n);
  assert.ok(Object.isFrozen(record));
  assert.equal(translated.amount(record), 9n);
  assert.throws(() => translated.amount({ $: 'Wrong', amount: 9n }), TypeError);
  const local = translateSource(files['src/lib.rs'], 'src/lib.rs', { projectDeclarations: result.executableDeclarations });
  assert.equal(local.ir.counts.executableFunctions, 2);
  assert.equal((await load(local.javascript)).translated.amount(record), 9n);
});

test('ambiguous, missing, and conditional module edges never read an invented source', () => {
  const files = { 'src/lib.rs': 'mod duplicate; mod missing; #[cfg(test)] mod tests;', 'src/duplicate.rs': '', 'src/duplicate/mod.rs': '', 'src/tests.rs': 'panic!("do not parse");' };
  const read = [];
  const graph = resolveModuleGraph({ ...project(files), readSource: path => { read.push(path); return files[path]; } });
  assert.deepEqual(read, ['src/lib.rs']);
  assert.equal(graph.edges.length, 0);
  assert.equal(graph.diagnostics.length, 3);
  assert.match(graph.diagnostics[0].message, /ambiguous/u);
  assert.match(graph.diagnostics[1].message, /missing/u);
});
