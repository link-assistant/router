import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolveModuleGraph} from '../project.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {PRODUCTION_PROFILE,compilationProfile} from '../cfg-profile.mjs';
import {proveConditionalNominalTarget,conditionalNominalTargetFacts,conditionalNominalTargetOriginals} from '../source-conditional-nominal-targets.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
const variants='#[cfg(windows)] struct Local(u8); #[cfg(not(windows))] struct Local(u16);';
const drop='impl Drop for Local {fn drop(&mut self){}}';
function original(source,{profile=PRODUCTION_PROFILE,file='src/lib.rs',path=[]}={}){
 const graph=resolveModuleGraph({entry:file,paths:[file],readSource:()=>source,compilationProfile:profile});
 const module=graph.modules.find(module=>JSON.stringify(module.path)===JSON.stringify(path));assert.ok(module);
 const binding=resolveModuleBindings({modules:graph.modules,compilationProfile:profile});
 const implementations=extractImplDeclarations(source,{sourcePath:file,modulePath:module.path,sourceView:module.sourceView,compilationProfile:profile}).implementations;
 return {source,graph,binding,module,implementation:implementations.find(row=>row.traitPath?.join('::')==='Drop')??implementations[0]};
}
const input=value=>({implementation:value.implementation,module:value.module,modules:value.graph.modules,sourceScopes:value.binding.scopes});
const prove=value=>proveConditionalNominalTarget(value.implementation,input(value));
const facts=(proof,value)=>conditionalNominalTargetFacts(proof,input(value));
const originals=(proof,value)=>conditionalNominalTargetOriginals(proof,input(value));
function retain(name,value){
 const directory=process.env.ROUTER_CONDITIONAL_TARGET_VECTORS;if(!directory)return;
 mkdirSync(directory,{recursive:true});writeFileSync(directory+'/'+name+'.json',JSON.stringify(value),{flag:'wx'});
}

test('neutral source retains both original cfg alternatives without choosing a nominal layout or availability',{timeout:5000},()=>{
 const value=original(variants+drop),proof=prove(value),evidence=facts(proof,value),backing=originals(proof,value);
 assert.deepEqual(evidence.family,['crate','Local']);assert.deepEqual(evidence.alternatives.map(row=>row.configuration.status),['unknown','unknown']);
 assert.equal(evidence.alternatives.length,2);assert.deepEqual(evidence.alternatives.map(row=>row.kind),['struct','struct']);
 assert.equal(backing.source,value.source);assert.equal(backing.originalImpl.start,value.implementation.span.start);
 assert.deepEqual(backing.binding.evidence,backing.alternatives.map(row=>({source:value.module.file,span:{start:row.item.start,end:row.item.end},via:'declaration'})));
 for(const key of ['layoutSelected','availabilityProved','copyAuthority','noDropAuthority','namespaceAuthority','runtimeAuthority'])assert.equal(evidence[key],false);
 for(const key of ['ancestorAndGlobalOutputClosureRequired','nestedImplementationClosureRequired','nestedMacroOutputClosureRequired'])assert.equal(evidence.residuals[key],true);
 assert.ok(Object.isFrozen(backing));assert.ok(Object.isFrozen(backing.alternatives[0].item.tokens));
 retain('neutral-complete-alternatives',{source:value.source,binding:value.binding,implementation:value.implementation,proof,evidence,backing});
});

test('explicit profiles preserve every source alternative and its exact original cfg evidence',{timeout:5000},()=>{
 const rows=[];for(const windows of [false,true]){
  const value=original(variants+drop,{profile:compilationProfile({flags:{test:false,windows}})}),proof=prove(value),evidence=facts(proof,value);
  assert.deepEqual(evidence.alternatives.map(row=>row.configuration.status),windows?['active','inactive']:['inactive','active']);
  assert.equal(evidence.layoutSelected,false);assert.equal(evidence.availabilityProved,false);
  assert.equal(originals(proof,value).alternatives.length,2);rows.push({source:value.source,proof,evidence,backing:originals(proof,value)});
 }retain('explicit-profiles-no-layout-selection',rows);
});

test('genuine inline view path is part of the lexical family and no caller item list supplies alternatives',{timeout:5000},()=>{
 const value=original('mod platform {'+variants+drop+'}',{path:['platform']}),proof=prove(value);
 assert.deepEqual(facts(proof,value).family,['crate','platform','Local']);
 value.module.items=[];value.module.allItems=[];
 assert.deepEqual(facts(proof,value).family,['crate','platform','Local']);
 retain('inline-original-view',{source:value.source,proof,evidence:facts(proof,value),backing:originals(proof,value)});
});

