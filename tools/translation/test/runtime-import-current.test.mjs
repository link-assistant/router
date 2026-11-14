import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareRuntimeImportCurrentSources} from '../prepare-runtime-import-current-sources.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

test('current runtime-import consumers retain the complete historical producers and fresh reversible source equations',{timeout:60000},()=>{
 const plan=prepareRuntimeImportCurrentSources();
 assert.equal(plan.typescriptVersion,'5.9.3');
 assert.equal(plan.files.length,12);
 assert.equal(new Set(plan.files.map(row=>row.path)).size,12);
 assert.equal(plan.originalPublicPreparationUnchanged,true);
 assert.equal(plan.originalRuntimeIssuersUnchanged,true);
 assert.equal(plan.semanticAuthority,false);
 assert.equal(plan.runtimeParity,false);
 const root=new URL('../../../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
 assert.equal(read(plan.originalProducer.path),plan.originalProducer.after);
 assert.equal(read(plan.originalNodeHelper.path),plan.originalNodeHelper.source);
 for(const row of plan.files){
  assert.equal(read(row.path),row.after,row.path);
  assert.equal(row.current,row.after,row.path);
  assert.equal(row.equation.inverse,row.before,row.path);
  assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true,row.path);
  if(Object.hasOwn(row,'bindingBatch')){
   assert.equal(row.bindingBatch.before,row.bindingPreviousAfter,row.path);
   assert.equal(row.bindingBatch.after,row.after,row.path);assert.equal(row.bindingBatch.inverse,row.bindingPreviousAfter,row.path);
   assert.equal(row.bindingBatch.semanticAuthority,false);assert.equal(row.bindingBatch.runtimeAuthority,false);
   assert.equal(row.bindingPreviousEquation.before,row.bindingPreviousAfter,row.path);
   assert.equal(row.bindingPreviousEquation.after,row.after,row.path);assert.equal(row.bindingPreviousEquation.inverse,row.bindingPreviousAfter,row.path);
   for(const stage of row.bindingPreviousEquation.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before,row.path);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after,row.path);}
  }
  if(Object.hasOwn(row,'runtimePreviousAfter')){
   assert.equal(row.runtimePreviousEquation.before,row.runtimePreviousAfter,row.path);
   assert.equal(row.runtimePreviousEquation.after,row.after,row.path);assert.equal(row.runtimePreviousEquation.inverse,row.runtimePreviousAfter,row.path);
  }
  if(Object.hasOwn(row,'lifetimeAfter')){
   assert.equal(row.lifetimeEquation.before,row.lifetimeAfter,row.path);assert.equal(row.lifetimeEquation.after,row.after,row.path);assert.equal(row.lifetimeEquation.inverse,row.lifetimeAfter,row.path);
   for(const stage of row.lifetimeEquation.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before,row.path);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after,row.path);}
  }
  assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.equation.stages){
   assert.equal(stage.inverse,stage.before,row.path);
   assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before,row.path);
   assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after,row.path);
  }
 }
});
