import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {createDeriveFootprintContext,deriveFootprintSourceContext} from '../derive-footprints.mjs';
import {createDeriveBangContext} from '../derive-bang-context.mjs';
import {resolveModuleBindings,isResolvedSourceScopeSet} from '../module-bindings.mjs';
import {resolveDerivedSourceBindings} from '../derived-source-bindings.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {createDefaultSourceContext,defaultSourceContextFacts} from '../default-trait-source.mjs';
import {createCloneSourceContext,cloneSourceContextFacts} from '../clone-trait-source.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest,lock});
const source='#[derive(Default)] pub struct Payload{flag:bool,count:u32} pub fn make()->Payload{Payload::default()}';
function retain(name,value){if(!process.env.ROUTER_DERIVED_BINDING_VECTORS)return;mkdirSync(process.env.ROUTER_DERIVED_BINDING_VECTORS,{recursive:true});writeFileSync(join(process.env.ROUTER_DERIVED_BINDING_VECTORS,name+'.json.gz'),gzipSync(JSON.stringify(value)));}
const compile=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
function setup(source){
  const capture=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE});
  const modules=capture.views.map(sourceView=>({file:'src/lib.rs',path:sourceView.modulePath,source,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition}));
  const deriveContext=createDeriveFootprintContext({modules,dependencies,externalModules:registeredStandardHostBindings(),compilationProfile:PRODUCTION_PROFILE});
  const original=deriveFootprintSourceContext(deriveContext);
  return {deriveContext,original,input:{modules:original.modules,externalModules:original.externalModules,deriveContext,compilationProfile:original.compilationProfile}};
}
function clear(result){for(const scope of result.scopes){assert.equal(scope.configurationCondition,'active');assert.equal(scope.unresolvedTypeScope,false);assert.equal(scope.unresolvedAttributeMacroScope,false);}assert.ok(isResolvedSourceScopeSet(result.scopes));}