test('the complete unchanged bounded_process original retains both Owned layouts and every body-output obligation',{timeout:5000},()=>{
 const file='src/bounded_process.rs',source=readFileSync(repositorySourceURL(file,new URL('../../../',import.meta.url)),'utf8'),value=original(source,{file}),proof=prove(value),evidence=facts(proof,value),backing=originals(proof,value);
 assert.deepEqual(evidence.family,['crate','Owned']);assert.equal(evidence.sourceSha256,hash(source));
 assert.equal(evidence.alternatives.length,2);assert.deepEqual(evidence.alternatives.map(row=>row.configuration.status),['unknown','unknown']);
 assert.ok(backing.alternatives.some(row=>source.slice(row.item.start,row.item.end).includes('std::process::Child')));
 assert.ok(backing.alternatives.some(row=>source.slice(row.item.start,row.item.end).includes('ChildWrapper')));
 assert.ok(evidence.residuals.originalBodyMarkers.some(row=>row.text==='format!'||row.text==='!'));
 assert.ok(source.slice(backing.originalImpl.start,backing.originalImpl.end).includes('format!'));
 assert.equal(evidence.noDropAuthority,false);assert.equal(evidence.namespaceAuthority,false);
 retain('whole-original-bounded-process',{file,source,context:'complete unchanged standalone original file; not the full Router ancestor graph',runtimeAdmissionClaim:false,graphDiagnostics:value.graph.diagnostics,binding:value.binding,proof,evidence,backing});
});

test('private proof copies proxies foreign callers and changed original resolver origins are refused',{timeout:5000},()=>{
 const value=original(variants+drop),proof=prove(value),foreign=original(variants+drop);
 for(const candidate of [structuredClone(proof),{...proof},new Proxy(proof,{})])assert.throws(()=>facts(candidate,value),/private original target proof/);
 assert.throws(()=>facts(proof,foreign),/caller association/);
 assert.throws(()=>conditionalNominalTargetOriginals(proof,{...input(value),implementation:structuredClone(value.implementation)}),/caller association/);
 assert.throws(()=>proveConditionalNominalTarget(value.implementation,{...input(value),sourceScopes:structuredClone(value.binding.scopes)}),/private resolved source scopes/);
 for(const change of [{source:value.source+' '},{file:'src/other.rs'},{path:['other']},{sourceView:structuredClone(value.module.sourceView)},{compilationProfile:compilationProfile({flags:{windows:true}})},{configurationCondition:'unknown'}]){
  const module={...value.module,...change};assert.throws(()=>proveConditionalNominalTarget(value.implementation,{...input(value),module,modules:[module]}),/private|original|unsealed|match|unresolved/);
 }
 retain('private-origin-controls',{source:value.source,proof,evidence:facts(proof,value)});
});

test('same-identity implementation metadata body span target header and profile mutations cannot reuse a proof',{timeout:5000},()=>{
 const rows=[];
 for(const change of [implementation=>{implementation.bodySpan.end--;},implementation=>{implementation.headerSpan.end--;},implementation=>{implementation.typePath=['Other'];},implementation=>{implementation.methods[0].source+=' ';},implementation=>{implementation.diagnostics=[];}]){
  const value=original(variants+drop),proof=prove(value);change(value.implementation);
  assert.throws(()=>facts(proof,value),/differs|changed/);rows.push({implementation:value.implementation,proof});
 }
 const value=original(variants+drop),proof=prove(value);value.module.compilationProfile=compilationProfile({flags:{windows:true}});
 assert.throws(()=>facts(proof,value),/match|original/);retain('mutable-proof-input-controls',rows);
});

test('aliases named imports globs and extra conditional target kinds cannot disappear from the complete census',{timeout:5000},()=>{
 const suffixes=['#[cfg(unix)] type Local=Victim;','#[cfg(unix)] use other::Victim as Local;','use other::*;','#[cfg(unix)] enum Local{One}','#[cfg(unix)] mod Local{}'];
 const rows=[];for(const suffix of suffixes){
  const value=original(variants+suffix+drop);
  if(suffix.includes('enum Local')){
   const proof=prove(value);assert.equal(facts(proof,value).alternatives.length,3);assert.equal(facts(proof,value).layoutSelected,false);rows.push({source:value.source,proof,evidence:facts(proof,value)});
  }else{assert.throws(()=>prove(value),/alternative|import|alias|resolver/);rows.push({source:value.source,refused:true});}
 }retain('complete-alias-import-census',rows);
});

