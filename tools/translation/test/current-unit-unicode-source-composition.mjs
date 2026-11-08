// Independent full-source checks; these records grant no semantic authority.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareCurrentCoreUnitUnicode} from '../prepare-current-core-unit-unicode.mjs';
import {composeUnitPrivacyApplicationSources} from './fixtures/unit-privacy-source-composition.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
export function currentCoreApplicationSourceEquations(packet){
 const plan=prepareCurrentCoreUnitUnicode(),originals=plan.layers[1].originalUnicodePlan.files;
 return {...composeUnitPrivacyApplicationSources(packet),...Object.fromEntries(['rust/src/translation_core.rs','rust/src/translation_core/primitives.rs'].map(path=>{
  const row=plan.sources[path],historical=originals.find(part=>part.path===path);
  return [path,{historicalSource:historical.before,source:row.after,equation:row}];
 }))};
}
export function currentCoreApplicationSource(row,equations){
 const current=equations[row.path];if(!current)return row.source;
 assert.equal(row.source,current.historicalSource,row.path+': complete historical application source');
 assert.equal(hash(current.source),current.equation.afterSha256);assert.equal(transportConcreteSyntaxMeta(current.equation.afterMeta).source,current.source);
 return current.source;
}
export function assertCurrentCoreUnicodeSourceComposition(layer,prior={},finalSources){
 assert.equal(layer.schema,'router-current-unit-unicode-source-v1');assert.equal(layer.typescriptVersion,'5.9.3');
 assert.equal(layer.semanticAuthority,false);assert.equal(layer.runtimeExecuted,false);assert.equal(layer.rustExecuted,false);assert.equal(layer.newEncodedOrDigestCache,false);
 assert.equal(layer.files.length,8);assert.equal(new Set(layer.files.map(row=>row.path)).size,8);
 assert.equal(layer.originalUnicodePlan.schema,'router-owned-unicode-predicate-sources-v1');assert.equal(layer.originalUnicodePlan.files.length,8);
 assert.equal(layer.originalUnicodePlan.semanticAuthority,false);assert.equal(layer.originalUnicodePlan.nativeRustExecuted,false);
 for(const row of [...layer.originalUnicodePlan.files,...layer.files]){
  assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);assert.equal(row.inverse,row.before);
  assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);
  assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.deepEqual(row.trace,row.stages.flatMap(stage=>stage.trace));
  for(const stage of row.stages){assert.equal(stage.completeInverse,true);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}
  assert.equal(row.nativeCopies.length,row.sourceLanguage==='JavaScript'?2:0);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));
 }
 for(const row of layer.files){
  if(Object.hasOwn(prior,row.path))assert.equal(row.before,prior[row.path].after,row.path+': complete preceding source');
  const final=finalSources?.[row.path]??row;assert.equal(row.current,final.after,row.path);assert.equal(readFileSync(new URL(row.path,root),'utf8'),final.after,row.path);
  const historical=layer.originalUnicodePlan.files.find(old=>old.path===row.path);assert.ok(historical);
  if(!['rust/src/translation_core.rs','tools/translation/router-core-source-data.mjs'].includes(row.path)){assert.equal(row.before,historical.before);assert.equal(row.after,historical.after);}
 }
 const facade=layer.files.find(row=>row.path==='rust/src/translation_core.rs'),oldFacade=layer.originalUnicodePlan.files.find(row=>row.path===facade.path);
 assert.ok(facade.before.startsWith(oldFacade.before));assert.equal(facade.after,oldFacade.after+facade.before.slice(oldFacade.before.length));
 assert.ok(facade.after.includes('strip_unicode_whitespace, has_unicode_control'));assert.ok(facade.after.includes('pub use crate::__router_translation_core_matches as matches_unit;'));
 const data=layer.files.find(row=>row.path==='tools/translation/router-core-source-data.mjs');
 assert.equal(layer.dataDiamond.fromUnicode,data.after);assert.equal(layer.dataDiamond.fromUnit,data.after);
 assert.ok(data.after.includes(JSON.stringify(facade.after)));
 const leaf=layer.files.find(row=>row.path==='rust/src/translation_core/primitives.rs');assert.ok(data.after.includes(JSON.stringify(leaf.after)));
}
