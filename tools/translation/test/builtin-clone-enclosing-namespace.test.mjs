// Enclosing-only Clone receiving cases; full method semantics stay separate.
// This independently qualifies enclosing names; method execution stays opaque.
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,Hash} from 'node:crypto';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintAt,deriveFootprintOriginalContext,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {createDeriveBangContext} from '../derive-bang-context.mjs';
import {proveBuiltinDeriveBangFootprint,proveBuiltinCloneEnclosingNamespace,requireBuiltinCloneEnclosingNamespace,reissueBuiltinCloneEnclosingNamespace} from '../builtin-derive-bang-footprints.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction} from '../builtin-derive-ast-meta.mjs';
import {builtinPayloadDataInputs} from '../builtin-derive-data-inputs.mjs';
import {compileBuiltinCloneEnclosingNamespaceModel} from '../builtin-clone-ast-route.mjs';
import {createDeriveEnclosingNamespaceContext,deriveEnclosingNamespaceOutputAt,originalDeriveEnclosingNamespaceOutputs,proveDeriveEnclosingNamespaceEffect,deriveEnclosingNamespaceEffectFacts} from '../derive-enclosing-namespace-context.mjs';
import {resolveModuleBindings,resolveEnclosingNamespaceModuleBindings} from '../module-bindings.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {itemConfiguration,PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {writeJsonTextGzip} from '../../evidence/write-json-gzip.mjs';

