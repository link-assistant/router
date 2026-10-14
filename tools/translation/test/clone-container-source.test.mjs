import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {pinnedCloneBody,parsePinnedBody,parsedPinnedBodyEvidence} from '../extensions/standard-body-source.mjs';
import {originalOptionCloneBody,assertOriginalOptionCloneBody} from '../clone-container-source.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {decodeBuiltinSourceMeta} from '../builtin-source-meta.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {createCloneSourceContext,cloneSourceContextFacts} from '../clone-trait-source.mjs';
import {originalCloneGeneratedMethod,assertOriginalCloneGeneratedMethod} from '../clone-source-ir.mjs';
import {originalCloneContainerFields,assertOriginalCloneContainerFields} from '../clone-container-fields.mjs';
import {proveCloneContainerNoDrop,requireCloneContainerNoDrop} from '../clone-container-no-drop.mjs';
import {functionLifetimeSignature} from '../extensions/source-lifetimes.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {requireOriginalCloneEmission,requireOriginalCloneFieldEmission} from '../extensions/clone-source-body.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});
const compile=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
function retain(name,value){if(process.env.ROUTER_OPTION_CLONE_EVIDENCE_DIR){mkdirSync(process.env.ROUTER_OPTION_CLONE_EVIDENCE_DIR,{recursive:true});writeFileSync(process.env.ROUTER_OPTION_CLONE_EVIDENCE_DIR+'/'+name+'.json.gz',gzipSync(JSON.stringify(value)+'\n'));}}
test('complete original Option Clone source selects the match while clone_from remains uncompiled',()=>{
 const original=originalOptionCloneBody();assert.strictEqual(assertOriginalOptionCloneBody(original),original);assert.equal(original.evidence.cloneFromCompiled,false);
 const selection=pinnedCloneBody('Option'),syntax=parsePinnedBody(HostRustParser,selection);assert.equal(syntax.k,'match');assert.equal(syntax.rows.length,2);assert.ok(parsedPinnedBodyEvidence(syntax));assert.throws(()=>assertOriginalOptionCloneBody(structuredClone(original)),/copied|original|issued/);assert.throws(()=>parsePinnedBody(HostRustParser,structuredClone(selection)),/original|pinned|issued/);retain('original-method-selection',{original,selection,syntax});
});
for(const copy of [false,true])test('actual '+(copy?'Copy':'fieldwise')+' Option Clone executes None and primitive payloads with a reusable shared input',async()=>{
 const source=`#[derive(Clone${copy?',Copy':',Debug,Default'})]pub struct Payload{pub maybe:Option<u64>,pub flag:bool}pub fn duplicate(x:&Payload)->Payload{x.clone()}pub fn after_clone(x:&Payload)->bool{let cloned=x.clone();x.flag&&cloned.flag}`;
 const result=compile(source);retain('execute-'+copy,{source,result});assert.deepEqual(result.meta.refused,[]);const row=result.meta.checkedGeneratedMethods.find(row=>row.generator==='core::clone::Clone');assert.equal(row.cloneSourceProof.schema,'original-generated-option-clone-ir-v1');assert.equal(row.cloneSourceProof.selectedBranch,'has_derive_copy='+copy);assert.equal(row.cloneSourceProof.cloneFromCompiled,false);assert.equal(row.cloneSourceProof.runtimeParity,false);assert.equal(result.meta.checkedMethods.length,0);
 if(!copy){for(const output of row.cloneSourceProof.noDropProof.deriveOutputs){const storage=output.sourceOutputStorage,read=node=>node[0]==='leaf'?decodeBuiltinSourceMeta(node[1]):node[0]==='array'?node[1].map(read):Object.fromEntries(node[1].map(([key,child])=>[key,read(child)])),decoded=read(storage.tree);assert.equal(Buffer.byteLength(JSON.stringify(decoded)),storage.bytes);assert.equal(decoded.digest,output.sourceOutputDigest);}}
 await verifyTypedTargets(result,api=>{for(const maybe of [Object.freeze({$:'None'}),Object.freeze({$:'Some',field0:9n})]){const input=Object.freeze({$:'Payload',maybe,flag:true}),output=api.duplicate(input);assert.deepEqual(output,input);assert.notStrictEqual(output,input);assert.equal(api.after_clone(input),true);assert.equal(input.maybe,maybe);assert.notStrictEqual(api.duplicate(input),output);}assert.throws(()=>api.duplicate({$:'Payload',maybe:Object.freeze({$:'None'}),flag:true}),/immutable|frozen/i);},{childTimeoutMs:30000});
});
test('six original Option primitive fields use actual Option bodies without a payload Default bound',async()=>{
 const source='#[derive(Clone)]pub struct Payload{a:Option<u8>,b:Option<i64>,c:Option<usize>,d:Option<bool>,e:u16,f:bool}pub fn duplicate(x:&Payload)->Payload{x.clone()}',result=compile(source);retain('six-fields',{source,result});assert.deepEqual(result.meta.refused,[]);await verifyTypedTargets(result,api=>{const some=value=>Object.freeze({$:'Some',field0:value}),input=Object.freeze({$:'Payload',a:some(255n),b:some(-4n),c:Object.freeze({$:'None'}),d:some(false),e:7n,f:true});assert.deepEqual(api.duplicate(input),input);assert.deepEqual(api.duplicate(input),input);},{childTimeoutMs:30000});
});
test('unregistered layouts, custom Drop/traits, macros, helpers and allocator clones stay refused',()=>{
 const sources=[
 'struct Option<T>{value:T}#[derive(Clone)]struct Payload{a:Option<u64>}',
 'trait Clone{}#[derive(Clone)]struct Payload{a:Option<u64>}',
 '#[derive(Clone)]struct Payload<T>{a:Option<T>}',
 '#[derive(Clone)]struct Payload{a:Option<String>}',
 '#[derive(Clone)]struct Payload{a:Option<Vec<u64>>}',
 '#[derive(Clone)]struct Payload{a:Option<Option<u64>>}',
 '#[derive(Clone)]struct Payload{a:Option<u64>}impl Drop for Payload{fn drop(&mut self){}}',
 '#[derive(Clone)]struct Payload{a:Option<u64>}impl Payload{fn clone(&self)->Self{unknown()}}',
 '#[derive(Clone)]struct Payload{a:Option<u64>}fn hidden(){unknown!();}',
 '#[derive(Clone)]struct Payload{a:Option<u64>}macro_rules! unknown{()=>{}}',
 '#[derive(Clone)]struct Payload{#[unknown]a:Option<u64>}',
 '#[derive(Clone)]struct Payload{a:Option<u64>}mod other{use missing::*;}',
 '#[derive(Clone,PartialEq)]struct Payload{a:Option<u64>}',
 '#![no_implicit_prelude]#[derive(Clone)]struct Payload{a:Option<u64>}',
 '#[derive(Clone)]struct Payload{a:Option<u64>}fn hidden(){impl Drop for Payload{fn drop(&mut self){}}}',
 '#[derive(Clone,Copy)]struct Payload{a:Option<u64>}fn hidden(){impl Drop for Payload{fn drop(&mut self){}}}',
 '#[derive(Clone)]struct Payload{a:Option<u64>}use Payload as Alias;fn hidden(){impl Drop for Alias{fn drop(&mut self){}}}',
 '#[derive(Clone)]struct Payload{a:Option<u64>}fn hidden(){impl Payload{fn clone(&self)->Self{unknown()}}}',
 '#[derive(Clone)]struct Payload{a:Option<u64>}fn hidden(){impl Default for Payload{fn default()->Self{unknown()}}}',
 '#[derive(Clone)]struct Payload{a:Option<u64>}const HIDDEN:()={impl Drop for Payload{fn drop(&mut self){}}};',

 ];const vectors=sources.map(source=>{try{return {source,result:compile(source)};}catch(error){assert.equal(error.name,'TranslationError');return {source,parserRefusal:{name:error.name,message:error.message}};}});retain('refusals',vectors);for(const {source,result,parserRefusal}of vectors){if(parserRefusal)continue;assert.ok(result.meta.refused.length,source);assert.ok(!result.meta.checkedGeneratedMethods?.some(row=>row.generator==='core::clone::Clone'),source);}
});
test('checked Option Clone body and mirrored proof tampering cannot acquire emission',()=>{
 const source='#[derive(Clone)]struct Payload{a:Option<u64>,flag:bool}pub fn duplicate(x:&Payload)->Payload{x.clone()}',result=compile(source),program=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),method=[...program.declarations.values()].find(entry=>entry.body?.k==='routerCheckedCloneBody');retain('emission-origin',{source,result});assert.ok(method);assert.strictEqual(requireOriginalCloneEmission(method.body),method.body.body);
 for(const mutate of [node=>node.cloneSourceProof.selectedBranch='has_derive_copy=true',node=>node.cloneSourceProof.optionSource.syntax.rows.reverse(),node=>node.cloneSourceProof.noDropProof.copyAuthority=true,node=>node.constEligible=true,node=>node.body=structuredClone(node.body.body??{k:'name',path:['forged']}),node=>node.cloneSourceProof.primitiveBodies[0].syntax.value.path=['forged']]){const forged=structuredClone(method.body);mutate(forged);assert.throws(()=>requireOriginalCloneEmission(forged),/unissued|changed/);}
 assert.throws(()=>requireOriginalCloneEmission(new Proxy(method.body,{})),/unissued|changed|proxy/);
});

