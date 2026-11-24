import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject,translateProjectOwnedDefinitions} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url);
const manifest=readFileSync(new URL('rust/Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8');
const deriveDependencies=loadDeriveDependencyProof({manifest,lock});
function options(source,progress){return {entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies,compilationProfile:PRODUCTION_PROFILE,progress};}

test('owned project namespace selection retains complete original scopes and checked target behavior',{timeout:60000},async()=>{
 const source='#[derive(Debug)] pub struct Record{value:u8} pub fn increment(value:u8)->u8{value+1}',events=[];
 const original=translateProject(options(source)),current=translateProjectOwnedDefinitions(options(source,event=>events.push(event)));
 assert.deepEqual(current.meta.bindingEvidence.scopes,original.meta.bindingEvidence.scopes);
 assert.deepEqual(current.meta.executable,original.meta.executable);
 assert.deepEqual(current.meta.checkedSemanticProgram,original.meta.checkedSemanticProgram);
 assert.equal(current.meta.runtimeParity,false);
 assert.ok(events.some(event=>event.stage==='namespace'&&event.phase==='enclosing-bindings'));
 await verifyTypedTargets(current,api=>{assert.equal(api.increment(0n),1n);assert.equal(api.increment(254n),255n);assert.throws(()=>api.increment(255n),RangeError);},{childTimeoutMs:20000});
});

test('unknown producer and configuration obligations remain explicit in owned namespace selection',{timeout:60000},()=>{
 for(const source of ['#[derive(Debug,Foreign)]pub struct Record{value:u8} pub fn keep(value:u8)->u8{value}','#[cfg(unknown_feature)]pub struct Maybe; pub fn keep(value:u8)->u8{value}']){
  const original=translateProject(options(source)),current=translateProjectOwnedDefinitions(options(source));
  assert.deepEqual(current.meta.bindingEvidence.scopes,original.meta.bindingEvidence.scopes);
  assert.deepEqual(current.meta.executable,original.meta.executable);
  assert.equal(current.meta.runtimeParity,false);
 }
});

test('ordinary project API retains its original namespace progress contract',{timeout:60000},()=>{
 const events=[];translateProject(options('pub fn keep(value:u8)->u8{value}',event=>events.push(event)));
 assert.equal(events.some(event=>event.stage==='namespace'&&event.state==='advance'),false);
});

test('owned Default and Clone keep genuine generated methods and their complete original namespace results',{timeout:60000},async()=>{
 const source='#[derive(Default,Clone,Debug)]pub struct Record{value:u8}pub fn make()->Record{Record::default().clone()}';
 const original=translateProject(options(source)),current=translateProjectOwnedDefinitions(options(source));
 assert.deepEqual(current.meta.bindingEvidence.scopes,original.meta.bindingEvidence.scopes);
 assert.deepEqual(current.meta.checkedGeneratedMethods,original.meta.checkedGeneratedMethods);
 assert.deepEqual(current.meta.checkedSemanticProgram,original.meta.checkedSemanticProgram);
 assert.deepEqual(current.meta.refused,original.meta.refused);
 await verifyTypedTargets(current,api=>{const a=api.make(),b=api.make();assert.deepEqual(a,{$:'Record',value:0n});assert.deepEqual(b,a);assert.notStrictEqual(a,b);},{childTimeoutMs:20000});
 for(const source of ['use missing::*;#[derive(Default,Clone)]pub struct Record{value:u8}pub fn make()->Record{Record::default().clone()}','#[derive(Default,Clone,Unknown)]pub struct Record{value:u8}pub fn make()->Record{Record::default().clone()}']){
  const original=translateProject(options(source)),current=translateProjectOwnedDefinitions(options(source));
  assert.deepEqual(current.meta.bindingEvidence.scopes,original.meta.bindingEvidence.scopes);
  assert.deepEqual(current.meta.executable,original.meta.executable);
  assert.ok(current.meta.refused.length);
 }
});
