import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,Hash} from 'node:crypto';
import {prepareCloneEnclosingSources,deriveCloneEnclosingSourceHistory,deriveCloneEnclosingNativeSourceHistory,deriveCloneEnclosingContextSourceRules} from '../prepare-clone-enclosing-source-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {restoreReceivingSourceHistory} from './fixtures/current-receiving-source-history.mjs';
import {legacyProofConsumerSource,restoreCurrentEnclosingNamespaceSource} from './fixtures/native-proof-json-format.mjs';

const root=new URL('../../../',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const pins=new Map([
 ['tools/translation/builtin-clone-ast-route.mjs','a6430936d7403ba1b63e3c0f044005353ed020214689d3e0a782cf55b7f969a2'],
 ['tools/translation/builtin-derive-bang-footprints.mjs','5acb7995868d92fa6952004248a2823f32eb2e3c2399e8282b5bfc16a7bdcfec'],
 ['tools/translation/derive-enclosing-namespace-context.mjs','676dd12bc5e324d8c4785b477c49486c8c43b9f9c3467483e0fc261e6d527e7e'],
]);

test('all three complete Clone sources retain independently pinned predecessors and serialized CST inverses',{timeout:60000},()=>{
 const plan=prepareCloneEnclosingSources();
 assert.equal(plan.rows.length,3);
 assert.equal(plan.typescriptVersion,'5.9.3');
 assert.equal(plan.productionExecutableGain,0);
 assert.equal(plan.methodExecutionQualified,false);
 for(const row of plan.rows){
  assert.equal(row.current,readFileSync(new URL(row.path,root),'utf8'));
  assert.equal(row.after,row.current);
  assert.equal(row.beforeSha256,pins.get(row.path));
  assert.equal(hash(row.before),pins.get(row.path));
  assert.equal(row.inverse,row.before);
  assert.equal(row.sourceAuthority,false);
  assert.equal(row.runtimeAuthority,false);
  assert.equal(row.equation.inverse,row.before);
  assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.equation.stages){
   assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
   assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
   assert.equal(stage.inverse,stage.before);
  }
  for(const old of row.unchangedOriginalFunctions)assert.equal(old.after,old.before);
  if(row.path.endsWith('/derive-enclosing-namespace-context.mjs')){
   assert.deepEqual(row.changedOriginalFunctions.map(value=>value.name),[
    'createUnscopedDeriveEnclosingNamespaceContext','deriveEnclosingNamespaceOutputAt',
    'originalDeriveEnclosingNamespaceOutputs','enclosingSelectedOwner',
    'proveDeriveEnclosingNamespaceEffect',
   ]);
  }else{
   assert.equal(row.changedOriginalFunctions.length,0);
   assert.ok(row.after.startsWith(row.before));
  }
 }
});

test('foreign suffixes truncated sources changed bytes and another file cannot borrow a Clone source equation',{timeout:60000},()=>{
 for(const path of pins.keys()){
  const source=readFileSync(new URL(path,root),'utf8');
  for(const changed of [source+'\n// foreign extension\n',source.slice(0,-1),source.replace('function','functioN')]){
   assert.notEqual(changed,source);
   assert.throws(()=>deriveCloneEnclosingSourceHistory({path,source:changed}),/unregistered complete source/);
  }
  const another=[...pins.keys()].find(value=>value!==path);
  assert.throws(()=>deriveCloneEnclosingSourceHistory({path:another,source}),/unregistered complete source/);
 }
 assert.throws(()=>deriveCloneEnclosingSourceHistory({path:[...pins.keys()][0],source:{}}),/complete primitive source/);
});

test('overlapping complete context anchors compose in declared order with a complete inverse',{timeout:60000},()=>{
 const path='tools/translation/derive-enclosing-namespace-context.mjs',source=readFileSync(new URL(path,root),'utf8');
 const native=deriveCloneEnclosingNativeSourceHistory({path,source}),composition=deriveCloneEnclosingContextSourceRules(native.before);
 assert.equal(composition.after,source);
 assert.equal(composition.before,native.before);
 assert.equal(composition.middle,native.before);
 assert.equal(composition.inverse,native.before);
 assert.deepEqual(composition.trace.map(row=>row.id),native.rules.map(row=>row.id));
 assert.equal(composition.sourceAuthority,false);
 assert.equal(composition.runtimeAuthority,false);
 const anchors=native.rules.map(rule=>({rule,at:native.before.indexOf(rule.before)}));
 assert.ok(anchors.some((a,i)=>anchors.some((b,j)=>i!==j&&a.at>=0&&b.at>=0&&a.at<b.at+b.rule.before.length&&b.at<a.at+a.rule.before.length)));
 const [first]=native.rules;
 assert.throws(()=>deriveCloneEnclosingContextSourceRules(native.before.replace(first.before,'')),/complete exact rule anchor|Complete ordered Clone context anchor/);
 assert.throws(()=>deriveCloneEnclosingContextSourceRules(source),/complete exact rule anchor|Complete ordered Clone context anchor/);
});

test('the actual Clone append restores through the original whole Debug history without JSON or Hash callbacks',{timeout:60000},()=>{
 const path='tools/translation/builtin-derive-bang-footprints.mjs',source=readFileSync(new URL(path,root),'utf8');
 const stringify=JSON.stringify,update=Hash.prototype.update,apply=Reflect.apply,retained=[];
 let jsonCalls=0,hashCalls=0,historical,enclosing,byteWrapper;
 try{
  JSON.stringify=function(...args){jsonCalls++;return apply(stringify,this,args);};
  Hash.prototype.update=function(...args){hashCalls++;return apply(update,this,args);};
  historical=restoreReceivingSourceHistory(source,'proof-consumer',(name,value)=>retained.push({name,value}));
  byteWrapper=restoreReceivingSourceHistory(source,'clone-enclosing-extension');
  enclosing=restoreCurrentEnclosingNamespaceSource(source);
 }finally{JSON.stringify=stringify;Hash.prototype.update=update;}
 assert.equal(jsonCalls,0);
 assert.equal(hashCalls,0);
 assert.equal(retained.length,1);
 assert.equal(retained[0].value.current,source);
 assert.equal(retained[0].value.inverse,source);
 assert.equal(retained[0].value.historical,historical);
 const layer=retained[0].value.provenance.cloneSourceHistory;
 assert.equal(hash(layer.byteWrapperOutput),pins.get(path));
 assert.equal(byteWrapper,layer.byteWrapperOutput);
 assert.equal(restoreReceivingSourceHistory(byteWrapper,'clone-enclosing-extension'),byteWrapper);
 assert.ok(source.startsWith(enclosing),'the original Debug inverse remains a complete literal prefix');
 assert.equal(layer.beforeSha256,pins.get(path));
 assert.equal(layer.afterSha256,hash(source));
 assert.equal(layer.sourceAuthority,false);
 assert.equal(hash(legacyProofConsumerSource(source)),'11372586893462cd262c55902b268f71568d237eceb12283cd9b9724b36c1514');
 assert.ok(!enclosing.includes('export function proveBuiltinCloneEnclosingNamespace('));
 assert.ok(!enclosing.includes('export function proveBuiltinDebugEnclosingNamespace('));
 for(const changed of [source+'\n// foreign extension\n',source.slice(0,-1)]){
  assert.throws(()=>restoreReceivingSourceHistory(changed,'proof-consumer'),/unregistered complete current source/);
  assert.throws(()=>restoreReceivingSourceHistory(changed,'clone-enclosing-extension'),/unregistered complete current source/);
  assert.throws(()=>restoreCurrentEnclosingNamespaceSource(changed),/unregistered complete current source/);
 }
});
