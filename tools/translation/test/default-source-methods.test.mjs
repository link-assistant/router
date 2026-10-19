import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {createDefaultSourceContext,defaultSourceContextFacts} from '../default-trait-source.mjs';
import {originalDefaultGeneratedMethod,assertOriginalDefaultGeneratedMethod} from '../default-source-ir.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {extractImplDeclarations,proveDefaultMethodAdmission,lowerDefaultMethodTokens} from '../impl-resolver.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock});
const compile=(source,entry='src/lib.rs')=>translateProject({entry,paths:[entry],readSource:()=>source,cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
function alias(result,type,name='originalDefault'){
  const program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),entries=[...program.declarations.values()].filter(item=>item.impl?.method==='default'),entry=entries.length===1?entries[0]:entries.find(item=>item.impl.defaultSourceProof?.typePath?.at(-1)===type);
  assert.ok(entry,type);return {...result,javascript:result.javascript+`\nexport {${entry.fullName} as ${name}};`,typescript:result.typescript+`\nexport {${entry.fullName} as ${name}};`};
}
function setup(source){const captured=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}),modules=captured.views.map(sourceView=>({file:'src/lib.rs',path:sourceView.modulePath,source,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition})),derive=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE}),context=createDefaultSourceContext(derive);return {context,module:defaultSourceContextFacts(context).modules[0]};}

