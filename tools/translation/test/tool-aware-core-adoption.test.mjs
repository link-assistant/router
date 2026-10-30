// Independent adoption/namespace and receiving SOURCE. Every case is unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {resolveModuleGraph,translateProjectWithFlatEnclosingSemanticMeta} from '../project.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {originalUseDeclarationLeaves} from '../module-bindings.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createEnclosingCoreAdoptionProducerContext,createToolAwareEnclosingCoreAdoptionProducerContext,coreAdoptionNamespaceAttributeClosed,coreAdoptionToolAwareProducerClosedAttributeSpans,createToolAwareCoreAdoptionNonTraitImportSelector,finishToolAwareCoreAdoptionProducerContext,coreAdoptionProducerBindings} from '../core-adoption-producer-context.mjs';
import {coreTypeProducerProblemsForModule} from '../tool-aware-core-primitives-candidate.mjs';
import {prepareToolAwareCoreAdoptionSources} from '../prepare-tool-aware-core-adoption-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},entry='rust/src/lib.rs',root=new URL('../../../',import.meta.url);
const dependencyInputs={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const source='#[rustfmt::skip]pub fn selected(value:bool)->bool{value}\npub mod model{#[derive(Clone,Debug)]pub struct Record{value:u8}}\n';
function setup(text=source){const graph=resolveModuleGraph({entry,paths:[entry],readSource:()=>text,compilationProfile:PRODUCTION_PROFILE});return {modules:[...graph.modules],compilationProfile:PRODUCTION_PROFILE,dependencyInputs};}
function rootModule(input){return input.modules.find(module=>module.path.length===0);}
function rootAttribute(input,name){const module=rootModule(input),item=originalSourceModuleItems(module).find(row=>row.name==='selected');const attribute=coreAttributes(item).find(row=>row.name===name);return {module,item,attribute};}
import {itemConfiguration} from '../cfg-profile.mjs';
const coreAttributes=item=>itemConfiguration(item.tokens,PRODUCTION_PROFILE).attributes;
function closed(context,row){return coreAdoptionNamespaceAttributeClosed(context,row.module.source,row.module.file,row.module.sourceView?.modulePath??row.module.path,row.item,row.attribute);}
test('genuine complete-output tool proof composes with the shared original adoption issuer',limits,()=>{
 const input=setup(),context=createToolAwareEnclosingCoreAdoptionProducerContext(input),row=rootAttribute(input,'rustfmt');assert.ok(context);assert.equal(closed(context,row),true);assert.equal(coreTypeProducerProblemsForModule(context,row.module).length,0);assert.ok(coreAdoptionProducerBindings(context));
 const spans=coreAdoptionToolAwareProducerClosedAttributeSpans(context,row.module);assert.equal(spans.length,1);assert.equal(spans[0].expected,'#[rustfmt::skip]');assert.equal(row.module.source.slice(...spans[0].span),spans[0].expected);
 const result=finishToolAwareCoreAdoptionProducerContext(context);assert.equal(result.originalToolAttributeContext.certificates.length,1);assert.equal(result.executableAdmission,false);assert.equal(result.runtimeAuthority,false);assert.equal(result.crossInvocationCache,false);
 assert.throws(()=>coreAdoptionNamespaceAttributeClosed(structuredClone(context),row.module.source,row.module.file,[],row.item,row.attribute),/foreign/u);
 const legacy=createEnclosingCoreAdoptionProducerContext(input);assert.throws(()=>finishToolAwareCoreAdoptionProducerContext(legacy),/tool-aware/u);
});
test('stability namespace facts retain original Rust metadata and cannot issue an erasure span',limits,()=>{
 const input=setup('#[stable(feature="fixture",since="1.0.0")]'+source),context=createToolAwareEnclosingCoreAdoptionProducerContext(input),stable=rootAttribute(input,'stable');assert.equal(closed(context,stable),true);
 const spans=coreAdoptionToolAwareProducerClosedAttributeSpans(context,stable.module);assert.equal(spans.length,1);assert.equal(spans[0].name,'rustfmt');assert.ok(spans.every(row=>row.name!=='stable'));
 assert.equal(closed(context,{...stable,attribute:{...stable.attribute,span:{start:stable.attribute.span.start+1,end:stable.attribute.span.end}}}),false);
 const result=finishToolAwareCoreAdoptionProducerContext(context);assert.ok(result.registeredBuiltinAttributeSource.selected.some(row=>row.name==='stable'));assert.equal(result.registeredBuiltinAttributeSource.namespaceAuthority,false);
});
test('named nontrait candidates retain exact original declarations and no executable admission',limits,()=>{
 const input=setup('use model::Record;\n'+source),context=createToolAwareEnclosingCoreAdoptionProducerContext(input),module=rootModule(input),item=originalSourceModuleItems(module).find(row=>row.term==='use'),leaf=originalUseDeclarationLeaves(item,module.path)[0],selector=createToolAwareCoreAdoptionNonTraitImportSelector({...input,context}),role=selector.select(module,item,leaf);
 assert.ok(role);assert.equal(role.executableAdmission,false);assert.equal(role.namespaceComplete,false);assert.equal(role.originalDispatchProved,false);assert.ok(role.roles.some(row=>row.kind==='struct'&&row.target.join('::')==='crate::model::Record'));assert.equal(role.roles[0].declaration.original,'#[derive(Clone,Debug)]pub struct Record{value:u8}');selector.verify();finishToolAwareCoreAdoptionProducerContext(context);
 assert.equal(selector.select(module,item,{...leaf,glob:true}),null);assert.equal(selector.select(module,{...item,start:item.start+1},leaf),null);
});
test('source/profile changes copied contexts and injected attributes never acquire producer authority',limits,()=>{
 const input=setup(),context=createToolAwareEnclosingCoreAdoptionProducerContext(input),row=rootAttribute(input,'rustfmt'),selector=createToolAwareCoreAdoptionNonTraitImportSelector({...input,context});assert.equal(closed(context,{...row,attribute:{...row.attribute,name:'unknown'}}),false);
 assert.throws(()=>createToolAwareCoreAdoptionNonTraitImportSelector({...input,compilationProfile:{flags:{test:true}},context}),/profile differs/u);
 input.modules.pop();assert.throws(()=>selector.verify(),/graph changed/u);assert.throws(()=>finishToolAwareCoreAdoptionProducerContext(context),/graph changed/u);
 for(const text of ['mod rustfmt{}'+source,'use unresolved::*;'+source,'#![no_implicit_prelude]'+source,'#[unknown]pub struct Hidden;'+source]){const other=setup(text),created=createToolAwareEnclosingCoreAdoptionProducerContext(other);assert.equal(closed(created,rootAttribute(other,'rustfmt')),false,text);}
});
test('no-Cargo and no-derive operations keep their original bounded refusal',limits,()=>{
 const input=setup();assert.equal(createToolAwareEnclosingCoreAdoptionProducerContext({...input,dependencyInputs:undefined}),null);assert.equal(createToolAwareEnclosingCoreAdoptionProducerContext(setup('#[rustfmt::skip]pub fn selected(value:bool)->bool{value}')),null);assert.equal(finishToolAwareCoreAdoptionProducerContext(null),null);
});
test('selected enclosing translation keeps independent JavaScript and strict TypeScript behavior',limits,async()=>{
 const dependencies=loadDeriveDependencyProof(dependencyInputs),result=translateProjectWithFlatEnclosingSemanticMeta({entry,paths:[entry],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE,cargoManifest:dependencyInputs.manifest,deriveDependencies:dependencies});assert.ok(result.meta.executable.some(row=>row.name==='selected'));
 await verifyTypedTargets(result,api=>{assert.equal(api.selected(false),false);assert.equal(api.selected(true),true);},{childTimeoutMs:20000});
});
test('complete context selector primitive and base64 source copies retain ordered phases and original inverses',limits,()=>{
 const plan=prepareToolAwareCoreAdoptionSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