test('unresolved transforms and top-level expansion cannot certify just the two convenient declarations',{timeout:5000},()=>{
 const sources=[
  ['#[custom] '+variants+drop,'original attribute transformation remains unresolved'],
  [variants+'#[custom] fn unrelated(){}'+drop,'original attribute transformation remains unresolved'],
  ['#[cfg_attr(unix,replace)] '+variants+drop,'original cfg grammar remains unresolved'],
  [variants+'create_alias!();'+drop,'module-level output or declaration grammar remains unresolved'],
  [variants+'macro_rules! create_alias {()=>{type Local=Victim;}}'+drop,'module-level output or declaration grammar remains unresolved'],
  [variants+'#[custom] '+drop,'original attribute transformation remains unresolved'],
  [variants+'#[async_trait::async_trait] impl Task for Local{}'+drop,'original attribute transformation remains unresolved'],
 ];const rows=sources.map(([source,expected])=>{
  try{return {source,expected,admitted:true,proof:prove(original(source))};}
  catch(error){return {source,expected,admitted:false,observed:{typeError:error instanceof TypeError,name:error.name,message:error.message}};}
 });
 // Preserve every original negative outcome before asserting any one of them.
 retain('transform-and-output-refusals',rows);
 for(const row of rows){assert.equal(row.admitted,false,row.source);assert.equal(row.observed.typeError,true,row.source);assert.equal(row.observed.message,'Original conditional nominal target: '+row.expected,row.source);}
});

test('generic binders qualified targets and unknown outer impl or ancestor cfg remain refused',{timeout:5000},()=>{
 const sources=[variants+'impl<Local> Drop for Local{fn drop(&mut self){}}',variants+'impl Drop for self::Local{fn drop(&mut self){}}',variants+'#[cfg(unix)] '+drop,variants+'unsafe impl Drop for Local{fn drop(&mut self){}}'];
 for(const source of sources)assert.throws(()=>prove(original(source)),/grammar|target|required|availability/);
 const source='#[cfg(unix)] mod platform{'+variants+drop+'}';assert.throws(()=>prove(original(source,{path:['platform']})),/availability/);
 const value=original('#[cfg(windows)] struct Local<T>(T);#[cfg(not(windows))] struct Local(u16);'+drop);assert.throws(()=>prove(value),/generic nominal/);
 retain('generic-qualified-and-conditional-refusals',{sources,conditionalAncestor:source});
});

test('nested Drop Copy aliases and unknown macro outputs remain full independent obligations',{timeout:5000},()=>{
 const bodies=['fn drop(&mut self){impl Drop for Victim{fn drop(&mut self){}}}','fn drop(&mut self){unknown!();}','fn drop(&mut self){#[cfg(unix)]{impl Copy for Victim{}}}','fn drop(&mut self){type Local=Victim;}'];
 const rows=[];for(const body of bodies){
  const value=original(variants+'impl Drop for Local{'+body+'}'),proof=prove(value),evidence=facts(proof,value),backing=originals(proof,value);
  assert.equal(evidence.residuals.nestedImplementationClosureRequired,true);assert.equal(evidence.residuals.nestedMacroOutputClosureRequired,true);
  assert.ok(value.source.slice(backing.originalImpl.start,backing.originalImpl.end).includes(body));
  assert.equal(evidence.noDropAuthority,false);assert.equal(evidence.namespaceAuthority,false);rows.push({source:value.source,proof,evidence,backing});
 }retain('retained-full-body-obligations',rows);
});

test('descriptor-only caller checks reject proxies and accessors without invoking their callbacks',{timeout:5000},()=>{
 const value=original(variants+drop);let calls=0;
 const proxy=new Proxy(value.module,{get(){calls++;throw Error('callback');},getPrototypeOf(){calls++;throw Error('callback');}});
 assert.throws(()=>proveConditionalNominalTarget(value.implementation,{...input(value),module:proxy,modules:[proxy]}),/plain original module/);
 const module={...value.module};Object.defineProperty(module,'source',{get(){calls++;return value.source;},enumerable:true});
 assert.throws(()=>proveConditionalNominalTarget(value.implementation,{...input(value),module,modules:[module]}),/data property/);
 const implementation={...value.implementation};Object.defineProperty(implementation,'bodySpan',{get(){calls++;return value.implementation.bodySpan;},enumerable:true});
 assert.throws(()=>proveConditionalNominalTarget(implementation,input(value)),/accessor/);
 assert.equal(calls,0);retain('zero-callback-descriptor-controls',{calls});
});

test('public compact evidence cannot select a layout or replace the complete authenticated original backing',{timeout:5000},()=>{
 const value=original(variants+drop),proof=prove(value),evidence=facts(proof,value),backing=originals(proof,value);
 assert.deepEqual(Object.keys(proof),['schema','digest']);assert.equal(proof.digest.length,64);
 assert.equal(evidence.alternatives.every(row=>!Object.hasOwn(row,'layout')),true);
 assert.throws(()=>{evidence.family[1]='Victim';},TypeError);assert.throws(()=>{backing.alternatives[0].item.tokens[0].text='type';},TypeError);
 assert.throws(()=>conditionalNominalTargetFacts(evidence,input(value)),/private original target proof/);
 retain('compact-public-full-private-witness',{source:value.source,proof,evidence,backing});
});

