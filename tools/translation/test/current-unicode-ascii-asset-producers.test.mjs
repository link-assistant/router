import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readHistoricalAsciiAsset} from './ascii-asset-historical-outputs.mjs';
import {prepareUnicodeAsciiAssetProducers} from '../prepare-unicode-ascii-asset-producers.mjs';
import {prepareCoreAsciiAssets} from '../prepare-current-core-ascii-assets.mjs';
import {prepareCoreAsciiBaseAssets} from '../prepare-current-core-ascii-base-assets.mjs';
import {hostCoreAsciiRuntimeAssets} from '../ascii-runtime-assets.mjs';
import {hostCoreAsciiBaseRuntimeAssets} from '../ascii-base-runtime-assets.mjs';
import {hostRuntimeAssetsNamedDataAliases} from '../host-assets.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

test('separate current asset producers retain both entire historical producers and complete source equations',{timeout:60000},()=>{
 const plan=prepareUnicodeAsciiAssetProducers();assert.equal(plan.originalProducerApisUnchanged,true);assert.equal(plan.semanticAuthority,false);assert.equal(plan.files.length,2);
 for(const row of plan.files){
  assert.equal(row.current,row.after);assert.equal(readFileSync(new URL('../../../'+row.input,import.meta.url),'utf8'),row.before);assert.equal(row.equation.inverse,row.before);
  for(const stage of row.equation.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}
  assert.equal(row.publishedEquation.before,row.publishedAfter);assert.equal(row.publishedEquation.after,row.after);assert.equal(row.publishedEquation.inverse,row.publishedAfter);
  for(const stage of row.publishedEquation.stages){assert.equal(stage.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}
  for(const marker of ['copySource(ts,row.path,before)','copySource(ts,row.path,after)','verifyNativeCopiedSourceBindings','completeNativeAstCopy:true'])assert.ok(row.before.includes(marker)&&row.after.includes(marker),marker);
 }
});

for(const [name,prepare,assets]of [
 ['selected',prepareCoreAsciiAssets,hostCoreAsciiRuntimeAssets],
 ['base',prepareCoreAsciiBaseAssets,hostCoreAsciiBaseRuntimeAssets],
])test(name+' current assets preserve complete historical helper DATA and source plans',{timeout:60000},()=>{
 const plan=prepare();assert.equal(plan.files.length,3);assert.equal(plan.historical.files.length,3);assert.equal(plan.currentInputComposition.unicode.files.length,8);assert.equal(plan.semanticAuthority,false);
 assert.deepEqual(JSON.parse(JSON.stringify(plan.historical.selection)),plan.historical.selection);
 const historicalParent=plan.historical.originals.find(row=>row.path==='tools/translation/host-assets.mjs').source;
 for(const row of name==='selected'?plan.historical.selection.selected:plan.historical.selection.retained){
  assert.ok(row.span.every(Number.isInteger));assert.equal(historicalParent.slice(...row.span),row.source);
  assert.ok(!Object.hasOwn(row,'node'),'native AST ownership stays private');
 }
 for(const row of plan.historical.files){
  assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);
  if(row.path!=='tools/translation/js-to-rust/owned-core-source.mjs')assert.equal(row.after,readHistoricalAsciiAsset(row.path),row.path);
 }
 for(const row of plan.files){
  assert.equal(row.inverse,row.before);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}
  assert.equal(row.nativeCopies.length,2);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));
  if(row.path!=='tools/translation/js-to-rust/owned-core-source.mjs')assert.equal(readFileSync(new URL('../../../'+row.path,import.meta.url),'utf8'),row.after,row.path);
 }
 const complete=hostRuntimeAssetsNamedDataAliases(),current=assets();assert.equal(current.size,name==='selected'?3:33);
 for(const [path,source]of current)assert.equal(source,complete.get(path),path);
 for(const row of plan.currentInputComposition.rows){
  const original=plan.currentInputComposition.originals.find(other=>other.path===row.path),evolution=plan.currentInputComposition.unicode.files.find(other=>other.path===row.path);
  assert.equal(row.source,evolution?evolution.after:original.source);if(evolution)assert.equal(evolution.before,original.source);
 }
});
