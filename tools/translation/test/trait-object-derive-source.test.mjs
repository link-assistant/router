import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,Hash} from 'node:crypto';
import {translateProject,resolveModuleGraph} from '../project.mjs';
import {loadDeriveDependencyProof,deriveDependencySource} from '../derive-dependencies.mjs';
import {inventoryDeriveQuoteMeta,createQuoteFragmentCompiler} from '../derive-quote-meta.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {createDeriveBangContext} from '../derive-bang-context.mjs';
import {proveBuiltinDeriveBangFootprint,assertBuiltinDeriveBangFootprint,originalBuiltinDefaultBangOutput} from '../builtin-derive-bang-footprints.mjs';
import {builtinDefaultOriginalSourcePlan,validateBuiltinDefaultAstOutput} from '../builtin-default-ast-route.mjs';
import {builtinVisitorFunctionText} from '../builtin-visitor-source.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {lexPrivateConcreteSources} from '../private-parser-execution.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {captureSerializationContext} from '../serialization-schema/extract.mjs';
import {serializeSerializationMeta,parseSerializationMeta} from '../serialization-schema/meta.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const root=new URL('../../../',import.meta.url),read=file=>readFileSync(new URL(file,root),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
const manifest=read('Cargo.toml'),lock=read('Cargo.lock'),dependencies=loadDeriveDependencyProof({manifest,lock});
const compiler=createQuoteFragmentCompiler(inventoryDeriveQuoteMeta(dependencies));
function retain(name,value){const path=process.env.ROUTER_TRAIT_OBJECT_SOURCE_VECTOR_DIR;if(path){mkdirSync(path,{recursive:true});writeFileSync(join(path,name+'.json'),JSON.stringify(value),{flag:'wx'});}}
function observation(callback){try{return {value:callback()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function observedOperation(callback,mutate=null){
  const update=Object.getOwnPropertyDescriptor(Hash.prototype,'update'),digest=Object.getOwnPropertyDescriptor(Hash.prototype,'digest'),tape=[];let result;
  try{
    Object.defineProperty(Hash.prototype,'update',{...update,value:function(...args){const returned=Reflect.apply(update.value,this,args);tape.push({phase:'update',input:typeof args[0]==='string'?args[0]:args[0].toString('base64'),kind:typeof args[0],args:args.length,returnedThis:returned===this});if(mutate)mutate();return returned;}});
    Object.defineProperty(Hash.prototype,'digest',{...digest,value:function(...args){const returned=Reflect.apply(digest.value,this,args);tape.push({phase:'digest',args,value:returned});return returned;}});
    result=observation(callback);
  }finally{Object.defineProperty(Hash.prototype,'update',update);Object.defineProperty(Hash.prototype,'digest',digest);}
  return {result,tape};
}
const observedTokens=(input,mutate=null)=>observedOperation(()=>lexPrivateConcreteSources(input),mutate);
function setup(source,name='Record',owner='Debug'){
  const modules=[{file:'src/lib.rs',path:[],source}],context=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
  const certificate=context.certificates.find(row=>row.name===name),attribute=certificate?.attributes.find(row=>row.derives?.some(path=>path.join('::')===owner));
  return {context,certificate,invocation:attribute&&{path:[owner],attributeSpan:attribute.span}};
}
function original(file,name,owner){
  const paths=execFileSync('git',['ls-files','-z','--','src/*.rs'],{cwd:fileURLToPath(root),encoding:'utf8'}).split('\0').filter(Boolean);
  const graph=resolveModuleGraph({entry:file,paths,readSource:read,compilationProfile:PRODUCTION_PROFILE}),context=createDeriveFootprintContext({modules:graph.modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
  const certificate=context.certificates.find(row=>row.source===file&&row.name===name),attribute=certificate?.attributes.find(row=>row.derives?.some(path=>path.join('::')===owner));
  return {source:read(file),graph,context,certificate,invocation:attribute&&{path:[owner],attributeSpan:attribute.span}};
}
function noBehavior(proof){assert.equal(proof.selectedOwnerBangComplete,true);assert.equal(proof.dimensions.typeNamespaceComplete,false);for(const key of ['generatedImplBehavior','copyAuthority','noDropAuthority','constAuthority'])assert.equal(proof[key],false,key);assert.equal(proof.route.namespaceAuthority,false);}
function declaration(file,name){const source=read(file),items=sourceItems(source),item=items.find(row=>['struct','enum'].includes(row.term)&&row.name===name);assert.ok(item,name);return {file,source,sha256:hash(source),span:{start:item.start,end:item.end},text:source.slice(item.start,item.end)};}
function fixture(t,source){const path=mkdtempSync(join(tmpdir(),'router-trait-object-schema-'));mkdirSync(join(path,'src'));writeFileSync(join(path,'Cargo.toml'),manifest);writeFileSync(join(path,'Cargo.lock'),lock);writeFileSync(join(path,'src/lib.rs'),source);t.after(()=>rmSync(path,{recursive:true,force:true}));return captureSerializationContext({root:path,paths:['src/lib.rs'],compilationProfile:PRODUCTION_PROFILE});}

test('single explicit trait paths preserve complete original Syn tokens and serialized fragments',{timeout:60000},()=>{
  const originals=['src/ty.rs','src/generics.rs'].map(path=>deriveDependencySource(dependencies,'syn',path)),request=originals.map(row=>({source:row.source,language:'Rust'})),captured=observedTokens(request),expected=originals.map(row=>rustTokens(row.source));
  retain('01-complete-two-source-transaction',{originals,request,captured,expected});assert.ok(captured.result.value,captured.result.error?.message);assert.deepEqual(captured.result.value.rows.map(row=>row.tokens),expected);assert.deepEqual(captured.result.value.rows.map(row=>row.source),originals.map(row=>row.source));
  assert.equal(captured.tape.filter(row=>row.phase==='update').length,60);assert.equal(captured.tape.filter(row=>row.phase==='digest').length,60);assert.ok(captured.tape.filter(row=>row.phase==='update').every(row=>row.returnedThis));
  const selected=observedOperation(()=>compiler.sourceType('Arc<dyn Store>',{}));retain('01-complete-selected-hash-order',selected);assert.ok(selected.result.value,selected.result.error?.message);
  const updates=selected.tape.filter(row=>row.phase==='update'),digests=selected.tape.filter(row=>row.phase==='digest'),selections=selected.result.value.provenance.traitObjectSyntax.sources;
  assert.equal(updates.length,69);assert.equal(digests.length,69);
  const inputUpdate={phase:'update',input:'Arc<dyn Store>',kind:'string',args:1,returnedThis:true},inputDigest={phase:'digest',args:['hex'],value:hash('Arc<dyn Store>')};
  // Macro token-tree provenance precedes the sourceType provenance hash;
  // both finish before the private source selection transaction begins.
  assert.deepEqual(selected.tape.slice(0,4),[inputUpdate,inputDigest,inputUpdate,inputDigest]);assert.deepEqual(selected.tape.slice(4,-14),captured.tape);
  assert.deepEqual(selected.tape.slice(-14),selections.flatMap(row=>[{phase:'update',input:deriveDependencySource(dependencies,'syn',row.source).source.slice(row.span.start,row.span.end),kind:'string',args:1,returnedThis:true},{phase:'digest',args:['hex'],value:row.sha256}]));
  const rows=[];
  for(const source of ['dyn Store','dyn crate::service::Store','Arc<dyn Store>','Mutex<HashMap<Key,Arc<dyn service::Store<Value>>>>',"&'static dyn service::Store<Value>"]){
    const result=observation(()=>compiler.roundTrip(compiler.sourceType(source,{role:'independent syntax regression'})));rows.push({source,result});
    assert.ok(result.value,source);assert.equal(result.value.provenance.semanticRoundTrip,true);assert.equal(result.value.provenance.sourceSha256,hash(source));
    const proof=result.value.provenance.traitObjectSyntax;assert.equal(proof.schema,'original-single-trait-object-syntax-v1');assert.equal(proof.traitOwnerResolved,false);assert.equal(proof.generatedImplBehavior,false);assert.equal(proof.sources.length,7);
    for(const selected of proof.sources){const input=deriveDependencySource(dependencies,'syn',selected.source);assert.equal(input.sha256,selected.sourceSha256);assert.equal(hash(input.source.slice(selected.span.start,selected.span.end)),selected.sha256);}
    assert.deepEqual(proof.sourceSelection,{contract:'private-authenticated-token-batch-v1',completeOriginals:2,tokenizations:2,selectedSliceHashes:7});
    for(const selected of proof.sources){const input=deriveDependencySource(dependencies,'syn',selected.source),tokens=rustTokens(input.source.slice(selected.span.start));let depth=0,end=-1;for(const token of tokens){if(token.type!=='punct')continue;if(token.text==='{')depth++;else if(token.text==='}'&&!--depth){end=selected.span.start+token.end;break;}}assert.equal(end,selected.span.end);}
    assert.deepEqual(compiler.roundTrip(result.value).syntax,result.value.syntax);
  }
  retain('01-source-fragments',rows);
});

test('both complete original Router modules retain their actual Debug field syntax and owners',{timeout:60000},()=>{
  const rows=[];
  for(const [file,name,sha]of [['src/credential_recovery_store.rs','RecoverableCredentialStore','91af0053ff35f899efd181962f0492665e10bfab06b59e2c30b261dfabbc8f5e'],['src/refresh.rs','TokenCache','dac860972f9c160d8730146477e82177dd1e6e1da97bc2e12e45ed398fa24108']]){
    const args=original(file,name,'Debug'),result=observation(()=>proveBuiltinDeriveBangFootprint(args));rows.push({file,name,...args,result});retain('02-'+name,rows.at(-1));
    assert.equal(hash(args.source),sha);assert.ok(result.value,result.error?.message);const proof=result.value;noBehavior(proof);assert.equal(proof.source,file);assert.equal(proof.sourceSha256,sha);
    const field=proof.route.typedSource.fields.find(row=>row.typeSource.includes('dyn CredentialStore'));assert.ok(field);assert.equal(args.source.slice(field.typeSpan.start,field.typeSpan.end),field.typeSource);assert.equal(field.semanticSyntaxRoundTrip,true);
    const item=originalSourceModuleItems(args.graph.modules.find(module=>module.file===file&&!module.path.length)).find(item=>item.name===name);assert.deepEqual(proof.span,{start:item.start,end:item.end});
  }
});

test('complete original TokenCache Default retains every field without executing their traits',{timeout:60000},()=>{
  const args=original('src/refresh.rs','TokenCache','Default'),result=observation(()=>originalBuiltinDefaultBangOutput(args));retain('03-complete-original-default',{...args,result});
  assert.ok(result.value,result.error?.message);const joined=result.value;noBehavior(joined.proof);assert.equal(joined.route.runtimeAuthority,false);
  assert.equal(joined.route.typedSource.fields.length,9);const field=joined.route.typedSource.fields.find(row=>row.name==='stores');assert.equal(field.typeSource,'Mutex<HashMap<SubscriptionKey, Arc<dyn CredentialStore>>>');assert.equal(field.type.semanticSyntaxRoundTrip,true);
  assert.equal(joined.output.items[0].body.statements[0].expr.slots.fields.length,9);assert.equal(validateBuiltinDefaultAstOutput(joined.route,structuredClone(joined.output)),true);
});

test('the unchanged actual DTO declarations keep prelude layouts beside the actual opaque siblings',{timeout:60000},t=>{
  // These are explicit isolated namespace fixtures made from whole original
  // declarations. They do not assert that a copied declaration is its parent
  // module. The original complete module graphs are independently checked above.
  const recovery=declaration('src/credential_recovery_store.rs','RecoveryRecord'),store=declaration('src/credential_recovery_store.rs','RecoverableCredentialStore'),provider=declaration('src/subscription/types.rs','SubscriptionProvider'),token=declaration('src/subscription/types.rs','SubscriptionToken'),response=declaration('src/refresh.rs','RefreshResponse'),cache=declaration('src/refresh.rs','TokenCache');
  const sources=[{name:'RecoveryRecord',source:[provider.text,token.text,store.text,recovery.text].join('\n'),fields:['version','provider','baseline_fingerprint','token']},{name:'RefreshResponse',source:'use serde::Deserialize;\n'+cache.text+'\n'+response.text,fields:['access_token','refresh_token','expires_in']}];
  for(const row of sources){const context=fixture(t,row.source),direction=row.name==='RecoveryRecord'?'both':'deserialize',result=observation(()=>{const wire=serializeSerializationMeta(context,{roots:['crate::'+row.name],direction});return {wire,meta:parseSerializationMeta(wire,context)};});retain('04-'+row.name,{originals:{recovery,store,provider,token,response,cache},...row,result});assert.ok(result.value,result.error?.message);const meta=result.value.meta;assert.deepEqual(meta.types.find(type=>type.owner==='crate::'+row.name).fields.map(field=>field.name),row.fields);assert.equal(meta.runtimeAuthority,false);}
});

test('unsupported trait bounds macros binders and malformed source remain explicit refusals',{timeout:60000},()=>{
  const rows=[];
  for(const source of ['dyn pub','dyn struct','dyn crate','dyn self','dyn super','dyn Self','dyn for','dyn async','dyn gen','dyn _','dyn crate<Store>','dyn self<Store>','dyn super<Store>','dyn ::crate::Store','dyn ::self::Store','dyn ::super::Store','dyn module::pub','dyn module::crate::Store','dyn self::super::Store','dyn super::crate::Store','dyn crate::self::Store','dyn Store<pub>','dyn Store<crate>','dyn Store<module::super>','dyn','dyn dyn Store','dyn ?Store','dyn for<\'a> Store','dyn Store + Send','dyn Store + \'static','dyn \'static','dyn unknown!()','Arc<dyn unknown!()>','dyn Store<Item=Value>','dyn Fn()->u8','impl Store','dyn { injected!() }','dyn Store; inserted!()']){const result=observation(()=>compiler.sourceType(source,{}));rows.push({source,result});assert.ok(result.error,source);}
  for(const type of ['Arc<dyn pub>','Arc<dyn struct>','Arc<dyn crate>','Arc<dyn self>','Arc<dyn super>','Arc<dyn ::crate::Store>','Arc<dyn module::pub>','Arc<dyn self::super::Store>','Arc<dyn Store<pub>>','Arc<dyn unknown!()>','Arc<dyn Store + Send>','Arc<dyn for<\'a> Store>','Arc<dyn Store<Item=u8>>'])for(const owner of ['Debug','Default']){const source='#[derive('+owner+')]pub struct Record{value:'+type+'}',args=setup(source,'Record',owner),result=observation(()=>proveBuiltinDeriveBangFootprint(args));rows.push({source,result});assert.ok(result.error,source);}
  for(const type of ['dyn crate::Store','dyn self::Store','dyn super::Store','dyn super::super::Store','dyn ::external::Store','dyn module::Store<crate::Value>']){
    const source='#[derive(Default)]pub struct Record{value:Arc<'+type+'>}',result=observation(()=>proveBuiltinDeriveBangFootprint(setup(source,'Record','Default')));rows.push({source,result});assert.ok(result.value,result.error?.message);noBehavior(result.value);
  }
  let reads=0;const getter=[];Object.defineProperty(getter,'0',{enumerable:true,get(){reads++;return {source:'',language:'Rust'};}});const proxy=new Proxy([],{get(){reads++;throw Error('unexpected get');},ownKeys(){reads++;throw Error('unexpected keys');}});
  for(const input of [[],getter,proxy,[{source:'fn x(){}',language:'unknown'}],[{source:3,language:'Rust'}],[{source:'fn x(){}',language:'Rust',unknown:true}]]){const result=observation(()=>lexPrivateConcreteSources(input));rows.push({inputKind:input===getter?'getter':input===proxy?'proxy':'data',result});assert.ok(result.error);}
  assert.equal(reads,0);retain('05-complete-refusals',rows);
});

test('copied fragments changed source and unknown producers cannot manufacture namespace closure',{timeout:60000},()=>{
  const source='#[derive(Debug,Default)]pub struct Record{value:Arc<dyn Store>}',args=setup(source),proof=proveBuiltinDeriveBangFootprint(args),fragment=compiler.sourceType('Arc<dyn Store>',{}),copied=structuredClone(fragment);
  assert.throws(()=>compiler.roundTrip(copied),/checked original/);assert.throws(()=>assertBuiltinDeriveBangFootprint(structuredClone(proof),args.context,args.certificate,args.invocation));
  const changing=[{source:'pub struct First{}',language:'Rust'},{source:'pub struct Second{}',language:'Rust'}];let changed=false;const observed=observedTokens(changing,()=>{if(!changed){changed=true;changing[1].source='pub struct Changed{}';}});retain('06-late-source-mutation',{changing,observed});assert.ok(changed);assert.ok(observed.result.error);assert.ok(observed.tape.some(row=>row.phase==='update'));
  const find=Object.getOwnPropertyDescriptor(Array.prototype,'find');let escaped=null,field=null,index=-1,publicResult,privateResult;
  try{
    Object.defineProperty(Array.prototype,'find',{...find,value:function(...args){if(escaped===null&&this.includes('{')&&this.includes('}'))escaped=this;return Reflect.apply(find.value,this,args);}});
    try{rustTokens('{}');}finally{Object.defineProperty(Array.prototype,'find',find);}
    index=escaped.indexOf('{');field=Object.getOwnPropertyDescriptor(escaped,String(index));Object.defineProperty(escaped,String(index),{...field,value:'unreachable-punctuation'});
    publicResult=observation(()=>rustTokens('{}'));privateResult=observation(()=>lexPrivateConcreteSources([{source:'{}',language:'Rust'}]));
  }finally{Object.defineProperty(Array.prototype,'find',find);if(field)Object.defineProperty(escaped,String(index),field);}
  retain('06-public-table-versus-private-operation',{publicResult,privateResult});assert.ok(publicResult.error);assert.ok(privateResult.value,privateResult.error?.message);assert.deepEqual(privateResult.value.rows[0].tokens.map(row=>row.text),['{','}']);
  const other=setup(source.replace('dyn Store','dyn Other'));assert.throws(()=>assertBuiltinDeriveBangFootprint(proof,other.context,other.certificate,other.invocation));
  const rows=[];for(const text of ['use custom::Debug;'+source,'use custom::automatically_derived;'+source,source+' unknown!();',source.replace('value:','#[unknown]value:')]){const selected=setup(text),bang=createDeriveBangContext({deriveContext:selected.context});rows.push({source:text,context:selected.context,bang});assert.equal(bang.certificates.some(row=>row.dimensions.bangMacroComplete),false,text);}retain('06-forgery-and-producers',{source,proof,fragment,copied,rows});
});

test('independent checked functions execute in JS and strict TS while trait behavior stays refused',{timeout:60000},async()=>{
  const source='#[derive(Debug,Default)]pub struct Record{stores:Mutex<HashMap<Key,Arc<dyn Store>>>}pub fn accepted(value:Option<u8>)->bool{matches!(value,Some(n) if n>2)}pub fn unsupported()->Record{Record::default()}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});retain('07-independent-functions',{source,result});
  assert.equal(result.meta.bindingEvidence.scopes[0].unresolvedTypeScope,false);assert.ok(result.meta.executable.some(row=>row.name==='accepted'));assert.equal(result.meta.executable.some(row=>row.name==='unsupported'),false);assert.ok(result.meta.refused.some(row=>row.name==='unsupported'));assert.equal((result.meta.checkedGeneratedMethods??[]).some(row=>row.name==='Record.default'),false);
  const wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
  await verifyTypedTargets(result,api=>{assert.equal(api.accepted(Object.freeze({$:'None'})),false);for(const [value,want]of [[0n,false],[2n,false],[3n,true],[255n,true]])assert.equal(api.accepted(Object.freeze({$:'Some',field0:value})),want);assert.throws(()=>api.accepted({$:'Some',field0:3n}),TypeError);},{childTimeoutMs:20000});
});

test('the full original Default trait-object visitor and helper chain stays source-bound',{timeout:60000},()=>{
  const args=setup('#[derive(Default)]pub struct Record{value:Arc<dyn Store>}','Record','Default'),joined=originalBuiltinDefaultBangOutput(args),plan=builtinDefaultOriginalSourcePlan(joined.route),names=['walk_ty','visit_param_bound','walk_param_bound','visit_poly_trait_ref','walk_poly_trait_ref','visit_modifiers','visit_generic_params','visit_trait_ref','walk_trait_ref'],rows=[];
  for(const name of names){const selection=plan.visitor.recipes.find(row=>row.name===name);assert.ok(selection,name);const text=builtinVisitorFunctionText(plan.visitor.inventory,selection);rows.push({selection,text});assert.equal(selection.semanticSyntaxRoundTrip,true);assert.equal(selection.sourceSha256,'2cde31625ec47f907d6a314ae06e75711245ca79f8dc1f5bf5b44768c6dc87fd');for(const helper of plan.visitor.helperOutputs.filter(row=>row.call.functionDigest===selection.digest))assert.ok(helper.proof.digest);}
  assert.ok(rows.find(row=>row.selection.name==='walk_ty').text.includes('TyKind :: TraitObject'));assert.equal(plan.visitor.arbitraryVisitorExecution,false);noBehavior(joined.proof);retain('08-full-visitor-chain',{joined,plan,rows});
});
