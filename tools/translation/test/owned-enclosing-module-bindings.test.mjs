// Complete source/issuer receiving checks for the explicit owned DATA-cost format.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {createDeriveFootprintContext,deriveFootprintSourceContext} from '../derive-footprints.mjs';
import {createDeriveEnclosingNamespaceContext} from '../derive-enclosing-namespace-context.mjs';
import {resolveEnclosingNamespaceModuleBindings,isResolvedSourceScopeSet,assertResolvedSourceScopeOrigin} from '../module-bindings.mjs';
import {resolveOwnedEnclosingNamespaceModuleBindings} from '../owned-enclosing-module-bindings.mjs';
import {deriveOwnedEnclosingBindingSources} from '../prepare-owned-enclosing-bindings.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock}),limits={timeout:60000};
function setup(source='#[derive(Default,Clone,Debug)]pub struct Record{value:u8}pub fn keep(value:u8)->u8{value}'){
 const captured=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}),modules=captured.views.map(sourceView=>({file:'src/lib.rs',path:sourceView.modulePath,source,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition}));
 const deriveContext=createDeriveFootprintContext({modules,dependencies,externalModules:registeredStandardHostBindings(),compilationProfile:PRODUCTION_PROFILE}),original=deriveFootprintSourceContext(deriveContext),deriveBangContext=createDeriveEnclosingNamespaceContext({deriveContext});
 return {modules:original.modules,externalModules:original.externalModules,deriveContext,deriveBangContext,compilationProfile:original.compilationProfile};
}
const observe=run=>{try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}};
function same(input){const before=observe(()=>resolveEnclosingNamespaceModuleBindings(input)),after=observe(()=>resolveOwnedEnclosingNamespaceModuleBindings(input));assert.deepEqual(after,before);if(after.value){assert.ok(isResolvedSourceScopeSet(after.value.scopes));assertResolvedSourceScopeOrigin(after.value.scopes,{modules:input.modules,compilationProfile:input.compilationProfile});}return after;}
test('copied actual wrapper and consumer rules retain complete source CST and inverse equations',limits,()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8'),input={moduleBindings:read('module-bindings.mjs'),project:read('project.mjs'),derivedSourceBindings:read('derived-source-bindings.mjs'),coreAdoptionProducerContext:read('core-adoption-producer-context.mjs')},proposal=deriveOwnedEnclosingBindingSources(input);assert.equal(proposal.files.length,4);
 for(const row of proposal.files){assert.equal(readFileSync(repositorySourceURL(row.path,new URL('../../../',import.meta.url)),'utf8'),row.text);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.source);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.text);assert.equal(row.inverse,row.source);}
 const original=proposal.files[0].completeOriginalModule;assert.equal(original.source,input.moduleBindings);assert.equal(transportConcreteSyntaxMeta(original.meta).source,input.moduleBindings);assert.equal(proposal.files[0].source,input.moduleBindings.slice(...original.selection));
 assert.throws(()=>deriveOwnedEnclosingBindingSources({...input,moduleBindings:input.moduleBindings.replace('return withCurrentRetainedPrivateNativeProofCostScope(()=>resolveUnscopedModuleBindings','return changedCostScope(()=>resolveUnscopedModuleBindings')}),/changed|wrapper/);
 assert.equal(proposal.sourceAndOwnerVerdictsCached,false);assert.equal(proposal.encodedResultsCached,false);
});
test('genuine current source issuer retains every binding diagnostic and compilation condition',limits,()=>{
 for(const source of ['#[derive(Debug)]pub struct Record{value:u8}pub fn keep(value:u8)->u8{value}','#[derive(Default,Clone,Debug)]pub struct Record{value:u8}','#[derive(Default,Clone,Unknown)]pub struct Record{value:u8}','#[cfg(unknown_feature)]pub struct Maybe;pub fn keep(value:u8)->u8{value}'])same(setup(source));
});
test('copied foreign source contexts profiles and scoped carriers retain exact original refusals',limits,()=>{
 const input=setup(),other=setup('pub struct Different{value:u8}');
 for(const change of [{deriveContext:structuredClone(input.deriveContext)},{deriveBangContext:structuredClone(input.deriveBangContext)},{deriveBangContext:other.deriveBangContext},{modules:input.modules.map(module=>({...module,source:module.source+' '}))},{compilationProfile:{flags:{test:true}}},{toolContext:{}}]){
  const result=same({...input,...change});assert.ok(result.error);
 }
});
test('unresolved external owners and original full source sets cannot be replaced by a closed table',limits,()=>{
 const input=setup('use missing::*;#[derive(Default,Clone)]pub struct Record{value:u8}'),actual=same(input);assert.ok(actual.value.scopes.some(scope=>scope.unresolvedTypeScope));
 const changed={...input,modules:[]};assert.ok(same(changed).error);
 const externalModules=new Map(input.externalModules);externalModules.set('extra',{kind:'mod',complete:false,bindings:[{name:'Thing',namespace:'type',kind:'struct',target:['extra','Thing']}]});const result=same({...input,externalModules});assert.ok(result.error);
});
test('original argument defaults failure order and repeated independent calls remain synchronous',limits,()=>{
 for(const input of [undefined,{},null,{modules:[]},{modules:null},{modules:[],externalModules:null}]){
  const before=observe(()=>resolveEnclosingNamespaceModuleBindings(input)),after=observe(()=>resolveOwnedEnclosingNamespaceModuleBindings(input));assert.deepEqual(after,before);
 }
 const input=setup(),first=same(input),second=same(input);assert.deepEqual(second,first);assert.notStrictEqual(second.value.scopes,first.value.scopes);
});
