import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {Hash,createHash} from 'node:crypto';
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
 // Preserve the original seven-owner source. A plain struct Default has no
 // unit-variant #[default] helper and still needs complete output evidence.
 const row=setup('#[derive(Copy,Clone,Debug,Default,Eq,PartialEq,Hash)]pub struct Payload{value:u8}');
 const before=resolveModuleBindings(row),after=resolve(row),token=effect(row),actual=facts(token,row);
 const requested=proveDeriveRequestedNameUnchanged(token,row.context,row.deriveContext,row.module,row.item,names),selected=deriveRequestedNameEffectFacts(requested,token,row.context,row.deriveContext,row.module,row.item);
 const standard=setup('#[derive(Copy,Clone,Debug,Eq,PartialEq,Hash)]pub struct Payload{value:u8}');
 const standardBefore=resolveModuleBindings(standard),standardAfter=resolve(standard),standardToken=effect(standard),standardFacts=facts(standardToken,standard);
 const incomplete=setup('#[derive(Ord)]pub struct Payload{value:u8}'),incompleteBefore=resolveModuleBindings(incomplete),incompleteAfter=resolve(incomplete);
 const unitDefault=setup('#[derive(Default)]pub enum Choice{#[default]First,Other}'),unitDefaultBefore=resolveModuleBindings(unitDefault),unitDefaultAfter=resolve(unitDefault);
 retain('02-every-builtin-alternative',{row,before,after,token,actual,requested,selected,standard,standardBefore,standardAfter,standardToken,standardFacts,incomplete,incompleteBefore,incompleteAfter,unitDefault,unitDefaultBefore,unitDefaultAfter});
 assert.equal(model(before).unresolvedTypeScope,true);assert.equal(model(after).unresolvedTypeScope,false);
 assert.equal(model(after).unresolvedBangMacroScope,false);
 assert.equal(actual.alternatives.length,7);assert.ok(actual.alternatives.every(output=>output.kind==='ItemKind::Impl'));
 assert.ok(actual.alternatives.some(output=>output.originalCompleteOutput.proof.route?.branches?.length>1));
 // Public dimensions keep their historical limited contract. Plain struct
 // Default is standard-only; the actual unit #[default] helper is distinct.
 assert.equal(row.context.certificates[0].dimensions.typeNamespaceComplete,false);
 assert.ok(row.deriveContext.certificates[0].standardInput);assert.equal(row.deriveContext.certificates[0].builtinDefault,undefined);
 assert.equal(row.deriveContext.certificates[0].dimensions.typeNamespaceComplete,false);
 assert.equal(row.deriveContext.certificates[0].dimensions.valueNamespaceComplete,false);
 assert.deepEqual(selected.requests,names);assert.equal(selected.namespaceAuthority,false);
 assert.ok(standard.deriveContext.certificates[0].standardInput);
 assert.equal(standard.deriveContext.certificates[0].dimensions.typeNamespaceComplete,false);
 assert.equal(standard.deriveContext.certificates[0].dimensions.valueNamespaceComplete,false);
 assert.equal(standard.context.certificates[0].dimensions.typeNamespaceComplete,false);
 assert.equal(model(standardBefore).unresolvedTypeScope,true,'incomplete input must retain its newly repaired conservative boundary');
 assert.equal(model(standardAfter).unresolvedTypeScope,false,'only the complete private per-invocation output effect discharges that boundary');
 assert.equal(standardFacts.alternatives.length,6);assert.ok(standardFacts.alternatives.every(output=>output.kind==='ItemKind::Impl'));
 assert.equal(unitDefault.deriveContext.certificates[0].builtinDefault.variant,'First');
 assert.equal(unitDefault.deriveContext.certificates[0].dimensions.typeNamespaceComplete,true);
 assert.equal(unitDefault.deriveContext.certificates[0].dimensions.valueNamespaceComplete,true);
 assert.equal(model(unitDefaultBefore).unresolvedTypeScope,false);assert.equal(model(unitDefaultAfter).unresolvedTypeScope,false);
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

