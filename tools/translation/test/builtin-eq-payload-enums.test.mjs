import {repositorySourcePath} from "./fixtures/repository-paths.mjs";
import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {builtinPayloadDataInputs,builtinDeriveDataInputs} from '../builtin-derive-data-inputs.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {proveBuiltinDeriveBangFootprint,isBuiltinDeriveBangFootprint,assertBuiltinDeriveBangFootprint,originalBuiltinDeriveEnclosingOutput} from '../builtin-derive-bang-footprints.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction,astFragmentText} from '../builtin-derive-ast-meta.mjs';
import {liftBuiltinEqAstRoute} from '../builtin-eq-ast-route.mjs';
import {PRODUCTION_PROFILE,compilationProfile} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {originalPayloadDeriveSelection} from './original-payload-derive-context.mjs';

const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
function read(path){try{return readFileSync(repositorySourceURL(path,root),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;return execFileSync('git',['show','HEAD:'+repositorySourcePath(path,root)],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});}}
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
function retain(name,value){const directory=process.env.ROUTER_EQ_PAYLOAD_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value),{flag:'wx'});}}
function setup(source,{name='Payload',file='src/lib.rs',profile=PRODUCTION_PROFILE}={}){const context=createDeriveFootprintContext({modules:[{file,path:[],source}],dependencies,compilationProfile:profile}),certificate=context.certificates.find(row=>row.name===name),attribute=certificate?.attributes.find(row=>row.derives?.some(path=>path.join('::')==='Eq'));return {context,certificate,invocation:attribute&&{path:['Eq'],attributeSpan:attribute.span}};}
let issued=0;
function prove(source,options){const args=setup(source,options);let proof;try{proof=proveBuiltinDeriveBangFootprint(args);}catch(error){retain('issued-'+ ++issued,{source,options:options??null,error:{name:error.name,message:error.message}});throw error;}retain('issued-'+ ++issued,{source,options:options??null,proof});return {args,proof};}
function outcome(callback){try{return {value:callback()};}catch(error){return {error:{name:error.name,message:error.message}};}}
const source='#[derive(Eq)]pub enum Payload{Empty,Tuple(u8,String,u8),Named{left:Vec<String>,right:bool}}';

test('static Eq traversal retains every original tuple and named field without generating runtime assertions',{timeout:20000},()=>{
 const {args,proof}=prove(source),route=proof.route,typed=route.typedSource;
 assert.equal(typed.inputStyle,'payload-enum');assert.deepEqual(typed.fields.map(row=>[row.variant,row.variantIndex,row.fieldIndex,row.name]),[['Tuple',1,0,'0'],['Tuple',1,1,'1'],['Tuple',1,2,'2'],['Named',2,0,'left'],['Named',2,1,'right']]);
 assert.deepEqual(typed.fields.map(row=>source.slice(row.span.start,row.span.end)),['u8','String','u8','Vec<String>','bool']);assert.ok(typed.fields.every(row=>row.semanticSyntaxRoundTrip));assert.deepEqual(typed.variants.map(row=>[row.name,row.style,row.fields.length]),[['Empty','unit',0],['Tuple','tuple',3],['Named','named',2]]);
 assert.deepEqual(typed.assertionCount,{minimum:1,maximum:5});assert.equal(route.constructionFlow.statement.kind,'LocalKind::Decl');assert.equal(route.constructionFlow.statement.initializerCount,0);assert.equal(route.constructionFlow.associatedItem.methods,1);assert.equal(proof.selectedOwnerBangComplete,true);assert.equal(proof.generatedImplBehavior,false);
 const callback=route.recipes.find(row=>row.digest===route.constructionFlow.sourceCallback),text=astFragmentText(callback);for(const flow of ['for variant in &enum_def.variants','for field in variant.fields()','let mut seen_type_names = FxHashSet::default()','field.ty.clone()'])assert.ok(text.includes(flow));
 assert.equal(originalBuiltinDeriveEnclosingOutput(proof,args.context,args.certificate,args.invocation).sink.kind,'ItemKind::Impl');assert.equal(typed.namespaceAuthority,false);assert.throws(()=>typed.variants[1].fields.pop(),TypeError);
});

test('empty layouts, repeated simple types and the complete 128-field budget preserve type-only branches',{timeout:60000},()=>{
 for(const variants of ['Unit,Tuple(),Named{}','Tuple(u8)','Tuple('+Array.from({length:64},()=> 'u8').join(',')+'),Named{'+Array.from({length:64},(_,i)=>'v'+i+':u8').join(',')+'}']){
  const original='#[derive(Eq)]pub enum Payload{'+variants+'}',{proof}=prove(original),typed=proof.route.typedSource,count=variants.includes('v63')?128:variants==='Tuple(u8)'?1:0;assert.equal(typed.fields.length,count);assert.deepEqual(typed.assertionCount,{minimum:count?1:0,maximum:count});assert.equal(proof.route.constructionFlow.statement.initializerCount,0);
 }
 const invalid='#[derive(Eq)]pub enum Payload{V('+Array.from({length:129},()=> 'u8').join(',')+')}';assert.throws(()=>prove(invalid),/budget/);
});

