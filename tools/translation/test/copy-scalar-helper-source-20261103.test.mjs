// Complete source ancestry case; execution remains deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeCopyScalarHelperSources20261103} from '../copy-scalar-helper-20261103-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
test('both private readers and four original implementations retain complete Copy-helper source histories',{timeout:900000},()=>{
 const result=proposeCopyScalarHelperSources20261103();assert.equal(result.sourceInstalled,false);assert.equal(result.nativeBindingQualified,false);
 assert.equal(result.files.length,2);assert.equal(result.copies.length,4);assert.equal(result.newFiles.length,3);assert.equal(result.inputSources.length,6);
 for(const row of [...result.files,...result.copies]){
  assert.equal(row.inverse,row.before);assert.notEqual(row.before,row.after);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  assert.equal(row.stages[0].before,row.before);assert.equal(row.stages[1].after,row.after);
  for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}
 }
 for(const row of result.files){
  assert.match(row.after,/createOwnedCoreCopyHelperSourceContext/);assert.match(row.after,/copyHelperCalls\.push/);
  assert.match(row.after,/!copyHelperRoots\?\.has\(value\)/);assert.match(row.after,/originalOwnedCoreImport\(handle,target,spec.name,typed\)/);
  assert.match(row.after,/substituteCopyScalarHelperExpression20261103/);
 }
 for(const row of result.copies.filter(row=>row.path.endsWith('-document.mjs'))){assert.match(row.after,/copyHelperCalls/);assert.match(row.after,/pairedDeclaration/);assert.match(row.after,/check\(expand\(item,data,files,pairs\),context\)/);assert.match(row.after,/LIMIT=33554432,ITEMS=4096/);}
 for(const row of result.newFiles)assert.equal(transportConcreteSyntaxMeta(row.concreteMeta).source,row.source);
});
