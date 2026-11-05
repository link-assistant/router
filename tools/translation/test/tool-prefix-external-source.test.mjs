// Independent tool-prefix/external association SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolveModuleGraph} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {captureToolExternalNamespaceInputs} from '../tool-context-inputs.mjs';
import {createToolAttributeContext,createEnclosingToolAttributeContext,createRegisteredBuiltinToolAttributeContext,createRegisteredBuiltinEnclosingToolAttributeContext,createConfiguredVariantToolAttributeContext,createConfiguredVariantEnclosingToolAttributeContext,assertToolAttributeContextInputs,isToolAttributeContext,isToolAttributeCertificate,toolAttributeAt} from '../tool-attributes.mjs';
import {resolveModuleBindings,resolveEnclosingNamespaceModuleBindings,resolveRegisteredBuiltinEnclosingNamespaceModuleBindings,resolveConfiguredVariantEnclosingNamespaceModuleBindings} from '../module-bindings.mjs';
import * as wholeOwner from '../whole-owner-module-bindings-candidate.mjs';
import * as wholeOwnerCore from '../whole-owner-core-module-bindings-candidate.mjs';
import * as proofByte from '../proof-byte-whole-owner-module-bindings-candidate.mjs';
import * as proofByteCore from '../proof-byte-core-bindings-candidate.mjs';
import * as literalInclude from '../literal-include-module-bindings-candidate.mjs';
import {prepareToolPrefixExternalSources} from '../prepare-tool-prefix-external-sources.mjs';
const limits={timeout:60000},source='#[rustfmt::skip]pub fn keep(value:u8)->u8{value}',constructors=[createToolAttributeContext,createEnclosingToolAttributeContext,createRegisteredBuiltinToolAttributeContext,createRegisteredBuiltinEnclosingToolAttributeContext,createConfiguredVariantToolAttributeContext,createConfiguredVariantEnclosingToolAttributeContext];
function setup(text=source,externalModules=registeredStandardHostBindings()){
 const graph=resolveModuleGraph({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>text,compilationProfile:PRODUCTION_PROFILE});return {modules:graph.modules,externalModules,compilationProfile:PRODUCTION_PROFILE};
}
for(const create of constructors){
 test(create.name+' keeps genuine default tool ownership and rejects external rustfmt prefixes',limits,()=>{
  const input=setup(),context=create(input);assert.ok(isToolAttributeContext(context));assert.equal(context.certificates.length,1);assert.ok(isToolAttributeCertificate(context.certificates[0]));assert.strictEqual(assertToolAttributeContextInputs(context,input),context);const module=input.modules[0],item=originalSourceModuleItems(module).find(row=>row.name==='keep');assert.strictEqual(toolAttributeAt(context,module,item,context.certificates[0].attribute),context.certificates[0]);
  for(const [name,complete]of [['rustfmt',true],['rustfmt',false],['rustfmt::library',true],['rustfmt::library',false]]){const externalModules=new Map(input.externalModules);externalModules.set(name,{kind:'mod',complete,bindings:[]});for(const text of [source,'mod nested{'+source+'}']){const refused=create(setup(text,externalModules));assert.equal(refused.certificates.length,0,name);assert.ok(refused.diagnostics.some(row=>/closed active tool-prelude/u.test(row.message)),name);}}
  const externalModules=new Map(input.externalModules);externalModules.set('rustfmt_extra',{kind:'mod',complete:true,bindings:[]});assert.equal(create({...input,externalModules}).certificates.length,1);
 });
 test(create.name+' binds original external graph and profile even when no tool candidate exists',limits,()=>{
  const input=setup(),context=create(input),externalModules=new Map(input.externalModules);externalModules.set('rustfmt',{kind:'mod',complete:true,bindings:[]});assert.throws(()=>assertToolAttributeContextInputs(context,{...input,externalModules}),/external namespaces changed/u);assert.throws(()=>assertToolAttributeContextInputs(structuredClone(context),input),/original complete source composition/u);assert.throws(()=>assertToolAttributeContextInputs(context,{...input,modules:[]}),/module set changed/u);assert.throws(()=>assertToolAttributeContextInputs(context,{...input,modules:input.modules.map(row=>({...row,source:row.source+'//changed'}))}),/module source or view changed/u);
  assert.throws(()=>assertToolAttributeContextInputs(context,{...input,compilationProfile:{flags:{test:true}}}),/profile or external namespaces changed/u);const empty=setup('pub fn keep(value:u8)->u8{value}'),emptyContext=create(empty);assert.equal(emptyContext.certificates.length,0);assert.throws(()=>assertToolAttributeContextInputs(emptyContext,{...empty,externalModules}),/external namespaces changed/u);
 });
 test(create.name+' preserves local import cfg and disabled-prelude refusals',limits,()=>{
  for(const text of ['mod rustfmt{}'+source,'use unknown::rustfmt;'+source,'use unknown::*;'+source,'#![no_implicit_prelude]'+source,'#[cfg(unknown_feature)]pub struct Maybe;'+source])assert.equal(create(setup(text)).certificates.length,0,text);
 });
}
test('all original resolver lanes reject foreign external tables for genuine tool contexts',limits,()=>{
 const input=setup(),toolContext=createToolAttributeContext(input),externalModules=new Map(input.externalModules);externalModules.set('rustfmt',{kind:'mod',complete:true,bindings:[]});const resolvers=[resolveModuleBindings,resolveEnclosingNamespaceModuleBindings,resolveRegisteredBuiltinEnclosingNamespaceModuleBindings,resolveConfiguredVariantEnclosingNamespaceModuleBindings,...[wholeOwner,wholeOwnerCore,proofByte,proofByteCore,literalInclude].flatMap(module=>[module.resolveModuleBindings,module.resolveEnclosingNamespaceModuleBindings])];assert.equal(resolvers.length,14);
 for(const resolve of resolvers){assert.equal(typeof resolve,'function');assert.throws(()=>resolve({...input,externalModules,toolContext}),/Tool source profile or external namespaces changed/u,resolve.name);const actual=resolve({...input,toolContext});assert.equal(actual.scopes.find(row=>row.path.length===0).unresolvedAttributeMacroScope,false,resolve.name);}
});
test('complete external DATA snapshots distinguish source mutation and refuse callbacks without invoking them',limits,()=>{
 const table={kind:'mod',complete:true,bindings:[{name:'Marker',namespace:'type',kind:'struct',target:['foreign','Marker']}]},external=new Map([['foreign',table]]),before=captureToolExternalNamespaceInputs(external);assert.equal(captureToolExternalNamespaceInputs(new Map([['foreign',structuredClone(table)]])),before);table.bindings[0].target=['foreign','Changed'];assert.notEqual(captureToolExternalNamespaceInputs(external),before);
 let calls=0;for(const table of [Object.defineProperty({complete:true,bindings:[]},'kind',{get(){calls++;return 'mod';}}),{kind:'mod',complete:true,bindings:[],toJSON(){calls++;return {};}},{kind:'mod',complete:true,bindings:new Array(1)},new Proxy({kind:'mod',complete:true,bindings:[]},{get(){calls++;return undefined;}})])assert.throws(()=>captureToolExternalNamespaceInputs(new Map([['foreign',table]])),/plain original DATA/u);assert.equal(calls,0);const changedMap=new Map();changedMap[Symbol.iterator]=function(){calls++;throw Error('input iterator');};assert.throws(()=>captureToolExternalNamespaceInputs(changedMap),/plain original DATA/u);assert.equal(calls,0);
 const cyclic={kind:'mod',complete:true,bindings:[]};cyclic.self=cyclic;assert.throws(()=>captureToolExternalNamespaceInputs(new Map([['foreign',cyclic]])),/plain original DATA/u);
});
test('retained complete native resolver sources retain the higher-priority extern-prelude and tool ordering',limits,()=>{
 const native=gunzipSync(readFileSync(new URL('../source-profiles/tool-attributes/rust-resolve-ident-1.89.0.rs.gz',import.meta.url)),{maxOutputLength:120000}).toString('utf8');assert.ok(native.includes('Scope::ExternPrelude => Scope::ToolPrelude'));assert.ok(native.includes('Scope::ToolPrelude => Scope::StdLibPrelude'));assert.ok(native.includes('this.extern_prelude_get'));assert.ok(native.includes('this.registered_tool_bindings.get'));
});
test('nine complete source equations retain original owners both phases full CST inverses and all original APIs',limits,()=>{
 const plan=prepareToolPrefixExternalSources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}const original=plan.files.find(row=>row.path==='tools/translation/tool-attributes.mjs');for(const create of constructors)assert.ok(original.before.includes('function '+create.name+'('));assert.equal(plan.receivingExecuted,false);
});
