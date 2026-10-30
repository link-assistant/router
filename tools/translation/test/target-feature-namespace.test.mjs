// Independent original target-feature namespace SOURCE. All cases are unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {itemConfiguration,PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {originalDerivedOuterBuiltinAttributeRegistrations,originalSourceMetadataBuiltinAttributeRegistrations} from '../derive-ancestor-attribute-scope.mjs';
import {createTokenBoundRegisteredBuiltinCallerAttributeScope,createSourceMetadataBuiltinCallerAttributeScope} from '../registered-builtin-caller-attribute-source.mjs';
import {resolveConfiguredVariantEnclosingNamespaceModuleBindings} from '../module-bindings.mjs';
import {createRegisteredBuiltinToolAttributeContext,createConfiguredVariantToolAttributeContext} from '../tool-attributes.mjs';
import {createToolAwareDeriveFootprintContext} from '../derive-footprints.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createSourceBoundToolAwareCoreAdoptionProducerContext,coreAdoptionSourceBoundNamespaceAttributeClosed,coreAdoptionSourceBoundProducerClosedAttributeSpans,finishSourceBoundToolAwareCoreAdoptionProducerContext} from '../core-adoption-producer-context.mjs';
import {prepareTargetFeatureNamespaceSources} from '../prepare-target-feature-namespace-sources.mjs';
const limits={timeout:60000},entry='rust/src/lib.rs',attributeText='#[target_feature(enable="sse2")]',source=attributeText+'pub unsafe fn intrinsic(value:u64)->u64{value}\n#[rustfmt::skip]pub fn selected(value:bool)->bool{value}\npub mod model{#[derive(Clone,Debug)]pub struct Record{value:u8}}';
function setup(text=source){const graph=resolveModuleGraph({entry,paths:[entry],readSource:()=>text,compilationProfile:PRODUCTION_PROFILE});return {modules:graph.modules,externalModules:registeredStandardHostBindings(),compilationProfile:PRODUCTION_PROFILE};}
function original(input){const module=input.modules.find(row=>row.path.length===0),item=originalSourceModuleItems(module).find(row=>row.name==='intrinsic'),attribute=itemConfiguration(item.tokens,PRODUCTION_PROFILE).attributes.find(row=>row.name==='target_feature');return {module,item,attribute};}
function rootFacts(input){return resolveConfiguredVariantEnclosingNamespaceModuleBindings(input).scopes.find(row=>row.path.length===0);}
test('complete original ungated registration and parser/collector copies include the actual target feature symbol',limits,()=>{
 const legacy=originalDerivedOuterBuiltinAttributeRegistrations(),current=originalSourceMetadataBuiltinAttributeRegistrations();assert.equal(legacy.registrations.some(row=>row.name==='target_feature'),false);assert.equal(current.registrations.length,legacy.registrations.length+1);const registration=current.registrations.find(row=>row.name==='target_feature');assert.ok(registration.registration.originalInvocation.original.includes('target_feature'));assert.equal(registration.registration.attributeBehaviorExecuted,false);assert.equal(current.namespaceAuthority,false);assert.equal(current.callerOwnerResolved,false);assert.equal(current.crossInvocationCache,false);
 const input=setup(),row=original(input),old=createTokenBoundRegisteredBuiltinCallerAttributeScope(),scope=createSourceMetadataBuiltinCallerAttributeScope();assert.equal(old.at(row.module,row.item,row.attribute),null);old.finish();const proof=scope.at(row.module,row.item,row.attribute);assert.equal(proof.original,attributeText);assert.equal(proof.originalTokenBoundsVerified,true);assert.equal(proof.semanticAuthority,false);assert.equal(scope.finish().runtimeAuthority,false);
});
test('configured namespaces compose tool ownership while old registered APIs retain their previous domain',limits,()=>{
 const input=setup();assert.equal(rootFacts(input).unresolvedTypeScope,false);assert.equal(createRegisteredBuiltinToolAttributeContext(input).certificates.length,0);assert.equal(createConfiguredVariantToolAttributeContext(input).certificates.length,1);
 for(const text of ['#[target_feature(enable="sse2",)]',attributeText]){const other=setup(source.replace(attributeText,text));assert.equal(createConfiguredVariantToolAttributeContext(other).certificates.length,1);}
});
test('source-bound adoption retains target metadata and never emits its erasure span',limits,()=>{
 const root=new URL('../../../',import.meta.url),dependencyInputs={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},input=setup(),row=original(input),dependencies=loadDeriveDependencyProof(dependencyInputs),derive=createToolAwareDeriveFootprintContext({...input,dependencies});assert.equal(derive.certificates.length,1);
 const context=createSourceBoundToolAwareCoreAdoptionProducerContext({...input,dependencyInputs});assert.equal(coreAdoptionSourceBoundNamespaceAttributeClosed(context,row.module.source,row.module.file,[],row.item,row.attribute),true);const spans=coreAdoptionSourceBoundProducerClosedAttributeSpans(context,row.module);assert.ok(spans.some(span=>span.name==='rustfmt'));assert.ok(spans.every(span=>span.name!=='target_feature'));assert.ok(row.module.source.includes(attributeText));const result=finishSourceBoundToolAwareCoreAdoptionProducerContext(context);assert.ok(result.registeredBuiltinAttributeSource.selected.some(proof=>proof.name==='target_feature'));assert.equal(result.executableAdmission,false);assert.equal(result.runtimeAuthority,false);
});
test('qualified raw macro-valued wider and malformed attribute arguments retain explicit namespace refusal',limits,()=>{
 for(const text of ['#[target_feature::apply(enable="sse2")]','#[r#target_feature(enable="sse2")]','#[target_feature(enable=concat!("sse","2"))]','#[target_feature(enable=r"sse2")]','#[target_feature(enable="sse2",disable="avx")]','#[target_feature]']){const input=setup(source.replace(attributeText,text));assert.equal(createConfiguredVariantToolAttributeContext(input).certificates.length,0,text);}
 for(const text of ['mod rustfmt{}'+source,'use missing::*;'+source,'#![no_implicit_prelude]'+source])assert.equal(createConfiguredVariantToolAttributeContext(setup(text)).certificates.length,0,text);
});
test('attribute-looking original string tokens cannot supply a metadata attribute boundary',limits,()=>{
 const text='const TEXT: &str = r#"#[target_feature(enable="sse2")]"#;',input=setup(text),module=input.modules[0],item=originalSourceModuleItems(module).find(row=>row.term==='const'),start=text.indexOf(attributeText),scope=createSourceMetadataBuiltinCallerAttributeScope();assert.ok(start>=0);assert.equal(scope.at(module,item,{name:'target_feature',span:{start,end:start+attributeText.length}}),null);assert.equal(scope.finish(),null);
});
test('six complete source equations retain original owner bounds phases and inverses',limits,()=>{
 const plan=prepareTargetFeatureNamespaceSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