const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
function test(name,body){return nodeTest(name,{timeout:60_000},async t=>{
 const vectors=[],retain=(kind,value)=>vectors.push({kind,value});
 try{await body(t,retain);}finally{
  const directory=process.env.ROUTER_BUILTIN_ENCLOSING_NAMESPACE_VECTOR_DIR;
  if(directory){mkdirSync(directory,{recursive:true});writeJsonTextGzip(join(directory,hash(name)+'.json.gz'),JSON.stringify({name,vectors,rustExecuted:false,performanceQualified:false}));}
 }
});}
function setup(source){
 const read=path=>readFileSync(repositorySourceURL(path,root),'utf8');
 const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
 const modules=[{file:'src/lib.rs',path:[],source:'mod model;use model::Record;'},
  {file:'src/model.rs',path:['model'],source}],module=modules[1];
 const context=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
 const item=originalSourceModuleItems(module).find(row=>row.name==='Record'&&['struct','enum'].includes(row.term));
 assert.ok(item);const certificate=deriveFootprintAt(context,module,item);
 const attribute=certificate?.attributes.find(row=>row.name==='derive'&&row.derives.some(path=>path.length===1&&path[0]==='Clone'))??itemConfiguration(item.tokens,PRODUCTION_PROFILE).attributes.find(row=>row.name==='derive');
 assert.ok(attribute);return {source,modules,module,item,context,certificate,dependencies,invocation:{path:['Clone'],attributeSpan:attribute.span}};
}
const args=row=>({context:row.context,certificate:row.certificate,invocation:row.invocation});
function select(row){
 const token=proveBuiltinCloneEnclosingNamespace(args(row));assert.ok(token);
 return {token,facts:requireBuiltinCloneEnclosingNamespace(token,row.context,row.certificate,row.invocation)};
}
function effect(row,context){
 const token=proveDeriveEnclosingNamespaceEffect(context,row.context,row.module,row.item);
 return {token,facts:deriveEnclosingNamespaceEffectFacts(token,context,row.context,row.module,row.item)};
}
function bindings(row,context,fresh){
 return (fresh?resolveEnclosingNamespaceModuleBindings:resolveModuleBindings)({modules:row.modules,deriveContext:row.context,deriveBangContext:context,externalModules:deriveFootprintExternalModules(row.context),compilationProfile:PRODUCTION_PROFILE});
}
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message,stack:String(error.stack)}};}}
function refused(run){const result=outcome(run);assert.equal(result.error?.name,'TypeError');return result;}
function frozen(value){if(!value||typeof value!=='object')return;assert.equal(Object.isFrozen(value),true);for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);assert.ok(Object.hasOwn(descriptor,'value'));frozen(descriptor.value);}}
function once(source,before,after){assert.equal(source.split(before).length,2);return source.replace(before,()=>after);}
async function copiedModule(t,source,url){
 const relocated=source.replace(/(from\s+)(['"])(\.\.?\/[^'"\n]+)\2/g,(_whole,prefix,quote,spec)=>prefix+quote+new URL(spec,url).href+quote);
 const directory=mkdtempSync(join(tmpdir(),'router-clone-enclosing-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const file=join(directory,'subject.mjs');writeFileSync(file,relocated);assert.equal(readFileSync(file,'utf8'),relocated);
 return {api:await import(pathToFileURL(file).href),source,relocated};
}

test('original Clone named and unit outputs close both resolver branches without method authority',(_t,retain)=>{
 for(const source of ['#[derive(Clone)]pub struct Record;','#[derive(Clone)]pub struct Record{a:u8,b:u64}','#[derive(Clone)]pub enum Record{A}','#[derive(Clone)]pub enum Record{A,B}']){
  const row=setup(source),full=proveBuiltinDeriveBangFootprint(args(row)),chosen=select(row),model=chosen.facts.model;
  assert.equal(full.generatedImplBehavior,false);assert.equal(model.schema,'original-clone-enclosing-namespace-model-v1');
  assert.deepEqual(model.grammar.branches.map(row=>row.condition),['has_derive_copy=false','has_derive_copy=true']);
  for(const branch of model.grammar.branches){assert.equal(branch.outputKind,'ItemKind::Impl');assert.equal(branch.methods,1);assert.equal(branch.associatedTypes,0);assert.equal(branch.closure.bodyExpressionComplete,true);assert.equal(branch.closure.allOriginalFieldsRetained,true);assert.equal(branch.closure.allOriginalVariantsRetained,true);assert.ok(branch.closure.cells>0);}
  assert.equal(model.methodBehavior,'opaque-untranslated');assert.equal(model.generatedImplBehavior,false);assert.equal(model.namespaceAuthority,false);assert.equal(model.runtimeAuthority,false);assert.equal(Object.hasOwn(chosen.facts,'selectedOwnerBangComplete'),false);
  assert.equal(JSON.stringify(JSON.parse(chosen.facts.wire)),chosen.facts.wire);assert.equal(hash(chosen.facts.wire),chosen.facts.digest);frozen(chosen.facts);
  const old=createDeriveBangContext({deriveContext:row.context}),current=createDeriveEnclosingNamespaceContext({deriveContext:row.context});
  assert.deepEqual(bindings(row,current,true),bindings(row,old,false));
  const dimension=effect(row,current);assert.deepEqual(dimension.facts.enclosingTypeBindings,[]);assert.deepEqual(dimension.facts.enclosingUsableValueBindings,[]);assert.deepEqual(dimension.facts.enclosingMacroNames,[]);
  retain('complete-original-input-and-model',{row,full,chosen,current,dimension});
 }
});

test('separate Clone enclosing format retains all 128 fields while the old full-output budget still refuses',(_t,retain)=>{
 const source='#[derive(Clone)]pub struct Record{'+Array.from({length:128},(_,index)=>'f'+index+':u8').join(',')+'}',row=setup(source);
 const full=refused(()=>proveBuiltinDeriveBangFootprint(args(row)));assert.match(full.error.message,/positive AST validation budget/);
 const chosen=select(row);assert.equal(chosen.facts.model.grammar.sourceTypeRoundtrips.length,128);
 assert.ok(chosen.facts.model.grammar.sourceTypeRoundtrips.every(row=>row.semanticSyntaxRoundTrip===true));
 const context=createDeriveEnclosingNamespaceContext({deriveContext:row.context}),certificate=deriveEnclosingNamespaceOutputAt(context,row.context,row.module,row.item);assert.ok(certificate);assert.deepEqual(certificate.residualOwners,[]);effect(row,context);
 const outputs=originalDeriveEnclosingNamespaceOutputs(context,row.context,row.module,row.item);assert.equal(outputs.outputs.length,1);assert.equal(outputs.outputs[0].format,'clone-enclosing');
 const excess=setup(source.replace('f127:u8','f127:u8,f128:u8')),bound=refused(()=>proveBuiltinCloneEnclosingNamespace(args(excess)));assert.match(bound.error.message,/source syntax budget/);
 retain('complete-bounded-original-field-domain',{source,row,full,chosen,context,certificate,outputs,excess,bound,productionExecutableGain:0,methodExecutionQualified:false});
});

test('Clone enclosing private source invocation rejects copied models certificates contexts and changed spans',(_t,retain)=>{
 const row=setup('#[derive(Clone)]pub struct Record{value:u8}'),chosen=select(row),failures=[];
 for(const token of [{...chosen.token},structuredClone(chosen.token),JSON.parse(chosen.facts.wire),{...chosen.facts},{}])failures.push(refused(()=>requireBuiltinCloneEnclosingNamespace(token,row.context,row.certificate,row.invocation)));
 failures.push(refused(()=>requireBuiltinCloneEnclosingNamespace(chosen.token,row.context,structuredClone(row.certificate),row.invocation)));
 failures.push(refused(()=>requireBuiltinCloneEnclosingNamespace(chosen.token,setup(row.source).context,row.certificate,row.invocation)));
 failures.push(refused(()=>requireBuiltinCloneEnclosingNamespace(chosen.token,row.context,row.certificate,{path:['Debug'],attributeSpan:row.invocation.attributeSpan})));
 failures.push(refused(()=>requireBuiltinCloneEnclosingNamespace(chosen.token,row.context,row.certificate,{path:['Clone'],attributeSpan:{...row.invocation.attributeSpan,end:row.invocation.attributeSpan.end-1}})));
 assert.equal(reissueBuiltinCloneEnclosingNamespace(chosen.token,row.context,row.certificate,row.invocation).wire,chosen.facts.wire);
 assert.throws(()=>Object.defineProperty(chosen.facts.model,'runtimeAuthority',{value:true}),TypeError);
 const context=createDeriveEnclosingNamespaceContext({deriveContext:row.context}),dimension=effect(row,context),saved=row.module.source;
 try{row.module.source+='\n';failures.push(refused(()=>deriveEnclosingNamespaceEffectFacts(dimension.token,context,row.context,row.module,row.item)));}finally{row.module.source=saved;}
 retain('complete-private-membership-refusals',{row,chosen,context,dimension,failures});
});

test('Clone positive enclosing grammar rejects changed macros attributes tokens children and type assertions',async(t,retain)=>{
 const row=setup('#[derive(Clone)]pub struct Record{value:u8}'),profile=builtinDeriveAstSourceProfile(row.dependencies),entry=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/clone.rs','expand_deriving_clone');
 const input=builtinPayloadDataInputs({source:row.source,span:row.certificate.span}),original={...deriveFootprintOriginalContext(row.context,row.certificate),module:row.module},options={profile,entry,input,original,certificate:row.certificate};
 const clean=compileBuiltinCloneEnclosingNamespaceModel(options);assert.ok(clean);
 const url=new URL('../builtin-clone-ast-route.mjs',import.meta.url),source=readFileSync(url,'utf8'),anchor=' const closed=closeCloneEnclosingBranches(state,leaves,branches);';
 const attacks=["branches[0].output.items[0].body.statements[0].expr.kind='ExprKind::MacCall';","branches[0].output.attrs.push('macro_export');","branches[0].output.items[0].tokens={opaque:true};","delete branches[0].output.items[0].body.statements[0].expr.slots.fields;","branches[1].output.items[0].body.typeOnlyStatements.candidates[0].local.initializer={kind:'MacCall'};","branches[0].output.items[0].body.statements[0].expr.slots.fields[0].fieldInfoSpan={...leaves.fields[0].fieldInfoSpan};"];
 const results=[];for(const attack of attacks){const after=once(source,anchor,' '+attack+'\n'+anchor),copy=await copiedModule(t,after,url),result=refused(()=>copy.api.compileBuiltinCloneEnclosingNamespaceModel(options));assert.match(result.error.message,/positive grammar/);results.push({attack,source:copy.source,relocated:copy.relocated,result});}
 retain('complete-original-grammar-and-adverse-copied-sources',{row,options,clean,source,results});
});

test('Clone enclosing composition retains all sibling owners unknown attributes and payload fallbacks',(_t,retain)=>{
 const rows=[];
 for(const source of ['#[derive(Clone,Debug,Copy)]pub struct Record{value:u8}','#[derive(Clone,serde::Serialize,serde::Deserialize)]pub struct Record{value:u8}']){
  const row=setup(source),context=createDeriveEnclosingNamespaceContext({deriveContext:row.context}),certificate=deriveEnclosingNamespaceOutputAt(context,row.context,row.module,row.item);assert.ok(certificate);assert.deepEqual(certificate.residualOwners,[]);
  const actual=row.certificate.attributes.filter(attribute=>attribute.name==='derive').flatMap(attribute=>attribute.derives);assert.equal(certificate.actualOwners.length,actual.length);assert.equal(certificate.selectedOwners.length,actual.length);effect(row,context);rows.push({row,context,certificate});
 }
 for(const source of ['#[derive(Clone,unknown::Open)]pub struct Record{value:u8}','#[derive(Clone)]pub struct Record{#[unknown]value:u8}','#[derive(Clone)]#[repr(packed)]pub struct Record{value:u8}','#[derive(Clone)]pub struct Record{value:unknown!()}','#[derive(Clone)]pub struct Record(u8);']){
  const row=setup(source),result=outcome(()=>proveBuiltinCloneEnclosingNamespace(args(row))),context=createDeriveEnclosingNamespaceContext({deriveContext:row.context});
  assert.equal(deriveEnclosingNamespaceOutputAt(context,row.context,row.module,row.item),null);assert.ok(context.diagnostics.length+row.context.diagnostics.length>0);rows.push({row,result,context});
 }
 const payload=setup('#[derive(Clone)]pub enum Record{A(u8),B{value:u8}}');assert.equal(proveBuiltinCloneEnclosingNamespace(args(payload)),null);
 const context=createDeriveEnclosingNamespaceContext({deriveContext:payload.context}),certificate=deriveEnclosingNamespaceOutputAt(context,payload.context,payload.module,payload.item);
 const fallback=certificate?originalDeriveEnclosingNamespaceOutputs(context,payload.context,payload.module,payload.item):null;if(fallback)assert.ok(fallback.outputs.every(row=>row.format!=='clone-enclosing'));else assert.ok(context.diagnostics.length);
 retain('complete-sibling-refusals-and-fallback',{rows,payload,context,certificate,fallback});
});

test('Clone model hashing cannot issue a private token after observer mutation of the current invocation',(_t,retain)=>{
 const row=setup('#[derive(Clone)]pub struct Record{value:u8}'),chosen=select(row),descriptor=Object.getOwnPropertyDescriptor(Hash.prototype,'update'),events=[],span=row.invocation.attributeSpan;let entered=false,result;
 try{Object.defineProperty(Hash.prototype,'update',{...descriptor,value:function(...args){const value=Reflect.apply(descriptor.value,this,args);events.push(args.map(value=>typeof value==='string'?value:{type:typeof value}));if(!entered&&typeof args[0]==='string'&&args[0].includes('original-clone-enclosing-namespace-model-v1')){entered=true;row.invocation.attributeSpan={...span,start:span.start+1};}return value;}});result=outcome(()=>proveBuiltinCloneEnclosingNamespace(args(row)));}
 finally{Object.defineProperty(Hash.prototype,'update',descriptor);row.invocation.attributeSpan=span;}
 assert.ok(result.error?.name==='TypeError'||(!entered&&result.value===null));assert.equal(reissueBuiltinCloneEnclosingNamespace(chosen.token,row.context,row.certificate,row.invocation).wire,chosen.facts.wire);
 retain('complete-hash-observer-mutation',{row,chosen,entered,events,result});
});
