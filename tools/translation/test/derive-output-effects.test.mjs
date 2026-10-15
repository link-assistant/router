import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Hash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {createDeriveBangContext} from '../derive-bang-context.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {parserSourceScope} from '../source-scopes.mjs';
import {PRODUCTION_PROFILE,compilationProfile} from '../cfg-profile.mjs';
import {originalImplNamespaceSourcePlan,originalImplNamespacePlanCacheFacts,requireOriginalImplNamespaceSourcePlan} from '../derive-ancestor-attribute-scope.mjs';
import {DERIVE_EMPTY_ENCLOSING_EFFECT_RULE,proveDeriveEmptyEnclosingEffect,deriveEmptyEnclosingEffectFacts,proveDeriveRequestedNameUnchanged,deriveRequestedNameEffectFacts} from '../derive-output-effects.mjs';

const test=(name,body)=>nodeTest(name,{timeout:60_000},body);
const repository=new URL('../../../',import.meta.url),read=path=>readFileSync(new URL(path,repository),'utf8');
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
const retain=(name,value)=>{const directory=process.env.ROUTER_DERIVE_EFFECT_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(directory+'/'+name+'.json',JSON.stringify(value)+'\n',{flag:'wx'});}};
const names=[{namespace:'type',name:'Formatter'},{namespace:'type',name:'Result'},{namespace:'type',name:'Display'},{namespace:'value',name:'format'}];
function setup(source,rootSource='mod model;',profile=PRODUCTION_PROFILE){
 const modules=[{file:'src/lib.rs',path:[],source:rootSource},{file:'src/model.rs',path:['model'],source}];
 const deriveContext=createDeriveFootprintContext({modules,dependencies,compilationProfile:profile});
 const context=createDeriveBangContext({deriveContext}),module=modules[1],item=originalSourceModuleItems(module).find(item=>['struct','enum'].includes(item.term));
 return {source,modules,deriveContext,context,module,item,externalModules:deriveFootprintExternalModules(deriveContext),compilationProfile:profile};
}
const effect=row=>proveDeriveEmptyEnclosingEffect(row.context,row.deriveContext,row.module,row.item);
const facts=(token,row)=>deriveEmptyEnclosingEffectFacts(token,row.context,row.deriveContext,row.module,row.item);
const model=resolved=>resolved.scopes.find(scope=>scope.file==='src/model.rs');
const resolve=row=>resolveModuleBindings({...row,deriveBangContext:row.context});
function failure(run){let error;assert.throws(()=>{try{run();}catch(cause){error={name:cause.name,message:cause.message};throw cause;}},TypeError);return error;}

