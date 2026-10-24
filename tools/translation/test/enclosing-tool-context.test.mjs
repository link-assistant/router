// Independent enclosing producer/tool composition SOURCE. Execution deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintSourceContext} from '../derive-footprints.mjs';
import {createDeriveEnclosingNamespaceContext} from '../derive-enclosing-namespace-context.mjs';
import {createToolAttributeContext,createEnclosingToolAttributeContext,isToolAttributeContext,isToolAttributeCertificate,toolAttributeAt} from '../tool-attributes.mjs';
import {resolveModuleGraph,translateProject,translateProjectWithFlatEnclosingSemanticMeta} from '../project.mjs';
import {resolveEnclosingNamespaceModuleBindings} from '../module-bindings.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareEnclosingToolContextSources} from '../prepare-enclosing-tool-context-sources.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock}),limits={timeout:60000};
const source='#[derive(Clone,Debug)]pub struct Record{value:u8}\n#[rustfmt::skip]pub fn keep(value:u8)->u8{value}\n';
function setup(text=source){
 const graph=resolveModuleGraph({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>text,compilationProfile:PRODUCTION_PROFILE}),deriveContext=createDeriveFootprintContext({modules:graph.modules,dependencies,externalModules:registeredStandardHostBindings(),compilationProfile:PRODUCTION_PROFILE}),original=deriveFootprintSourceContext(deriveContext),deriveBangContext=createDeriveEnclosingNamespaceContext({deriveContext});return {...original,deriveContext,deriveBangContext};
}
test('genuine complete enclosing outputs compose with actual tool-prelude ownership and original source certificates',limits,()=>{
 const input=setup(),context=createEnclosingToolAttributeContext(input);assert.ok(isToolAttributeContext(context));assert.equal(context.certificates.length,1);const proof=context.certificates[0];assert.ok(isToolAttributeCertificate(proof));assert.equal(proof.owner.namespace,'tool-prelude');assert.equal(proof.dimensions.typeNamespaceComplete,true);assert.equal(proof.runtimeBehavior,false);const module=input.modules.find(row=>row.path.length===0),item=originalSourceModuleItems(module).find(row=>row.name==='keep');assert.strictEqual(toolAttributeAt(context,module,item,proof.attribute),proof);
 const binding=resolveEnclosingNamespaceModuleBindings({...input,toolContext:context});assert.equal(binding.scopes.find(row=>row.path.length===0).unresolvedTypeScope,false);assert.equal(binding.scopes.find(row=>row.path.length===0).unresolvedAttributeMacroScope,false);
 assert.equal(isToolAttributeContext(structuredClone(context)),false);assert.equal(isToolAttributeCertificate(structuredClone(proof)),false);
});
test('an enclosing context validates complete source/profile/external association even without a tool candidate',limits,()=>{
 const input=setup('#[derive(Clone)]pub struct Record{value:u8}'),other=setup('#[derive(Clone)]pub struct Different{value:u8}');
 for(const deriveBangContext of [structuredClone(input.deriveBangContext),other.deriveBangContext])assert.throws(()=>createEnclosingToolAttributeContext({...input,deriveBangContext}),/original|context|composition|source/u);
 assert.throws(()=>createEnclosingToolAttributeContext({...input,deriveBangContext:null}),/genuine complete/u);
 assert.throws(()=>createEnclosingToolAttributeContext({...input,modules:[]}),/original module set/u);
 const externalModules=new Map(input.externalModules);externalModules.set('foreign',{kind:'mod',complete:false,bindings:[]});assert.throws(()=>createEnclosingToolAttributeContext({...input,externalModules}),/external namespaces/u);
 const modules=input.modules.map(row=>({...row,items:[],allItems:[]}));assert.throws(()=>createEnclosingToolAttributeContext({...input,modules}),/item carrier/u);
});
test('same-path source and item-carrier changes cannot hide an unknown producer',limits,()=>{
 const input=setup(source+'#[unknown]pub struct Hidden;'),changed=input.modules.map(row=>({...row,source:row.source+'\n// changed\n'}));assert.throws(()=>createEnclosingToolAttributeContext({...input,modules:changed}),/original module|source|changed/u);
 const filtered=input.modules.map(row=>({...row,items:originalSourceModuleItems(row).filter(item=>item.name!=='Hidden')}));assert.throws(()=>createEnclosingToolAttributeContext({...input,modules:filtered}),/item carrier/u);assert.equal(createEnclosingToolAttributeContext(input).certificates.length,0);
});
test('actual type-prefix shadows unknown derives imports and disabled preludes retain refusals',limits,()=>{
 for(const text of [
  'mod rustfmt{}'+source,
  'use unknown::rustfmt;'+source,
  'use unknown::*;'+source,
  '#![no_implicit_prelude]'+source,
  source.replace('Clone,Debug','Clone,Debug,Unknown'),
  '#[cfg(unknown_feature)]pub struct Maybe;'+source,
 ]){const input=setup(text),context=createEnclosingToolAttributeContext(input);assert.equal(context.certificates.length,0,text);assert.ok(context.diagnostics.length>0,text);}
});
test('legacy tool APIs retain their exact ordinary proof and rejection domains',limits,()=>{
 const text='#[rustfmt::skip]pub fn keep(value:u8)->u8{value}',graph=resolveModuleGraph({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>text,compilationProfile:PRODUCTION_PROFILE}),input={modules:graph.modules,externalModules:registeredStandardHostBindings(),compilationProfile:PRODUCTION_PROFILE};assert.deepEqual(createEnclosingToolAttributeContext(input),createToolAttributeContext(input));
 const genuine=setup(),before=createToolAttributeContext(genuine);assert.deepEqual(createToolAttributeContext(genuine),before);assert.throws(()=>toolAttributeAt(structuredClone(before),genuine.modules[0],originalSourceModuleItems(genuine.modules[0])[0],{}),/Unsealed/u);
});
test('actual enclosing project selects genuine tool composition while ordinary API keeps its original lane',limits,async()=>{
 const options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE,cargoManifest:manifest,deriveDependencies:dependencies},old=translateProject(options),events=[],result=translateProjectWithFlatEnclosingSemanticMeta({...options,progress:row=>events.push(row)});assert.equal(result.meta.toolAttributeFootprints.certificates.length,1);assert.equal(result.meta.runtimeParity,false);assert.ok(events.some(row=>row.stage==='namespace'&&row.phase==='tool-attributes'));assert.deepEqual(translateProject(options).meta,old.meta);
 await verifyTypedTargets(result,api=>{assert.equal(api.keep(0n),0n);assert.equal(api.keep(255n),255n);assert.throws(()=>api.keep(256n),RangeError);},{childTimeoutMs:20000});
});
test('complete original source, ordered substitutions and project history remain available',limits,()=>{const plan=prepareEnclosingToolContextSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const original=plan.files.find(row=>row.path==='tools/translation/tool-attributes.mjs');assert.ok(original.before.includes('export function createToolAttributeContext'));assert.ok(original.after.includes('export function createEnclosingToolAttributeContext'));assert.equal(plan.receivingExecuted,false);});