test('actual complete affinity and subscription sources retain every private Eq payload owner',{timeout:60000},()=>{
 for(const [file,name,digest,variants,count]of [['src/response_affinity.rs','AffinityDestination','e8aa97145a2df74e399c3c1bc648075f0b72266ed2def6dcc6e17291579dbf41',['StoredProvider','Subscription'],7],['src/subscription.rs','InstallDocumentResult','e0949d81ba1a62586fd99dc79fb3e889346bc2fb60e17aa5e3e30f252018ce28',['Installed','AlreadyPresent'],2]]){
  const original=read(file);assert.equal(hash(original),digest);const args=originalPayloadDeriveSelection({file,name,owner:'Eq'}),proof=proveBuiltinDeriveBangFootprint(args);retain('complete-original-'+name,{source:original,args,proof});assert.equal(proof.source,file);assert.equal(proof.sourceSha256,digest);assert.deepEqual(proof.route.typedSource.variants.map(row=>row.name),variants);assert.equal(proof.route.typedSource.fields.length,count);assert.ok(proof.route.typedSource.fields.every(row=>row.semanticSyntaxRoundTrip));assert.equal(originalBuiltinDeriveEnclosingOutput(proof,args.context,args.certificate,args.invocation).proof.generatedImplBehavior,false);
 }
});

test('generic, conditional, macro-bearing, discriminant and foreign owner inputs retain independent refusals',{timeout:20000},()=>{
 const sources=['#[derive(Eq)]pub enum Payload<T>{V(T)}','#[derive(Eq)]pub enum Payload{V(u8)=1}','#[derive(Eq)]pub enum Payload{V(generated!())}','#[derive(Eq)]pub enum Payload{V(#[cfg(flag)]u8)}','#[derive(Eq)]pub enum Payload{#[cfg_attr(flag,unknown)]V(u8)}','#[derive(Eq)]pub enum Payload{V{#[unknown]v:u8}}','#[derive(Eq)]pub enum Payload{V([u8;{injected!()}])}','use custom::Eq;'+source,'inject!();'+source];
 const results=sources.map(original=>({source:original,result:outcome(()=>prove(original))}));retain('complete-refusals',results);for(const row of results)assert.equal(row.result.error?.name,'TypeError',row.source);
 assert.throws(()=>builtinDeriveDataInputs({source,span:{start:0,end:source.length}}),/payload/);
});

test('copied, stale and field-substituted candidates never replace original private Eq joins',{timeout:20000},()=>{
 const {args,proof}=prove(source),profile=builtinDeriveAstSourceProfile(dependencies),entry=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/cmp/eq.rs','expand_deriving_eq'),input=builtinPayloadDataInputs({source,span:args.certificate.span}),original={dependencies,module:{source}};
 for(const fake of [structuredClone(proof),Object.freeze(structuredClone(proof))]){assert.equal(isBuiltinDeriveBangFootprint(fake),false);assert.throws(()=>assertBuiltinDeriveBangFootprint(fake,args.context,args.certificate,args.invocation),TypeError);}
 const stale=setup(source+' '),foreign=setup(source,{profile:compilationProfile({flags:{test:true}})});for(const change of [{certificate:structuredClone(args.certificate)},{context:structuredClone(args.context)},{context:stale.context},{context:foreign.context},{invocation:{path:['Eq'],attributeSpan:{start:0,end:1}}}])assert.throws(()=>proveBuiltinDeriveBangFootprint({...args,...change}),TypeError);
 const changed=[{...input,variants:input.variants.slice(1)},{...input,variants:input.variants.map((variant,index)=>index===1?{...variant,fields:variant.fields.map(field=>({...field,typeSpan:{start:0,end:1}}))}:variant)},{...input,fields:[{name:'injected',typeSpan:{start:0,end:1}}]}];retain('complete-field-substitutions',{source,input,changed});for(const candidate of changed)assert.throws(()=>liftBuiltinEqAstRoute({profile,entry,original,certificate:args.certificate,input:candidate}),/complete source fields/);
 assert.throws(()=>liftBuiltinEqAstRoute({profile:structuredClone(profile),entry,original,certificate:args.certificate,input}),/Unsealed/);assert.equal(proveBuiltinDeriveBangFootprint({...args,input:{fields:[]}}).route.typedSource.fields.length,5);
});

test('payload syntax ingress refuses getters and proxies without invoking callbacks',{timeout:5000},()=>{
 let callbacks=0;const span={start:0,end:source.length};for(const input of [{get source(){callbacks++;return source;},span},new Proxy({source,span},{get(){callbacks++;throw Error('unexpected');},getOwnPropertyDescriptor(){callbacks++;throw Error('unexpected');}}),{source,span:{get start(){callbacks++;return 0;},end:source.length}}])assert.throws(()=>builtinPayloadDataInputs(input),TypeError);assert.equal(callbacks,0);retain('ingress',{source,callbacks});
});

test('independent JavaScript and strict TypeScript execute without admitting generated Eq behavior',{timeout:60000},async()=>{
 const original=source.replace('#[derive(Eq)]','#[derive(Debug,Eq)]')+'pub fn accepted(value:Option<u8>)->bool{matches!(value,Some(n) if n>2)}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>original,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});retain('complete-independent-program',{source:original,result});assert.ok(result.meta.executable.some(row=>row.name==='accepted'));assert.equal(result.meta.checkedMethods.some(row=>row.name.endsWith('.assert_receiver_is_total_eq')),false);assert.equal(result.meta.runtimeParity,false);
 await verifyTypedTargets(result,api=>{assert.equal(api.accepted(Object.freeze({$:'None'})),false);for(const [field0,wanted]of [[0n,false],[2n,false],[3n,true],[255n,true]])assert.equal(api.accepted(Object.freeze({$:'Some',field0})),wanted);assert.throws(()=>api.accepted(Object.freeze({$:'Some',field0:256n})),TypeError);},{childTimeoutMs:20000});
});
