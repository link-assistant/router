import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,Hash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from '../extensions/external-trait-sources.mjs';
import {captureOriginalBuiltinNamespaceCandidate,originalBuiltinNamespaceCandidateFacts} from '../builtin-derive-namespace-candidates.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {proveBuiltinDeriveBangFootprint} from '../builtin-derive-bang-footprints.mjs';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';

const repository=new URL('../../../',import.meta.url),read=path=>readFileSync(new URL(path,repository),'utf8');
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
const hash=value=>createHash('sha256').update(value).digest('hex');
const retain=(name,value)=>{const directory=process.env.ROUTER_BUILTIN_NAMESPACE_CANDIDATE_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value)+'\n',{flag:'wx'});}};
function authored(source,name='Payload'){
 const captured=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE});
 const module={file:'src/lib.rs',path:[],source,sourceView:captured.views[0],compilationProfile:PRODUCTION_PROFILE};
 const item=originalSourceModuleItems(module).find(item=>item.name===name);
 assert.ok(item);return {module,item};
}
const options=(row,invocationIndex=0)=>({dependencies,...row,invocationIndex});
const facts=(token,input)=>originalBuiltinNamespaceCandidateFacts(token,input);
const capture=input=>{const token=captureOriginalBuiltinNamespaceCandidate(input);return {token,evidence:facts(token,input)};};

test('all eight actual original base64 invocations retain complete original source and output syntax without owner authority',{timeout:60000},()=>{
 const packageToken=captureOriginalExternalTraitPackage(dependencies,'base64'),original=originalExternalTraitPackageInputs(packageToken),sources=new Map(original.sources.map(row=>[row.path,row.source]));
 const paths=original.sources.filter(row=>row.path.endsWith('.rs')).map(row=>row.path);
 const graph=resolveModuleGraph({entry:original.crateRoot,paths,readSource:path=>sources.get(path),compilationProfile:null});
 const module=graph.modules.find(row=>row.file==='src/engine/mod.rs');assert.ok(module);
 retain('01-complete-original-package',{original,paths,graph});
 const outputs=[];
 for(const [name,count]of [['DecodePaddingMode',5],['DecodeMetadata',3]]){
  const item=originalSourceModuleItems(module).find(item=>item.name===name);assert.ok(item);
  for(let invocationIndex=0;invocationIndex<count;invocationIndex++){
   const input=options({module,item},invocationIndex),result=capture(input);outputs.push({name,...result});
   assert.equal(result.evidence.sourceSha256,hash(module.source));assert.deepEqual(result.evidence.itemSpan,{start:item.start,end:item.end});
   assert.equal(result.evidence.sourceViewDigest,module.sourceView.digest);
   for(const key of ['callerOwnerResolved','callerScopeComplete','attributeOwnersResolved','namespaceAuthority','runtimeAuthority','generatedImplBehavior'])assert.equal(result.evidence[key],false,key);
  }
 }
 retain('01-all-eight-complete-candidates',outputs);
 assert.equal(outputs.length,8);assert.deepEqual(outputs.map(row=>row.evidence.invocation.path[0]),['Clone','Copy','Debug','PartialEq','Eq','PartialEq','Eq','Debug']);
 assert.deepEqual(outputs.map(row=>row.evidence.registeredOwner.registration.callback.join('::')),['clone::expand_deriving_clone','bounds::expand_deriving_copy','debug::expand_deriving_debug','partial_eq::expand_deriving_partial_eq','eq::expand_deriving_eq','partial_eq::expand_deriving_partial_eq','eq::expand_deriving_eq','debug::expand_deriving_debug']);
 assert.equal(module.configurationCondition,'unknown','no_std/conditional documentation still retains its genuine original boundary');
});

