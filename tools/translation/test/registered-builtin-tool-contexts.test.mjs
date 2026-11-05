// Independent tool/input/source composition SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {resolveModuleGraph,translateProject,translateProjectWithFlatEnclosingSemanticMeta} from '../project.mjs';
import {createDeriveFootprintContext,createToolAwareDeriveFootprintContext,isDeriveFootprintContext,deriveFootprintSourceContext} from '../derive-footprints.mjs';
import {createToolAttributeContext,createRegisteredBuiltinToolAttributeContext,createRegisteredBuiltinEnclosingToolAttributeContext,isToolAttributeContext,toolAttributeAt} from '../tool-attributes.mjs';
import {createDeriveEnclosingNamespaceContext} from '../derive-enclosing-namespace-context.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareRegisteredBuiltinToolSources} from '../prepare-registered-builtin-tool-sources.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock}),limits={timeout:60000};
const source='#[stable(feature="fixture",since="1.0.0")]#[rustfmt::skip]pub fn root(value:bool)->bool{value}\npub mod model{#[derive(Clone,Debug)]pub struct Record{value:u8}}\n';
function setup(text=source,externalModules=registeredStandardHostBindings()){const graph=resolveModuleGraph({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>text,compilationProfile:PRODUCTION_PROFILE});return {modules:graph.modules,dependencies,externalModules,compilationProfile:PRODUCTION_PROFILE};}
test('current registered builtin namespace sources compose with original root tool proof and child derive ownership',limits,()=>{
 const input=setup(),legacy=createToolAttributeContext(input),tool=createRegisteredBuiltinToolAttributeContext(input),context=createToolAwareDeriveFootprintContext(input);assert.equal(legacy.certificates.length,0);assert.equal(tool.certificates.length,1);assert.ok(isToolAttributeContext(tool));assert.equal(context.certificates.length,1);assert.ok(isDeriveFootprintContext(context));assert.equal(context.originalToolContext.certificates.length,1);assert.equal(context.originalToolContext.semanticAuthority,false);assert.equal(context.certificates[0].generatedImplBehavior,false);assert.equal(context.certificates[0].dimensions.typeNamespaceComplete,false);assert.equal(context.certificates[0].dimensions.valueNamespaceComplete,false);assert.equal(deriveFootprintSourceContext(context).modules.length,input.modules.length);
 const bang=createDeriveEnclosingNamespaceContext({deriveContext:context}),complete=createRegisteredBuiltinEnclosingToolAttributeContext({...input,deriveContext:context,deriveBangContext:bang});assert.equal(complete.certificates.length,1);assert.equal(isToolAttributeContext(structuredClone(tool)),false);assert.deepEqual(createToolAttributeContext(input),legacy);
});
test('actual source/profile/module joins and recomputed external tables still govern tool ownership',limits,()=>{
 const input=setup(),tool=createRegisteredBuiltinToolAttributeContext(input),module=input.modules.find(row=>row.path.length===0),item=module.items.find(row=>row.term==='fn'),attribute=tool.certificates[0].attribute;assert.ok(toolAttributeAt(tool,module,item,attribute));assert.throws(()=>toolAttributeAt(tool,{...module,source:module.source+' '},item,attribute),/source mismatch/u);
 for(const value of [tool,structuredClone(tool),false])assert.throws(()=>createToolAwareDeriveFootprintContext({...input,toolContext:value}),/freshly recomputed/u);
 const external=registeredStandardHostBindings();external.set('foreign',{kind:'mod',complete:true,bindings:[{namespace:'type',name:'rustfmt',target:['foreign','rustfmt'],kind:'mod'}]});assert.equal(createRegisteredBuiltinToolAttributeContext(setup('use foreign::*;'+source,external)).certificates.length,0);
});
test('unknown producers qualified builtin paths architecture globs type shadows and original cycles remain refused',limits,()=>{
 for(const text of ['mod rustfmt{}'+source,'use unresolved::*;'+source,'use core::arch::x86_64::*;'+source,'#![no_implicit_prelude]'+source,'#[unknown]pub struct Hidden;'+source,source.replace('stable(feature','stable::transform(feature'),'#[derive(Clone,Debug)]pub struct Record{value:u8}#[rustfmt::skip]pub fn root(value:bool)->bool{value}']){const input=setup(text);assert.equal(createRegisteredBuiltinToolAttributeContext(input).certificates.length,0,text);assert.equal(createToolAwareDeriveFootprintContext(input).certificates.length,0,text);}
 const unknownChild=setup(source.replace('Clone,Debug','Clone,Debug,Unknown'));assert.equal(createToolAwareDeriveFootprintContext(unknownChild).certificates.length,0);
});
test('selected enclosing project uses original registered tool contexts without changing default project admission',limits,()=>{
 const options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE,cargoManifest:manifest,deriveDependencies:dependencies},before=translateProject(options),result=translateProjectWithFlatEnclosingSemanticMeta(options);assert.deepEqual(translateProject(options).meta,before.meta);assert.ok(result.meta.toolAttributeFootprints.certificates.length>0);assert.equal(result.meta.runtimeParity,false);assert.equal(createDeriveFootprintContext(setup()).certificates.length,0);
});
test('complete original constructor consumer and fresh classifier source copies retain both phases and full inverses',limits,()=>{
 const plan=prepareRegisteredBuiltinToolSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
