import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {externalModuleBindings} from '../registered-bindings.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {bindNonCopyTraitOwner,nonCopyTraitOwner,COPY_NAMESPACE_BINDINGS} from '../copy-trait-owners.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const display='impl std::fmt::Display for Kind{fn fmt(&self,f:&mut std::fmt::Formatter<\'_>)->std::fmt::Result{f.pad("kind")}}';
const value='#[derive(Clone,Copy)] enum Kind{A,B} impl Kind{pub fn read(self)->u8{match self{Self::A=>1,Self::B=>2}}} pub fn run(value:Kind)->u8{value.read()}';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});

test('only matching original closed standard trait owners receive non-Copy relevance evidence',()=>{
  const source=value+display,module={file:'src/lib.rs',path:[],source,items:sourceItems(source),configurationCondition:'active'};
  const bindings=resolveModuleBindings({modules:[module],externalModules:externalModuleBindings({extraBindings:COPY_NAMESPACE_BINDINGS}),compilationProfile:PRODUCTION_PROFILE});
  const scopes=new Map(bindings.scopes.map(scope=>[scope.file,scope]));
  const raw=extractImplDeclarations(source,{sourcePath:module.file,modulePath:[]}).implementations.find(impl=>impl.traitPath);
  const implementation={...raw,resolvedType:{kind:'data',name:'Kind'},resolvedNominalTarget:null};
  assert.equal(nonCopyTraitOwner(implementation),null);
  bindNonCopyTraitOwner(implementation,module,scopes);
  const proof=nonCopyTraitOwner(implementation);assert.ok(proof);assert.equal(proof.sourceSha256,hash(source));
  assert.equal(nonCopyTraitOwner({...implementation}),null,'serialization cannot manufacture private owner evidence');
  implementation.traitPath=['Drop'];assert.equal(nonCopyTraitOwner(implementation),null,'changed original identity invalidates the seal');
});

test('standard Display does not alter checked Copy execution or hostile value guards',{timeout:30_000},async()=>{
  const result=project(value+display);assert.deepEqual(result.meta.refused.map(item=>({term:item.term,name:item.name})),[{term:'method',name:'Kind.fmt'}]);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.run(Object.freeze({$:'A'})),1n);assert.equal(api.run(Object.freeze({$:'B'})),2n);
    assert.throws(()=>api.run({$:'A'}),TypeError);let traps=0;
    const proxy=new Proxy(Object.freeze({$:'A'}),{get(){traps++;throw Error('trap');}});
    assert.throws(()=>api.run(proxy),TypeError);assert.equal(traps,0);
  });
});

test('shadowed and unknown trait owners, Drop and conditional or unsafe implementations still refuse Copy',()=>{
  for(const extra of [
    'mod std{pub mod fmt{pub trait Display{}}} '+display,
    'impl Drop for Kind{fn drop(&mut self){}}',
    'impl Copy for Kind{}',
    'impl Clone for Kind{fn clone(&self)->Self{Self::A}}',
    'unsafe impl Send for Kind{}',
    '#[cfg(feature="unknown")] '+display,
    'emit_items!{} '+display,
    'impl foreign::Display for Kind{}',
  ]){const result=project(value+extra);assert.equal(result.meta.executable.some(item=>item.name==='run'),false,extra);assert.ok(result.meta.refused.length,extra);}
});

test('unchanged whole subscription Copy methods retain actual source and standard Display ownership',{timeout:30_000},async()=>{
  const path='src/subscription/types.rs',source=readFileSync(new URL(path,root),'utf8');assert.equal(hash(source),'74996ec0b4a32cb6e8d8c6a5e4cf2057a09238acff6d141ad58b592184c12c26');
  const dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
  const result=translateProject({entry:path,paths:[path],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE,deriveDependencies:dependencies});
  const originals=[['as_str',893,1135,'9b8833487bac3ef42338552374ee0ab7aca4d65925763668da851ab7143126cc'],['home_subdir',1783,2034,'50cba53a550fddae23c789aba4ed038a1bf51e24d7fb5c3f3571340d2220cae8']];
  const program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),exports=[];
  for(const [name,start,end,digest]of originals){assert.equal(hash(source.slice(start,end)),digest);const method=result.meta.checkedMethods.find(item=>item.name==='SubscriptionProvider.'+name);assert.ok(method);assert.deepEqual(method.span,{start,end});const emitted=[...program.declarations.values()].find(entry=>entry.impl?.method===name);assert.ok(emitted);exports.push(`export {${emitted.name} as original_${name}};`);}
  const alias='\n'+exports.join('\n');
  await verifyTypedTargets({...result,javascript:result.javascript+alias,typescript:result.typescript+alias},(_api,_result,module)=>{
    for(const [name,text,home]of [['Claude','claude','.claude'],['Codex','codex','.codex'],['Gemini','gemini','.gemini'],['Qwen','qwen','.qwen']]){const value=Object.freeze({$:name});assert.equal(module.original_as_str(value),text);assert.equal(module.original_home_subdir(value),home);}
    assert.throws(()=>module.original_as_str({$:'Claude'}),TypeError);assert.throws(()=>module.original_home_subdir(Object.freeze({$:'Wrong'})),TypeError);
  });
});
