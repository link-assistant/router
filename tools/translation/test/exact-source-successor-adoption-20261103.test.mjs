// Full actual consumer and historical source cases SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {proposeExactSourceSuccessorAdoption} from '../exact-source-successor-adoption-20261103.mjs';
import {exactSourceHistoryEpoch} from '../exact-source-history-epoch-20261103.mjs';
import {knownProtectedPrivateCliLineageSuccessor} from '../protected-private-cli-lineage-20261103-history.mjs';
import {preparePrivateParserDataCurrentSources} from '../prepare-private-parser-data-current-sources.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/source-profiles/exact-source-successor-adoption-20261103/';
const read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
const parents=[['adapter','tools/translation/prepare-private-parser-data-current-sources.mjs'],['consumer','tools/translation/private-parser-data-current-sources.mjs'],['history','tools/translation/protected-private-cli-lineage-20261103-history.mjs'],['engine','tools/translation/exact-source-successors-20261103.mjs'],['cases','tools/translation/test/exact-source-successors-20261103.test.mjs']];
test('all actual producer and registry successors retain whole before/after/CST inverses',{timeout:60000},()=>{
 const inputs=parents.map(([name,path])=>({path,source:read(BASE+name+'.before.txt')})),result=proposeExactSourceSuccessorAdoption(inputs);
 assert.equal(result.files.length,5);for(const row of result.files){assert.equal(row.after,read(row.path));assert.equal(row.inverse,row.before);assert.equal(row.history.inverse,row.before);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);}
 inputs[0].source+='\n';assert.throws(()=>proposeExactSourceSuccessorAdoption(inputs),/exact complete actual/u);
});
test('original ten-source API preserves its historical after while the exact catalogue joins new physical producers',{timeout:60000},()=>{
 const old='tools/translation/source-profiles/protected-private-cli-lineage-20261103/';
 for(const [role,path]of [['adapter-producer','tools/translation/prepare-private-parser-data-current-sources.mjs'],['current-consumer','tools/translation/private-parser-data-current-sources.mjs']]){
  const result=knownProtectedPrivateCliLineageSuccessor({root:ROOT,path,before:read(old+role+'.before.txt')});
  assert.equal(result.after,read(old+role+'.after.txt'));assert.equal(result.currentAfter,read(path));assert.equal(result.laterHistories.length,1);
  assert.equal(result.laterHistories[0].before,result.after);assert.equal(result.laterHistories[0].inverse,result.after);
  assert.ok(result.laterHistories[0].sourceSuccessorChain.chain.length);assert.equal(result.semanticAuthority,false);
 }
});
test('actual complete native DATA producer preserves historical rows and independently checks current native bindings',{timeout:60000},()=>{
 const result=preparePrivateParserDataCurrentSources();assert.equal(result.files.length,9);assert.equal(result.sourceAuthority,false);assert.equal(result.runtimeAuthority,false);
 for(const row of result.files){assert.equal(row.inverse,row.before);assert.equal(row.currentAfter,read(row.path));assert.equal(row.currentNativeBindings.nativeSemanticScopeChecked,true);assert.ok(Array.isArray(row.laterHistories));}
 for(const path of ['tools/translation/exact-source-successors-20261103.mjs','tools/translation/exact-source-successor-data-20261103.mjs','tools/translation/exact-source-history-epoch-20261103.mjs'])assert.ok(result.inputs.some(row=>row.path===path));
});
test('generic epochs retain exactly two original phase names, including an empty source module',{timeout:60000},()=>{
 const before='',after='export const value=1;\n',result=exactSourceHistoryEpoch({path:'new.mjs',before,after,current:before,language:'JavaScript'});
 assert.equal(result.after,after);assert.equal(result.inverse,before);assert.deepEqual(result.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of result.stages)assert.equal(stage.inverse,before);assert.equal(result.semanticAuthority,false);
});
