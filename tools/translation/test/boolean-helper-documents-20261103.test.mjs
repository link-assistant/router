// Whole original source-copy ancestry. All execution is deferred while drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeBooleanHelperDocumentSources20261103} from '../boolean-helper-documents-20261103-profile.mjs';
test('helper documents retain the two real readers and both complete original document implementations',{timeout:900000},()=>{
 const result=proposeBooleanHelperDocumentSources20261103();
 assert.equal(result.sourceInstalled,false);assert.equal(result.nativeBindingQualified,false);
 assert.equal(result.files.length,2);assert.equal(result.copies.length,2);assert.equal(result.newFiles.length,2);
 for(const row of [...result.files,...result.copies]){
  assert.equal(row.inverse,row.before);assert.notEqual(row.before,row.after);
  assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  assert.equal(row.stages[0].before,row.before);assert.equal(row.stages[1].after,row.after);
  assert.equal(row.stages[1].before,row.stages[0].after);
  for(const stage of row.stages)assert.equal(stage.history.inverse,stage.before);
 }
 for(const row of result.files){
  assert.equal(result.predecessor.files.find(previous=>previous.path===row.path).after,row.before);
  assert.match(row.after,/booleanHelperCalls\.push/);
 }
 for(const row of result.copies){
  assert.match(row.after,/createOwnedCoreBooleanHelperSourceContext as createOwnedCoreSourceContext/);
  assert.match(row.after,/function serializeOwnedBooleanHelperDocument/);
  assert.match(row.after,/function readOwnedBooleanHelperDocument/);
  assert.match(row.after,/function referenced\(item\).*booleanHelperCalls/);
  assert.match(row.after,/const checked=check\(expand\(item,data,files,pairs\),context\)/);
  assert.match(row.after,/LIMIT=33554432,ITEMS=4096/);
 }
 const operation=result.newFiles.find(row=>row.path.endsWith('owned-boolean-helper-profile-20261103.mjs'));
 assert.match(operation.source,/document\.readOwnedBooleanHelperDocument\(meta\)/);
 assert.match(operation.source,/parseReverseConcreteSource\(text\)/);
 assert.match(operation.source,/operations\.emitOwnedCoreProgram/);
});