test('stable language rule consumes complete original resolver actions independently from repository order',()=>{
 const row=setup('#[derive(Copy)]pub struct Payload{value:u8}'),token=effect(row),actual=facts(token,row);
 assert.equal(actual.rule.id,'rust.original-complete-derived-enclosing-name-effect.v1');
 assert.deepEqual(DERIVE_EMPTY_ENCLOSING_EFFECT_RULE.languageOrder,['actual-original-reduced-graph-namespace-actions','private-complete-output-and-generated-owner-joins','all-retained-output-alternatives','enclosing-name-effect']);
 assert.notDeepEqual(actual.rule.languageOrder,actual.rule.repositoryOrder);
 assert.ok(Object.isFrozen(actual.rule.languageOrder));assert.ok(Object.isFrozen(actual.rule.prerequisites));assert.ok(Object.isFrozen(actual.rule.repositoryOrder));
 assert.equal(actual.sourcePlan.selections.item.path,'compiler/rustc_resolve/src/build_reduced_graph.rs');
 assert.ok(actual.sourcePlan.selections.associated.original.includes('impl_binding_keys'));
 assert.equal(actual.sourcePlan.recipes.length,4);assert.equal(actual.sourcePlan.wholeCompilerExecuted,false);
 assert.deepEqual(actual.enclosingTypeBindings,[]);assert.deepEqual(actual.enclosingUsableValueBindings,[]);
 assert.equal(actual.runtimeAuthority,false);assert.deepEqual(Object.keys(token),['schema']);
 const first=originalImplNamespaceSourcePlan(),second=originalImplNamespaceSourcePlan(),cache=originalImplNamespacePlanCacheFacts();
 assert.deepEqual(first,second);assert.equal(requireOriginalImplNamespaceSourcePlan(first),first);
 if(cache.eligible)assert.strictEqual(first,second);else assert.notStrictEqual(first,second);
 assert.throws(()=>requireOriginalImplNamespaceSourcePlan(structuredClone(first)),/copied or foreign/u);
 const includes=Object.getOwnPropertyDescriptor(String.prototype,'includes'),update=Object.getOwnPropertyDescriptor(Hash.prototype,'update');let ownerCallbacks=0,hashCallbacks=0,fallback,hashFallback;
 try{
  Object.defineProperty(String.prototype,'includes',{...includes,value:function(...args){ownerCallbacks++;return Reflect.apply(includes.value,this,args);}});
  assert.equal(originalImplNamespacePlanCacheFacts().eligible,false);fallback=originalImplNamespaceSourcePlan();
 }finally{Object.defineProperty(String.prototype,'includes',includes);}
 assert.ok(ownerCallbacks>=3);assert.notStrictEqual(fallback,first);assert.deepEqual(fallback,first);
 try{
  Object.defineProperty(Hash.prototype,'update',{...update,value:function(...args){hashCallbacks++;return Reflect.apply(update.value,this,args);}});
  assert.equal(originalImplNamespacePlanCacheFacts().eligible,false);hashFallback=originalImplNamespaceSourcePlan();
 }finally{Object.defineProperty(Hash.prototype,'update',update);}
 assert.equal(hashCallbacks,1);assert.notStrictEqual(hashFallback,first);assert.deepEqual(hashFallback,first);
 const next=effect(row),nextFacts=facts(next,row);assert.notStrictEqual(next,token);
 assert.notStrictEqual(nextFacts.alternatives[0].originalCompleteOutput.proof,actual.alternatives[0].originalCompleteOutput.proof,'complete caller output must still be freshly reissued');
 retain('01-complete-source-rule',{row,token,actual,first,second,cache,fallback,ownerCallbacks,hashFallback,hashCallbacks,next,nextFacts});
});

