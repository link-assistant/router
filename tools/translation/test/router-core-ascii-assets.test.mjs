import {assertRuntimeImportSourceComposition} from './runtime-import-source-composition.mjs';
import {assertOwnedCorePrivateAnalysisSourceComposition} from './owned-core-private-analysis-source-composition.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs,{readFileSync} from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {createHash} from 'node:crypto';
import {hostRuntimeAssetsNamedDataAliases} from '../host-assets.mjs';
import {hostCoreAsciiRuntimeAssets,coreAsciiAssetReadSchedule} from '../ascii-runtime-assets.mjs';
import {composeCoreAsciiAssets} from '../prepare-core-ascii-assets.mjs';
import {currentAsciiSourcePlan as prepareCurrentCoreAsciiReverseAssets} from './current-ascii-source-plan.mjs';
import {ownedCoreAsciiRuntimeSources,ownedCoreRuntimeSources} from '../js-to-rust/owned-core-source.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
const names=['string-iterator-runtime.mjs','whitespace-data.mjs','string-iterator-runtime.d.mts'];
const hash=source=>createHash('sha256').update(source).digest('hex');
const bunMock=process.versions.bun?(await import('bun:test')).mock:null;
const originalFsNamespace=bunMock?{...await import('node:fs')}:null;
function observedRead(run,change){
 const original=fs.readFileSync,tape=[];
 const observed=function(path,...args){const source=Reflect.apply(original,this,[path,...args]),name=path instanceof URL?path.pathname:String(path);tape.push(name);return change?change(name,source):source;};
 try{
  if(bunMock)bunMock.module('node:fs',()=>({...originalFsNamespace,readFileSync:observed}));else{fs.readFileSync=observed;syncBuiltinESMExports();}
  return {value:run(),tape};
 }finally{
  if(bunMock)bunMock.module('node:fs',()=>originalFsNamespace);else{fs.readFileSync=original;syncBuiltinESMExports();}
  assert.equal(readFileSync,original,'the actual named filesystem binding is restored');
 }
}
test('selected ASCII producer retains all complete original native nodes current layers and full CST inverses',{timeout:60000},()=>{
 const current=prepareCurrentCoreAsciiReverseAssets(),plan=current.layers[1],reverse=current.birth;assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.files.length,3);assert.equal(plan.semanticAuthority,false);assert.equal(plan.fullBuilderCallbackParity,false);
 assert.deepEqual(plan.selection.statements.map(row=>row.name),names);assert.deepEqual(plan.selection.nativeBindings.unboundIdentifiers,[]);
 for(const row of plan.files){assert.equal(row.current,current.files.find(final=>final.path===row.path).after,row.path);assert.equal(row.beforeSha256,hash(row.before));assert.equal(row.afterSha256,hash(row.after));assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.nativeCopies.length,2);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));assert.deepEqual(row.trace,row.stages.flatMap(stage=>stage.trace));for(const stage of row.stages){assert.equal(stage.completeInverse,true);assert.deepEqual(stage.trace.map(part=>part.phase),['language','repository']);}}
 for(const row of reverse.files){assert.equal(row.current,current.files.find(final=>final.path===row.path).after);assert.equal(row.inverse,row.before);}
 assert.equal(current.layers.length,6);assertRuntimeImportSourceComposition(current.layers[4],Object.fromEntries(current.layers.slice(0,4).flatMap(layer=>layer.files.map(row=>[row.path,row]))),Object.fromEntries(current.files.map(row=>[row.path,row])));assertOwnedCorePrivateAnalysisSourceComposition(current.layers[3],Object.fromEntries(current.layers.slice(0,3).flatMap(layer=>layer.files.map(row=>[row.path,row]))),Object.fromEntries(current.files.map(row=>[row.path,row])));
 const prior=Object.fromEntries(reverse.files.map(row=>[row.path,row]));assert.equal(composeCoreAsciiAssets(prior).historicalSources,prior);assert.throws(()=>composeCoreAsciiAssets({...prior,'tools/translation/js-to-rust/owned-core-source.mjs':{after:'changed'}}),/preceding complete source/);
});
test('new selected schedule matches all three complete old-builder outputs without unrelated asset reads',{timeout:60000},()=>{
 const original=hostRuntimeAssetsNamedDataAliases(),observed=observedRead(()=>hostCoreAsciiRuntimeAssets());assert.deepEqual([...observed.value],[...original].filter(([name])=>names.includes(name)));
 const schedule=coreAsciiAssetReadSchedule();assert.equal(schedule.fullBuilderCallbackParity,false);assert.equal(schedule.hostCheckerExecuted,false);assert.equal(schedule.unrelatedAssetReads,false);assert.deepEqual(schedule.selectedAssets,names);
 const relative=observed.tape.map(path=>path.split('/tools/translation/').at(-1));assert.deepEqual(relative,['ascii-runtime-assets.mjs','host-assets.mjs','extensions/string-iterator-runtime.mjs','extensions/whitespace-data.mjs']);
 const expected=ownedCoreAsciiRuntimeSources('js/runtime','ts/runtime');assert.equal(expected.length,6);for(const name of names)for(const prefix of ['js/runtime','ts/runtime'])assert.equal(expected.find(row=>row.path===prefix+'/'+name).source,original.get(name));assert.equal(ownedCoreRuntimeSources().some(row=>row.path.endsWith('/string-iterator-runtime.mjs')),false);
 const ts=ownershipCompiler();for(const [name,source]of observed.value){const file=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,name.endsWith('.mts')?ts.ScriptKind.TS:ts.ScriptKind.JS);assert.deepEqual(file.parseDiagnostics,[]);}
});
test('every complete selected runtime and producer source stays fresh and unknown native hooks refuse',{timeout:60000},()=>{
 for(const suffix of ['ascii-runtime-assets.mjs','host-assets.mjs','extensions/string-iterator-runtime.mjs','extensions/whitespace-data.mjs']){
  let changed=false;assert.throws(()=>observedRead(()=>hostCoreAsciiRuntimeAssets(),(name,source)=>{if(name.endsWith('/'+suffix)){changed=true;return source+'\n';}return source;}),/asset producer source changed|selected asset source changed/);assert.equal(changed,true);
 }
 const old=Object.getOwnPropertyDescriptor(Array.prototype,'filter');let touched=0;try{Object.defineProperty(Array.prototype,'filter',{...old,value:function(...args){touched++;return Reflect.apply(old.value,this,args);}});assert.throws(()=>hostCoreAsciiRuntimeAssets(),/host|intrinsics|source/i);assert.equal(touched,0);}finally{Object.defineProperty(Array.prototype,'filter',old);}
 assert.equal(hostCoreAsciiRuntimeAssets().size,3);
});
test('all source hashes receive complete fresh selected strings on every independent call',{timeout:60000},()=>{
 const prototype=Object.getPrototypeOf(createHash('sha256')),field=Object.getOwnPropertyDescriptor(prototype,'update'),tapes=[];let selected=[];
 try{Object.defineProperty(prototype,'update',{...field,value:function(source,...rest){if(typeof source==='string')selected.push(source);return Reflect.apply(field.value,this,[source,...rest]);}});for(let at=0;at<2;at++){selected=[];const result=hostCoreAsciiRuntimeAssets();tapes.push(selected.slice());for(const source of result.values())assert.ok(selected.includes(source));for(const path of ['ascii-runtime-assets.mjs','host-assets.mjs'])assert.ok(selected.includes(readFileSync(new URL('../'+path,import.meta.url),'utf8')));}}
 finally{Object.defineProperty(prototype,'update',field);}
 assert.deepEqual(tapes[1],tapes[0]);
});
