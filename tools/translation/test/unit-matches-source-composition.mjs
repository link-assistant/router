// Full source equations only; this assertion supplies no semantic authority.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
export function assertUnitMatchesSourceComposition(layer,prior={},finalSources){
 assert.equal(layer.schema,'router-owned-unit-matches-source-v1');assert.equal(layer.files.length,7);assert.equal(layer.originalLiteralDomainUnchanged,true);assert.equal(layer.newEncodedOrDigestCache,false);assert.equal(layer.semanticAuthority,false);assert.equal(layer.runtimeExecuted,false);assert.equal(layer.rustExecuted,false);
 assert.equal(new Set(layer.files.map(row=>row.path)).size,7);
 for(const row of layer.files){
  if(Object.hasOwn(prior,row.path))assert.equal(row.before,prior[row.path].after,row.path+': preceding complete source');
  const final=finalSources===undefined?row:finalSources[row.path];assert.ok(final,row.path+': complete final source');assert.equal(row.current,final.after,row.path);assert.equal(readFileSync(new URL(row.path,root),'utf8'),final.after,row.path);
  assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);
  assert.deepEqual(row.trace,row.stages.flatMap(stage=>stage.trace));assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.stages){assert.equal(stage.before,stage.phase==='language'?row.before:row.language);assert.equal(stage.after,stage.phase==='language'?row.language:row.after);assert.equal(stage.completeInverse,true);assert.deepEqual(stage.trace.map(event=>event.phase),['language','repository']);assert.equal(stage.trace.find(event=>event.phase===stage.phase).rules.length,1);assert.equal(stage.trace.find(event=>event.phase!==stage.phase).rules.length,0);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}
  assert.equal(row.nativeCopies.length,row.sourceLanguage==='JavaScript'?2:0);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));if(row.nativeBindings)assert.deepEqual(row.nativeBindings.unboundIdentifiers,[]);
 }
}
