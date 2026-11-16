// Independent original namespace/profile source. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {resolveModuleGraph,translateProjectWithFlatEnclosingSemanticMeta} from '../project.mjs';
import {resolveRegisteredBuiltinEnclosingNamespaceModuleBindings,resolveConfiguredVariantEnclosingNamespaceModuleBindings,isResolvedSourceScopeSet,assertResolvedSourceScopeOrigin} from '../module-bindings.mjs';
import {createRegisteredBuiltinToolAttributeContext,createConfiguredVariantToolAttributeContext,createConfiguredVariantEnclosingToolAttributeContext,isToolAttributeContext,toolAttributeAt} from '../tool-attributes.mjs';
import {createToolAwareDeriveFootprintContext} from '../derive-footprints.mjs';
import {createDeriveEnclosingNamespaceContext} from '../derive-enclosing-namespace-context.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {compilationProfile,PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {prepareConfiguredEnumVariantSources} from '../prepare-configured-enum-variant-sources.mjs';
const limits={timeout:60000},sourcePath='rust/src/lib.rs';
const source='pub enum Choice<T>{#[cfg(any())]rustfmt(T),#[cfg(all())]Value(T)}\nuse Choice::*;\n#[rustfmt::skip]pub fn selected(value:bool)->bool{value}\n';
function setup(text=source,profile=PRODUCTION_PROFILE){const graph=resolveModuleGraph({entry:sourcePath,paths:[sourcePath],readSource:()=>text,compilationProfile:profile});return {modules:graph.modules,externalModules:registeredStandardHostBindings(),compilationProfile:profile};}
function root(result){return result.scopes.find(row=>row.path.length===0);}
test('known inactive variants cannot shadow a tool prefix and known active variants retain resolved original names',limits,()=>{
 const input=setup(),legacy=resolveRegisteredBuiltinEnclosingNamespaceModuleBindings(input),current=resolveConfiguredVariantEnclosingNamespaceModuleBindings(input);assert.ok(root(legacy).bindings.some(row=>row.name==='rustfmt'));assert.ok(!root(current).bindings.some(row=>row.name==='rustfmt'));assert.ok(root(current).bindings.filter(row=>row.name==='Value').every(row=>row.status==='resolved'));assert.equal(createRegisteredBuiltinToolAttributeContext(input).certificates.length,0);
 assert.ok(root(current).bindings.some(row=>row.name==='Value'&&row.namespace==='type'&&row.status==='resolved'));assert.ok(root(current).bindings.some(row=>row.name==='Value'&&row.namespace==='value'&&row.status==='resolved'));
 const tool=createConfiguredVariantToolAttributeContext(input);assert.equal(tool.certificates.length,1);assert.ok(isToolAttributeContext(tool));assert.equal(tool.certificates[0].owner.namespace,'tool-prelude');assert.equal(tool.certificates[0].runtimeBehavior,false);assert.ok(isResolvedSourceScopeSet(current.scopes));assert.strictEqual(assertResolvedSourceScopeOrigin(current.scopes,input),current.scopes);assert.equal(isResolvedSourceScopeSet(structuredClone(current.scopes)),false);
});
test('explicit active inactive and unknown feature profiles retain every possible original shadow',limits,()=>{
 const text=source.replace('cfg(any())','cfg(feature="shadow")'),profiles=[
  [compilationProfile({flags:{test:false},values:{feature:[]},closedKeys:['feature']}),false,'absent'],
  [compilationProfile({flags:{test:false},values:{feature:['shadow']},closedKeys:['feature']}),true,'resolved'],
  [PRODUCTION_PROFILE,true,'unresolved'],
 ];
 for(const [profile,present,status]of profiles){const input=setup(text,profile),facts=resolveConfiguredVariantEnclosingNamespaceModuleBindings(input),names=root(facts).bindings.filter(row=>row.name==='rustfmt');assert.equal(names.length>0,present);if(present)assert.ok(names.every(row=>row.status===status));assert.equal(createConfiguredVariantToolAttributeContext(input).certificates.length,present?0:1);}
 const absent=setup(source.replace('#[cfg(all())]Value','#[cfg_attr(any(),unknown)]#[cfg(all())]Value'));assert.equal(createConfiguredVariantToolAttributeContext(absent).certificates.length,1);
});
test('unknown producers live shadows opaque globs and truncated caller item carriers keep their original refusals',limits,()=>{
 for(const text of [source.replace('cfg(any())','cfg(all())'),'mod rustfmt{}'+source,'use unknown::*;'+source,'use core::arch::x86_64::*;'+source,source.replace('#[cfg(all())]Value','#[unknown]Value'),source.replace('#[cfg(all())]Value','#[cfg_attr(all(),unknown)]Value')])assert.equal(createConfiguredVariantToolAttributeContext(setup(text)).certificates.length,0,text);
 const active=setup(source.replace('cfg(any())','cfg(all())'));active.modules=active.modules.map(module=>({...module,items:[],allItems:[]}));assert.equal(createConfiguredVariantToolAttributeContext(active).certificates.length,0);assert.ok(root(resolveConfiguredVariantEnclosingNamespaceModuleBindings(active)).bindings.some(row=>row.name==='rustfmt'));
 const input=setup(),tool=createConfiguredVariantToolAttributeContext(input),module=input.modules[0],item=originalSourceModuleItems(module).find(row=>row.name==='selected'),attribute=tool.certificates[0].attribute;assert.ok(toolAttributeAt(tool,module,item,attribute));assert.throws(()=>toolAttributeAt(tool,{...module,source:module.source+' '},item,attribute));assert.equal(isToolAttributeContext(structuredClone(tool)),false);assert.throws(()=>assertResolvedSourceScopeOrigin(resolveConfiguredVariantEnclosingNamespaceModuleBindings(input).scopes,{...input,modules:input.modules.map(module=>({...module,source:module.source+' '}))}));
});
test('selected original input and complete-output tool constructors compose child derives through the actual project path',limits,()=>{
 const repository=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',repository),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',repository),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock}),text=source+'pub mod model{#[derive(Clone,Debug)]pub struct Record{value:u8}}',input={...setup(text),dependencies},derive=createToolAwareDeriveFootprintContext(input);assert.equal(derive.originalToolContext.certificates.length,1);assert.equal(derive.certificates.length,1);const bang=createDeriveEnclosingNamespaceContext({deriveContext:derive}),output=createConfiguredVariantEnclosingToolAttributeContext({...input,deriveContext:derive,deriveBangContext:bang});assert.equal(output.certificates.length,1);assert.equal(derive.certificates[0].dimensions.typeNamespaceComplete,false);assert.equal(derive.certificates[0].generatedImplBehavior,false);
 const result=translateProjectWithFlatEnclosingSemanticMeta({entry:sourcePath,paths:[sourcePath],readSource:()=>text,compilationProfile:PRODUCTION_PROFILE,cargoManifest:manifest,deriveDependencies:dependencies});assert.ok(result.meta.toolAttributeFootprints.certificates.length>0);assert.equal(result.meta.runtimeParity,false);
});
test('all complete configured variant resolver constructor and consumer sources retain both phases and exact inverses',limits,()=>{
 const plan=prepareConfiguredEnumVariantSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
