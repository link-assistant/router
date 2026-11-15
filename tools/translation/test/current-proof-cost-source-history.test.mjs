import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,openSync,closeSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {currentProofCostSourceHistory,currentProofCostConsumerHistory,readProofCostScopeHistory,readProofRetainedCostHistory} from './current-proof-cost-source-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const url=new URL('../private-native-proof-json.mjs',import.meta.url),current=()=>readFileSync(url,'utf8');
test('cost history composes complete original freezer scanner and guarded source equations',{timeout:60000},()=>{
 const source=current(),history=currentProofCostSourceHistory(source);
 assert.equal(history.actual,source);assert.equal(history.inverse,source);
 assert.equal(history.source,history.pair.original);
 assert.equal(createHash('sha256').update(history.source).digest('hex'),history.pair.originalSha256);
 assert.equal(history.scanner.original,history.pair.after);
 assert.equal(history.source.includes('createRetainedPrivateScalarCostStore'),false);
 assert.equal(history.source.includes('privateNativeProofJsonDataWithinBudget'),false);
 assert.equal(source.includes('createRetainedPrivateScalarCostStore'),true);
 assert.equal(source.includes('privateNativeProofJsonDataWithinBudget'),true);
 assert.deepEqual(history.stages.map(row=>row.phase),['language','repository']);
 for(const stage of history.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.deepEqual(stage.trace.map(row=>row.phase),['language','repository']);}
 assert.equal(history.sourceAuthority,false);assert.equal(history.runtimeAuthority,false);
 for(const changed of [source+'\n// changed\n',source.replace("'./guarded-proof-lexing-intrinsics.mjs'","'./foreign.mjs'"),source.replace('try{return withinNativeBudget(value);}','try{return true;}')]){assert.notEqual(changed,source);assert.throws(()=>currentProofCostSourceHistory(changed),/source|pin|lexing/);}
});
test('comparison readers preserve native bytes paths descriptors and unrelated complete sources',{timeout:60000},t=>{
 const source=current(),directory=mkdtempSync(join(tmpdir(),'router-proof-history-read-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const copy=join(directory,'private-native-proof-json.mjs');writeFileSync(copy,source);
 for(const read of [readProofCostScopeHistory,readProofRetainedCostHistory]){
  const history=read(url,'utf8');assert.notEqual(history,source);
  assert.equal(read(fileURLToPath(url),{encoding:'utf8'}),history);
  assert.deepEqual(read(url),readFileSync(url));
  assert.equal(read(copy,'utf8'),source);
  const descriptor=openSync(url,'r');try{assert.equal(read(descriptor,'utf8'),source);}finally{closeSync(descriptor);}
  assert.throws(()=>read(join(directory,'missing'),'utf8'),{code:'ENOENT'});
  assert.throws(()=>read(url,{encoding:'invalid-encoding'}),{code:'ERR_INVALID_ARG_VALUE'});
 }
 assert.equal(current(),source);
});
test('scoped consumers retain complete operation bridge history and refuse changed source',{timeout:60000},()=>{
 for(const name of ['builtin-debug-ast-route.mjs','builtin-derive-bang-footprints.mjs']){
  const consumer=new URL('../'+name,import.meta.url),source=readFileSync(consumer,'utf8'),history=currentProofCostConsumerHistory(source);
  assert.equal(history.actual,source);assert.equal(history.inverse,source);assert.equal(history.path,'tools/translation/'+name);
  assert.equal(source.includes('operation-proof-byte-bridge.mjs'),true);assert.equal(history.source.includes('operation-proof-byte-bridge.mjs'),false);
  for(const stage of history.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.deepEqual(stage.trace.map(row=>row.phase),['language','repository']);}
  assert.equal(history.sourceAuthority,false);assert.equal(history.runtimeAuthority,false);
  for(const read of [readProofCostScopeHistory,readProofRetainedCostHistory])assert.deepEqual(read(consumer),readFileSync(consumer));
  assert.throws(()=>currentProofCostConsumerHistory(source+'\n// changed\n'),/unregistered complete current source/);
  assert.throws(()=>currentProofCostConsumerHistory(source.replace('operation-proof-byte-bridge.mjs','foreign.mjs')),/registered current proof consumer/);
  assert.equal(readFileSync(consumer,'utf8'),source);
 }
});
