// Full source-only freshness assertions; these confer no semantic authority.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root = new URL('../../../', import.meta.url);
const hash = source => createHash('sha256').update(source).digest('hex');
export function assertAsciiSourceComposition(layer, prior = {}) {
  assert.equal(layer.schema, 'router-owned-ascii-sources-v1');
  assert.equal(layer.files.length, 7); assert.equal(layer.semanticAuthority, false); assert.equal(layer.nativeRustExecuted, false);
  assert.equal(new Set(layer.files.map(row => row.path)).size, 7);
  for (const row of layer.files) {
    if (Object.hasOwn(prior, row.path)) assert.equal(row.before, prior[row.path].after, row.path + ': complete predecessor');
    assert.equal(row.current, row.after, row.path + ': physical current');
    assert.equal(readFileSync(new URL(row.path, root), 'utf8'), row.after, row.path);
    assert.equal(hash(row.before), row.beforeSha256); assert.equal(hash(row.after), row.afterSha256);
    assert.equal(row.inverse, row.before);
    assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source, row.before);
    assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source, row.after);
    assert.deepEqual(row.trace.map(part => part.phase), ['language', 'repository']);
    assert.deepEqual(row.stages.map(stage => stage.phase), ['language', 'repository']);
    for (const stage of row.stages) {
      assert.equal(stage.completeInverse, true); assert.equal(stage.before, row.before);
      assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source, stage.before);
      assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source, stage.after);
    }
    assert.equal(row.nativeCopies.length, row.sourceLanguage === 'JavaScript' ? 2 : 0);
    assert.equal(row.completeNativeAstCopy, row.sourceLanguage === 'JavaScript');
    assert.ok(row.nativeCopies.every(copy => copy.completeNativeAstCopy));
  }
}