test('all privately closed builtin branches narrow only their original item type uncertainty',()=>{
 // Preserve the original seven-owner source as an already-closed Default
 // input control; it never demonstrated a historical namespace gain.
 const row=setup('#[derive(Copy,Clone,Debug,Default,Eq,PartialEq,Hash)]pub struct Payload{value:u8}');
 const before=resolveModuleBindings(row),after=resolve(row),token=effect(row),actual=facts(token,row);
 const requested=proveDeriveRequestedNameUnchanged(token,row.context,row.deriveContext,row.module,row.item,names),selected=deriveRequestedNameEffectFacts(requested,token,row.context,row.deriveContext,row.module,row.item);
 const standard=setup('#[derive(Copy,Clone,Debug,Eq,PartialEq,Hash)]pub struct Payload{value:u8}');
 const standardBefore=resolveModuleBindings(standard),standardAfter=resolve(standard),standardToken=effect(standard),standardFacts=facts(standardToken,standard);
 const incomplete=setup('#[derive(Ord)]pub struct Payload{value:u8}'),incompleteBefore=resolveModuleBindings(incomplete),incompleteAfter=resolve(incomplete);
 retain('02-every-builtin-alternative',{row,before,after,token,actual,requested,selected,standard,standardBefore,standardAfter,standardToken,standardFacts,incomplete,incompleteBefore,incompleteAfter});
 assert.equal(model(before).unresolvedTypeScope,false);assert.equal(model(after).unresolvedTypeScope,false);
 assert.equal(model(after).unresolvedBangMacroScope,false);
 assert.equal(actual.alternatives.length,7);assert.ok(actual.alternatives.every(output=>output.kind==='ItemKind::Impl'));
 assert.ok(actual.alternatives.some(output=>output.originalCompleteOutput.proof.route?.branches?.length>1));
 // Public dimensions keep their historical limited contract. The old Default
 // input is complete; the standard-only input explicitly is not.
 assert.equal(row.context.certificates[0].dimensions.typeNamespaceComplete,false);
 assert.ok(row.deriveContext.certificates[0].builtinDefault);
 assert.equal(row.deriveContext.certificates[0].dimensions.typeNamespaceComplete,true);
 assert.equal(row.deriveContext.certificates[0].dimensions.valueNamespaceComplete,true);
 assert.deepEqual(selected.requests,names);assert.equal(selected.namespaceAuthority,false);
 assert.ok(standard.deriveContext.certificates[0].standardInput);
 assert.equal(standard.deriveContext.certificates[0].dimensions.typeNamespaceComplete,false);
 assert.equal(standard.deriveContext.certificates[0].dimensions.valueNamespaceComplete,false);
 assert.equal(standard.context.certificates[0].dimensions.typeNamespaceComplete,false);
 assert.equal(model(standardBefore).unresolvedTypeScope,true,'incomplete input must retain its newly repaired conservative boundary');
 assert.equal(model(standardAfter).unresolvedTypeScope,false,'only the complete private per-invocation output effect discharges that boundary');
 assert.equal(standardFacts.alternatives.length,6);assert.ok(standardFacts.alternatives.every(output=>output.kind==='ItemKind::Impl'));
 assert.ok(incomplete.deriveContext.certificates[0].standardInput);
 assert.equal(model(incompleteBefore).unresolvedTypeScope,true);assert.equal(model(incompleteAfter).unresolvedTypeScope,true,'an unproved output cannot discharge the repaired boundary');
});

test('unit enum and full data branches retain all alternatives without trait or runtime promotion',()=>{
 const rows=[];
 for(const source of ['#[derive(Copy,Clone,Debug,Eq,PartialEq,Hash)]pub enum Mode{Alpha,Beta}', '#[derive(Clone,Debug,Default,PartialEq,Hash)]pub struct Payload{value:String}']){
  const row=setup(source),token=effect(row),actual=facts(token,row);assert.ok(actual.alternatives.length>=5);
  assert.equal(model(resolve(row)).unresolvedTypeScope,false);assert.equal(row.context.generatedImplBehavior,false);
  for(const alternative of actual.alternatives)assert.equal(alternative.originalCompleteOutput.proof.generatedImplBehavior,false);
  rows.push({row,token,actual});
 }
 retain('03-all-retained-data-branches',{rows});
});

test('genuine Serde Schemars and Clap output trees use the same enclosing effect consumer',()=>{
 const rows=[];
 for(const source of ['#[derive(serde::Serialize,serde::Deserialize,schemars::JsonSchema)]pub struct Payload{value:u8}', '#[derive(clap::ValueEnum)]pub enum Choice{Fast,Safe}', '#[derive(clap::Args)]pub struct Options{#[arg(long)]value:Option<String>}']){
  const row=setup(source),token=effect(row),actual=facts(token,row);assert.ok(actual.alternatives.length);
  assert.ok(actual.alternatives.every(alternative=>alternative.roots?.every(root=>['ItemKind::Impl','ItemKind::Const'].includes(root.kind))));
  assert.ok(actual.alternatives.every(alternative=>alternative.roots.every(root=>Object.isFrozen(root.originalSyntax))));
  if(source.includes('Deserialize'))assert.ok(actual.alternatives.filter(alternative=>alternative.invocation.path.at(-1)==='Deserialize').length===2);
  assert.equal(model(resolve(row)).unresolvedTypeScope,false);rows.push({row,token,actual});
 }
 retain('04-private-quote-output-families',{rows});
});

