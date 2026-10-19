import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {createCloneSourceContext,cloneSourceContextFacts} from '../clone-trait-source.mjs';
import {originalCloneGeneratedMethod,assertOriginalCloneGeneratedMethod} from '../clone-source-ir.mjs';
import {HostRustParser,HostChecker} from '../extensions/host-contracts.mjs';
import {requireOriginalCloneEmission,requireOriginalCloneFieldEmission,checkOriginalCloneFieldBorrow} from '../extensions/clone-source-body.mjs';
import {functionLifetimeSignature} from '../extensions/source-lifetimes.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});
const compile=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
const retain=(name,value)=>{if(process.env.ROUTER_CLONE_EVIDENCE_DIR){mkdirSync(process.env.ROUTER_CLONE_EVIDENCE_DIR,{recursive:true});writeFileSync(process.env.ROUTER_CLONE_EVIDENCE_DIR+'/'+name+'.json.gz',gzipSync(JSON.stringify(value,null,2)+'\n'));}};
function setup(source){const capture=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}),modules=capture.views.map(sourceView=>({file:'src/lib.rs',path:sourceView.modulePath,source,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition})),derive=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE}),context=createCloneSourceContext(derive);return {context,module:cloneSourceContextFacts(context).modules[0]};}
test('repeated original Clone checks preserve target-specific overlap and independent contexts',()=>{
  const declarations='#[derive(Clone,Copy,serde::Serialize)]pub enum First{A}#[derive(Clone,Copy,serde::Serialize)]pub enum Second{B}',written='impl Second{fn clone(&self)->Self{Self::B}}',captured=setup(declarations+written),{context,module}=captured,items=originalSourceModuleItems(module),first=items.find(row=>row.name==='First'),second=items.find(row=>row.name==='Second');
  const surface=originalCloneGeneratedMethod(context,module,first,HostRustParser);assert.throws(()=>originalCloneGeneratedMethod(context,module,second,HostRustParser),/overlapping actual nominal target/);assert.deepEqual(originalCloneGeneratedMethod(context,module,first,HostRustParser),surface);
  const other=setup(declarations),otherItems=originalSourceModuleItems(other.module);for(const item of otherItems.filter(row=>row.term==='enum'))assert.ok(originalCloneGeneratedMethod(other.context,other.module,item,HostRustParser));
  const unresolved=setup(declarations+'impl<T> T{fn clone(&self)->Self{unknown()}}');for(const item of originalSourceModuleItems(unresolved.module).filter(row=>row.term==='enum'))assert.throws(()=>originalCloneGeneratedMethod(unresolved.context,unresolved.module,item,HostRustParser),/unresolved or overlapping/);
  assert.throws(()=>originalCloneGeneratedMethod(structuredClone(context),module,first,HostRustParser),/unsealed/);
});
for(const copy of [false,true])for(const types of [['u8'],['bool','u16'],['i8','i16','i32'],['u64','i64','usize','isize'],['u32','u32','bool','u32','bool']])test('actual compiler '+(copy?'cs_clone_simple':'cs_clone')+' and original primitive bodies execute '+types.length+' fields in JS and strict TS',async()=>{
    const source=`#[derive(Clone${copy?',Copy':''})] struct Payload{${types.map((type,index)=>`field_${index}:${type}`).join(',')}} pub fn duplicate(x:&Payload)->Payload{x.clone()}`,result=compile(source);retain('fields-'+copy+'-'+types.length,{source,...result});assert.deepEqual(result.meta.refused,[]);
    const generated=result.meta.checkedGeneratedMethods;assert.equal(generated.length,1);assert.equal(generated[0].generator,'core::clone::Clone');assert.equal(generated[0].receiver,'shared');assert.equal(generated[0].cloneSourceProof.selectedBranch,'has_derive_copy='+copy);assert.equal(generated[0].cloneSourceProof.runtimeParity,false);assert.equal(result.meta.checkedMethods.length,0);assert.equal(result.meta.executable.length,1);assert.equal(result.checkedGeneratedMethodDeclarations[0].name,'clone');
    assert.equal(generated[0].cloneSourceProof.typeAssertions.length,copy?new Set(types).size:0);assert.ok(generated[0].cloneSourceProof.receiver.originalRecipe.digest);
    await verifyTypedTargets(result,api=>{const fields=Object.fromEntries(types.map((type,index)=>['field_'+index,type==='bool'?index%2===0:BigInt(index+1)])),input=Object.freeze({$:'Payload',...fields}),output=api.duplicate(input);assert.deepEqual(output,input);assert.notStrictEqual(output,input);assert.notStrictEqual(api.duplicate(input),output);assert.deepEqual(input,{$:'Payload',...fields});assert.throws(()=>api.duplicate({...input}),/immutable|frozen/i);},{childTimeoutMs:30000});
});
test('mixed Default and Clone generated rows remain distinct and are excluded from original-method counts',async()=>{
  const source='#[derive(Default,Clone)] struct Payload{enabled:bool,value:u32} pub fn make()->Payload{Payload::default().clone()}',result=compile(source);retain('mixed-default-clone',{source,...result});assert.deepEqual(result.meta.refused,[]);assert.deepEqual(result.meta.checkedGeneratedMethods.map(row=>row.generator),['core::default::Default','core::clone::Clone']);assert.equal(result.meta.checkedMethods.length,0);assert.equal(result.meta.executable.length,1);await verifyTypedTargets(result,api=>assert.deepEqual(api.make(),{$:'Payload',enabled:false,value:0n}),{childTimeoutMs:30000});
});
test('original input, parser, source view, compiler slots and private receiver origins reject copied or changed proofs',()=>{
  const {context,module}=setup('#[derive(Clone)] struct Payload{value:u32}'),item=originalSourceModuleItems(module).find(item=>item.term==='struct'),surface=originalCloneGeneratedMethod(context,module,item,HostRustParser);assert.strictEqual(assertOriginalCloneGeneratedMethod(surface,context),surface);
  assert.throws(()=>assertOriginalCloneGeneratedMethod(structuredClone(surface),context),/copied/);assert.throws(()=>originalCloneGeneratedMethod(structuredClone(context),module,item,HostRustParser),/unsealed/);assert.throws(()=>originalCloneGeneratedMethod(context,{...module,source:module.source+' '},item,HostRustParser),/differs/);assert.throws(()=>originalCloneGeneratedMethod(context,{...module,sourceView:{...module.sourceView}},item,HostRustParser),/differs/);assert.throws(()=>originalCloneGeneratedMethod(context,module,item,class extends HostRustParser{}),/actual original Host parser/);
  const forged={...surface,fullName:surface.name,params:[{...surface.params[0],type:{kind:'data',name:'Payload',rustReference:{kind:'shared',pointee:{kind:'data',name:'Payload'}}}}],ret:{kind:'data',name:'Payload'},impl:{...surface.impl,cloneSourceProof:structuredClone(surface.impl.cloneSourceProof)}};assert.throws(()=>functionLifetimeSignature(forged),/retained actual source lifetime/);
  const rebound={...forged,impl:surface.impl,params:[{...forged.params[0],type:{kind:'data',name:'Other',rustReference:{kind:'shared',pointee:{kind:'data',name:'Other'}}}}],ret:{kind:'data',name:'Other'}};assert.throws(()=>functionLifetimeSignature(rebound),/retained actual source lifetime/);
  assert.throws(()=>checkOriginalCloneFieldBorrow({}, {k:'routerOriginalCloneFieldBorrow',cloneSourceProof:surface.impl.cloneSourceProof},new Map(),[]),/genuine generated Clone source/);
  surface.body.receiver.path[0]='forged';assert.throws(()=>assertOriginalCloneGeneratedMethod(surface,context),/changed/);
});
test('checked computation and mirrored proof edits cannot obtain generated Clone emission',()=>{
  const result=compile('#[derive(Clone)] struct Payload{value:u32} pub fn duplicate(x:&Payload)->Payload{x.clone()}'),program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),method=[...program.declarations.values()].find(entry=>entry.body?.k==='routerCheckedCloneBody');assert.ok(method);assert.strictEqual(requireOriginalCloneEmission(method.body),method.body.body);assert.throws(()=>requireOriginalCloneFieldEmission(method.body.body.value.value,{}),/exact actual checked Clone frame/);
  for(const mutate of [node=>node.cloneSourceProof.selectedBranch='has_derive_copy=true',node=>node.body.value.value.value.field='other',node=>node.constEligible=true,node=>node.cloneSourceProof.receiver.originalRecipe.digest='forged',node=>node.body.value.value.cloneSourceProof.sourceProofDigest='forged',node=>node.body.value.value.cloneSourceProof.field='other',node=>node.cloneSourceProof.noDropProof.copyAuthority=true]){const node=structuredClone(method.body);mutate(node);assert.throws(()=>requireOriginalCloneEmission(node),/forged|changed/);}
});
test('source Clone execution retains trait, allocator, helper, macro, layout and ownership refusals',()=>{
  const sources=[
    'trait Clone{fn clone(&self)->Self;} #[derive(Clone)] struct Payload{value:u32}',
    'mod foreign{pub trait Clone{fn clone(&self)->Self;}}use foreign::Clone;#[derive(Clone)]struct Payload{value:u32}',
    '#[derive(Clone)]struct Payload{value:u32}mod other{use missing::*;}',
    '#[derive(Clone)]struct Payload{value:u32}mod other{trait Drop{}impl Drop for super::Payload{}}',
    '#[derive(Clone)]struct Payload{value:u32}trait Default{}impl Default for Payload{}',
    'mod std{} #[derive(Clone)] struct Payload{value:u32}',
    '#![no_implicit_prelude] #[derive(Clone)] struct Payload{value:u32}',
    '#[derive(Clone)] struct Payload<T>{value:T}',
    '#[derive(Clone)] struct Payload{value:String}',
    '#[derive(Clone)] struct Payload{value:Vec<u32>}',
    '#[derive(Clone)] struct Payload{value:f64}',
    '#[derive(Clone)] struct Payload{#[unknown] value:u32}',
    '#[unknown] #[derive(Clone)] struct Payload{value:u32}',
    '#[derive(Clone)] struct Payload{a:u32,b:u32,c:u32,d:u32,e:u32,f:u32}',
    '#[derive(Clone)] struct Payload{value:u32} impl Drop for Payload{fn drop(&mut self){}}',
    '#[derive(Clone)] struct Payload{value:u32} impl Payload{fn clone(&self)->Self{Self{value:7}}}',
    '#[derive(Clone)] struct Payload{value:u32} impl std::clone::Clone for Payload{fn clone(&self)->Self{Self{value:7}}}',
    '#[derive(Clone)] struct Payload{value:u32} macro_rules! hidden{()=>{}}',
    '#[derive(Clone)] struct Payload{value:u32} fn hidden(){unknown!();}',
    '#[derive(Clone,PartialEq)] struct Payload{value:u32}',
    '#[derive(Clone)] struct Payload{value:u32} const BAD:Payload=Payload{value:1}.clone();',
  ];
  const results=sources.map(source=>({source,result:compile(source)}));retain('negative-sources',results);for(const {source,result}of results){assert.ok(result.meta.refused.length,source);if(!source.includes('const BAD'))assert.ok(!result.meta.checkedGeneratedMethods?.some(row=>row.generator==='core::clone::Clone'),source);}
});
test('original checker prototype mutation cannot authorize compiler Clone body checking',()=>{
  const old=HostChecker.prototype.expectedOwnership;try{HostChecker.prototype.expectedOwnership=function(){};assert.throws(()=>compile('#[derive(Clone)] struct Payload{value:u32}'),/original parser.*method|original.*identity|overridden/i);}finally{HostChecker.prototype.expectedOwnership=old;}
});
test('source receiver scope relocation and repeated shared use preserve original names and aliases',async()=>{
  const source='mod nested{#[derive(Clone,Copy)] pub struct Payload{pub value:u32}pub fn duplicate(x:&Payload)->Payload{x.clone()}pub fn after_clone(x:&Payload)->u32{let cloned=x.clone();x.value+cloned.value}}',result=compile(source);retain('nested-shared-use',{source,...result});assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.checkedGeneratedMethods[0].name,'nested.Payload.clone');assert.equal(result.meta.checkedGeneratedMethods[0].cloneSourceProof.typePath.join('.'),'crate.nested.Payload');await verifyTypedTargets(result,api=>{const input=Object.freeze({$:'Payload',value:21n});assert.deepEqual(api['nested.duplicate'](input),input);assert.equal(api['nested.after_clone'](input),42n);assert.equal(input.value,21n);},{childTimeoutMs:30000});
});
