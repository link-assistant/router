import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {inspectDeriveInput} from '../derive-inputs.mjs';
import {createDeriveFootprintContext,deriveFootprintAt,isDeriveFootprintCertificate,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {translateProject} from '../project.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest,lock});
const context=source=>createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE});
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE,cargoManifest:manifest,deriveDependencies:dependencies});
const declarations="#[derive(Debug,Default,Clone)] pub struct Inputs<'a>{pub path:&'a str} #[derive(serde::Serialize)] pub struct State{pub ready:bool}";

test('derive lifetime-only header retains all exact source names tokens and UTF-16 spans',()=>{
  const source="// é 😀\n#[derive(serde::Serialize)] pub struct Entry<'a,'other,>{first:&'a str,last:&'other str}";
  const item=sourceItems(source).find(item=>item.term==='struct'),input=inspectDeriveInput(item,PRODUCTION_PROFILE),proof=context(source),certificate=proof.certificates[0];
  assert.deepEqual(input.lifetimeParameters.names,['a','other']);assert.ok(certificate);assert.equal(isDeriveFootprintCertificate(certificate),true);
  assert.deepEqual(certificate.lifetimeParameters,input.lifetimeParameters);
  assert.equal(source.slice(input.lifetimeParameters.span.start,input.lifetimeParameters.span.end),"<'a,'other,>");
  for(const token of input.lifetimeParameters.tokens)assert.equal(source.slice(token.span.start,token.span.end),token.text);
  assert.equal(certificate.generatedImplBehavior,false);assert.equal(certificate.lifetimeParameters.genericTypeInstantiation,false);assert.equal(certificate.dimensions.bangMacroComplete,false);
});

test('an original lifetime-only builtin sibling permits independently owned Serde namespace proof',()=>{
  const proof=context(declarations),module={file:'src/lib.rs',path:[],source:declarations};
  assert.deepEqual(proof.certificates.map(item=>item.name),['State']);assert.deepEqual(proof.diagnostics,[{source:'src/lib.rs',span:{start:0,end:70},name:'Inputs',message:'Standard-only input retains a generic, helper, configuration or layout obligation'}]);
  const evidence=resolveModuleBindings({modules:[module],externalModules:deriveFootprintExternalModules(proof),deriveContext:proof,compilationProfile:PRODUCTION_PROFILE});
  assert.equal(evidence.scopes[0].unresolvedTypeScope,false);assert.equal(evidence.scopes[0].unresolvedAttributeMacroScope,false);assert.equal(evidence.scopes[0].unresolvedBangMacroScope,true);
});

test('newly admitted original string functions run in JS and independently strict-compiled TS',{timeout:30000},async()=>{
  const result=project(declarations+" pub fn echo<'a>(path:&'a str)->&'a str{path} pub fn enabled(path:&str)->bool{path==\"router\"}");
  for(const name of ['echo','enabled'])assert.ok(result.meta.executable.some(item=>item.name===name),JSON.stringify(result.meta.refused));
  assert.equal(result.meta.runtimeParity,false);assert.ok(result.meta.refused.some(item=>item.name==='Inputs'));
  await verifyCohortTargets(result,api=>{assert.equal(api.echo('Ω😀'),'Ω😀');assert.equal(api.enabled('router'),true);assert.equal(api.enabled('other'),false);});
});

test('const generic bounds parameter attributes duplicates and reserved lifetimes remain refused',()=>{
  for(const parameters of ["<const N:usize>","<'a:'b,'b>","<'a,'a>","<'static>","<'_>","<>","<#[unknown] 'a>","<'a = 'static>","<"+Array.from({length:33},(_,i)=>"'name"+i).join(',')+">"]){
    const source='#[derive(serde::Serialize)] pub struct Entry'+parameters+"{value:&'a str}";
    assert.equal(context(source).certificates.length,0,parameters);assert.throws(()=>inspectDeriveInput(sourceItems(source).find(item=>item.term==='struct'),PRODUCTION_PROFILE),/generic|lifetime|Lifetime|bounded|names/i);
  }
  assert.equal(context("#[derive(serde::Serialize)] pub struct Entry<'a> where 'a:'static{value:&'a str}").certificates.length,0);
});

test('unknown lifetime siblings source expansions and shadowed owners cannot close another derive',()=>{
  for(const sibling of ["#[derive(Unknown)] pub struct Inputs<'a>{value:&'a str}","#[derive(Debug)] pub struct Inputs<'a,T:Trait>{value:&'a T}","#[derive(Debug)] pub struct Inputs<'a>{value:expand!()}","#[cfg_attr(unix,derive(Debug))] pub struct Inputs<'a>{value:&'a str}"])
    assert.equal(context(sibling+' #[derive(serde::Serialize)] pub struct State{ready:bool}').certificates.length,0,sibling);
  assert.equal(context("mod serde{} #[derive(serde::Serialize)] pub struct Entry<'a>{value:&'a str}").certificates.length,0);
});

test('lifetime certificates reject clones changed source tokens and original module substitutions',()=>{
  const source="#[derive(serde::Serialize)] pub struct Entry<'a>{value:&'a str}",proof=context(source),certificate=proof.certificates[0],module={file:'src/lib.rs',path:[],source,compilationProfile:PRODUCTION_PROFILE},item=sourceItems(source).find(item=>item.term==='struct');
  assert.ok(certificate);assert.strictEqual(deriveFootprintAt(proof,module,item),certificate);assert.equal(isDeriveFootprintCertificate(structuredClone(certificate)),false);
  const changed=structuredClone(item);changed.tokens.find(token=>token.text==="'a").text="'b";
  assert.throws(()=>deriveFootprintAt(proof,module,changed),/invocation/);
  assert.throws(()=>deriveFootprintAt(proof,{...module,source:source.replaceAll("'a","'b")},item),/original source/);
  assert.throws(()=>deriveFootprintAt(structuredClone(proof),module,item),/Unsealed/);
});
