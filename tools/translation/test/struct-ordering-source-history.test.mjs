import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {derivePinnedRepositorySourceEvolution} from '../pinned-repository-source-evolution.mjs';
import {deriveStructOrderingSourceHistory} from '../struct-ordering-source-history.mjs';
import {cloneEnclosingComparisonHistory,readCloneEnclosingComparisonSource} from './fixtures/clone-enclosing-comparison-history.mjs';
import {deriveCloneEnclosingNativeSourceHistory} from '../prepare-clone-enclosing-source-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {restoreReceivingSourceHistory} from './fixtures/current-receiving-source-history.mjs';
import {legacyProofConsumerSource} from './fixtures/native-proof-json-format.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const subjects=[
 ['builtin-derive-bang-footprints.mjs','e90460283e07d0d08ef4548e5c8aa9f1f43e7be9374b2c2e2547e7db1705c474'],
 ['builtin-ordering-ast-route.mjs','ee817bbba54f916cada509ad9b63da474e8f6c78b88d633d518a706217ac88e7'],
];
function sourcePair(name,pin){
 const profile=new URL('../source-profiles/struct-ordering-source-history/'+name.replace('.mjs','.rules.json'),import.meta.url);
 const bytes=readFileSync(profile);assert.equal(hash(bytes),pin);
 const data=JSON.parse(bytes),current=readFileSync(new URL('../'+name,import.meta.url),'utf8');
 let before=current;
 for(const edit of [...data.edits].reverse()){
  assert.equal(before.split(edit.after).length,2);before=before.replace(edit.after,()=>edit.before);
 }
 return {profile,data,current,before};
}

test('installed struct-ordering sources and their exact preceding comparison layers retain complete inverses',{timeout:60000},()=>{
 for(const [name,pin]of subjects){
  const {profile,data,current,before}=sourcePair(name,pin);
  const row=derivePinnedRepositorySourceEvolution(ownershipCompiler(),{
   path:data.path,source:before,profile,profileSha256:pin,
  });
  assert.equal(row.after,current);assert.equal(row.inverse,before);
  assert.equal(hash(before),data.beforeSha256);assert.equal(hash(current),data.afterSha256);
  assert.deepEqual(row.languageRules,[]);
  assert.deepEqual([...new Set(row.trace.map(stage=>stage.phase))],['repository']);
  assert.equal(row.productionExecutableGain,0);assert.equal(row.semanticAuthority,false);
  for(const source of [before,current]){
   const history=deriveStructOrderingSourceHistory(ownershipCompiler(),{path:data.path,source});
   assert.equal(history.before,before);assert.equal(history.after,current);
   assert.equal(history.current,source);assert.equal(history.inverse,before);
  }
  const retained=[],historical=restoreReceivingSourceHistory(current,'proof-consumer',(name,value)=>retained.push({name,value}));
  assert.equal(retained.length,1);assert.equal(retained[0].value.inverse,current);
  assert.equal(retained[0].value.provenance.structOrderingSourceHistory.before,before);
  assert.equal(retained[0].value.provenance.structOrderingSourceHistory.inverse,before);
  const preceding=[];
  assert.equal(restoreReceivingSourceHistory(before,'proof-consumer',(_name,value)=>preceding.push(value)),historical);
  assert.equal(preceding.length,1);assert.equal(preceding[0].current,before);
  assert.equal(preceding[0].inverse,before);
 }
 assert.equal(hash(legacyProofConsumerSource(readFileSync(new URL('../builtin-derive-bang-footprints.mjs',import.meta.url),'utf8'))),
  '11372586893462cd262c55902b268f71568d237eceb12283cd9b9724b36c1514');
});

test('changed struct-ordering predecessors and unregistered current extensions cannot acquire comparison history',{timeout:60000},()=>{
 for(const [name,pin]of subjects){
  const {profile,data,current,before}=sourcePair(name,pin);
  assert.throws(()=>derivePinnedRepositorySourceEvolution(ownershipCompiler(),{
   path:data.path,source:before+'\n',profile,profileSha256:pin,
  }),/unregistered complete source predecessor/);
  assert.throws(()=>restoreReceivingSourceHistory(current+'\n// unrelated later source\n','proof-consumer'),/unregistered complete current source/);
  assert.throws(()=>deriveStructOrderingSourceHistory(ownershipCompiler(),{path:data.path,source:current+'\n'}),/unregistered complete source/);
  assert.throws(()=>restoreReceivingSourceHistory(current.replace('function','functioN'),'proof-consumer'),/unregistered complete current source/);
 }
});

test('the original complete Clone proposal and current ordering have distinct native and serialized source equations',{timeout:60000},()=>{
 const row=cloneEnclosingComparisonHistory(),path=new URL('../../../'+row.path,import.meta.url);
 assert.equal(row.current,readFileSync(path,'utf8'));
 assert.equal(readCloneEnclosingComparisonSource(path,'utf8'),row.historical);
 assert.deepEqual(readCloneEnclosingComparisonSource(path),readFileSync(path));
 assert.throws(()=>readCloneEnclosingComparisonSource(new URL('./absent-comparison-input.mjs',import.meta.url),'utf8'),{code:'ENOENT'});
 assert.notEqual(row.current,row.historical);
 assert.equal(row.history.before,row.historical);assert.equal(row.history.after,row.current);
 assert.equal(row.equation.inverse,row.historical);
 assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.equation.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
  assert.equal(stage.inverse,stage.before);
 }
 assert.equal(deriveCloneEnclosingNativeSourceHistory({path:row.path,source:row.historical}).after,row.historical);
 assert.throws(()=>deriveCloneEnclosingNativeSourceHistory({path:row.path,source:row.current}),/unregistered complete source/);
 assert.equal(row.sourceAuthority,false);assert.equal(row.runtimeAuthority,false);
 assert.equal(row.productionExecutableGain,0);
});