test('complete authored candidate order is the original invocation order rather than a familiar-name registry grant',{timeout:60000},()=>{
 const row=authored('#[derive(Eq,PartialEq,Debug,Copy,Clone)]pub struct Payload{first:u8,second:Option<usize>}'),results=[];
 for(let index=0;index<5;index++)results.push(capture(options(row,index)));
 retain('02-authored-complete-order',{row,results});
 assert.deepEqual(results.map(result=>result.evidence.registeredOwner.name),['Eq','PartialEq','Debug','Copy','Clone']);
 assert.deepEqual(results.map(result=>Object.keys(result.token)),Array.from({length:5},()=>['schema']));
 const debug=results[2].evidence.syntax;assert.deepEqual(debug.typedSource.fields.map(field=>field.name),['first','second']);
 const copy=results[3].evidence.syntax;assert.equal(copy.branches[0].associatedItems,0);assert.equal(copy.positiveSchema.length,2);
 assert.equal(results[1].evidence.syntax.implementations.length,2);
});

test('copied private dependencies items views or candidate flags cannot substitute for the original occurrence',()=>{
 const row=authored('#[derive(Copy)]pub struct Payload{value:u8}'),input=options(row),result=capture(input);
 for(const token of [null,{},structuredClone(result.token),{...result.token,namespaceAuthority:true}])assert.throws(()=>facts(token,input),/copied or foreign/);
 for(const dependencies of [{},structuredClone(input.dependencies)])assert.throws(()=>captureOriginalBuiltinNamespaceCandidate({...input,dependencies}),/genuine dependency/);
 assert.throws(()=>captureOriginalBuiltinNamespaceCandidate({...input,item:structuredClone(row.item)}),/exact issued original item/);
 assert.throws(()=>captureOriginalBuiltinNamespaceCandidate({...input,module:{...row.module,sourceView:structuredClone(row.module.sourceView)}}),/genuine original source view/);
 const other=authored(row.module.source);assert.throws(()=>facts(result.token,options(other)),/changed/);
 retain('03-private-origin-controls',{row,result,other});
});

test('whole source module path profile and actual invocation are freshly rejoined on every candidate access',()=>{
 const row=authored('#[derive(Copy,Debug)]pub struct Payload{value:u8}'),input=options(row),result=capture(input);
 for(const module of [{...row.module,source:row.module.source+' '},{...row.module,file:'src/foreign.rs'},{...row.module,path:['foreign']},{...row.module,compilationProfile:null}])assert.throws(()=>facts(result.token,{...input,module}));
 assert.throws(()=>facts(result.token,{...input,invocationIndex:1}),/changed/);
 for(const invocationIndex of [-1,0.5,NaN,Infinity,'0',2])assert.throws(()=>captureOriginalBuiltinNamespaceCandidate({...input,invocationIndex}));
 const hole=[];hole.length=1;hole.extra='same key count';assert.throws(()=>captureOriginalBuiltinNamespaceCandidate({...input,module:{...row.module,path:hole}}));
 assert.equal(facts(result.token,input),result.evidence);retain('04-fresh-original-joins',{row,result});
});

test('proxy accessor and copied span ingress cannot invoke hostile metadata or obtain an owned output',()=>{
 const row=authored('#[derive(Copy)]pub struct Payload{value:u8}');let callbacks=0;
 const getter=Object.defineProperty({...options(row)},'module',{get(){callbacks++;throw Error('getter');}}),proxy=new Proxy(row.module,{get(){callbacks++;throw Error('proxy');},getOwnPropertyDescriptor(){callbacks++;throw Error('descriptor');}});
 assert.throws(()=>captureOriginalBuiltinNamespaceCandidate(getter));
 assert.throws(()=>captureOriginalBuiltinNamespaceCandidate(options({...row,module:proxy})));
 const itemGetter=Object.defineProperty({},'start',{get(){callbacks++;throw Error('item getter');}});assert.throws(()=>captureOriginalBuiltinNamespaceCandidate(options({...row,item:itemGetter})),/exact issued original item/);
 assert.equal(callbacks,0);retain('05-hostile-ingress',{callbacks,row});
});