test('top-level options reject proxy and accessor traps before any caller callback',{timeout:5000},()=>{
 const value=original(variants+drop),proof=prove(value);let calls=0;
 const apis=[{name:'prove',keys:['module','modules','sourceScopes'],call:options=>proveConditionalNominalTarget(value.implementation,options)},
  {name:'facts',keys:['module','modules','sourceScopes','implementation'],call:options=>conditionalNominalTargetFacts(proof,options)},
  {name:'originals',keys:['module','modules','sourceScopes','implementation'],call:options=>conditionalNominalTargetOriginals(proof,options)}];
 const rows=[];for(const api of apis){
  const proxy=new Proxy(input(value),{get(){calls++;throw Error('callback');},getPrototypeOf(){calls++;throw Error('callback');},getOwnPropertyDescriptor(){calls++;throw Error('callback');}});
  assert.throws(()=>api.call(proxy),/own-data caller options/);
  for(const key of api.keys){
   const options=input(value);Object.defineProperty(options,key,{get(){calls++;throw Error('callback');},enumerable:true});
   assert.throws(()=>api.call(options),/data property/);rows.push({api:api.name,key,refused:true});
  }
 }
 const options={};Object.defineProperty(options,'module',{get(){calls++;throw Error('callback');}});
 assert.throws(()=>conditionalNominalTargetFacts({...proof},options),/private original target proof/);
 assert.equal(calls,0);retain('top-level-options-zero-callback-controls',{calls,rows});
});

test('proof issuance snapshots mutable caller profile metadata without freezing or mutating the caller',{timeout:5000},()=>{
 const value=original(variants+drop),profile={schemaVersion:1,flags:{test:false},values:{},closedKeys:[]};
 value.module.compilationProfile=profile;
 const before=JSON.stringify(profile),descriptors=Object.getOwnPropertyDescriptors(profile),flagsDescriptors=Object.getOwnPropertyDescriptors(profile.flags);
 const proof=prove(value),evidence=facts(proof,value);
 assert.notEqual(evidence.compilationProfile,profile);assert.notEqual(evidence.compilationProfile.flags,profile.flags);
 assert.equal(JSON.stringify(profile),before);assert.deepEqual(Object.getOwnPropertyDescriptors(profile),descriptors);assert.deepEqual(Object.getOwnPropertyDescriptors(profile.flags),flagsDescriptors);
 for(const object of [profile,profile.flags,profile.values,profile.closedKeys])assert.equal(Object.isFrozen(object),false);
 assert.equal(Object.isFrozen(evidence.compilationProfile),true);assert.equal(Object.isFrozen(evidence.compilationProfile.flags),true);
 assert.equal(Object.getPrototypeOf(evidence.compilationProfile),null);
 assert.deepEqual(JSON.parse(JSON.stringify(evidence.compilationProfile)),profile);
 retain('caller-profile-snapshot',{source:value.source,before,after:JSON.stringify(profile),proof,evidence,callerFrozen:false});
 profile.flags.windows=true;assert.throws(()=>facts(proof,value),/match|original/);
 assert.equal(profile.flags.windows,true);assert.equal(Object.isFrozen(profile.flags),false);
});

test('inherited serialization hooks cannot mask changed own-data source-target joins',{timeout:5000},()=>{
 const value=original(variants+drop),proof=prove(value),originalHook=Object.getOwnPropertyDescriptor(Object.prototype,'toJSON');let calls=0;
 const changed={...value.implementation,typePath:['Victim']};
 let headerRefused=false,bodyRefused=false,profileRefused=false,hookedProof;
 try{
  Object.defineProperty(Object.prototype,'toJSON',{value(){calls++;return {};},writable:true,configurable:true});
  assert.throws(()=>proveConditionalNominalTarget(changed,input(value)),/selection differs/);headerRefused=true;
  hookedProof=prove(value);
  value.implementation.methods[0].source+=' ';
  assert.throws(()=>facts(hookedProof,value),/changed/);bodyRefused=true;
  value.module.compilationProfile={schemaVersion:1,flags:{test:false,windows:true},values:{},closedKeys:[]};
  assert.throws(()=>facts(hookedProof,value),/profile differs/);profileRefused=true;
 }finally{
  if(originalHook)Object.defineProperty(Object.prototype,'toJSON',originalHook);else delete Object.prototype.toJSON;
 }
 // Existing origin/digest helpers keep their callback behavior. This leaf's
 // full structural joins must still reject even when those JSON bytes collapse.
 assert.ok(calls>0);assert.equal(headerRefused&&bodyRefused&&profileRefused,true);
 retain('inherited-tojson-structural-joins',{calls,headerRefused,bodyRefused,profileRefused,source:value.source,proof,hookedProof});
});
