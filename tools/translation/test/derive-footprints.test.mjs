import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DERIVE_SOURCE_PROFILE,createDeriveDependencyProof,isDeriveDependencyProof,deriveDependencyProfile} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintAt,isDeriveFootprintCertificate,assertDeriveFootprintCertificate} from '../derive-footprints.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {deriveFootprintExternalModules} from '../derive-footprints.mjs';
const root=new URL('../source-profiles/derive/',import.meta.url);
const inputs=()=>({manifest:readFileSync(new URL('../../../Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8'),archives:new Map(DERIVE_SOURCE_PROFILE.packages.map(entry=>[entry.name+'@'+entry.version,readFileSync(new URL(entry.archive,root))])),standardCore:readFileSync(new URL(DERIVE_SOURCE_PROFILE.standardCore.archive,root))});
const dependency=createDeriveDependencyProof(inputs());
const context=(source,rootSource='mod model;')=>createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source:rootSource},{file:'src/model.rs',path:['model'],source}],dependencies:dependency,compilationProfile:PRODUCTION_PROFILE});

test('actual locked archives and all audited members are verified before dependency branding',()=>{
  assert.equal(isDeriveDependencyProof(dependency),true);assert.equal(isDeriveDependencyProof(structuredClone(dependency)),false);
  assert.equal(dependency.packages.length,8);assert.equal(dependency.packages.reduce((count,entry)=>count+entry.members.length,0),197);
  const changed=inputs(),entry=DERIVE_SOURCE_PROFILE.packages[0],bytes=Buffer.from(changed.archives.get(entry.name+'@'+entry.version));bytes[bytes.length-1]^=1;changed.archives.set(entry.name+'@'+entry.version,bytes);
  assert.throws(()=>createDeriveDependencyProof(changed),/checksum mismatch/);
  assert.throws(()=>createDeriveDependencyProof({...inputs(),manifest:inputs().manifest+'\n'}),/manifest or lock/);
  assert.throws(()=>createDeriveDependencyProof({...inputs(),standardCore:Buffer.from('not a source archive')}));
  const unsupported=deriveDependencyProfile({manifest:'[package]\nname="other"\n',lock:null});assert.equal(unsupported.proof,null);assert.equal(unsupported.diagnostics[0].kind,'unsupported-profile');
});

test('actual qualified and imported derive owners certify independent namespace dimensions',()=>{
  const source='use serde::{Serialize,Deserialize}; use schemars::JsonSchema as Schema; #[derive(Clone,Serialize,Deserialize,Schema)] #[serde(rename_all="snake_case")] pub enum Kind { Ready, #[serde(rename="paused")] Paused }';
  const result=context(source);assert.deepEqual(result.diagnostics,[]);assert.equal(result.certificates.length,1);
  const certificate=result.certificates[0];assert.equal(isDeriveFootprintCertificate(certificate),true);assert.equal(isDeriveFootprintCertificate(structuredClone(certificate)),false);
  assert.deepEqual(certificate.owners.map(owner=>owner.target),[['serde','Serialize'],['serde','Deserialize'],['schemars','JsonSchema']]);
  assert.deepEqual(certificate.dimensions,{typeNamespaceComplete:true,valueNamespaceComplete:true,attributeMacroComplete:true,bangMacroComplete:false});assert.equal(certificate.generatedImplBehavior,false);
  const item=sourceItems(source).find(item=>item.term==='enum');assert.strictEqual(deriveFootprintAt(result,{file:'src/model.rs',source},item),certificate);
  assert.strictEqual(assertDeriveFootprintCertificate(certificate,source.slice(item.start,item.end),item.start),certificate);
  assert.throws(()=>deriveFootprintAt(structuredClone(result),{file:'src/model.rs',source},item),/Unsealed/);
  assert.throws(()=>assertDeriveFootprintCertificate(certificate,source.slice(item.start,item.end)+' ',item.start),/mismatched/);
});