test('a requested name proof preserves actual local shadows and never resolves a formatting owner',()=>{
 const row=setup('#[derive(Clone)]pub struct Payload{value:u8}pub struct Formatter;macro_rules! format{()=>{false};}'),token=effect(row),proof=proveDeriveRequestedNameUnchanged(token,row.context,row.deriveContext,row.module,row.item,names),actual=deriveRequestedNameEffectFacts(proof,token,row.context,row.deriveContext,row.module,row.item),resolved=resolve(row),scope=parserSourceScope(model(resolved),resolved.scopes);
 assert.equal(actual.namespaceAuthority,false);assert.equal(actual.runtimeAuthority,false);
 assert.ok(model(resolved).bindings.some(binding=>binding.name==='Formatter'&&binding.namespace==='type'&&binding.target?.join('::')==='crate::model::Formatter'));
 assert.equal(scope.shadowedBuiltinMacros.has('format'),true);
 const qualified=setup('#[derive(Clone)]pub struct Payload{value:u8}','use unknown::std;mod model;');
 const error=failure(()=>effect(qualified));retain('05-requested-shadows-remain',{row,token,proof,actual,resolved,qualified,error});
});

test('unknown sibling producers imports and cfg alternatives remain unresolved',()=>{
 const rows=[];
 for(const [label,source,rootSource,profile]of [
  ['attribute','#[derive(Clone)]pub struct Payload{value:u8}#[unknown]pub struct Other;','mod model;',PRODUCTION_PROFILE],
  ['bang','#[derive(Clone)]pub struct Payload{value:u8}unknown!();','mod model;',PRODUCTION_PROFILE],
  ['glob','use unknown::*;#[derive(Clone)]pub struct Payload{value:u8}','mod model;',PRODUCTION_PROFILE],
  ['cfg','#[derive(Clone)]pub struct Payload{value:u8}','mod model;#[cfg(unix)]mod conditional;',compilationProfile({flags:{test:false}})],
 ]){
  const row=setup(source,rootSource,profile),resolved=resolve(row),scope=parserSourceScope(model(resolved),resolved.scopes),rootScope=resolved.scopes.find(scope=>scope.path.length===0);
  let effectToken=null,effectFacts=null,effectError=null;
  try{effectToken=effect(row);effectFacts=facts(effectToken,row);}catch(error){effectError={name:error.name,message:error.message,stack:error.stack};}
  const observed={label,row,resolved,scope,rootScope,effectToken,effectFacts,effectError};rows.push(observed);
  // Capture every variant before any assertions, including unexpected success.
  retain('06-unknown-'+label,observed);
 }
 retain('06-unknown-producers-and-conditions',{rows});
 for(const observed of rows){
  assert.equal(observed.effectError?.name,'TypeError',observed.label);
  assert.equal(observed.effectToken,null,observed.label);
  if(observed.label!=='cfg')assert.equal(observed.scope.unresolvedTypeScope,true,observed.label);
  else{
   // The missing conditional sibling contributes ancestor bang uncertainty,
   // not inherited type uncertainty to this unrelated child module.
   assert.equal(observed.scope.unresolvedTypeScope,false);
   assert.equal(observed.rootScope.bindings.find(binding=>binding.name==='conditional'&&binding.namespace==='type')?.status,'unresolved');
   assert.equal(observed.rootScope.unresolvedBangMacroScope,true);
   assert.equal(observed.scope.unresolvedBangMacroScope,true);
  }
 }
});

test('opaque bodies types helpers additional derives and generated attributes cannot borrow empty effects',()=>{
 const rows=[];
 for(const source of [
  '#[derive(Clone,Ord)]pub struct Payload{value:u8}',
  '#[derive(Clone)]pub enum Payload{Value(u8),None}',
  '#[derive(Clone)]pub struct Payload{value:unknown!()}',
  '#[derive(Clone)]pub struct Payload{#[unknown]value:u8}',
  '#[derive(Clone)]pub struct Payload{value:u8=unknown!()}',
  '#[derive(serde::Serialize)]#[serde(serialize_with="unknown")]pub struct Payload{value:u8}',
 ]){const row=setup(source);rows.push({row,error:failure(()=>effect(row))});}
 for(const name of ['inline','automatically_derived']){const row=setup('#[derive(Clone)]pub struct Payload{value:u8}','use unknown::'+name+';mod model;');rows.push({row,error:failure(()=>effect(row))});}
 retain('07-no-opaque-associated-or-generated-effects',{rows});
});