test('unsupported owners helpers conditional layout and hidden macro/type output inputs retain their grammar refusals',()=>{
 const sources=['#[derive(Ord)]pub struct Payload{value:u8}','#[derive(core::marker::Copy)]pub struct Payload{value:u8}','#[derive(Copy)]pub struct Payload<T>{value:T}','#[derive(Copy)]pub struct Payload(u8);','#[derive(Copy)]#[cfg_attr(unknown,doc="x")]pub struct Payload{value:u8}','#[derive(Copy)]pub struct Payload{value:expand!()}','#[derive(Copy)]#[foreign]pub struct Payload{value:u8}'],outputs=[];
 for(const source of sources){const row=authored(source);let error;assert.throws(()=>{try{captureOriginalBuiltinNamespaceCandidate(options(row));}catch(cause){error={name:cause.name,message:cause.message};throw cause;}},TypeError);outputs.push({source,error});}
 retain('06-complete-refused-inputs',outputs);assert.equal(outputs.length,sources.length);
});

test('complete pre-factor and current owned output leaves preserve full proof bytes and crypto callbacks',{timeout:60000},async t=>{
 const fixture=new URL('./fixtures/builtin-derive-namespace-candidates/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8')),original=readFileSync(new URL('builtin-derive-bang-footprints.mjs.original.txt',fixture),'utf8');
 assert.equal(Buffer.byteLength(original),manifest.bytes);assert.equal(hash(original),manifest.sha256);
 const actualUrl=new URL('../builtin-derive-bang-footprints.mjs',import.meta.url),relocated=original.replace(/from (['"])(\.\/[^'"]+)\1/g,(_whole,quote,specifier)=>'from '+quote+new URL(specifier,actualUrl).href+quote);
 const directory=mkdtempSync(join(tmpdir(),'router-complete-builtin-original-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const path=join(directory,'builtin-derive-bang-footprints.mjs');writeFileSync(path,relocated,{flag:'wx'});
 const old=await import(pathToFileURL(path).href),row=authored('#[derive(Copy)]pub struct Payload{value:u8}'),context=createDeriveFootprintContext({modules:[row.module],dependencies,compilationProfile:PRODUCTION_PROFILE}),certificate=context.certificates[0];assert.ok(certificate);
 const invocation=certificate.attributes.filter(attribute=>attribute.name==='derive').flatMap(attribute=>attribute.derives.map(path=>({path,attributeSpan:attribute.span})))[0];
 const sharedIssuerWarmup={old:old.proveBuiltinDeriveBangFootprint({context,certificate,invocation}),current:proveBuiltinDeriveBangFootprint({context,certificate,invocation})};
 assert.equal(JSON.stringify(sharedIssuerWarmup.old),JSON.stringify(sharedIssuerWarmup.current));
 const descriptor=Object.getOwnPropertyDescriptor(Hash.prototype,'update');
 function observed(run){const tape=[];try{Object.defineProperty(Hash.prototype,'update',{...descriptor,value:function(value,...rest){tape.push({value:typeof value==='string'?value:Buffer.from(value).toString('base64'),type:typeof value,rest});return Reflect.apply(descriptor.value,this,[value,...rest]);}});return {proof:run({context,certificate,invocation}),tape};}finally{Object.defineProperty(Hash.prototype,'update',descriptor);}}
 const before=observed(old.proveBuiltinDeriveBangFootprint),after=observed(proveBuiltinDeriveBangFootprint);retain('07-whole-original-current-output',{original,relocated,manifest,row,context,sharedIssuerWarmup,before,after});
 assert.equal(JSON.stringify(after.proof),JSON.stringify(before.proof));assert.deepEqual(after.tape,before.tape);assert.ok(after.tape.length);
});

test('the shared Copy grammar factoring preserves complete authored checked meta JavaScript and strict TypeScript',{timeout:60000},async()=>{
 const source='#[derive(Clone,Copy,Debug,PartialEq,Eq)]pub enum Mode{First,Second}pub fn bounded(value:u8)->u8{value+1}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
 retain('08-whole-authored-translation',{source,result});assert.equal(result.meta.executable.some(row=>row.name==='bounded'),true);const observations=[];
 try{await verifyTypedTargets(result,api=>{for(const input of [0n,127n,254n]){const actual=api.bounded(input);assert.equal(actual,input+1n);observations.push({input:String(input),actual:String(actual)});}assert.throws(()=>api.bounded(255n),RangeError);assert.throws(()=>api.bounded(-1n),RangeError);},{childTimeoutMs:20000});}finally{retain('08-complete-target-observations',observations);}
 assert.equal(observations.length,6);
});