test('the unchanged complete bulk-order Default fixture reaches checked JS and strict TS',{timeout:60000},async()=>{
  const result=compile(source);retain('01-default',{source,result});
  assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.checkedGeneratedMethods.length,1);assert.equal(result.meta.checkedGeneratedMethods[0].name,'Payload.default');assert.equal(result.meta.executable.filter(row=>row.term==='fn').length,1);assert.equal(result.meta.runtimeParity,false);
  assert.equal(result.meta.deriveNamespaceFootprints.certificates[0].dimensions.typeNamespaceComplete,false);clear(result.meta.bindingEvidence);
  await verifyTypedTargets(result,api=>{assert.deepEqual(api.make(),{$:'Payload',flag:false,count:0n});assert.notStrictEqual(api.make(),api.make());},{childTimeoutMs:20000});
});
test('the separate original Clone context consumes complete generated enclosing effects',{timeout:60000},async()=>{
  const source='#[derive(Clone)] pub struct Payload{flag:bool,count:u32} pub fn duplicate(x:&Payload)->Payload{x.clone()}';
  const result=compile(source);retain('02-clone',{source,result});assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.checkedGeneratedMethods.length,1);assert.equal(result.meta.checkedGeneratedMethods[0].generator,'core::clone::Clone');
  const setupValue=setup(source),context=createCloneSourceContext(setupValue.deriveContext);clear(cloneSourceContextFacts(context).binding);
  await verifyTypedTargets(result,api=>{const input=Object.freeze({$:'Payload',flag:true,count:9n});const output=api.duplicate(input);assert.deepEqual(output,input);assert.notStrictEqual(output,input);},{childTimeoutMs:20000});
});
test('mixed Default and Clone retain separate checked methods and unchanged input-only certificates',{timeout:60000},async()=>{
  const source='#[derive(Default,Clone)] pub struct Payload{flag:bool,count:u32} pub fn make()->Payload{Payload::default().clone()}';
  const result=compile(source);retain('03-mixed',{source,result});assert.deepEqual(result.meta.refused,[]);assert.deepEqual(result.meta.checkedGeneratedMethods.map(row=>row.generator),['core::default::Default','core::clone::Clone']);assert.equal(result.meta.checkedMethods.length,0);assert.equal(result.meta.deriveNamespaceFootprints.certificates[0].dimensions.typeNamespaceComplete,false);
  await verifyTypedTargets(result,api=>assert.deepEqual(api.make(),{$:'Payload',flag:false,count:0n}),{childTimeoutMs:20000});
});
test('complete original binding equality precedes the genuine per-invocation output resolution',{timeout:60000},()=>{
  const {deriveContext,input}=setup(source),before=resolveModuleBindings(input),context=createDefaultSourceContext(deriveContext),state=defaultSourceContextFacts(context);
  const expected=resolveModuleBindings({...input,deriveBangContext:createDeriveBangContext({deriveContext})});
  retain('04-resolvers',{source,before,expected,actual:state.binding,certificate:deriveContext.certificates[0]});
  assert.equal(before.scopes[0].unresolvedTypeScope,true);assert.ok(before.diagnostics.length);assert.equal(deriveContext.certificates[0].dimensions.typeNamespaceComplete,false);assert.equal(deriveContext.certificates[0].dimensions.bangMacroComplete,false);
  assert.equal(JSON.stringify(state.binding),JSON.stringify(expected));clear(state.binding);assert.equal(expected.diagnostics.length,0);const prior=before.scopes[0].bindings.find(row=>row.name==='Payload'),current=state.binding.scopes[0].bindings.find(row=>row.name==='Payload');assert.equal(prior.status,'unresolved');assert.equal(prior.target,null);assert.equal(current.status,'resolved');assert.deepEqual(current.target,['crate','Payload']);assert.deepEqual(current.span,prior.span);assert.deepEqual(current.declaration,prior.declaration);
});
test('a namespace enrichment that changes any resolution keeps the complete old refusal result',{timeout:60000},()=>{
  const source='use extra::Thing; #[derive(Default)] pub struct Payload{flag:bool,count:u32}',{input}=setup(source);
  const externalModules=new Map(input.externalModules);externalModules.set('extra',{kind:'mod',complete:false,bindings:[{name:'Thing',namespace:'type',kind:'struct',target:['extra','Thing']}]});
  const enriched={...input,externalModules},baseline=resolveModuleBindings(enriched),original=resolveModuleBindings(input),actual=resolveDerivedSourceBindings(enriched);
  retain('05-enrichment',{source,baseline,original,actual});assert.notEqual(JSON.stringify(baseline),JSON.stringify(original));assert.equal(JSON.stringify(actual),JSON.stringify(baseline));assert.equal(actual.scopes[0].unresolvedTypeScope,true);assert.ok(isResolvedSourceScopeSet(actual.scopes));
});
test('copied contexts changed source views and mismatched profiles cannot issue output scope facts',{timeout:60000},()=>{
  const {input}=setup(source),other=setup(source.replace('Payload','Different'));
  assert.throws(()=>resolveDerivedSourceBindings({...input,deriveContext:structuredClone(input.deriveContext)}),/Unsealed/);
  assert.throws(()=>resolveDerivedSourceBindings({...input,deriveContext:other.deriveContext}),/changed|different|identity|original|belongs/i);
  assert.throws(()=>resolveDerivedSourceBindings({...input,modules:input.modules.map(module=>({...module,source:module.source+' '}))}),/changed|different|identity|original|belongs/i);
  assert.throws(()=>resolveDerivedSourceBindings({...input,compilationProfile:{flags:{test:true}}}),/profiles.*agree|profile/i);
});
test('unknown owners siblings imports and trait shadows retain genuine Default and Clone refusals',{timeout:60000},()=>{
  const sources=[
    'use missing::*;'+source,
    '#[derive(Default,Unknown)]pub struct Payload{flag:bool,count:u32}pub fn make()->Payload{Payload::default()}',
    'trait Default{}'+source,
    '#[unknown]'+source,
    '#[derive(Clone,Unknown)]pub struct Payload{flag:bool,count:u32}pub fn duplicate(x:&Payload)->Payload{x.clone()}',
    'use missing::*;#[derive(Clone)]pub struct Payload{flag:bool,count:u32}pub fn duplicate(x:&Payload)->Payload{x.clone()}',
  ];
  const rows=sources.map(source=>({source,result:compile(source)}));retain('07-refusals',rows);
  for(const {source,result}of rows){assert.ok(result.meta.refused.length,source);assert.equal(result.meta.executable.some(row=>['make','duplicate'].includes(row.name)),false,source);assert.equal(result.meta.runtimeParity,false);}
});
test('already resolved original manual Default keeps the entire baseline and genuine checked body',{timeout:60000},async()=>{
  const source='pub struct Payload{flag:bool,count:u32}impl Default for Payload{fn default()->Self{Self{flag:true,count:17}}}pub fn make()->Payload{Payload::default()}',{input}=setup(source),baseline=resolveModuleBindings(input),actual=resolveDerivedSourceBindings(input);
  retain('08-manual-baseline',{source,baseline,actual});clear(baseline);assert.equal(JSON.stringify(actual),JSON.stringify(baseline));
  const result=compile(source);retain('08-manual-targets',result);assert.deepEqual(result.meta.refused,[]);assert.equal(Object.hasOwn(result.meta,'checkedGeneratedMethods'),false);assert.deepEqual(result.checkedGeneratedMethodDeclarations,[]);assert.ok(result.meta.checkedMethods.some(row=>row.name==='Payload.default'));
  await verifyTypedTargets(result,api=>assert.deepEqual(api.make(),{$:'Payload',flag:true,count:17n}),{childTimeoutMs:20000});
});
