// Complete source equations supply no semantic or executable authority.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {receiveCompleteSourceMetadata} from './complete-source-metadata-receiving.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
export function assertStaticResultResidualSourceComposition(layer,prior,finalSources){
 assert.equal(layer.schema,'static-result-residual-source-v1');assert.equal(layer.typescriptVersion,'5.9.3');assert.equal(layer.files.length,1);
 for(const field of ['sourceAuthority','semanticAuthority','runtimeExecuted','rustExecuted'])assert.equal(layer[field],false);
 const receiving=receiveCompleteSourceMetadata(layer.files),transport=receiving.next;
 for(const row of layer.files){
  assert.equal(row.path,'tools/translation/extensions/source-lifetimes.mjs');assert.equal(row.before,prior[row.path].after);assert.equal(row.after,finalSources[row.path].after);
  assert.equal(row.current,row.after);assert.equal(readFileSync(new URL(row.path,root),'utf8'),row.after);assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);
  assert.equal(row.inverse,row.before);assert.equal(row.selection.nativeInverse,row.before);assert.equal(transport(row.beforeMeta).source,row.before);assert.equal(transport(row.afterMeta).source,row.after);
  assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.deepEqual(row.trace,row.stages.flatMap(stage=>stage.trace));
  for(const stage of row.stages){assert.equal(stage.completeInverse,true);assert.equal(transport(stage.beforeMeta).source,stage.before);assert.equal(transport(stage.afterMeta).source,stage.after);}
  assert.equal(row.nativeCopies.length,2);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));assert.deepEqual(row.nativeBindings.unboundIdentifiers,[]);
 }
 receiving.finish();
}
