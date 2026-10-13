import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {builtinDeriveDataInputs} from '../builtin-derive-data-inputs.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {proveBuiltinDeriveBangFootprint,isBuiltinDeriveBangFootprint,assertBuiltinDeriveBangFootprint} from '../builtin-derive-bang-footprints.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction} from '../builtin-derive-ast-meta.mjs';
import {liftBuiltinEqAstRoute} from '../builtin-eq-ast-route.mjs';
import {createDeriveBangContext} from '../derive-bang-context.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE,compilationProfile} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
const candidate=source=>builtinDeriveDataInputs({source,span:{start:0,end:source.length}});
function setup(source,profile=PRODUCTION_PROFILE){const modules=[{file:'src/lib.rs',path:[],source}],context=createDeriveFootprintContext({modules,dependencies,compilationProfile:profile}),certificate=context.certificates[0],attribute=certificate?.attributes.find(a=>a.derives?.some(p=>p.join('::')==='Eq'));return {modules,context,certificate,invocation:attribute&&{path:['Eq'],attributeSpan:attribute.span}};}
const joined=source=>{const args=setup(source);return createDeriveBangContext({deriveContext:args.context});};
test('pure input candidates preserve complete type spans and docs without issuing authority',()=>{
 const source='#[derive(Eq)]pub struct Record{/// λ😀\n#[serde(default)]pub value:Vec<Option<String>>,other:Vec<Option<String>>}',input=candidate(source);
 assert.equal(input.fields.length,2);for(const field of input.fields)assert.equal(source.slice(field.typeSpan.start,field.typeSpan.end),'Vec<Option<String>>');
 assert.equal(input.attributes.find(a=>a.name==='doc').sourceFeature,'original-line-doc-comment');assert.equal(input.attributes.find(a=>a.name==='serde').source,'#[serde(default)]');
 for(const key of ['namespaceAuthority','ownerAuthority','copyAuthority','noDropAuthority','generatedImplBehavior'])assert.equal(input[key],false);
 assert.equal(isBuiltinDeriveBangFootprint(input),false);assert.equal(isBuiltinDeriveBangFootprint(Object.freeze(structuredClone(input))),false);assert.throws(()=>input.fields.pop(),TypeError);
});
test('pure source inputs never execute accessors or proxies',()=>{
 let calls=0;for(const options of [{get source(){calls++;return 'struct P;';},span:{start:0,end:9}},new Proxy({source:'struct P;',span:{start:0,end:9}},{get(){calls++;}}),{source:'struct P;',span:{get start(){calls++;return 0;},end:9}}])assert.throws(()=>builtinDeriveDataInputs(options),/own data|accessor/);assert.equal(calls,0);
 for(const span of [{start:-1,end:9},{start:0,end:8},{start:0,end:10}])assert.throws(()=>builtinDeriveDataInputs({source:'struct P;',span}));
});
test('generic cfg unions macro types defaults and enum payloads/discriminants remain outside Eq syntax',()=>{
 for(const source of ['struct P<T>{v:T}','struct P where P:Other{v:u8}','#[cfg(flag)]struct P{v:u8}','union P{v:u8}','struct P{#[cfg(flag)]v:u8}','struct P{v:generated!()}','struct P{v:[u8;generated!()]}','struct P{v:u8=1}','enum P{A=1,B}','enum P{A(u8)}','struct P(u8);','struct P{v:u8,v:u16}','enum P{}'])assert.throws(()=>candidate(source),undefined,source);
});
test('Eq independently joins real default and callback-bearing serde helper registrations',()=>{
 for(const source of ['#[derive(Eq,Default,serde::Serialize)]pub enum P{On,#[default]Off}','#[derive(Eq,serde::Serialize)]pub struct P{/// actual docs\n#[serde(default,skip_serializing_if="Vec::is_empty")]v:Vec<String>}']){
  const proof=proveBuiltinDeriveBangFootprint(setup(source));assert.equal(proof.originalHelperOwners.length,1);assert.ok(proof.originalHelperOwners[0].exactNestedHelperInert);assert.equal(proof.slotProofs.outputKind.initializerCount,0);assert.deepEqual(proof.slotProofs.constness.outcomes,['Const::Yes','Const::No']);
  assert.equal(proof.copyAuthority,false);assert.equal(proof.noDropAuthority,false);assert.equal(proof.constAuthority,false);assert.equal(proof.generatedImplBehavior,false);
 }
});
test('shadow foreign unknown ancestor inactive helpers and macro insertions cannot obtain Eq closure',()=>{
 const valid='#[derive(Eq,Default,serde::Serialize)]pub enum P{On,#[default]Off}';
 for(const source of ['use custom::Eq;'+valid,'use custom::default;'+valid,'use custom::Default;'+valid,'use custom::doc;#[derive(Eq)]pub struct P{/// doc\nv:u8}','use custom::serde;#[derive(Eq,serde::Serialize)]pub struct P{#[serde(default)]v:u8}','#[unknown]mod ancestor{'+valid+'}',valid+'unknown!();','#[cfg(test)]'+valid,valid.replace('#[default]','#[default(value)]'),'#[derive(Eq)]pub struct P{#[unknown]v:u8}','#[derive(Eq)]pub struct P{#[serde(default)]v:u8}']){
  const output=joined(source);assert.equal(output.certificates.some(c=>c.selectedOwners.some(o=>o.target.join('::')==='core::Eq')),false,source);
 }
});
test('private source/caller/invocation joins reject copies foreign sources profiles and getters',()=>{
 const source='#[derive(Eq,serde::Serialize)]pub struct P{v:String}',args=setup(source),proof=proveBuiltinDeriveBangFootprint(args);
 for(const fake of [structuredClone(proof),Object.freeze(structuredClone(proof))]){assert.equal(isBuiltinDeriveBangFootprint(fake),false);assert.throws(()=>assertBuiltinDeriveBangFootprint(fake,args.context,args.certificate,args.invocation),/original invocation/);}
 for(const replacement of [{certificate:structuredClone(args.certificate)},{context:structuredClone(args.context)},{context:setup(source+' ').context},{context:setup(source,compilationProfile({flags:{test:true}})).context},{invocation:{path:['Eq'],attributeSpan:{start:1,end:2}}}])assert.throws(()=>proveBuiltinDeriveBangFootprint({...args,...replacement}));
 let calls=0;assert.throws(()=>proveBuiltinDeriveBangFootprint({...args,certificate:{get attributes(){calls++;return args.certificate.attributes;}}}));assert.equal(calls,0);
 const fake=candidate(source);assert.equal(proveBuiltinDeriveBangFootprint({...args,input:{...fake,fields:[]}}).route.typedSource.fields.length,1,'public candidate arguments cannot replace the actual original issuer read');
});
test('mutated copied compiler body/item/macro recipes cannot replace the privately pinned AST entry',()=>{
 const source='#[derive(Eq)]pub struct P{v:u8}',args=setup(source),profile=builtinDeriveAstSourceProfile(dependencies),entry=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/cmp/eq.rs','expand_deriving_eq'),input=candidate(source),original={dependencies,module:{source}};
 for(const mutation of [entry.syntax.slice(1),[...entry.syntax,{kind:'token',text:'macro_rules!',type:'ident'}],[]])assert.throws(()=>liftBuiltinEqAstRoute({profile,original,certificate:args.certificate,input,entry:{...structuredClone(entry),syntax:mutation}}),/Unsealed/);
 assert.throws(()=>liftBuiltinEqAstRoute({profile:structuredClone(profile),original,certificate:args.certificate,input,entry}),/Unsealed/);
});
test('fresh process rejects serialized output authority and reconstructs it only from original inputs',()=>{
 const source='#[derive(Eq,Default,serde::Serialize)]pub enum P{On,#[default]Off}',proof=proveBuiltinDeriveBangFootprint(setup(source));
 const script=`import{readFileSync}from'node:fs';import{loadDeriveDependencyProof}from${JSON.stringify(new URL('../derive-dependencies.mjs',import.meta.url).href)};import{createDeriveFootprintContext}from${JSON.stringify(new URL('../derive-footprints.mjs',import.meta.url).href)};import{proveBuiltinDeriveBangFootprint,isBuiltinDeriveBangFootprint}from${JSON.stringify(new URL('../builtin-derive-bang-footprints.mjs',import.meta.url).href)};import{PRODUCTION_PROFILE}from${JSON.stringify(new URL('../cfg-profile.mjs',import.meta.url).href)};const {fake,source}=JSON.parse(readFileSync(0,'utf8'));if(isBuiltinDeriveBangFootprint(fake)||isBuiltinDeriveBangFootprint(Object.freeze(fake)))throw Error('public authority');const dependencies=loadDeriveDependencyProof({manifest:readFileSync(${JSON.stringify(new URL('Cargo.toml',root).pathname)},'utf8'),lock:readFileSync(${JSON.stringify(new URL('Cargo.lock',root).pathname)},'utf8')}),context=createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source}],dependencies,compilationProfile:PRODUCTION_PROFILE}),certificate=context.certificates[0],attribute=certificate.attributes.find(a=>a.derives?.some(p=>p[0]==='Eq')),proof=proveBuiltinDeriveBangFootprint({context,certificate,invocation:{path:['Eq'],attributeSpan:attribute.span}});if(!isBuiltinDeriveBangFootprint(proof)||proof.itemSha256!==fake.itemSha256)throw Error('source reconstruction');console.log('genuine');`;
 assert.equal(execFileSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',timeout:10000,input:JSON.stringify({source,fake:proof})}).trim(),'genuine');
});
test('Eq helper/type-only namespace joins retain ordinary independently checked JS and strict TS behavior',{timeout:60000},async()=>{
 for(const prefix of ['#[derive(Eq,serde::Serialize)]pub enum P{#[serde(rename="λ😀#[macro_export]")]A,B}','#[derive(Eq,serde::Serialize)]pub struct P{/// actual doc\n#[serde(rename="λ😀")]v:u8}']){
  const source=prefix+'pub fn accepted(v:Option<u8>)->bool{matches!(v,Some(n) if n>2)}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});assert.ok(result.meta.executable.some(r=>r.name==='accepted'));
  await verifyTypedTargets(result,api=>{assert.equal(api.accepted(Object.freeze({$:'None'})),false);for(const [n,want]of [[0n,false],[2n,false],[3n,true],[255n,true]])assert.equal(api.accepted(Object.freeze({$:'Some',field0:n})),want);assert.throws(()=>api.accepted({$:'Some',field0:3n}),TypeError);assert.throws(()=>api.accepted(Object.freeze({$:'Some',field0:256n})),TypeError);},{childTimeoutMs:20000});
 }
});