test('complete unchanged Router Option records preserve independent source-output refusals',{timeout:60_000},()=>{
 const jsonMacroDependencies=loadJsonMacroSourceProof({manifest,lock}),vectors=[];
 for(const [file,owner,reason]of [['src/output_limit.rs','OutputTokenLimiter',/caller bang expansion/],['src/subscription_usage_types.rs','UsagePool',/independent sibling trait/]]){
  const source=readFileSync(new URL(file,root),'utf8'),result=translateProject({entry:file,paths:[file],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,jsonMacroDependencies,compilationProfile:PRODUCTION_PROFILE});vectors.push({file,owner,source,result});const row=result.meta.refused.find(row=>row.name===owner+'.clone');assert.ok(row,owner);assert.match(row.message,reason);assert.ok(!result.meta.checkedGeneratedMethods?.some(row=>row.name===owner+'.clone'));
 }retain('complete-original-owners',vectors);
});

test('container source fields, no-Drop proofs and shared receiver origins reject copied or rebound inputs',()=>{
 const source='#[derive(Clone)]pub struct Payload{maybe:Option<u64>,flag:bool}',capture=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}),modules=capture.views.map(sourceView=>({file:'src/lib.rs',path:sourceView.modulePath,source,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition})),derive=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE}),context=createCloneSourceContext(derive),module=cloneSourceContextFacts(context).modules[0],item=originalSourceModuleItems(module).find(item=>item.name==='Payload'),fields=originalCloneContainerFields(context,module,item,HostRustParser),proof=proveCloneContainerNoDrop(context,module,item,fields),surface=originalCloneGeneratedMethod(context,module,item,HostRustParser);
 assert.strictEqual(requireCloneContainerNoDrop(proof,context,module,item),proof);assert.strictEqual(assertOriginalCloneGeneratedMethod(surface,context),surface);
 for(const foreign of [structuredClone(fields),new Proxy(fields,{})])assert.throws(()=>assertOriginalCloneContainerFields(foreign,context,module,item),/copied|rebound/);
 for(const foreign of [structuredClone(proof),new Proxy(proof,{})])assert.throws(()=>requireCloneContainerNoDrop(foreign,context,module,item),/copied|rebound/);
 assert.throws(()=>originalCloneContainerFields(context,{...module,source:source+' '},item,HostRustParser),/differs/);assert.throws(()=>originalCloneContainerFields(context,{...module,sourceView:{...module.sourceView}},item,HostRustParser),/differs/);assert.throws(()=>originalCloneContainerFields(context,module,item,class extends HostRustParser{}),/actual original Host parser/);assert.throws(()=>assertOriginalCloneGeneratedMethod(structuredClone(surface),context),/copied/);
 const forged={...surface,fullName:surface.name,params:[{...surface.params[0],type:{kind:'data',name:'Payload',rustReference:{kind:'shared',pointee:{kind:'data',name:'Payload'}}}}],ret:{kind:'data',name:'Payload'},impl:{...surface.impl,cloneSourceProof:structuredClone(surface.impl.cloneSourceProof)}};assert.throws(()=>functionLifetimeSignature(forged),/retained actual source lifetime/);
 const altered={...surface,impl:surface.impl,params:[{...surface.params[0],type:{...surface.params[0].type,path:['crate','Other']}}],ret:surface.ret};assert.throws(()=>functionLifetimeSignature(altered),/retained actual source lifetime/);
 surface.body.receiver.path[0]='changed';assert.throws(()=>assertOriginalCloneGeneratedMethod(surface,context),/changed/);retain('private-source-origins',{source,fields,proof});
});

test('actual opaque trait parameters retain their refusal without masquerading as nested impl declarations',async()=>{
 const source='#[derive(Clone)]pub struct Payload{maybe:Option<u64>,flag:bool}impl Payload{fn opaque(input:impl Into<String>)->u64{0}}pub fn duplicate(x:&Payload)->Payload{x.clone()}',result=compile(source);retain('opaque-trait-parameter',{source,result});assert.ok(result.meta.checkedGeneratedMethods.some(row=>row.name==='Payload.clone'));assert.ok(result.meta.executable.some(row=>row.name==='duplicate'));assert.ok(result.meta.refused.some(row=>row.name==='Payload.opaque'));await verifyTypedTargets(result,api=>{const input=Object.freeze({$:'Payload',maybe:Object.freeze({$:'Some',field0:7n}),flag:true});assert.deepEqual(api.duplicate(input),input);},{childTimeoutMs:30000});
});
