// Original layout batch draft. Engine results are recorded independently.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {projectCopyEvidence} from '../project-copy.mjs';
import {fixture} from './fixtures/copy-layout-refusal-fixture.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const retain=(name,value)=>{const directory=process.env.ROUTER_COPY_LAYOUT_BATCH_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value,(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item instanceof Map?{$map:[...item]}:item)+'\n');}};

test('independent original missing Copy layouts are discarded together before survivor certification',()=>{
  const source=Array.from({length:64},(_,index)=>`pub struct Bad${index}{value:Missing${index}}`).join(' ')+' #[derive(Clone,Copy)] pub struct Good{value:u8} #[derive(Clone,Copy)] pub struct Dependent{value:Bad0}';
  const row=fixture(source),evidence=projectCopyEvidence(row.declarations,[row.module],new Map(),row.scopes);
  const parentResults={good:evidence(['Good'],row.module,{start:0,end:source.length}),bad:Array.from({length:64},(_,index)=>evidence(['Bad'+index],row.module,{start:0,end:source.length})),dependent:evidence(['Dependent'],row.module,{start:0,end:source.length}),fields:evidence.fieldCertificates(['Good'],row.module,{start:0,end:source.length})};
  retain('01-parent-engine-evidence',{source,versions:process.versions,...parentResults});
  assert.equal(parentResults.good.verified,true);
  assert.deepEqual(parentResults.bad,Array(64).fill(null));assert.equal(parentResults.dependent,null);
  assert.equal(parentResults.fields.length,1);
  const script=`import{readFileSync}from'node:fs';import{measureCopyLayoutPhases}from${JSON.stringify(new URL('./fixtures/copy-layout-refusal-fixture.mjs',import.meta.url).href)};const result=await measureCopyLayoutPhases(readFileSync(0,'utf8'));console.log(JSON.stringify(result,(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item instanceof Map?{$map:[...item]}:item));`;
  const child=spawnSync(process.env.ROUTER_TRANSLATION_NODE??'node',['--input-type=module','--eval',script],{input:source,encoding:'utf8',timeout:20_000,maxBuffer:8*1024*1024});
  retain('01-node-coverage-raw',{source,script,status:child.status,signal:child.signal,error:child.error&&{name:child.error.name,message:child.error.message},stdout:child.stdout,stderr:child.stderr,parentVersions:process.versions});
  assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);
  const measured=JSON.parse(child.stdout);retain('01-node-coverage-complete',measured);
  assert.ok(measured.versions.node);assert.equal(measured.versions.bun,undefined);assert.equal(measured.source,source);
  assert.equal(measured.method.url,new URL('../extensions/host-contracts.mjs',import.meta.url).href);assert.equal(measured.hostSource.slice(measured.method.startOffset,measured.method.endOffset),measured.method.text);
  assert.equal(measured.scriptsMatched,1);assert.equal(measured.matches.length,1);
  assert.equal(measured.matches[0].ranges[0].count,3,'one independent refusal phase, one transitive refusal phase, then an independently rechecked survivor');
  assert.equal(measured.results.good.verified,true);assert.deepEqual(measured.results.bad,Array(64).fill(null));assert.equal(measured.results.dependent,null);assert.equal(measured.results.fields.length,1);
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
