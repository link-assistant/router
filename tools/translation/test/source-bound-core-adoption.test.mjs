// Independent no-derive adoption SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {resolveModuleGraph,translateProjectWithFlatEnclosingSemanticMeta} from '../project.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {originalUseDeclarationLeaves} from '../module-bindings.mjs';
import {itemConfiguration,PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {createCoreAdoptionProducerContext,createEnclosingCoreAdoptionProducerContext,createToolAwareEnclosingCoreAdoptionProducerContext,createSourceBoundToolAwareCoreAdoptionProducerContext,coreAdoptionSourceBoundNamespaceAttributeClosed,coreAdoptionSourceBoundProducerClosedAttributeSpans,finishSourceBoundToolAwareCoreAdoptionProducerContext,createSourceBoundToolAwareCoreAdoptionNonTraitImportSelector} from '../core-adoption-producer-context.mjs';
import {coreTypeProducerProblemsForModule} from '../tool-aware-core-primitives-candidate.mjs';
import {prepareSourceBoundCoreAdoptionSources} from '../prepare-source-bound-core-adoption-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},entry='rust/src/lib.rs',root=new URL('../../../',import.meta.url),dependencyInputs={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const source='use model::{Record,FLAG,read};\n#[rustfmt::skip]pub fn selected(value:bool)->bool{value}\npub mod model{pub struct Record{pub value:u8}pub const FLAG:bool=true;pub fn read(value:bool)->bool{value}}';
function setup(text=source){const graph=resolveModuleGraph({entry,paths:[entry],readSource:()=>text,compilationProfile:PRODUCTION_PROFILE});return {modules:[...graph.modules],compilationProfile:PRODUCTION_PROFILE,dependencyInputs};}
function rootModule(input){return input.modules.find(module=>module.path.length===0);}
function tool(input){const module=rootModule(input),item=originalSourceModuleItems(module).find(row=>row.name==='selected'),attribute=itemConfiguration(item.tokens,input.compilationProfile).attributes.find(row=>row.name==='rustfmt');return {module,item,attribute};}
function closed(context,row){return coreAdoptionSourceBoundNamespaceAttributeClosed(context,row.module.source,row.module.file,row.module.sourceView?.modulePath??row.module.path,row.item,row.attribute);}
test('ordinary no-derive source graph obtains named struct const and function candidates',limits,()=>{
 const input=setup(),context=createSourceBoundToolAwareCoreAdoptionProducerContext(input),module=rootModule(input),item=originalSourceModuleItems(module).find(row=>row.term==='use'),selector=createSourceBoundToolAwareCoreAdoptionNonTraitImportSelector({...input,context});assert.ok(context);assert.equal(closed(context,tool(input)),true);assert.equal(coreTypeProducerProblemsForModule(context,module).length,0);
 const kinds=new Map([['Record','struct'],['FLAG','const'],['read','fn']]);for(const leaf of originalUseDeclarationLeaves(item,module.path)){const role=selector.select(module,item,leaf);assert.ok(role,leaf.name);assert.ok(role.roles.some(row=>row.kind===kinds.get(leaf.name)),leaf.name);assert.equal(role.executableAdmission,false);assert.equal(role.namespaceComplete,false);assert.equal(role.originalDispatchProved,false);for(const row of role.roles)assert.ok(row.declaration.original.length>0);}
 selector.verify();const result=finishSourceBoundToolAwareCoreAdoptionProducerContext(context);assert.equal(result.producerMode,'original-source-without-derive-v1');assert.equal(result.dependenciesDigest,null);assert.equal(result.deriveDependenciesVerified,false);assert.deepEqual(result.dependencyInputs,dependencyInputs);assert.deepEqual(result.selections,[]);assert.equal(result.originalToolAttributeContext.certificates.length,1);assert.equal(result.crossInvocationCache,false);
});
test('legacy creators keep no-derive refusal and the source lane grants no Cargo dependency proof',limits,()=>{
 const input=setup();for(const creator of [createCoreAdoptionProducerContext,createEnclosingCoreAdoptionProducerContext,createToolAwareEnclosingCoreAdoptionProducerContext])assert.equal(creator(input),null);
 assert.equal(createSourceBoundToolAwareCoreAdoptionProducerContext({...input,dependencyInputs:undefined}),null);
 const unused={manifest:'not a dependency manifest',lock:'not a dependency lock'},context=createSourceBoundToolAwareCoreAdoptionProducerContext({...input,dependencyInputs:unused}),result=finishSourceBoundToolAwareCoreAdoptionProducerContext(context);assert.equal(result.deriveDependenciesVerified,false);assert.deepEqual(result.dependencyInputs,unused);assert.equal(result.semanticAuthority,false);assert.equal(result.executableAdmission,false);
 const accessor={get manifest(){throw Error('must not invoke getter');},lock:'x'};assert.throws(()=>createSourceBoundToolAwareCoreAdoptionProducerContext({...input,dependencyInputs:accessor}),/bounded primitive Cargo source/u);
});
test('known derive input delegates to genuine complete output with its original source joins',limits,()=>{
 const input=setup(source+'pub mod derived{#[derive(Clone,Debug)]pub struct D{value:u8}}'),context=createSourceBoundToolAwareCoreAdoptionProducerContext(input),result=finishSourceBoundToolAwareCoreAdoptionProducerContext(context);assert.ok(context);assert.notEqual(result.producerMode,'original-source-without-derive-v1');assert.ok(result.dependenciesDigest);assert.equal(closed(context,tool(input)),true);assert.equal(result.runtimeAuthority,false);
});
test('unknown producers globs live type shadows and altered actual source cannot become tool ownership',limits,()=>{
 for(const text of ['mod rustfmt{}'+source,'use missing::*;'+source,'#![no_implicit_prelude]'+source,'#[unknown]pub struct Hidden;'+source]){const input=setup(text),context=createSourceBoundToolAwareCoreAdoptionProducerContext(input);assert.equal(closed(context,tool(input)),false,text);}
 const input=setup(),context=createSourceBoundToolAwareCoreAdoptionProducerContext(input),row=tool(input),spans=coreAdoptionSourceBoundProducerClosedAttributeSpans(context,row.module);assert.equal(spans.length,1);assert.equal(spans[0].expected,'#[rustfmt::skip]');
});
test('private contexts and selectors refuse copied tokens profile changes and changed graph membership',limits,()=>{
 const input=setup(),context=createSourceBoundToolAwareCoreAdoptionProducerContext(input),selector=createSourceBoundToolAwareCoreAdoptionNonTraitImportSelector({...input,context}),row=tool(input);assert.throws(()=>closed(structuredClone(context),row),/foreign/u);assert.equal(closed(context,{...row,item:{...row.item,start:row.item.start+1}}),false);
 assert.throws(()=>createSourceBoundToolAwareCoreAdoptionNonTraitImportSelector({...input,compilationProfile:{flags:{test:true}},context}),/profile differs/u);input.modules.reverse();assert.throws(()=>selector.verify(),/graph changed/u);assert.throws(()=>finishSourceBoundToolAwareCoreAdoptionProducerContext(context),/graph changed/u);
});
test('no-derive tool-owned body keeps independent JavaScript and strict TypeScript behavior',limits,async()=>{
 const text='#[rustfmt::skip]pub fn selected(value:bool)->bool{value}',result=translateProjectWithFlatEnclosingSemanticMeta({entry,paths:[entry],readSource:()=>text,compilationProfile:PRODUCTION_PROFILE});assert.ok(result.meta.executable.some(row=>row.name==='selected'));await verifyTypedTargets(result,api=>{assert.equal(api.selected(false),false);assert.equal(api.selected(true),true);},{childTimeoutMs:20000});
});
test('complete no-derive source family retains full inverse and both ordered substitution phases',limits,()=>{
 const plan=prepareSourceBoundCoreAdoptionSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
