// Closed enclosing entry controls; full Router parity remains unqualified.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject,translateProjectWithFlatSemanticMeta,translateProjectWithFlatEnclosingSemanticMeta as enclosing} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),deriveDependencies=loadDeriveDependencyProof({manifest,lock});
const options=(source,progress)=>({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies,compilationProfile:PRODUCTION_PROFILE,progress});
function sameChecked(before,after){
 assert.deepEqual(after.meta.bindingEvidence.scopes,before.meta.bindingEvidence.scopes);
 assert.deepEqual(after.meta.executable,before.meta.executable);
 assert.deepEqual(after.meta.refused,before.meta.refused);
 assert.deepEqual(after.meta.checkedSemanticProgram,before.meta.checkedSemanticProgram);
 assert.deepEqual(after.meta.targetSemanticProgram,before.meta.targetSemanticProgram);
 assert.deepEqual(after.meta.checkedGeneratedMethods,before.meta.checkedGeneratedMethods);
 assert.equal(after.javascript,before.javascript);assert.equal(after.typescript,before.typescript);
 assert.equal(after.meta.runtimeParity,false);assert.equal(Object.hasOwn(after,'ownedDefinitions'),false);
}
test('closed enclosing entry retains original checked programs and independently executes generated Default Clone and methods',{timeout:60000},async()=>{
 const source='#[derive(Default,Clone,Debug)]pub struct Record{value:u8}impl Record{pub fn read(&self)->u8{self.value}}pub fn make()->Record{Record::default().clone()}pub fn read_record(value:Record)->u8{value.read()}',events=[];
 const before=translateProject(options(source)),flat=translateProjectWithFlatSemanticMeta(options(source)),after=enclosing(options(source,event=>events.push(event)));
 sameChecked(before,after);sameChecked(flat,after);
 assert.equal(events.filter(event=>event.stage==='namespace'&&event.phase==='derive-namespace-context').length,1);
 assert.equal(events.filter(event=>event.stage==='namespace'&&event.phase==='enclosing-bindings').length,1);
 await verifyTypedTargets(after,api=>{const first=api.make(),second=api.make();assert.deepEqual(first,{$:'Record',value:0n});assert.deepEqual(second,first);assert.notStrictEqual(first,second);assert.equal(api.read_record(first),0n);const mutable={$:'Record',value:7n};assert.equal(api.read_record(mutable),7n);mutable.value=8n;assert.equal(api.read_record(mutable),8n);assert.equal(Object.isFrozen(mutable),false);let reads=0;const accessor=Object.defineProperty({$:'Record'},'value',{enumerable:true,get(){reads++;return 1n;}});assert.throws(()=>api.read_record(accessor),TypeError);const proxy=new Proxy(mutable,{get(){reads++;throw Error('unexpected input getter');},ownKeys(){reads++;throw Error('unexpected input keys');}});assert.throws(()=>api.read_record(proxy),TypeError);assert.equal(reads,0);},{childTimeoutMs:20000});
});
test('unknown derive owners wildcard imports and configuration retain complete original refusals',{timeout:60000},()=>{
 for(const source of ['#[derive(Default,Clone,Debug,Unknown)]pub struct Record{value:u8}pub fn keep(v:u8)->u8{v}','use missing::*;#[derive(Default,Clone)]pub struct Record{value:u8}pub fn make()->Record{Record::default()}','#[cfg(unknown_feature)]pub struct Maybe;pub fn keep(v:u8)->u8{v}']){
  const before=translateProject(options(source)),after=enclosing(options(source));sameChecked(before,after);
  assert.ok(after.meta.refused.length||after.meta.bindingEvidence.scopes.some(scope=>scope.unresolvedTypeScope));
 }
});
test('ordinary and flat DATA APIs keep original namespace progress while new entry has no caller-selected context',{timeout:60000},()=>{
 const source='pub fn keep(v:u8)->u8{v}';
 for(const run of [translateProject,translateProjectWithFlatSemanticMeta]){const events=[];run(options(source,event=>events.push(event)));assert.equal(events.some(event=>event.stage==='namespace'&&event.state==='advance'),false);}
 let reads=0;const input=options(source);for(const key of ['ownedDefinitionMode','deriveBangContext','semanticStorage'])Object.defineProperty(input,key,{get(){reads++;throw Error('caller scope injection');}});
 const result=enclosing(input);assert.equal(reads,0);assert.equal(result.meta.runtimeParity,false);assert.equal(Object.hasOwn(result,'ownedDefinitions'),false);
 const failure=Error('progress failure');assert.throws(()=>enclosing(options(source,()=>{throw failure;})),error=>error===failure);
});
