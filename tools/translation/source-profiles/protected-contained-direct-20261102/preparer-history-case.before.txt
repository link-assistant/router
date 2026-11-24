// Independent named source chronology cases. Native/CST execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {knownProtectedPreparerWriterSuccessor} from '../protected-preparer-writers-20261102-history.mjs';
import {knownLayoutOwnershipSourceSuccessor} from '../layout-ownership-bulk-20261101-successor.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url).pathname,read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
const base='tools/translation/source-profiles/protected-preparer-writers-20261102/';
for(const path of ['tools/translation/prepare-native-substitution-copy.mjs','tools/translation/prepare-mixed-native-substitution-copy.mjs','scripts/sync-rust-assets.mjs'])test('exact complete named successor and inverse at '+path,{timeout:60000},()=>{
 const before=read(base+path.replaceAll('/','__')+'.before.txt'),result=knownProtectedPreparerWriterSuccessor({root,path,before});assert.equal(result.before,before);assert.equal(result.currentAfter,read(path));assert.equal(result.after,read(path));assert.equal(result.inverse,before);assert.deepEqual(result.trace.map(row=>row.phase),['language','repository']);for(const stage of result.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);assert.equal(knownProtectedPreparerWriterSuccessor({root,path,before:before+'\n'}),null);
});
test('immutable original protected-installer preparer epoch joins its exact new successor without rewriting old images',{timeout:60000},()=>{
 const path='tools/translation/prepare-native-substitution-copy.mjs',originalBase='tools/translation/source-profiles/protected-source-installation-20261102/',oldBefore=read(originalBase+'preparer-before.mjs.txt'),oldAfter=read(originalBase+'preparer-after.mjs.txt');assert.equal(oldAfter,read(base+path.replaceAll('/','__')+'.before.txt'));
 const result=knownProtectedPreparerWriterSuccessor({root,path,before:oldBefore});assert.equal(result.before,oldBefore);assert.equal(result.after,oldAfter);assert.equal(result.currentAfter,read(path));assert.equal(result.inverse,oldBefore);assert.equal(result.history.inverse,oldBefore);assert.equal(result.laterHistories.length,1);assert.equal(result.laterHistories[0].before,oldAfter);assert.equal(result.laterHistories[0].currentAfter,read(path));assert.equal(result.laterHistories[0].inverse,oldAfter);
});
test('existing knownLayout unit chronology uses actual currentAfter rather than freezing a later unit epoch',{timeout:60000},()=>{
 const path='tools/translation/unit-runtime-materialization.mjs',before=read('tools/translation/source-profiles/layout-ownership-bulk-20261101/originals/unit-runtime-materialization.mjs.txt'),result=knownLayoutOwnershipSourceSuccessor({root,path,before});assert.equal(result.before,before);assert.equal(result.currentAfter,read(path));assert.equal(result.inverse,before);assert.equal(knownProtectedPreparerWriterSuccessor({root,path:'tools/translation/unassigned-preparer.mjs',before:''}),null);
});