test('opaque bodies types helpers additional derives and generated attributes cannot borrow empty effects',async()=>{
 const rows=[],states=[];
 function observe(source,rootSource='mod model;',label=String(rows.length+1).padStart(2,'0')){
  const observed={label,source,rootSource,action:'proveDeriveEmptyEnclosingEffect(context,deriveContext,module,item)',setupCompleted:false,token:null,error:null,actual:null,factsError:null};
  const state={row:null,token:null,error:null,setupError:null};
  try{state.row=setup(source,rootSource);observed.setupCompleted=true;observed.row=state.row;try{state.token=effect(state.row);observed.token=state.token;}catch(error){state.error=error;observed.error={name:error.name,message:error.message};}}
  catch(error){state.setupError=error;observed.setupError={name:error.name,message:error.message};}
  rows.push(observed);states.push(state);retain('07-initial-'+label,observed);
 }

 for(const source of [
  '#[derive(Clone,Ord)]pub struct Payload{value:u8}',
  '#[derive(Clone)]pub enum Payload{Value(u8),None}',
  '#[derive(Clone)]pub struct Payload{value:unknown!()}',
  '#[derive(Clone)]pub struct Payload{#[unknown]value:u8}',
  '#[derive(Clone)]pub struct Payload{value:u8=unknown!()}',
  '#[derive(serde::Serialize)]#[serde(serialize_with="unknown")]pub struct Payload{value:u8}',
 ]){observe(source);}
 for(const name of ['inline','automatically_derived'])observe('#[derive(Clone)]pub struct Payload{value:u8}','use unknown::'+name+';mod model;');
 // Initial actions remain unwrapped. Inspect a successful private token only
 // after every original subject has run; no Hash observer/reissue is added.
 for(let index=0;index<states.length;index++){
  const state=states[index],observed=rows[index];
  if(state.token)try{observed.actual=facts(state.token,state.row);}catch(error){observed.factsError={name:error.name,message:error.message};}
  retain('07-complete-'+observed.label,observed);
 }
 retain('07-no-opaque-associated-or-generated-effects',{rows});
 // All eight current initial native actions and their full facts stay first.
 // Replay the closed historical issuer graph with genuine current interfaces;
 // this is not historical bootstrap or Hash callback-schedule equivalence.
 const digest=value=>createHash('sha256').update(value).digest('hex'),fixtureText=read('tools/translation/test/fixtures/derive-payload-before-196.json');
 assert.equal(Buffer.byteLength(fixtureText),141090);assert.equal(digest(fixtureText),'751e59d5d2d36027775a7b500bdb9010c84aa027f23e0eb26b4a24466c5a8e27');
 const fixture=JSON.parse(fixtureText),loaded=new Map(),urls=new Map(),copies=[],currentSourcePins=[];
 assert.equal(fixture.schema,'closed-original-payload-effect-before-196-v1');assert.equal(fixture.modules.length,6);assert.deepEqual(fixture.loadOrder,fixture.modules.map(row=>row.path));
 const actualTargets=new Set(fixture.modules.flatMap(row=>row.imports.filter(edge=>edge.kind==='current-genuine-interface'&&!edge.target.startsWith('node:')).map(edge=>edge.target)));
 for(const path of actualTargets){const pin=fixture.currentGenuineInterfaces.find(row=>row.path===path);assert.ok(pin,'complete current interface '+path);const source=read(path);assert.equal(Buffer.byteLength(source),pin.bytes);assert.equal(digest(source),pin.sha256);currentSourcePins.push({path,source,sha256:pin.sha256});}
 assert.equal(digest(fixture.oldProfile.source),fixture.oldProfile.sha256);assert.equal(Buffer.byteLength(fixture.oldProfile.source),fixture.oldProfile.bytes);
 const oldManifest=JSON.parse(fixture.oldProfile.source),currentManifest=JSON.parse(read(fixture.oldProfile.path)),profileJoins=[];
 assert.equal(oldManifest.sources.length,36);for(const old of oldManifest.sources){const matches=currentManifest.sources.filter(row=>row.path===old.path);assert.equal(matches.length,1);assert.deepEqual(matches[0],old);profileJoins.push({old,current:matches[0]});}
 for(const row of fixture.modules){
  assert.equal(Buffer.byteLength(row.source),row.bytes);assert.equal(digest(row.source),row.sha256);assert.equal(row.source.includes('import.meta'),false);
  const imports=[...row.source.matchAll(/^import[^\n]*?\bfrom\s+(['"])([^'"\n]+)\1;/gmu)];assert.equal(imports.length,row.imports.length);const changes=[];
  for(let index=0;index<row.imports.length;index++){
   const edge=row.imports[index],actual=imports[index],quoted=actual[1]+actual[2]+actual[1],at=actual.index+actual[0].lastIndexOf(quoted);assert.equal(actual[2],edge.specifier);assert.deepEqual(edge.span,[at,at+quoted.length]);assert.equal(row.source.slice(...edge.span),edge.expected);
   if(!edge.specifier.startsWith('.'))continue;
   const target=fixture.modules.some(item=>item.path===edge.target)?urls.get(edge.target):new URL(edge.target,repository).href;assert.equal(typeof target,'string','closed earlier historical/current import '+edge.target);
   changes.push({start:edge.span[0],end:edge.span[1],expected:edge.expected,replacement:JSON.stringify(target),target:edge.target});
  }
  let copied=row.source;for(const edit of [...changes].reverse()){assert.equal(copied.slice(edit.start,edit.end),edit.expected);copied=copied.slice(0,edit.start)+edit.replacement+copied.slice(edit.end);}
  let shift=0;for(const edit of changes){edit.copiedStart=edit.start+shift;edit.copiedEnd=edit.copiedStart+edit.replacement.length;shift+=edit.replacement.length-edit.expected.length;}
  let inverse=copied;for(const edit of [...changes].reverse()){assert.equal(inverse.slice(edit.copiedStart,edit.copiedEnd),edit.replacement);inverse=inverse.slice(0,edit.copiedStart)+edit.expected+inverse.slice(edit.copiedEnd);}assert.equal(inverse,row.source);
  const url='data:text/javascript;base64,'+Buffer.from(copied).toString('base64');copies.push({path:row.path,original:row.source,copied,changes,inverse});urls.set(row.path,url);loaded.set(row.path,await import(url));
 }
 const selected=states[1],observed=rows[1],row=selected.row,oldBang=loaded.get('tools/translation/derive-bang-context.mjs'),oldEffects=loaded.get('tools/translation/derive-output-effects.mjs'),oldContext=oldBang.createDeriveBangContext({deriveContext:row.deriveContext});let oldToken=null,oldError=null;
 try{oldToken=oldEffects.proveDeriveEmptyEnclosingEffect(oldContext,row.deriveContext,row.module,row.item);}catch(error){oldError=error;}
 const historical={fixture,profileJoins,currentSourcePins,copies,row,context:oldContext,token:oldToken,error:oldError&&{name:oldError.name,message:oldError.message},scope:fixture.boundary};retain('07-546-complete-historical-private-refusal',historical);
 assert.equal(oldToken,null);assert.ok(oldError instanceof TypeError);assert.equal(oldError.message,'Original derive output has unresolved actual owners');
 const historicalRow=oldContext.certificates.find(value=>value.source===row.module.file&&value.span.start===row.item.start&&value.span.end===row.item.end);assert.ok(historicalRow);assert.equal(historicalRow.selectedOwners.length,0);assert.equal(historicalRow.residualOwners.length,1);assert.deepEqual(historicalRow.residualOwners[0].path,['Clone']);assert.equal(historicalRow.residualOwners[0].reason,'Builtin data enum payload or explicit discriminant remains unproved');
 assert.equal(selected.setupError,null);assert.equal(selected.error,null);assert.ok(selected.token);assert.equal(observed.factsError,null);const actual=observed.actual;assert.equal(actual.alternatives.length,1);const alternative=actual.alternatives[0],output=alternative.originalCompleteOutput,route=output.route;
 const {validateBuiltinCloneAstOutput}=await import('../builtin-clone-ast-route.mjs');retain('07-546-complete-current-payload-positive',{row,token:selected.token,actual,alternative,output,route});
 assert.equal(alternative.kind,'ItemKind::Impl');assert.equal(output.sink.kind,'ItemKind::Impl');assert.equal(validateBuiltinCloneAstOutput(route,route.branches),true);
 assert.deepEqual(route.branches.map(value=>value.feature),['has_derive_copy=false','has_derive_copy=true']);assert.deepEqual(route.typedSource.variants.map(value=>[value.name,value.style,value.fields.length]),[['Value','tuple',1],['None','unit',0]]);
 const full=route.branches[0].output.items[0].body.statements[0].expr;assert.equal(full.constructor.variant.name,'Match');assert.equal(full.slots.arms.length,2);assert.deepEqual(full.slots.arms.map(arm=>arm.pat.slots.path.segments),[['Payload','Value'],['Payload','None']]);assert.equal(route.branches[1].output.items[0].body.typeOnlyStatements.candidates.length,1);
 for(const key of ['namespaceAuthority','copyAuthority','noDropAuthority','constAuthority','generatedImplBehavior'])assert.equal(route[key],false,key);assert.equal(actual.runtimeAuthority,false);assert.equal(output.proof.generatedImplBehavior,false);assert.equal(actual.certificate.dimensions.typeNamespaceComplete,false);assert.equal(actual.certificate.dimensions.valueNamespaceComplete,false);assert.deepEqual(actual.enclosingTypeBindings,[]);assert.deepEqual(actual.enclosingUsableValueBindings,[]);
 // Preserve the exact seven other initial TypeError obligations. A setup
 // exception cannot substitute for the action's actual expected TypeError.
 for(let index=0;index<states.length;index++){
  if(index===1)continue; // The exact payload subject retains its historical refusal above and current namespace-only positive.
  const state=states[index];assert.equal(state.setupError,null,rows[index].label+' original setup');
  assert.throws(()=>{if(state.error)throw state.error;return state.token;},TypeError,rows[index].label+' original effect');
 }
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