test('literal default and skip metadata remain original attributes and generated trait obligations',()=>{
  const source='#[derive(serde::Serialize,serde::Deserialize)] pub struct Entry { #[serde(default)] enabled:bool, #[serde(skip)] transient:u8 }';
  const result=context(source);assert.deepEqual(result.diagnostics,[]);assert.equal(result.certificates.length,1);
  const certificate=result.certificates[0];assert.deepEqual(certificate.attributes.filter(attribute=>attribute.helpers).map(attribute=>attribute.helpers[0].key),['default','skip']);
  for(const attribute of certificate.attributes)assert.equal(source.slice(attribute.span.start,attribute.span.end).replaceAll(/\s/g,''),attribute.tokens.join(''));
  assert.equal(certificate.obligations.includes('generated trait implementations are not lowered'),true);
});

test('binder narrows only sealed declaration dimensions and keeps exported bang uncertainty',()=>{
  const source='use serde::Serialize; #[derive(Serialize)] pub struct Entry{value:u8}';
  const modules=[{file:'src/lib.rs',path:[],source:'mod model;'},{file:'src/model.rs',path:['model'],source}];
  const proof=createDeriveFootprintContext({modules,dependencies:dependency,compilationProfile:PRODUCTION_PROFILE});
  const evidence=resolveModuleBindings({modules,externalModules:deriveFootprintExternalModules(proof),deriveContext:proof,compilationProfile:PRODUCTION_PROFILE});
  const scope=evidence.scopes.find(scope=>scope.file==='src/model.rs');
  assert.equal(scope.unresolvedTypeScope,false);assert.equal(scope.unresolvedAttributeMacroScope,false);assert.equal(scope.unresolvedBangMacroScope,true);
  assert.equal(scope.bindings.find(binding=>binding.namespace==='type'&&binding.name==='Entry').status,'resolved');
  assert.equal(evidence.scopes.find(scope=>!scope.path.length).unresolvedBangMacroScope,true);
  assert.throws(()=>resolveModuleBindings({modules,deriveContext:structuredClone(proof)}),/Unsealed/);
});

test('unknown helpers generic inputs and macro-bearing fragments retain namespace uncertainty',()=>{
  for(const declaration of [
    '#[derive(serde::Serialize)] #[serde(crate="other")] pub struct Entry {value:u8}',
    '#[derive(serde::Serialize)] #[serde(remote="Other")] pub struct Entry {value:u8}',
    '#[derive(serde::Deserialize)] pub struct Entry {#[serde(default="helper()")] value:u8}',
    '#[derive(schemars::JsonSchema)] #[schemars(title={#[macro_export] macro_rules! escaped{()=>{}} "title"})] pub struct Entry {value:u8}',
    '#[derive(serde::Serialize)] pub struct Entry<T>{value:T}',
    '#[derive(serde::Serialize)] pub struct Entry{value:injected!()}',
    '#[derive(serde::Serialize,Unknown)] pub struct Entry{value:u8}',
    '#[derive(serde::Serialize)] pub struct Entry{value:u8} #[unknown] pub struct Sibling;',
    '#[derive(serde::Serialize)] pub struct Entry{value:u8} unknown::emit!{pub static SIBLING:u8=0;}',
    '#[cfg_attr(unix,derive(serde::Serialize))] pub struct Entry{value:u8}',
  ]){const result=context(declaration);assert.equal(result.certificates.length,0,declaration);}
});

test('actual local packages unknown macro imports and custom core owners cannot forge standard derives',()=>{
  for(const [source,rootSource]of [
    ['mod serde; #[derive(serde::Serialize)] pub struct Entry{value:u8}','mod model;'],
    ['use unknown::Serialize; #[derive(Serialize)] pub struct Entry{value:u8}','mod model;'],
    ['use serde::Serialize; use other::Serialize; #[derive(Serialize)] pub struct Entry{value:u8}','mod model;'],
    ['#[derive(serde::Serialize)] pub struct Entry{value:u8}','mod model; mod core;'],
    ['#[derive(serde::Serialize)] pub struct Entry{value:u8}','mod model; #[unknown] struct Root;'],
  ])assert.equal(context(source,rootSource).certificates.length,0,source+' '+rootSource);
  assert.throws(()=>createDeriveFootprintContext({modules:[],dependencies:structuredClone(dependency)}),/sealed/);
  assert.throws(()=>createDeriveFootprintContext({modules:[],dependencies:dependency,externalModules:new Map([['evil',{bindings:[{name:'Imported',namespace:'macro',macroKind:'derive',target:['serde','Serialize'],deriveDependencyDigest:dependency.digest}]}]])}),/privately verified/);
});
