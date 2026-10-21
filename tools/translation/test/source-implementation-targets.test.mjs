import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {bindOriginalStandardImplementationTarget,originalStandardImplementationTarget} from '../source-implementation-targets.mjs';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')});
function retain(name,value){const directory=process.env.ROUTER_IMPLEMENTATION_TARGET_VECTORS;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(directory+'/'+name+'.json.gz',gzipSync(JSON.stringify(value)));}}
function original(source,entry='src/lib.rs'){
 const graph=resolveModuleGraph({entry,paths:[entry],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE}),binding=resolveModuleBindings({modules:graph.modules,externalModules:registeredStandardHostBindings(),compilationProfile:PRODUCTION_PROFILE}),module=graph.modules[0],implementations=extractImplDeclarations(source,{sourcePath:entry,modulePath:module.path,sourceView:module.sourceView,compilationProfile:PRODUCTION_PROFILE}).implementations;
 return {source,graph,binding,module,implementations};
}
const bind=(input,implementation=input.implementations[0])=>bindOriginalStandardImplementationTarget(implementation,{module:input.module,modules:input.graph.modules,sourceScopes:input.binding.scopes});
for(const [target,kind]of [['String','owned-standard-string'],['&str','shared-primitive-str']])test('complete original '+target+' generic trait header selects its canonical target without trait execution',()=>{
 const source='pub struct Other; impl PartialEq<Other> for '+target+' {fn eq(&self,_other:&Other)->bool{false}}',input=original(source),selected=bind(input),proof=originalStandardImplementationTarget(selected);assert.ok(proof);assert.equal(proof.kind,kind);assert.equal(proof.targetOriginal,target);assert.equal(proof.traitBodyExecuted,false);assert.equal(proof.copyAuthority,false);assert.equal(proof.noDropAuthority,false);assert.equal(proof.conditionalAvailabilitySelected,false);assert.deepEqual(selected.diagnostics,input.implementations[0].diagnostics);assert.ok(proof.parsedType.rustOwnership);retain('canonical-'+kind,{source,implementation:input.implementations[0],selected,proof});
});
test('complete unchanged InstanceName original String and shared str impl headers retain all independent body refusals',()=>{
 const file='src/deploy/instance.rs',source=readFileSync(repositorySourceURL(file,root),'utf8'),input=original(source,file),rows=[];
 for(const [start,end,kind]of [[6296,6335,'owned-standard-string'],[6427,6464,'shared-primitive-str']]){
  const implementation=input.implementations.find(row=>row.headerSpan.start===start&&row.headerSpan.end===end);assert.ok(implementation);const selected=bind(input,implementation),proof=originalStandardImplementationTarget(selected);assert.ok(proof);assert.equal(proof.kind,kind);assert.deepEqual(proof.headerSpan,{start,end});assert.deepEqual(selected.diagnostics,implementation.diagnostics);assert.equal(proof.traitBodyExecuted,false);rows.push({implementation,selected,proof});
 }
 retain('whole-original-instance-targets',{file,source,graphDiagnostics:input.graph.diagnostics,binding:input.binding,rows});
});
test('private target origin and every original source parser scope and implementation join reject copies and mutation',()=>{
 const input=original('pub struct Other;impl PartialEq<Other> for String{fn eq(&self,_:&Other)->bool{false}}'),selected=bind(input),proof=originalStandardImplementationTarget(selected);assert.ok(proof);
 for(const fake of [structuredClone(selected),{...selected},new Proxy(selected,{})])assert.equal(originalStandardImplementationTarget(fake),null);
 assert.throws(()=>bindOriginalStandardImplementationTarget(selected,{module:input.module,modules:input.graph.modules,sourceScopes:structuredClone(input.binding.scopes)}),/exact original/);
 assert.throws(()=>bindOriginalStandardImplementationTarget(selected,{module:input.module,modules:[{...input.module,source:input.source+' '}],sourceScopes:input.binding.scopes}),/different original/);
 assert.throws(()=>bindOriginalStandardImplementationTarget(selected,{module:input.module,modules:input.graph.modules,sourceScopes:input.binding.scopes,Parser:class extends HostRustParser{}}),/actual Host/);
 const changed={...input.implementations[0],headerSpan:{...input.implementations[0].headerSpan,end:input.implementations[0].headerSpan.end-1}};assert.throws(()=>bind(input,changed),/header span/);
 selected.diagnostics=[];assert.throws(()=>originalStandardImplementationTarget(selected),/changed/);
 retain('private-target-mutation-controls',{source:input.source,proof,changedHeader:changed});
});
test('aliases shadows cfg generic binders procedural attributes body macros and nested impl effects remain refused',()=>{
 const sources=[
 'struct String;impl PartialEq<String> for String{fn eq(&self,_:&String)->bool{false}}',
 'type str=String;struct Other;impl PartialEq<Other> for &str{fn eq(&self,_:&Other)->bool{false}}',
 'use unknown::String;struct Other;impl PartialEq<Other> for String{fn eq(&self,_:&Other)->bool{false}}',
 '#[cfg(unix)] impl PartialEq<u8> for String{fn eq(&self,_:&u8)->bool{false}}',
 'impl<T> PartialEq<T> for String{fn eq(&self,_:&T)->bool{false}}',
 '#[async_trait] impl Custom for String{}',
 '#[async_trait::async_trait] impl Custom for &str{}',
 'impl PartialEq<u8> for String{fn eq(&self,_:&u8)->bool{unknown!()}}',
 'impl PartialEq<u8> for String{#[custom]fn eq(&self,_:&u8)->bool{false}}',
 'struct Payload;impl PartialEq<u8> for String{fn eq(&self,_:&u8)->bool{impl Drop for Payload{fn drop(&mut self){}}false}}',
 '#![no_implicit_prelude] impl PartialEq<u8> for String{fn eq(&self,_:&u8)->bool{false}}',
 'impl PartialEq<u8> for &mut str{fn eq(&self,_:&u8)->bool{false}}',
 ];const rows=[];
 for(const source of sources){const input=original(source);let selected,error;try{selected=bind(input);}catch(cause){assert.ok(cause instanceof TypeError||cause.name==='TranslationError');error={name:cause.name,message:cause.message};}assert.equal(selected?originalStandardImplementationTarget(selected):null,null,source);rows.push({source,selected,error});}retain('independent-target-refusals',rows);
});
for(const target of ['String','&str'])test('canonical unequal '+target+' target joins private Copy for checked generated Clone JS and strict TS',{timeout:60000},async()=>{
 const source='pub struct Other;#[derive(Clone,Copy,serde::Serialize)] pub enum Payload{First,Second}impl PartialEq<Other> for '+target+'{fn eq(&self,_:&Other)->bool{false}}pub fn duplicate(value:&Payload)->Payload{value.clone()}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
 retain('checked-unequal-'+(target==='String'?'String':'str'),{source,result});
 assert.ok(result.meta.checkedGeneratedMethods?.some(row=>row.name==='Payload.clone'),JSON.stringify(result.meta.refused));assert.ok(result.meta.executable.some(row=>row.name==='duplicate'),JSON.stringify(result.meta.refused));assert.equal(result.meta.checkedMethods.some(row=>row.name?.endsWith('.eq')),false);assert.ok(result.meta.unloweredItems.some(row=>row.term==='impl'&&row.span.start===source.indexOf('impl')));
 await verifyTypedTargets(result,api=>{for(const variant of ['First','Second']){const value=Object.freeze({$:variant}),copy=api.duplicate(value);assert.deepEqual(copy,value);assert.equal(Object.isFrozen(copy),true);assert.deepEqual(value,{$:variant});}},{childTimeoutMs:20000});
});
test('matching destructor custom trait conditional and procedural original impl targets retain Copy refusal',()=>{
 const rows=[];for(const header of ['impl Drop for Payload{fn drop(&mut self){}}','impl Custom for Payload{}','#[cfg(unix)] impl Drop for Payload{fn drop(&mut self){}}','#[async_trait] impl Custom for String{}']){
  const source='#[derive(Clone,Copy,serde::Serialize)]pub enum Payload{First,Second}'+header+'pub fn duplicate(value:&Payload)->Payload{value.clone()}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});assert.equal(result.meta.executable.some(row=>row.name==='duplicate'),false,source);assert.ok(result.meta.refused.some(row=>row.name==='Payload.clone'||row.name==='duplicate'));rows.push({source,result});
 }retain('copy-destructor-target-refusals',rows);
});
