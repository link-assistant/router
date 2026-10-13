// Original layout batch draft. Engine results are recorded independently.
import test from 'node:test';
import assert from 'node:assert/strict';
import {projectCopyEvidence} from '../project-copy.mjs';
import {HostChecker,parseRust} from '../extensions/host-contracts.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {moduleScopeKey} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

function fixture(source){
  const module={file:'src/lib.rs',path:[],source,items:sourceItems(source),configurationCondition:'active',compilationProfile:PRODUCTION_PROFILE};
  const surfaces=parseRust(source+' fn main(){}').items.filter(item=>item.k==='data'&&!item.generated);
  const declarations=surfaces.map(surface=>({name:surface.name,term:'struct',file:module.file,path:[],globalSpan:surface.span,surface}));
  const scopes=new Map(resolveModuleBindings({modules:[module],compilationProfile:PRODUCTION_PROFILE}).scopes.map(scope=>[moduleScopeKey(scope),scope]));
  return {module,declarations,scopes};
}

test('independent original missing Copy layouts are discarded together before survivor certification',()=>{
  const source=Array.from({length:64},(_,index)=>`pub struct Bad${index}{value:Missing${index}}`).join(' ')+' #[derive(Clone,Copy)] pub struct Good{value:u8} #[derive(Clone,Copy)] pub struct Dependent{value:Bad0}';
  const row=fixture(source),ordinary=HostChecker.prototype.program,calls=[];
  HostChecker.prototype.program=function(surface){calls.push(surface);return ordinary.call(this,surface);};
  let evidence;
  try{evidence=projectCopyEvidence(row.declarations,[row.module],new Map(),row.scopes);}finally{HostChecker.prototype.program=ordinary;}
  assert.equal(calls.length,3,'one independent refusal phase, one transitive refusal phase, then an independently rechecked survivor');
  assert.equal(evidence(['Good'],row.module,{start:0,end:source.length}).verified,true);
  for(const name of ['Bad0','Bad63','Dependent'])assert.equal(evidence([name],row.module,{start:0,end:source.length}),null);
  assert.equal(evidence.fieldCertificates(['Good'],row.module,{start:0,end:source.length}).length,1);
});

test('layout batching retains original nested consuming Copy execution and refused callers',async()=>{
  const source=Array.from({length:24},(_,index)=>`pub struct Bad${index}{value:Missing${index}}`).join(' ')+' #[derive(Clone,Copy)] pub struct Inner{value:u8} #[derive(Clone,Copy)] pub struct Outer{inner:Inner} impl Outer{pub fn read(self)->u8{self.inner.value}} pub fn run(value:Outer)->u8{value.read()} pub fn blocked(value:Bad0)->u8{0}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
  assert.deepEqual(result.meta.executable.map(item=>item.name),['run']);
  assert.ok(result.meta.refused.some(item=>item.name==='blocked'));
  assert.equal(result.meta.checkedMethods.length,1);
  await verifyTypedTargets(result,api=>{assert.equal(api.run(Object.freeze({$:'Outer',inner:Object.freeze({$:'Inner',value:19n})})),19n);assert.throws(()=>api.run(Object.freeze({$:'Outer',inner:{$:'Inner',value:19n}})),TypeError);assert.equal(api.blocked,undefined);});
});

test('actual Drop and custom Copy owners remain refused after layout batching',()=>{
  for(const extra of ['impl Drop for Good{fn drop(&mut self){}}','use custom::Copy;','use unknown::*;']){
    const source=extra+' '+Array.from({length:8},(_,index)=>`pub struct Bad${index}{value:Missing${index}}`).join(' ')+' #[derive(Clone,Copy)] pub struct Good{value:u8} impl Good{pub fn read(self)->u8{self.value}} pub fn blocked(value:Good)->u8{value.read()}';
    const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
    assert.equal(result.meta.checkedMethods.length,0,extra);assert.equal(result.meta.executable.some(item=>item.name==='blocked'),false,extra);assert.ok(result.meta.refused.some(item=>item.name==='blocked'));
  }
});
