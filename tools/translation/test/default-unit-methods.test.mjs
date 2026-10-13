import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {createDefaultSourceContext,defaultSourceContextFacts} from '../default-trait-source.mjs';
import {originalDefaultGeneratedMethod,assertOriginalDefaultGeneratedMethod} from '../default-source-ir.mjs';
import {originalUnitDefaultSource,assertOriginalUnitDefaultSource} from '../default-unit-source.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const root=new URL('../../../',import.meta.url),input={manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')};
const dependencies=loadDeriveDependencyProof(input),jsonMacroDependencies=loadJsonMacroSourceProof(input);
const compile=(source,entry='src/lib.rs')=>translateProject({entry,paths:[entry],readSource:()=>source,deriveDependencies:dependencies,jsonMacroDependencies,compilationProfile:PRODUCTION_PROFILE});
function setup(source){
 const captured=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE});
 const modules=captured.views.map(sourceView=>({file:'src/lib.rs',path:sourceView.modulePath,source,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition}));
 const context=createDefaultSourceContext(createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE})),module=defaultSourceContextFacts(context).modules[0];
 return {context,module,item:originalSourceModuleItems(module).find(value=>value.term==='enum')};
}
for(const names of [['Only'],['First','Last'],['A','B','C','D']])test('original unit Default selected variant '+names.join('/')+' executes in JS and strict TS',{timeout:60000},async()=>{
 for(const owner of ['Default','Default,serde::Serialize']){
  const selected=names.at(-1),source=`#[derive(${owner})]pub enum Choice{${names.map(name=>(name===selected?'#[default]':'')+name).join(',')}}pub fn make()->Choice{Choice::default()}`;
  const r=compile(source);assert.deepEqual(r.meta.refused,[]);assert.equal(r.meta.checkedGeneratedMethods.length,1);
  const method=r.meta.checkedGeneratedMethods[0];assert.equal(method.name,'Choice.default');assert.equal(method.originalDeclarationTerm,'enum');assert.equal(method.receiver,null);assert.equal(method.defaultSourceProof.unitSourceProof.constAuthority,false);
  assert.equal(r.checkedGeneratedMethodDeclarations[0].originalDeclarationTerm,'enum');
  await verifyTypedTargets(r,api=>{assert.deepEqual(api.make(),{$:selected});assert.ok(Object.isFrozen(api.make()));},{childTimeoutMs:20000});
 }
});
test('private original unit Default output and surface reject copied changed foreign and rebound proofs',()=>{
 const source='#[derive(Default,serde::Serialize)]pub enum Choice{A,#[default]B}',{context,module,item}=setup(source),proof=originalUnitDefaultSource(context,module,item);
 assert.strictEqual(assertOriginalUnitDefaultSource(proof,context,module,item),proof);for(const key of ['namespaceAuthority','copyAuthority','noDropAuthority','constAuthority','generatedImplBehavior','runtimeParity'])assert.equal(proof[key],false);
 assert.throws(()=>assertOriginalUnitDefaultSource(structuredClone(proof),context,module,item),/copied/);
 assert.throws(()=>originalUnitDefaultSource(structuredClone(context),module,item),/unsealed/);
 assert.throws(()=>originalUnitDefaultSource(context,{...module,source:source+' '},item),/differs/);
 assert.throws(()=>originalUnitDefaultSource(context,module,{...item,name:'Other'}),/exact original/);
 assert.throws(()=>originalUnitDefaultSource(context,new Proxy(module,{}),item),/plain original/);
 const other=setup(source);assert.throws(()=>assertOriginalUnitDefaultSource(proof,other.context,other.module,other.item),/foreign/);
 const surface=originalDefaultGeneratedMethod(context,module,item,HostRustParser);assert.strictEqual(assertOriginalDefaultGeneratedMethod(surface,context),surface);
 assert.throws(()=>assertOriginalDefaultGeneratedMethod(structuredClone(surface),context),/copied/);
 surface.body.path[surface.body.path.length-1]='A';assert.throws(()=>assertOriginalDefaultGeneratedMethod(surface,context),/changed/);
});
test('whole original Model source adds only its separately classified unit Default body',{timeout:60000},async()=>{
 const file='src/model_contract.rs',source=readFileSync(new URL(file,root),'utf8'),r=compile(source,file);
 assert.equal(r.meta.executable.filter(row=>row.term==='fn').length,2);assert.equal(r.meta.checkedMethods.length,4);assert.equal(r.meta.refused.length,20);
 const row=r.meta.checkedGeneratedMethods.find(row=>row.name==='ModelSelectorKind.default');assert.ok(row);assert.equal(row.originalDeclarationTerm,'enum');assert.equal(row.generator,'core::default::Default');assert.equal(row.receiver,null);
 assert.equal(r.meta.checkedGeneratedMethods.filter(row=>row.name==='ModelSelectorKind.clone').length,1);
 const program=parseProgram(JSON.stringify(r.meta.targetSemanticProgram)),entry=[...program.declarations.values()].find(value=>value.impl?.method==='default'&&value.impl.defaultSourceProof?.typePath?.at(-1)==='ModelSelectorKind');assert.ok(entry);
 const aliased={...r,javascript:r.javascript+`\nexport {${entry.fullName} as originalDefault};`,typescript:r.typescript+`\nexport {${entry.fullName} as originalDefault};`};
 await verifyTypedTargets(aliased,(_api,_result,module)=>assert.deepEqual(module.originalDefault(),{$:'Unknown'}),{childTimeoutMs:20000});
});
test('unit Default keeps malformed selection layout source ownership coherence and const calls refused',()=>{
 const prefix='#[derive(Default,serde::Serialize)]';
 const sources=[
  prefix+'enum Choice{A,B}',prefix+'enum Choice{#[default]A,#[default]B}',prefix+'enum Choice{#[default()]A}',
  prefix+'enum Choice{#[default]A(u8)}',prefix+'enum Choice{#[default]A=1}',prefix+'enum Choice{#[default]#[non_exhaustive]A}',
  prefix+'enum Choice<T>{#[default]A}',prefix+'#[repr(u8)]enum Choice{#[default]A}',prefix+'enum Choice{#[default]#[unknown]A}',
  'trait Default{}'+prefix+'enum Choice{#[default]A}',prefix+'enum Choice{#[default]A}impl Default for Choice{fn default()->Self{Self::A}}',
  'use unknown::*;'+prefix+'enum Choice{#[default]A}',
  prefix+'enum Choice{#[default]A}type Alias=Choice;impl Default for Alias{fn default()->Self{Self::A}}',
  prefix+'enum Choice{#[default]A}use crate::Choice as Alias;impl Default for Alias{fn default()->Self{Self::A}}',
 ];
 for(const source of sources){const r=compile(source+'pub fn bad()->Choice{Choice::default()}');assert.equal(r.meta.executable.some(row=>row.name==='bad'),false,source);assert.ok(r.meta.refused.length,source);}
 const r=compile(prefix+'enum Choice{#[default]A}pub const fn bad()->Choice{Choice::default()}');assert.equal(r.meta.executable.some(row=>row.name==='bad'),false);assert.ok(r.meta.refused.some(row=>row.name==='bad'));
});
test('unit Default coherence resolves unrelated same-named original targets independently',{timeout:60000},async()=>{
 const source='#[derive(Default,serde::Serialize)]pub enum Choice{#[default]A}mod other{pub struct Choice{value:u8}impl Default for Choice{fn default()->Self{Self{value:3}}}}pub fn make()->Choice{Choice::default()}';
 const r=compile(source);assert.ok(r.meta.checkedGeneratedMethods.some(row=>row.name==='Choice.default'));
 await verifyTypedTargets(r,api=>assert.deepEqual(api.make(),{$:'A'}),{childTimeoutMs:20000});
});
