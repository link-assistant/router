import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintAt,isDeriveFootprintCertificate,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {inspectDeriveInput} from '../derive-inputs.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});
const hash=value=>createHash('sha256').update(value).digest('hex');
const module=source=>({file:'src/lib.rs',path:[],source});
const context=source=>createDeriveFootprintContext({modules:[module(source)],dependencies,compilationProfile:PRODUCTION_PROFILE});

test('original lifetime and type names plus type defaults retain exact source tokens without instantiation',()=>{
  const source="// é 😀\n#[derive(serde::Serialize)] pub struct Entry<'a,T=crate::Value,U,>{first:&'a T,last:U}",item=sourceItems(source).find(item=>item.term==='struct'),input=inspectDeriveInput(item,PRODUCTION_PROFILE),proof=context(source),certificate=proof.certificates[0];
  assert.ok(certificate);assert.deepEqual(certificate.genericParameters,input.genericParameters);
  assert.deepEqual(input.genericParameters.parameters.map(({kind,name})=>[kind,name]),[['lifetime','a'],['type','T'],['type','U']]);
  assert.deepEqual(input.genericParameters.parameters[1].typeDefault.segments,['crate','Value']);
  assert.equal(source.slice(input.genericParameters.span.start,input.genericParameters.span.end),"<'a,T=crate::Value,U,>");
  for(const token of input.genericParameters.tokens)assert.equal(source.slice(token.span.start,token.span.end),token.text);
  assert.equal(certificate.generatedImplBehavior,false);assert.equal(certificate.dimensions.bangMacroComplete,false);assert.equal(input.genericParameters.genericTypeInstantiation,false);assert.equal(input.genericParameters.parameters[1].typeDefault.resolvedType,false);
});

test('generic original data headers close bounded type/value namespaces while generic layouts stay refused',async()=>{
  const source='#[derive(serde::Serialize)] pub struct Entry<T=Unknown>{value:T} pub fn selected(value:&str)->bool{value=="router"}',proof=context(source),evidence=resolveModuleBindings({modules:[module(source)],externalModules:deriveFootprintExternalModules(proof),deriveContext:proof,compilationProfile:PRODUCTION_PROFILE});
  assert.equal(evidence.scopes[0].unresolvedTypeScope,false);assert.equal(evidence.scopes[0].unresolvedAttributeMacroScope,false);assert.equal(evidence.scopes[0].unresolvedBangMacroScope,true);
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,cargoManifest:manifest,compilationProfile:PRODUCTION_PROFILE});
  assert.ok(result.meta.executable.some(item=>item.name==='selected'));assert.ok(result.meta.refused.some(item=>item.name==='Entry'&&/generic/.test(item.message)));assert.equal(result.meta.runtimeParity,false);
  await verifyTypedTargets(result,api=>{assert.equal(api.selected('router'),true);assert.equal(api.selected('Router'),false);});
});

test('const parameters bounds where clauses attributes malformed defaults and macro expansion stay refused',()=>{
  for(const parameters of ['<const N:usize>','<T:Clone>',"<'a:'b,'b>",'<T=Vec<u8>>','<T=emit!()>','<T={#[macro_export]macro_rules! escaped{()=>{}}}>','<T=fn()->u8>','<T=&str>','<T=(u8,u8)>','<T=[u8;1]>','<T=Value;mod escaped{}>','<T,T>','<#[unknown] T>','<gen>','<_>',"<'static>","<'a=Value>",'<T=Value,U=,>','<T=Value U>','<>','<'+Array.from({length:33},(_,i)=>'T'+i).join(',')+'>']){
    const source='#[derive(serde::Serialize)] pub struct Entry'+parameters+'{value:u8}';assert.equal(context(source).certificates.length,0,parameters);assert.throws(()=>inspectDeriveInput(sourceItems(source).find(item=>item.term==='struct'),PRODUCTION_PROFILE),TypeError,parameters);
  }
  assert.equal(context('#[derive(serde::Serialize)] pub struct Entry<T> where T:Clone{value:T}').certificates.length,0);
});

test('generic input cannot discharge unrelated owners or field macro syntax',()=>{
  for(const source of ['#[derive(Unknown)] struct Entry<T>{value:T} #[derive(serde::Serialize)] struct State{ready:bool}','#[derive(serde::Serialize)] struct Entry<T>{value:emit!()}','mod serde{} #[derive(serde::Serialize)] struct Entry<T>{value:T}','#[derive(serde::Serialize)] struct Entry<T>{value:T} #[unknown] struct Sibling;'])assert.equal(context(source).certificates.length,0,source);
});

test('generic certificates reject clones altered tokens sources and module substitutions',()=>{
  const source='#[derive(serde::Serialize)] pub struct Entry<T=Value>{value:T}',proof=context(source),certificate=proof.certificates[0],item=sourceItems(source).find(item=>item.term==='struct');assert.ok(certificate);assert.equal(isDeriveFootprintCertificate(structuredClone(certificate)),false);assert.strictEqual(deriveFootprintAt(proof,module(source),item),certificate);
  const changed=structuredClone(item);changed.tokens.find(token=>token.text==='Value').text='Other';assert.throws(()=>deriveFootprintAt(proof,module(source),changed),/invocation/);assert.throws(()=>deriveFootprintAt(proof,module(source.replace('Value','Other')),item),/original source/);assert.equal(deriveFootprintAt(proof,{...module(source),path:['other']},item),null);
});

test('whole original operation result preserves its actual default Value parameter and unresolved runtime',()=>{
  const path='src/operations.rs',source=readFileSync(repositorySourceURL(path,root),'utf8');assert.equal(hash(source),'df80717e2d2fc4b3b8ad00f08e2e5f06061a96b135981f42833ffc5ca4eeeabc');
  const proof=createDeriveFootprintContext({modules:[{file:path,path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE}),certificate=proof.certificates.find(item=>item.name==='OperationResult');assert.ok(certificate);assert.deepEqual(certificate.span,{start:787,end:1456});assert.equal(certificate.sourceSha256,hash(source));assert.deepEqual(certificate.genericParameters.parameters.map(parameter=>[parameter.name,parameter.typeDefault.segments]),[['T',['Value']]]);
  assert.equal(source.slice(certificate.genericParameters.span.start,certificate.genericParameters.span.end),'<T = Value>');assert.equal(certificate.genericParameters.genericTypeInstantiation,false);assert.equal(certificate.generatedImplBehavior,false);assert.equal(certificate.dimensions.bangMacroComplete,false);
});
