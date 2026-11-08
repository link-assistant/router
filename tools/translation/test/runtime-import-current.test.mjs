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
  assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.equation.stages){
   assert.equal(stage.inverse,stage.before,row.path);
   assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before,row.path);
   assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after,row.path);
  }
 }
});
