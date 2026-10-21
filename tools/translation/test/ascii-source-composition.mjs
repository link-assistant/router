// Full source-only freshness assertions; these confer no semantic authority.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root = new URL('../../../', import.meta.url);
const hash = source => createHash('sha256').update(source).digest('hex');
export function assertAsciiSourceComposition(layer, prior = {}, finalSources) {
  assert.equal(layer.schema, 'router-owned-ascii-sources-v1');
  assert.equal(layer.nativeRustExecuted, false);
  assertCompleteAsciiLayer(layer, prior, 7, finalSources);
}
export function assertAsciiReverseComposition(layer, prior = {}, finalSources) {
  assert.equal(layer.schema, 'router-owned-ascii-reverse-sources-v1');
  assert.equal(layer.runtimeExecuted, false); assert.equal(layer.rustExecuted, false);
  assertCompleteAsciiLayer(layer, prior, 4, finalSources);
}
export function assertAsciiAssetsComposition(layer, prior = {}, finalSources) {
  assert.equal(layer.schema, 'router-owned-ascii-assets-v1');
  assert.equal(layer.runtimeExecuted, false); assert.equal(layer.rustExecuted, false);
  assert.equal(layer.fullBuilderCallbackParity, false);
  assert.ok(layer.files.every(row => row.sourceLanguage === 'JavaScript'));
  assert.deepEqual(layer.selection.nativeBindings.unboundIdentifiers, []);
  assert.equal(layer.selection.nativeLexicalBindings.length, 5);
  assertCompleteAsciiLayer(layer, prior, 3, finalSources);
}
export function assertAsciiBaseAssetsComposition(layer, prior = {}, finalSources) {
  assert.equal(layer.schema, 'router-owned-ascii-base-assets-v1');
  assert.equal(layer.runtimeExecuted, false); assert.equal(layer.rustExecuted, false);
  assert.equal(layer.fullBuilderCallbackParity, false); assert.equal(layer.closure.rows.length, 33);
  assert.equal(layer.originalSourcePublicBuilderUnchanged, true); assert.equal(layer.nonAsciiContextsUnchanged, true);
  assert.deepEqual(layer.selection.nativeBindings.unboundIdentifiers, []);
  for (const name of ['HostChecker','hostData','HOST_CONTRACTS','typeScriptAliases','typeScriptType','jsonRetentionRuntimeAssets']) assert.ok(layer.selection.nativeLexicalBindings.some(row => row.name === name));
  assert.ok(layer.files.every(row => row.sourceLanguage === 'JavaScript'));
  assertCompleteAsciiLayer(layer, prior, 3, finalSources);
}
function assertCompleteAsciiLayer(layer, prior, count, finalSources) {
  assert.equal(layer.files.length, count); assert.equal(layer.semanticAuthority, false);
  assert.equal(new Set(layer.files.map(row => row.path)).size, count);
  for (const row of layer.files) {
    if (Object.hasOwn(prior, row.path)) assert.equal(row.before, prior[row.path].after, row.path + ': complete predecessor');
    const final = finalSources === undefined ? row : finalSources[row.path];
    if (finalSources !== undefined) assert.ok(Object.hasOwn(finalSources, row.path), row.path + ': final source is explicit');
    assert.equal(typeof final.after, 'string');
    assert.equal(row.current, final.after, row.path + ': physical current');
    assert.equal(readFileSync(new URL(row.path, root), 'utf8'), final.after, row.path);
    assert.equal(hash(row.before), row.beforeSha256); assert.equal(hash(row.after), row.afterSha256);
    assert.equal(row.inverse, row.before);
    assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source, row.before);
    assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source, row.after);
    assert.deepEqual(row.trace, row.stages.flatMap(stage => stage.trace));
    assert.deepEqual(row.stages.map(stage => stage.phase), ['language', 'repository']);
    for (const stage of row.stages) {
      assert.deepEqual(stage.trace.map(part => part.phase), ['language', 'repository']);
      assert.equal(stage.trace.find(part => part.phase === stage.phase).rules.length, 1);
      assert.equal(stage.trace.find(part => part.phase !== stage.phase).rules.length, 0);
      assert.equal(stage.after, stage.phase === 'language' ? row.before : row.after);
      assert.equal(stage.completeInverse, true); assert.equal(stage.before, row.before);
      assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source, stage.before);
      assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source, stage.after);
    }
    assert.equal(row.nativeCopies.length, row.sourceLanguage === 'JavaScript' ? 2 : 0);
    assert.equal(row.completeNativeAstCopy, row.sourceLanguage === 'JavaScript');
    assert.ok(row.nativeCopies.every(copy => copy.completeNativeAstCopy));
  }
}