for(const types of [['u8'],['u16','bool','i16'],['u32','i32','u64','bool','i64'],['usize','isize','i8','bool','u8']]) {
  test('actual generated primitive field Default '+types.join('/')+' executes checked IR in JS and strict TS',async()=>{
    const count=types.length,fields=types.map((type,index)=>`field_${index}:${type}`).join(','),result=compile(`#[derive(Default)] struct Payload{${fields}} pub fn make()->Payload{Payload::default()}`);
    assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.checkedGeneratedMethods[0].name,'Payload.default');
    await verifyTypedTargets(result,api=>{const value=api.make();assert.equal(value.$,'Payload');for(let index=0;index<count;index++)assert.equal(value['field_'+index],types[index]==='bool'?false:0n);assert.notStrictEqual(api.make(),value);},{childTimeoutMs:30000});
  });
}
test('actual manual static Default body and ordinary static dispatch preserve custom values',async()=>{
  for(const trait of ['Default','core::default::Default','std::default::Default']){
    const result=compile(`struct Payload{flag:bool,value:u32} impl ${trait} for Payload{fn default()->Self{Self{flag:true,value:17}}} pub fn make()->Payload{Payload::default()}`);
    assert.deepEqual(result.meta.refused,[]);await verifyTypedTargets(result,api=>assert.deepEqual(api.make(),{$:'Payload',flag:true,value:17n}),{childTimeoutMs:30000});
  }
});
for(const [file,type,golden]of [['src/management_config.rs','ManagementConfig',{$:'ManagementConfig',allow_remote:false,lockout_failures:5n,lockout_secs:1800n,exempt_loopback:true}],['src/emergency_auth.rs','EmergencyAuthConfig',{$:'EmergencyAuthConfig',enabled:false,allow_non_loopback:false,duration_minutes:60n}]])test('complete unchanged '+file+' original Default body executes without a Rust wrapper',async()=>{
  const source=readFileSync(repositorySourceURL(file,root),'utf8'),result=alias(compile(source,file),type);assert.ok(result.meta.checkedMethods.some(method=>method.name===type+'.default'));assert.equal(result.meta.runtimeParity,false);
  await verifyTypedTargets(result,(_api,_result,module)=>{assert.deepEqual(module.originalDefault(),golden);assert.notStrictEqual(module.originalDefault(),module.originalDefault());},{childTimeoutMs:30000});
});
test('complete unchanged EmergencyArgs derived Default duration is zero while Clap source default remains sixty',async()=>{
  const file='src/cli/emergency_args.rs',source=readFileSync(repositorySourceURL(file,root),'utf8'),result=alias(compile(source,file),'EmergencyArgs');
  assert.ok(source.includes('default_value_t = DEFAULT_DURATION_MINUTES'));assert.ok(result.meta.checkedGeneratedMethods.some(method=>method.name==='EmergencyArgs.default'));assert.equal(result.meta.checkedMethods.length,0);assert.equal(result.checkedMethodDeclarations.length,0);assert.equal(result.checkedGeneratedMethodDeclarations[0].term,'generated-method');assert.equal(result.checkedGeneratedMethodDeclarations[0].originalDeclarationTerm,'struct');assert.equal(result.meta.deriveNamespaceFootprints.certificates[0].generatedImplBehavior,false);
  await verifyTypedTargets(result,(_api,_result,module)=>assert.deepEqual(module.originalDefault(),{$:'EmergencyArgs',emergency_accept_any_token:false,emergency_allow_non_loopback:false,emergency_duration_minutes:0n}),{childTimeoutMs:30000});
});
test('private original generated AST and manual member proofs reject copied changed and rebound values',()=>{
  const {context,module}=setup('#[derive(Default)] struct Payload{value:u32}'),item=originalSourceModuleItems(module).find(item=>item.term==='struct'),surface=originalDefaultGeneratedMethod(context,module,item,HostRustParser);
  assert.strictEqual(assertOriginalDefaultGeneratedMethod(surface,context),surface);assert.throws(()=>assertOriginalDefaultGeneratedMethod(structuredClone(surface),context),/copied/);assert.throws(()=>originalDefaultGeneratedMethod(structuredClone(context),module,item,HostRustParser),/unsealed/);assert.throws(()=>originalDefaultGeneratedMethod(context,{...module,source:module.source+' '},item,HostRustParser),/differs/);
  assert.throws(()=>originalDefaultGeneratedMethod(context,module,item,class extends HostRustParser{block(){return {k:'num',value:'9',span:{start:0,end:3}};}}),/actual original Host parser/);
  surface.body.fields[0].value.value='9';assert.throws(()=>assertOriginalDefaultGeneratedMethod(surface,context),/changed/);
  const manual=setup('struct Payload{value:u32} impl Default for Payload{fn default()->Self{Self{value:7}}}'),method=extractImplDeclarations(manual.module.source,{sourcePath:manual.module.file,modulePath:manual.module.path,sourceView:manual.module.sourceView,compilationProfile:PRODUCTION_PROFILE}).implementations[0].methods[0],path=['crate','Payload'],proof=proveDefaultMethodAdmission(manual.context,method,path);
  assert.ok(lowerDefaultMethodTokens(method,path,proof));assert.throws(()=>lowerDefaultMethodTokens(method,path,structuredClone(proof)),/copied/);assert.throws(()=>proveDefaultMethodAdmission(manual.context,structuredClone(method),path),/unsealed/);
  assert.throws(()=>lowerDefaultMethodTokens(method,['crate','Other'],proof),/target differs/);
});
test('Default execution preserves independent trait coherence source and field-shape refusals',()=>{
  const sources=[
    'trait Default{fn default()->Self;}struct Payload{value:u32}impl Default for Payload{fn default()->Self{Self{value:1}}}pub fn bad()->Payload{Payload::default()}',
    '#![no_implicit_prelude] #[derive(Default)] struct Payload{value:u32}pub fn bad()->Payload{Payload::default()}',
    'mod core{} struct Payload{value:u32}impl core::default::Default for Payload{fn default()->Self{Self{value:1}}}pub fn bad()->Payload{Payload::default()}',
    'struct Payload{value:u32}impl Default for Payload{fn default()->Self{Self{value:1}}}impl Default for Payload{fn default()->Self{Self{value:2}}}pub fn bad()->Payload{Payload::default()}',
    '#[derive(Default)] struct Payload{value:u32}impl Default for Payload{fn default()->Self{Self{value:1}}}pub fn bad()->Payload{Payload::default()}',
    '#[derive(Default)] struct Payload<T>{value:T}pub fn bad()->Payload<u32>{Payload::default()}',
    '#[derive(Default)] struct Payload{#[unknown] value:u32}pub fn bad()->Payload{Payload::default()}',
    '#[derive(Default)] struct Payload{value:u32=9}pub fn bad()->Payload{Payload::default()}',
    'struct Payload{value:u32}impl Default for Payload{fn default(other:u32)->Self{Self{value:other}}}pub fn bad()->Payload{Payload::default()}',
    'struct Payload{value:u32}impl Default for Payload{fn default()->Self{Self{value:true}}}pub fn bad()->Payload{Payload::default()}',
    'struct Payload{value:u32}impl Default for Payload{fn default()->Self{Self{value:1}}fn other()->u32{3}}pub fn bad()->Payload{Payload::default()}',
    'use unknown::*;#[derive(Default)]struct Payload{value:u32}pub fn bad()->Payload{Payload::default()}',
    'struct Payload{value:u32}impl Default for Payload{fn default()->Self{unknown!()}}pub fn bad()->Payload{Payload::default()}',
    '#[derive(Default)] struct Payload{value:u32}pub const fn bad()->Payload{Payload::default()}',
  ];
  for(const source of sources){const result=compile(source);assert.ok(!result.meta.executable.some(entry=>entry.name==='bad'),source);assert.ok(result.meta.refused.length,source);}
});

for(const [source,golden]of [['#[derive(Default)] struct Payload{value:String}pub fn bad()->Payload{Payload::default()}',{$:'Payload',value:''}],['#[derive(Default)] struct Payload{a:u32,b:u32,c:u32,d:u32,e:u32,f:u32}pub fn bad()->Payload{Payload::default()}',{$:'Payload',a:0n,b:0n,c:0n,d:0n,e:0n,f:0n}]])test('former field-boundary refusal executes the exact original source '+source,async()=>{const result=compile(source);assert.ok(result.meta.executable.some(row=>row.name==='bad'),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>assert.deepEqual(api.bad(),golden),{childTimeoutMs:30000});});
