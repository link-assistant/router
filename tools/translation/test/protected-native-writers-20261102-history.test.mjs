// Independent complete source ancestry cases. CST/translation execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {captureProtectedNativeWriterSourceHistories,knownProtectedNativeWriterSuccessor} from '../protected-native-writers-20261102-history.mjs';
import {captureNativeLeafMoveSourceHistory} from '../native-module-move-20261101-source-history.mjs';
import {captureDurableNativeLeafMoveSourceHistory} from '../native-leaf-move-recovery-20261101-source-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
test('all four actual native writer source successors retain frozen originals full bytes and both phase inverses',{timeout:60000},()=>{
 const result=captureProtectedNativeWriterSourceHistories();assert.equal(result.files.length,4);assert.equal(result.verification,'UNRUN');
 for(const row of result.files){assert.equal(row.after,read(row.path));assert.equal(row.inverse,row.before);assert.equal(row.currentAfter,row.after);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);}
 const original=result.files[0];assert.equal(knownProtectedNativeWriterSuccessor({path:original.path,before:original.before+'// changed'}),null);assert.equal(knownProtectedNativeWriterSuccessor({path:'tools/translation/unassigned-writer.mjs',before:''}),null);
});
test('original native transaction and recovery histories retain actual current guarded installer joins',{timeout:60000},()=>{
 const ordinary=captureNativeLeafMoveSourceHistory(),durable=captureDurableNativeLeafMoveSourceHistory();assert.equal(ordinary.after,read('tools/translation/native-module-move-20261101-install.mjs'));assert.equal(ordinary.inverse,ordinary.before);
 const installer=durable.files.find(row=>row.originalPath==='tools/translation/native-module-move-20261101-install.mjs');assert.ok(installer);assert.notEqual(installer.originalSuccessor,null);assert.equal(installer.originalCurrent,read(installer.originalPath));assert.equal(installer.originalSuccessor.currentAfter,installer.originalCurrent);assert.equal(installer.originalSuccessor.before,installer.before);assert.equal(installer.after,read(installer.path));assert.equal(installer.inverse,installer.before);
 for(const row of durable.files){assert.equal(row.history.inverse,row.before);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);}assert.equal(durable.runtimeParity,false);assert.equal(durable.receivingExecuted,false);
});
