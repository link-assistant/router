import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {translateProject,translateProjectOwnedDefinitions} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {createDeriveEnclosingNamespaceContext} from '../derive-enclosing-namespace-context.mjs';
import {createDefaultSourceContext,createDefaultEnclosingSourceContext,defaultSourceContextFacts} from '../default-trait-source.mjs';
import {createCloneSourceContext,createCloneEnclosingSourceContext,cloneSourceContextFacts} from '../clone-trait-source.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const root=new URL('../../../',import.meta.url);
const manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8');
const lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest,lock});
const record='#[derive(Default,Clone)]pub struct Record{flag:bool,count:u32}';
const compile=(source,translate=translateProject)=>translate({entry:'src/lib.rs',paths:['src/lib.rs'],
 readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,
 compilationProfile:PRODUCTION_PROFILE});

function setup(source=record){
 const capture=captureSourceModuleViews({source,sourcePath:'src/lib.rs',
  compilationProfile:PRODUCTION_PROFILE});
 const modules=capture.views.map(sourceView=>({file:'src/lib.rs',
  path:sourceView.modulePath,source,sourceView,
  compilationProfile:PRODUCTION_PROFILE,
  configurationCondition:sourceView.configurationCondition}));
 const deriveContext=createDeriveFootprintContext({modules,dependencies,
  compilationProfile:PRODUCTION_PROFILE});
 const deriveBangContext=createDeriveEnclosingNamespaceContext({deriveContext});
 return {deriveContext,deriveBangContext};
}

test('shared enclosing contexts retain complete legacy Default and Clone evidence and bindings',
 {timeout:60000},()=>{
 const {deriveContext,deriveBangContext}=setup();
 const legacyDefault=createDefaultSourceContext(deriveContext);
 const legacyClone=createCloneSourceContext(deriveContext);
 const defaultContext=createDefaultEnclosingSourceContext(deriveContext,{deriveBangContext});
 const cloneContext=createCloneEnclosingSourceContext(deriveContext,
  {deriveBangContext,defaultContext});
 assert.deepEqual(defaultContext,legacyDefault);
 assert.deepEqual(cloneContext,legacyClone);
 assert.deepEqual(defaultSourceContextFacts(defaultContext).binding,
  defaultSourceContextFacts(legacyDefault).binding);
 const current=cloneSourceContextFacts(cloneContext);
 assert.deepEqual(current.binding,cloneSourceContextFacts(legacyClone).binding);
 assert.strictEqual(current.deriveContext,deriveContext);
 assert.strictEqual(current.defaultContext,defaultContext);
 for(const context of [defaultContext,cloneContext]){
  assert.equal(context.namespaceAuthority,false);
  assert.equal(context.generatedImplBehavior,false);
 }
});

test('sharing cannot accept copied Default contexts or a different derive invocation',
 {timeout:60000},()=>{
 const original=setup(),other=setup();
 const defaultContext=createDefaultEnclosingSourceContext(original.deriveContext,
  {deriveBangContext:original.deriveBangContext});
 const foreign=createDefaultEnclosingSourceContext(other.deriveContext,
  {deriveBangContext:other.deriveBangContext});
 for(const invalid of [{...defaultContext},structuredClone(defaultContext),foreign]){
  assert.throws(()=>createCloneEnclosingSourceContext(original.deriveContext,
   {deriveBangContext:original.deriveBangContext,defaultContext:invalid}),
  /unsealed|different original derive invocation/i);
 }
 assert.throws(()=>createDefaultEnclosingSourceContext(original.deriveContext,
  {deriveBangContext:other.deriveBangContext}),/different|original|invocation|context/i);
});

test('normal project sharing still checks and executes the independent Default and Clone bodies',
 {timeout:60000},async()=>{
 const result=compile(record+'pub fn make()->Record{Record::default()}'
  +'pub fn duplicate(x:&Record)->Record{x.clone()}');
 assert.deepEqual(result.meta.refused,[]);
 assert.deepEqual(result.meta.checkedGeneratedMethods.map(row=>row.name).sort(),
  ['Record.clone','Record.default']);
 assert.equal(result.meta.runtimeParity,false);
 await verifyTypedTargets(result,api=>{
  const value=Object.freeze({$:'Record',flag:true,count:17n});
  assert.deepEqual(api.make(),{$:'Record',flag:false,count:0n});
  assert.deepEqual(api.duplicate(value),value);
  assert.notStrictEqual(api.duplicate(value),value);
 },{childTimeoutMs:20000});
 for(const [source,name] of [['trait Clone{}'+record,'duplicate'],
  ['trait Default{}'+record,'make'],['use missing::*;'+record,'duplicate'],
  ['#[derive(Default,Clone,Unknown)]pub struct Record{flag:bool,count:u32}','duplicate']]){
  const refused=compile(source+'pub fn duplicate(x:&Record)->Record{x.clone()}'
   +'pub fn make()->Record{Record::default()}');
  assert.ok(refused.meta.refused.length,source);
  assert.equal(refused.meta.executable.some(row=>row.name===name),false,source);
 }
});

test('a large owned-definition Clone namespace cannot authorize its unsupported body or suppress an unrelated function',
 {timeout:60000},async()=>{
 const source='#[derive(Clone)]pub struct Record{'
  +Array.from({length:128},(_,index)=>'f'+index+':u8').join(',')
  +'}pub fn value()->u8{7}';
 const result=compile(source,translateProjectOwnedDefinitions);
 assert.equal(result.meta.executable.some(row=>row.name==='value'),true);
 assert.equal((result.meta.checkedGeneratedMethods??[]).some(row=>row.name==='Record.clone'),false);
 assert.ok(result.meta.refused.some(row=>row.term==='generated-method'
  &&row.name==='Record.clone'&&/positive AST validation budget/.test(row.message)));
 assert.equal(result.meta.runtimeParity,false);
 await verifyTypedTargets(result,api=>assert.equal(api.value(),7n),{childTimeoutMs:20000});
});
