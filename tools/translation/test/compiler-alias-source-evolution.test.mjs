import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deriveCompilerAliasSourceEvolution,COMPILER_ALIAS_ORIGINAL_CURRENT_PINS} from '../compiler-alias-source-evolution.mjs';
import {restoreCompilerDataAliasHistory} from './fixtures/compiler-data-alias-history.mjs';
import {prepareCompilerAliasHistory} from '../prepare-compiler-alias-history.mjs';
import {prepareBuiltinSourceMetaStringKeys} from '../prepare-builtin-source-meta-string-keys.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const historicalPins={
 'private-frozen-json.mjs':'0205c1bcb646e4565bec6486d916e65a7739f4b5bd635623c8179345fa1d86c8',
 'derive-bang-context.mjs':'1575931b64d4b0db54b8fbd37211413d37b8b8628535074d697c6e523897eb3c',
 'derive-enclosing-namespace-context.mjs':'8aea764e18b6277b9c48754b83fbd3391849fd112dd0d1e5fd7d40ba365c5c9c',
 'builtin-derive-bang-footprints.mjs':'c9400cdea6e12c08c0cb132745f42b31886f10eac43e59e437ef15cfe97ac234',
 'original-json-intrinsics.mjs':'9c5255ac206087959f2cf2e2c3bd9eb9ad096a2d04648ff7bbdbaefee8cda219',
 'private-data-freeze.mjs':'6ffa5ef6aa8c8ab86d77b01c2e82376275c81a37d7c4632762c5f9571e7acb92',
};
test('all original current pins retain exact complete inverses through declared source evolution',{timeout:60000},()=>{
 let changed=0;
 for(const [name,pin] of Object.entries(COMPILER_ALIAS_ORIGINAL_CURRENT_PINS)){
  const current=read(name),row=deriveCompilerAliasSourceEvolution(current,name);
  if(!row){assert.equal(hash(current),pin);continue;}
  changed++;assert.equal(row.current,current);assert.equal(row.text,current);assert.equal(row.inverse,row.source);assert.equal(hash(row.source),pin);assert.equal(row.sourceAuthority,false);assert.equal(row.runtimeAuthority,false);
  assert.equal(deriveCompilerAliasSourceEvolution(row.source,name),null);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);
  for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.source);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.text);assert.equal(stage.inverse,stage.source);}
 }
 assert.equal(changed,3);
});
test('every actual history reader preserves its independently pinned complete historical bytes',{timeout:60000},()=>{
 for(const [name,pin] of Object.entries(historicalPins)){
  const source=read(name),vectors=[],before=restoreCompilerDataAliasHistory(source,name,(kind,value)=>vectors.push({kind,value}));
  assert.equal(hash(before),pin);assert.equal(vectors.length,1);const row=vectors[0].value;
  assert.equal(row.source,source);assert.equal(row.historical,before);assert.equal(row.row.currentSha256,COMPILER_ALIAS_ORIGINAL_CURRENT_PINS[name]);assert.equal(row.row.historicalSha256,pin);assert.equal(row.inverse,source);
  assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,source);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,before);
 }
});
test('unrelated bodies imports and changed wrapper callbacks remain refused',{timeout:60000},()=>{
 for(const name of Object.keys(COMPILER_ALIAS_ORIGINAL_CURRENT_PINS))assert.throws(()=>deriveCompilerAliasSourceEvolution(read(name)+'\n// unrelated change\n',name),/pin|declared/u);
 const frozen=read('private-frozen-json.mjs').replace("'./guarded-proof-lexing-intrinsics.mjs'","'./foreign-lexing-intrinsics.mjs'");assert.throws(()=>deriveCompilerAliasSourceEvolution(frozen,'private-frozen-json.mjs'),/lexing import/u);
 const enclosing=read('derive-enclosing-namespace-context.mjs');
 for(const text of [enclosing.replace("'./schemars-enclosing-output-dispatch.mjs'","'./foreign-dispatch.mjs'"),enclosing.replace('withDefaultProofByteConsumers(()=>','withDefaultProofByteConsumers(async()=>'),enclosing.replace('withDefaultProofByteConsumers(()=>createUnscopedDeriveEnclosingNamespaceContext({deriveContext}))','withDefaultProofByteConsumers(()=>foreign({deriveContext}))')])assert.throws(()=>deriveCompilerAliasSourceEvolution(text,'derive-enclosing-namespace-context.mjs'),/required|wrapper/u);
});
test('the complete fixture producer retains all six original current and historical pins',{timeout:60000},()=>{
 const plan=prepareCompilerAliasHistory();assert.equal(plan.records.length,6);assert.equal(plan.sourceAuthority,false);assert.equal(plan.runtimeAuthority,false);
 for(const row of plan.records){assert.equal(row.currentSha256,COMPILER_ALIAS_ORIGINAL_CURRENT_PINS[row.name]);assert.equal(row.historicalSha256,historicalPins[row.name]);assert.equal(hash(row.completeCurrent),row.currentSha256);assert.equal(hash(row.completeHistorical),row.historicalSha256);}
 for(const row of plan.files){assert.equal(row.before,row.after);assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);}
});
test('the scanner comparison retains the complete physical source and guarded import inverse',{timeout:60000},()=>{
 const plan=prepareBuiltinSourceMetaStringKeys(),row=plan.scannerImportSourceEvolution,current=read('private-native-proof-json.mjs');
 assert.equal(plan.originalSerializerAPIsUnchanged,true);assert.equal(row.current,current);assert.equal(row.text,current);assert.equal(row.inverse,row.source);assert.equal(row.consumerBodyUnchanged,true);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.source);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.text);assert.equal(stage.inverse,stage.source);}
 assert.equal(plan.support[1].source,current);assert.equal(plan.scannerStages[0].after,row.source);assert.equal(plan.scannerStages[1].before,row.source);assert.equal(plan.scannerStages[1].after,current);
});
