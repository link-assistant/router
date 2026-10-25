// Independent original tool/input composition SOURCE. No execution during drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {resolveModuleGraph,translateProject,translateProjectWithFlatEnclosingSemanticMeta} from '../project.mjs';
import {createDeriveFootprintContext,createToolAwareDeriveFootprintContext,isDeriveFootprintContext,isDeriveFootprintCertificate,deriveFootprintSourceContext} from '../derive-footprints.mjs';
import {createToolAttributeContext} from '../tool-attributes.mjs';
import {createDeriveEnclosingNamespaceContext} from '../derive-enclosing-namespace-context.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareToolFirstDeriveSources} from '../prepare-tool-first-derive-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock}),limits={timeout:60000};
const source='#[rustfmt::skip]pub fn root(value:bool)->bool{value}\npub mod model{#[derive(Clone,Debug)]pub struct Record{value:u8}}\n';
function setup(text=source,externalModules=registeredStandardHostBindings()){
 const graph=resolveModuleGraph({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>text,compilationProfile:PRODUCTION_PROFILE});return {modules:graph.modules,dependencies,externalModules,compilationProfile:PRODUCTION_PROFILE};
}
test('independently genuine root tool ownership composes with child derive input without projecting any derive output',limits,()=>{
 const input=setup(),before=createDeriveFootprintContext(input),tool=createToolAttributeContext(input),context=createToolAwareDeriveFootprintContext(input);assert.equal(tool.certificates.length,1);assert.equal(before.certificates.length,0);assert.equal(context.certificates.length,1);assert.ok(isDeriveFootprintContext(context));assert.ok(isDeriveFootprintCertificate(context.certificates[0]));assert.equal(context.originalToolContext.certificates.length,1);assert.equal(context.originalToolContext.semanticAuthority,false);assert.equal(context.certificates[0].generatedImplBehavior,false);assert.equal(context.certificates[0].dimensions.typeNamespaceComplete,false);assert.ok(createDeriveEnclosingNamespaceContext({deriveContext:context}));assert.equal(deriveFootprintSourceContext(context).modules.length,input.modules.length);assert.equal(isDeriveFootprintContext(structuredClone(context)),false);assert.deepEqual(createDeriveFootprintContext(input),before);
});
test('current complete external tables and source views are recomputed; no supplied tool certificate can select ownership',limits,()=>{
 const input=setup(),tool=createToolAttributeContext(input);for(const toolContext of [tool,structuredClone(tool),{certificates:tool.certificates},false])assert.throws(()=>createToolAwareDeriveFootprintContext({...input,toolContext}),/freshly recomputed/u);
 const external=registeredStandardHostBindings();external.set('foreign',{kind:'mod',complete:true,bindings:[{namespace:'type',name:'rustfmt',target:['foreign','rustfmt'],kind:'mod'}]});const shadowed=setup('use foreign::*;'+source,external);assert.equal(createToolAwareDeriveFootprintContext(shadowed).certificates.length,0);
});
test('actual type shadows unknown attributes globs disabled preludes and unresolved derive owners keep original refusals',limits,()=>{
 for(const text of [
  'mod rustfmt{}'+source,
  'use unregistered::*;'+source,
  '#![no_implicit_prelude]'+source,
  '#[unknown]pub struct Hidden;'+source,
  source.replace('Clone,Debug','Clone,Debug,Unknown'),
  'use core::arch::x86_64::*;'+source,
 ])assert.equal(createToolAwareDeriveFootprintContext(setup(text)).certificates.length,0,text);
});
test('same-scope tool/derive circularity is not treated as an already genuine input or output proof',limits,()=>{
 const text='#[derive(Clone,Debug)]pub struct Record{value:u8}\n#[rustfmt::skip]pub fn root(value:bool)->bool{value}';const input=setup(text);assert.equal(createToolAttributeContext(input).certificates.length,0);assert.equal(createToolAwareDeriveFootprintContext(input).certificates.length,0);
});
test('the explicit enclosing project path selects original tool-first inputs and the default project API remains stable',limits,async()=>{
 const input=setup(),options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE,cargoManifest:manifest,deriveDependencies:dependencies},before=translateProject(options),result=translateProjectWithFlatEnclosingSemanticMeta(options);assert.deepEqual(translateProject(options).meta,before.meta);assert.ok(result.meta.toolAttributeFootprints.certificates.length>0);assert.equal(result.meta.runtimeParity,false);assert.ok(createToolAwareDeriveFootprintContext(input).certificates.length>0);await verifyTypedTargets(result,api=>{assert.equal(api.root(false),false);assert.equal(api.root(true),true);},{childTimeoutMs:20000});
});
test('complete original input constructor and project consumer keep native source selections and both ordered inverses',limits,()=>{
 const plan=prepareToolFirstDeriveSources();assert.equal(plan.files.length,3);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const input=plan.files.find(row=>row.path==='tools/translation/derive-footprints.mjs');assert.ok(input.before.includes('export function createDeriveFootprintContext'));assert.ok(input.after.includes('export function createToolAwareDeriveFootprintContext'));assert.ok(input.after.includes('const toolContext=createToolAttributeContext({modules,externalModules:external,compilationProfile:profile});'));
});
