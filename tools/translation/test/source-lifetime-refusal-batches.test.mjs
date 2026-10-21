import {assertAsciiSourceComposition,assertAsciiReverseComposition,assertAsciiAssetsComposition,assertAsciiBaseAssetsComposition} from './ascii-source-composition.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {parseRust, checkProjectProgram, checkProgram} from '../extensions/host-contracts.mjs';
import {declarationRefusals} from '../extensions/declaration-refusals.mjs';
import {TranslationError} from '../vendor/meta-language/translation/diagnostics.js';
import {serializeProgram} from '../semantic-meta.mjs';
import {prepareSourceLifetimeRefusalBatches,prepareCurrentSourceLifetimeRefusalBatches} from '../prepare-source-lifetime-refusal-batches.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
const project = (files, options = {}) => translateProject({entry: 'src/lib.rs', paths: Object.keys(files), readSource: path => files[path], ...options});
const refusals = result => result.meta.refused.map(({name, message, span}) => ({name, message, span})).sort((a, b) => a.name.localeCompare(b.name));
function thrown(run) { try { run(); } catch (error) { return error; } assert.fail('complete invalid source must refuse'); }

test('complete actual lifetime checker collector and project source copies retain native bindings and serialized CST inverses', {timeout: 60000}, () => {
  const plan = prepareSourceLifetimeRefusalBatches(), current = prepareCurrentSourceLifetimeRefusalBatches();
  const finalSources = Object.fromEntries(current.files.map(row => [row.path, row]));
  assert.equal(current.layers.length, 7);
  assert.equal(current.layers[1].files[0].before, plan.files.find(row => row.path === 'tools/translation/project.mjs').after);
  assert.equal(current.layers[2].files.find(row => row.path === 'tools/translation/project.mjs').before, current.layers[1].files[0].after);
  assert.equal(plan.typescriptVersion, '5.9.3'); assert.equal(plan.files.length, 3); assert.equal(plan.newAcrossInvocationCache, false);
  for (const row of plan.files) {
    assert.equal(row.current, current.files.find(final => final.path === row.path).after); assert.equal(row.inverse, row.before);
    assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source, row.before);
    assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source, row.after);
    assert.deepEqual(row.trace.map(part => part.phase), ['language', 'repository']);
    assert.deepEqual(row.nativeBindings.unboundIdentifiers, []);
  }
  const beforeAscii = Object.fromEntries(current.layers.slice(0,3).flatMap(layer => layer.files.map(row => [row.path, row])));
  assertAsciiSourceComposition(current.layers[3], beforeAscii, finalSources);
  assertAsciiReverseComposition(current.layers[4], Object.fromEntries(current.layers[3].files.map(row => [row.path, row])), finalSources);
  assertAsciiAssetsComposition(current.layers[5], Object.fromEntries(current.layers[4].files.map(row => [row.path, row])), finalSources);
  assertAsciiBaseAssetsComposition(current.layers[6], Object.fromEntries(current.layers[5].files.map(row => [row.path, row])), finalSources);
  for (const layer of current.layers.slice(1)) for (const row of layer.files) {
    assert.equal(row.current, current.files.find(final => final.path === row.path).after); assert.equal(row.inverse, row.before);
    assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source, row.before);
    assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source, row.after);
    if (layer === current.layers[1]) {
      assert.deepEqual(row.trace.map(part => part.phase), ['language', 'repository']);
      assert.deepEqual(row.nativeBindings.unboundIdentifiers, []);
    } else {
      assert.deepEqual(row.stages.map(stage => stage.phase), ['language', 'repository']);
    assert.deepEqual(row.trace, row.stages.flatMap(stage => stage.trace));
    for (const stage of row.stages) {
      assert.deepEqual(stage.trace.map(part => part.phase), ['language', 'repository']);
      assert.equal(stage.trace.find(part => part.phase === stage.phase).rules.length, 1);
      assert.equal(stage.trace.find(part => part.phase !== stage.phase).rules.length, 0);
      assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source, stage.before);
      assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source, stage.after);
      assert.equal(stage.completeInverse, true);
    }
    assert.equal(row.nativeCopies.length, row.sourceLanguage === 'Rust' ? 0 : 2);
    assert.ok(row.nativeCopies.every(copy => copy.completeNativeAstCopy));
    }
  }
});

