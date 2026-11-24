import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {originalJsonDefaultBody,assertOriginalJsonDefaultBody,originalJsonDefaultBodyEvidence} from '../json-default-source.mjs';
import {pinnedJsonDefaultBody,parsePinnedBody,parsedPinnedBodyEvidence} from '../extensions/standard-body-source.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {createDefaultSourceContext,defaultSourceContextFacts} from '../default-trait-source.mjs';
import {originalDefaultGeneratedMethod,assertOriginalDefaultGeneratedMethod,originalDefaultGeneratedDependencyEvidence} from '../default-source-ir.mjs';
import {originalDefaultField,originalDefaultFieldFacts,originalDefaultDependencyTarget} from '../default-generated-dependencies.mjs';
import {originalBuiltinDefaultBangOutput} from '../builtin-derive-bang-footprints.mjs';
import {deriveFootprintAt} from '../derive-footprints.mjs';
import {inspectDeriveInput} from '../derive-inputs.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),inputs={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const dependencies=loadDeriveDependencyProof(inputs),jsonMacroDependencies=loadJsonMacroSourceProof(inputs),hash=value=>createHash('sha256').update(value).digest('hex');
const compile=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,jsonMacroDependencies,compilationProfile:PRODUCTION_PROFILE});
function vector(name,value){if(!process.env.ROUTER_DEFAULT_DEPENDENCY_VECTORS)return;mkdirSync(process.env.ROUTER_DEFAULT_DEPENDENCY_VECTORS,{recursive:true});writeFileSync(process.env.ROUTER_DEFAULT_DEPENDENCY_VECTORS+'/'+name+'.json.gz',gzipSync(JSON.stringify(value)));}
function setup(source){
 const captured=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}),modules=captured.views.map(sourceView=>({file:'src/lib.rs',path:sourceView.modulePath,source,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition}));
 const derive=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE}),context=createDefaultSourceContext(derive),module=defaultSourceContextFacts(context).modules[0],item=originalSourceModuleItems(module).find(row=>row.name==='Payload');return {context,module,item};
}
test('actual owned JSON Default selects complete source declaration reexport features impl and body',{timeout:5000},()=>{
 const selected=originalJsonDefaultBody(dependencies),evidence=originalJsonDefaultBodyEvidence(selected),selection=pinnedJsonDefaultBody(dependencies),parsed=parsePinnedBody(HostRustParser,selection);
 assert.strictEqual(assertOriginalJsonDefaultBody(selected,dependencies),selected);assert.equal(selected.method.ownerHeader,'implDefaultforValue');assert.deepEqual(selected.method.parameters,[]);
 assert.equal(evidence.source.source.slice(selected.method.bodySpan.start,selected.method.bodySpan.end),selected.method.bodySource);assert.equal(evidence.source.sha256,hash(evidence.source.source));
 assert.equal(selected.evidence.declaration.name,'Value');const unit=selected.evidence.declaration.unitVariants.find(row=>row.name==='Null');assert.ok(unit);assert.equal(evidence.source.source.slice(unit.span.start,unit.span.end),unit.original);assert.ok(unit.documentationAttributes.length);assert.equal(unit.attributeOwnersResolved,false);assert.equal(unit.constructorAuthority,false);assert.equal(selected.evidence.trait,null);assert.equal(selected.evidence.traitOwnerResolved,false);assert.equal(selected.evidence.featureProof.unifiedFeatureClosureVerified,true);assert.equal(selected.evidence.runtimeAuthority,false);
 assert.equal(parsed.k,'name');assert.deepEqual(parsed.path,['Value','Null']);assert.equal(parsedPinnedBodyEvidence(parsed).selection,selection);vector('actual-json-owned-source',{selected,evidence,selection,parsed});
});
test('JSON source and original parsed bodies reject cloned foreign proxy and changed carriers',{timeout:5000},()=>{
 const selected=originalJsonDefaultBody(dependencies),other=loadDeriveDependencyProof(inputs);
 for(const fake of [structuredClone(selected),{...selected},new Proxy(selected,{})]){assert.throws(()=>assertOriginalJsonDefaultBody(fake,dependencies),/copied|unsealed/);assert.throws(()=>originalJsonDefaultBodyEvidence(fake),/copied|unsealed/);}
 assert.throws(()=>assertOriginalJsonDefaultBody(selected,other),/foreign/);assert.throws(()=>originalJsonDefaultBody(structuredClone(dependencies)),/genuine/);
 const selection=pinnedJsonDefaultBody(dependencies);assert.throws(()=>parsePinnedBody(HostRustParser,structuredClone(selection)),/privately selected/);assert.throws(()=>parsePinnedBody(class extends HostRustParser{},selection),/actual privately/);
 const parsed=parsePinnedBody(HostRustParser,selection);parsed.path[1]='Bool';assert.throws(()=>parsedPinnedBodyEvidence(parsed),/differs/);vector('json-source-forgery-controls',{selected,foreignDependencyDigest:other.digest,changedParsed:parsed});
});
for(const [label,declarations,fields,golden]of [
 ['nested-record','#[derive(Default)]pub struct Child{count:u32,enabled:bool}','child:Child',{$:'Payload',child:{$:'Child',count:0n,enabled:false}}],
 ['unit-enum','#[derive(Default)]pub enum Choice{A,#[default]B}','choice:Choice',{$:'Payload',choice:{$:'B'}}],
 ['owned-child','#[derive(Default)]pub struct Child{label:String,values:Vec<u8>,maybe:Option<String>}','child:Child',{$:'Payload',child:{$:'Child',label:'',values:[],maybe:{$:'None'}}}],
])test('source-generated '+label+' Default executes ordinary checked JS and strict TS',{timeout:60000},async()=>{
 const source=declarations+'#[derive(Default)]pub struct Payload{'+fields+'}pub fn make()->Payload{Payload::default()}',result=compile(source),row=result.meta.checkedGeneratedMethods?.find(row=>row.name==='Payload.default');assert.ok(row,JSON.stringify(result.meta.refused));assert.equal(row.defaultSourceProof.schema,'original-generated-dependent-default-ir-v1');assert.equal(row.origin,'derive-invocation');assert.equal(row.term,'generated-method');assert.equal(row.generator,'core::default::Default');assert.equal(result.meta.checkedMethods.some(row=>row.name==='Payload.default'),false);vector('behavior-'+label,{source,result,golden:JSON.stringify(golden,(_,value)=>typeof value==='bigint'?value.toString()+'n':value)});
 await verifyTypedTargets(result,api=>{const first=api.make(),second=api.make();assert.deepEqual(first,golden);assert.deepEqual(second,golden);assert.notStrictEqual(first,second);assert.ok(Object.isFrozen(first));if(first.child){assert.notStrictEqual(first.child,second.child);assert.ok(Object.isFrozen(first.child));if(first.child.values){assert.notStrictEqual(first.child.values,second.child.values);assert.ok(Object.isFrozen(first.child.values));assert.throws(()=>first.child.values.push(1n),TypeError);assert.deepEqual(api.make().child.values,[]);}}},{childTimeoutMs:20000});
});
test('written external Default bodies retain trait and documentation owner refusals without executable dispatch',{timeout:60000},()=>{
 for(const [index,prefix]of ['', 'use serde_json::Value as Json;'].entries()){
  const source=prefix+'#[derive(Default)]pub struct Payload{value:'+(prefix?'Json':'serde_json::Value')+'}pub fn make()->Payload{Payload::default()}',result=compile(source),refusal=result.meta.refused.find(row=>row.name==='Payload.default');
  assert.ok(refusal);assert.match(refusal.message,/external field Default original module\/prelude\/attribute owner closure remains unproved/);assert.equal(result.meta.checkedGeneratedMethods?.some(row=>row.name==='Payload.default')??false,false);assert.equal(result.meta.executable.some(row=>row.name==='make'),false);vector('json-owner-refusal-'+index,{source,result});
 }
});
test('private field target joins original canonical nested module import and declaration',{timeout:60000},async()=>{
 const source='mod inner{#[derive(Default)]pub struct Child{pub count:u16}}use inner::Child as Renamed;#[derive(Default)]pub struct Payload{child:Renamed}pub fn make()->Payload{Payload::default()}',args=setup(source),certificate=deriveFootprintAt(defaultSourceContextFacts(args.context).deriveContext,args.module,args.item),invocation=inspectDeriveInput(args.item,PRODUCTION_PROFILE).derives.find(row=>row.path.join('::')==='Default'),joined=originalBuiltinDefaultBangOutput({context:defaultSourceContextFacts(args.context).deriveContext,certificate,invocation}),proof=originalDefaultField(args.context,args.module,joined.proof,0,HostRustParser),target=originalDefaultDependencyTarget(proof,args.context);
 assert.deepEqual(target.typePath,['crate','inner','Child']);assert.equal(target.item.term,'struct');assert.equal(target.module.path.join('::'),'inner');assert.equal(originalDefaultFieldFacts(proof,args.context).fieldType.owner,'generated');
 for(const fake of [structuredClone(proof),{...proof},new Proxy(proof,{})])assert.throws(()=>originalDefaultFieldFacts(fake,args.context),/copied|unsealed/);
 const foreign=setup(source);assert.throws(()=>originalDefaultFieldFacts(proof,foreign.context),/foreign/);assert.throws(()=>originalDefaultField(args.context,args.module,structuredClone(joined.proof),0,HostRustParser),/genuine/);assert.throws(()=>originalDefaultField(args.context,new Proxy(args.module,{}),joined.proof,0,HostRustParser),/plain original/);assert.throws(()=>originalDefaultField(args.context,args.module,joined.proof,9,HostRustParser),/index/);
 const foreignState=defaultSourceContextFacts(foreign.context),foreignCertificate=deriveFootprintAt(foreignState.deriveContext,foreign.module,foreign.item),foreignJoined=originalBuiltinDefaultBangOutput({context:foreignState.deriveContext,certificate:foreignCertificate,invocation});assert.throws(()=>originalDefaultField(args.context,args.module,foreignJoined.proof,0,HostRustParser),/original invocation/);
 let proxyReads=0;assert.throws(()=>originalDefaultField(args.context,args.module,new Proxy(joined.proof,{get(){proxyReads++;throw new Error('untrusted proof getter');}}),0,HostRustParser),/genuine/);assert.equal(proxyReads,0);assert.throws(()=>originalDefaultField(args.context,args.module,joined.proof,0,class extends HostRustParser{}),/actual original Host/);
 const surface=originalDefaultGeneratedMethod(args.context,args.module,args.item,HostRustParser),backing=originalDefaultGeneratedDependencyEvidence(surface,args.context);assert.equal(backing.dependencies.length,1);assert.equal(backing.dependencies[0].field,'child');assert.deepEqual(backing.dependencies[0].surface.ret.path,target.typePath);assert.ok(Object.isFrozen(backing.dependencies[0].surface));assert.throws(()=>originalDefaultGeneratedDependencyEvidence(structuredClone(surface),args.context),/copied/);assert.throws(()=>originalDefaultGeneratedDependencyEvidence(surface,foreign.context),/rebound/);surface.body.fields[0].value.fields[0].value.value='7';assert.throws(()=>assertOriginalDefaultGeneratedMethod(surface,args.context),/changed/);vector('private-field-target-controls',{source,proof,target,backing,changedSurface:surface});
 const result=compile(source);await verifyTypedTargets(result,api=>assert.deepEqual(api.make(),{$:'Payload',child:{$:'Child',count:0n}}),{childTimeoutMs:20000});
});
test('recursive source graph aliases manual impls custom traits helpers and unknown conditions remain refused',{timeout:60000},()=>{
 const sources=[
  '#[derive(Default)]struct Payload{value:Payload}',
  '#[derive(Default)]struct A{other:B}#[derive(Default)]struct B{other:A}#[derive(Default)]struct Payload{value:A}',
  'struct Child{value:u8}impl Default for Child{fn default()->Self{Self{value:7}}}#[derive(Default)]struct Payload{value:Child}',
  '#[derive(Default)]struct Child{value:u8}impl Default for Child{fn default()->Self{Self{value:7}}}#[derive(Default)]struct Payload{value:Child}',
  '#[derive(Default)]struct Child{value:u8}type Alias=Child;#[derive(Default)]struct Payload{value:Alias}',
  'mod serde_json{pub struct Value;}#[derive(Default)]struct Payload{value:serde_json::Value}',
  'struct Value;#[derive(Default)]struct Payload{value:Value}',
  'use custom::Value;#[derive(Default)]struct Payload{value:Value}',
  'trait Default{}#[derive(Default)]struct Child{value:u8}#[derive(Default)]struct Payload{value:Child}',
  '#[derive(Default)]struct Child{#[unknown]value:u8}#[derive(Default)]struct Payload{value:Child}',
  '#[cfg(unix)]#[derive(Default)]struct Child{value:u8}#[derive(Default)]struct Payload{value:Child}',
  '#[derive(Default)]struct Child<T>{value:T}#[derive(Default)]struct Payload{value:Child<u8>}',
 ];
 for(const [index,prefix]of sources.entries()){const source=prefix+'pub fn make()->Payload{Payload::default()}';let result;try{result=compile(source);}catch(error){vector('dependency-refusal-'+index,{source,error:{name:error.name,message:error.message,stack:error.stack}});assert.match(error.message,/unknown|unsupported|unproved|outside|scope|requires|type|generic|shadow/i);continue;}assert.equal(result.meta.checkedGeneratedMethods?.some(row=>row.name==='Payload.default')??false,false,source);assert.equal(result.meta.executable.some(row=>row.name==='make'),false,source);assert.ok(result.meta.refused.length);vector('dependency-refusal-'+index,{source,result});}
});
test('bound-free Option Vec defaults do not recurse into non-Default nominal payloads',{timeout:60000},async()=>{
 const source='pub struct NotDefault{value:u8}#[derive(Default)]pub struct Payload{maybe:Option<NotDefault>,values:Vec<NotDefault>}pub fn make()->Payload{Payload::default()}',result=compile(source);assert.ok(result.meta.checkedGeneratedMethods.some(row=>row.name==='Payload.default'));assert.equal(result.meta.checkedGeneratedMethods.find(row=>row.name==='Payload.default').defaultSourceProof.schema,'original-generated-container-default-ir-v1');vector('non-default-payload-control',{source,result});await verifyTypedTargets(result,api=>assert.deepEqual(api.make(),{$:'Payload',maybe:{$:'None'},values:[]}),{childTimeoutMs:20000});
});