test('metadata copies changed sources and equal-byte foreign contexts cannot replay private effects',()=>{
 const row=setup('#[derive(Clone)]pub struct Payload{value:u8}'),other=setup(row.source),token=effect(row),errors=[];
 for(const fake of [{...token},structuredClone(token),new Proxy(token,{})])errors.push(failure(()=>facts(fake,row)));
 errors.push(failure(()=>facts(token,other)));
 errors.push(failure(()=>deriveEmptyEnclosingEffectFacts(token,row.context,row.deriveContext,{...row.module,source:row.source+' '},row.item)));
 errors.push(failure(()=>deriveEmptyEnclosingEffectFacts(token,row.context,row.deriveContext,row.module,{...row.item,end:row.item.end-1})));
 errors.push(failure(()=>proveDeriveEmptyEnclosingEffect(structuredClone(row.context),row.deriveContext,row.module,row.item)));
 const proof=proveDeriveRequestedNameUnchanged(token,row.context,row.deriveContext,row.module,row.item,names);
 errors.push(failure(()=>deriveRequestedNameEffectFacts({...proof},token,row.context,row.deriveContext,row.module,row.item)));
 assert.equal(facts(token,row).certificate,row.context.certificates[0]);retain('08-private-replay-and-mutation',{row,other,token,proof,errors});
});

test('requested-name descriptors reject callbacks holes oversized data and nonusable namespaces',()=>{
 const row=setup('#[derive(Copy)]pub struct Payload{value:u8}'),token=effect(row);let callbacks=0;const errors=[];
 const getter=Object.defineProperty({},'name',{get(){callbacks++;return 'Formatter';}});getter.namespace='type';
 const proxy=new Proxy(names,{get(){callbacks++;throw new Error('must not read');},ownKeys(){callbacks++;throw new Error('must not enumerate');}});
 for(const selected of [[getter],proxy,new Array(1),Array.from({length:129},()=>names[0]),[{namespace:'bang',name:'format'}],[{namespace:'value',name:'_'}],[{namespace:'type',name:'Formatter',namespaceAuthority:true}]])errors.push(failure(()=>proveDeriveRequestedNameUnchanged(token,row.context,row.deriveContext,row.module,row.item,selected)));
 assert.equal(callbacks,0);retain('09-bounded-own-request-data',{row,token,errors,callbacks});
});

test('fresh process cannot turn serialized public token bytes into issuer authority',()=>{
 const row=setup('#[derive(Copy)]pub struct Payload{value:u8}'),token=effect(row),moduleUrl=new URL('../derive-output-effects.mjs',import.meta.url).href;
 const source='import{deriveEmptyEnclosingEffectFacts}from '+JSON.stringify(moduleUrl)+';const token=JSON.parse(process.argv[1]);let error;try{deriveEmptyEnclosingEffectFacts(token,{},{},{file:"src/model.rs",path:["model"]},{start:0,end:1})}catch(e){error={name:e.name,message:e.message}}console.log(JSON.stringify({token,error}));if(!error||!error.message.includes("copied, foreign"))process.exitCode=1;';
 const child=spawnSync(process.execPath,['--input-type=module','--eval',source,JSON.stringify(token)],{encoding:'utf8',timeout:20_000,maxBuffer:1024*1024});
 assert.equal(child.status,0,child.stdout+child.stderr);assert.match(child.stdout,/copied, foreign/u);
 retain('10-fresh-process-replay',{row,token,source,command:[process.execPath,'--input-type=module','--eval',source,JSON.stringify(token)],status:child.status,stdout:child.stdout,stderr:child.stderr});
});