test('independent signature lifetime failures retain both original owners in one phase and every written source span', {timeout: 60000}, () => {
  const source = 'pub fn left(a:&str,b:&str)->&str{a} pub fn right(a:&str,b:&str)->&str{b} pub fn good()->u8{7}';
  const events = [], batched = project({'src/lib.rs': source}, {progress: event => events.push(event)});
  const ordinary = project({'src/lib.rs': source}, {collectIndependentSourceLifetimes: false});
  assert.deepEqual(refusals(batched), refusals(ordinary)); assert.equal(batched.javascript, ordinary.javascript); assert.equal(batched.typescript, ordinary.typescript);
  const selected = events.filter(event => event.stage === 'semantic-refusal' && event.phase === 'source-lifetime-signatures');
  assert.deepEqual(selected.map(row => row.declaration), ['left', 'right']); assert.equal(new Set(selected.map(row => row.attempt)).size, 1);
  for (const row of batched.meta.refused) assert.match(source.slice(row.span.start, row.span.end), /&str/);
  assert.deepEqual(batched.meta.executable.map(row => row.name), ['good']);
});

test('escaping source borrows fail together and their transitive caller is rechecked before either target can publish it', {timeout: 60000}, async () => {
  const source = "pub fn left(x:&str)->&'static str{x} pub fn right(x:&str)->&'static str{x} pub fn caller(x:&str)->&'static str{left(x)} pub fn good()->u8{9}";
  const events = [], batched = project({'src/lib.rs': source}, {progress: event => events.push(event)}), ordinary = project({'src/lib.rs': source}, {collectIndependentSourceLifetimes: false});
  assert.deepEqual(refusals(batched), refusals(ordinary)); assert.equal(batched.javascript, ordinary.javascript); assert.equal(batched.typescript, ordinary.typescript);
  const selected = events.filter(event => event.stage === 'semantic-refusal' && event.phase === 'source-lifetime-bodies');
  assert.deepEqual(selected.map(row => row.declaration), ['left', 'right']); assert.equal(new Set(selected.map(row => row.attempt)).size, 1);
  assert.deepEqual(batched.meta.executable.map(row => row.name), ['good']); assert.deepEqual(refusals(batched).map(row => row.name), ['caller', 'left', 'right']);
  await verifyCohortTargets(batched, api => { assert.deepEqual(Object.keys(api), ['good']); assert.equal(api.good(), 9n); });
});

test('ordinary standalone checker body collection and constant evaluation preserve their existing first-failure contracts', {timeout: 60000}, () => {
  for (const source of ["pub fn bad(x:&str)->&'static str{x} fn main(){}", 'const BAD:u8=255u8+1u8;fn main(){}']) {
    for (const run of [() => checkProgram(parseRust(source)), () => checkProjectProgram(parseRust(source), {collectIndependentBodies: true})]) {
      const error = thrown(run); assert.ok(error instanceof TranslationError); assert.equal(declarationRefusals(error), null);
      assert.match(error.reason, /escaping source borrow|constant evaluation/);
    }
  }
  const source = 'pub fn good(x:u8)->u8{x+1} fn main(){}';
  assert.equal(serializeProgram(checkProgram(parseRust(source))), serializeProgram(checkProjectProgram(parseRust(source), {collectIndependentBodies: true})));
});

test('128 independent late lifetime failures never become callable stubs in either complete target', {timeout: 60000}, async () => {
  const source = Array.from({length: 128}, (_, index) => `pub fn bad${index}(x:&str)->&'static str{x}`).join(' ') + ' pub fn good()->bool{true}';
  const events = [], batched = project({'src/lib.rs': source}, {progress: event => events.push(event)});
  assert.equal(batched.meta.refused.length, 128);
  assert.ok(batched.meta.refused.every(row => /escaping source borrow/.test(row.message)));
  assert.deepEqual(new Set(batched.meta.refused.map(row => row.name)), new Set(Array.from({length: 128}, (_, index) => 'bad' + index)));
  const errors = events.filter(row => row.stage === 'semantic-refusal' && row.phase === 'source-lifetime-bodies');
  assert.equal(errors.length, 128); assert.equal(new Set(errors.map(row => row.attempt)).size, 1); assert.equal(new Set(errors.map(row => row.declaration)).size, 128);
  await verifyCohortTargets(batched, api => { assert.deepEqual(Object.keys(api), ['good']); assert.equal(api.good(), true); });
});

test('nested module source owners remain distinct and source replacement cannot replay a prior failure or result', {timeout: 60000}, () => {
  const files = {'src/lib.rs': 'mod one;mod two;pub fn good()->u8{3}', 'src/one.rs': "pub fn same(x:&str)->&'static str{x}", 'src/two.rs': "pub fn same(x:&str)->&'static str{x}"};
  const first = project(files); assert.deepEqual(refusals(first).map(row => row.name), ['one.same', 'two.same']);
  files['src/one.rs'] = "pub fn same(x:&str)->&'static str{\"fixed\"}";
  const second = project(files); assert.deepEqual(refusals(second).map(row => row.name), ['two.same']); assert.ok(second.meta.executable.some(row => row.name === 'one.same'));
  assert.throws(() => project(files, {collectIndependentSourceLifetimes: 'yes'}), /Explicit source lifetime collection/);
  assert.deepEqual(refusals(project(files)), refusals(second));
});
