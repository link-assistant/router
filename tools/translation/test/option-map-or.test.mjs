import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {planStandardMethod,completeStandardMethod,STANDARD_METHOD_PROFILE} from '../extensions/standard-method-plans.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const none=Object.freeze({$:'None'}),some=field0=>Object.freeze({$:'Some',field0});
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
async function both(result,assertions){
  assert.deepEqual(result.meta.refused,[]);
  const directory=mkdtempSync(join(tmpdir(),'router-map-or-'));
  try{writeRuntimeAssets(directory);const js=join(directory,'src/fixture.mjs'),ts=join(directory,'src/fixture.ts');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    execFileSync(process.execPath,['--check',js],{timeout:30_000});
    try{execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'compiled'),ts],{encoding:'utf8',timeout:30_000});}catch(error){throw new Error(error.stdout+error.stderr,{cause:error});}
    const effects=await import(pathToFileURL(join(directory,'runtime/effects.mjs')).href);
    for(const path of [js,join(directory,'compiled/fixture.js')])await assertions((await import(pathToFileURL(path).href)).translated,effects);
  }finally{rmSync(directory,{recursive:true,force:true});}
}

test('canonical map_or returns the checked U rather than an Option in both targets',{timeout:30_000},async()=>{
  const result=project(`pub fn selected(value:Option<u8>,fallback:u16)->u16{value.map_or(fallback,|v|v as u16 + 1)} pub fn inferred(value:Option<u8>)->bool{let result=value.map_or(false,|v|v>0);result} pub fn item(value:Option<u8>)->u16{value.map_or(9u16,widen)} fn widen(value:u8)->u16{value as u16} pub fn text(value:Option<&'static str>)->&'static str{value.map_or("default",|v|v)}`);
  await both(result,api=>{assert.equal(api.selected(none,300n),300n);assert.equal(api.selected(some(255n),300n),256n);assert.equal(api.inferred(none),false);assert.equal(api.inferred(some(0n)),false);assert.equal(api.inferred(some(1n)),true);assert.equal(api.item(none),9n);assert.equal(api.item(some(7n)),7n);assert.equal(api.text(none),'default');assert.equal(api.text(some('selected')),'selected');assert.throws(()=>api.selected(some(256n),0n),TypeError);});
});

test('map_or evaluates its eager default even for Some and invokes its callback only for Some',{timeout:30_000},async()=>{
  const result=project('pub fn eager(value:Option<u8>,default:u8)->u8{value.map_or(default+1,|v|v)} pub fn lazy(value:Option<u8>)->u8{value.map_or(7,|v|v+1)} pub fn panic_default(value:Option<u8>)->u8{value.map_or(panic!("default"),|v|v)} pub fn panic_callback(value:Option<u8>)->u8{value.map_or(9,|v|panic!("callback"))}');
  await both(result,api=>{for(const value of [none,some(4n)])assert.throws(()=>api.eager(value,255n),RangeError);assert.equal(api.eager(some(4n),10n),4n);assert.equal(api.eager(none,10n),11n);assert.equal(api.lazy(none),7n);assert.equal(api.lazy(some(8n)),9n);assert.throws(()=>api.lazy(some(255n)),RangeError);assert.equal(api.panic_callback(none),9n);assert.throws(()=>api.panic_callback(some(1n)),{message:'callback'});for(const value of [none,some(1n)])assert.throws(()=>api.panic_default(value),{message:'default'});});
});

test('real effect capabilities observe receiver then default then the Some-only callback exactly once',{timeout:30_000},async()=>{
  const result=project('fn mark(path:&str)->bool{std::fs::read_to_string(path).is_ok()} fn receiver(flag:bool)->Option<u8>{let observed=mark("receiver");if flag {Some(1)}else{None}} fn fallback()->u8{let observed=mark("default");7} pub fn ordered(flag:bool)->u8{receiver(flag).map_or(fallback(),|v|{let observed=mark("callback");v})}');
  await both(result,(api,{withEffectCapabilities})=>{const seen=[],capability={fs:{sync:{readFileSync(path){seen.push(path);return new Uint8Array();}}}};
    assert.equal(withEffectCapabilities(capability,()=>api.ordered(true)),1n);assert.deepEqual(seen,['receiver','default','callback']);seen.length=0;
    assert.equal(withEffectCapabilities(capability,()=>api.ordered(false)),7n);assert.deepEqual(seen,['receiver','default']);
  });
});

test('plans preserve registered provenance type identity ownership and source evaluation evidence',()=>{
  const checked=checkProgram(parseRust('fn input(value:Option<u8>)->u16{0} enum Fake{None,Some(u8)} fn main(){}')),entry=checked.declarations.get('input'),span={start:10,end:50};
  const options={declarations:checked.declarations,resolveType:type=>type,argumentCount:2,defaultType:entry.ret,expected:entry.ret,span},plan=planStandardMethod(entry.params[0].type,'map_or',options);
  assert.equal(plan.operation,'option_map_or');assert.deepEqual(plan.evaluationOrder,['receiver','default','callback']);assert.equal(plan.callbackCondition,'Some');assert.equal(plan.constEligible,false);assert.deepEqual(plan.callbackParameters,[{kind:'fixed',bits:8,signed:false,rustPrimitiveName:'u8'}]);assert.deepEqual(JSON.parse(JSON.stringify(plan)),plan);
  assert.deepEqual(completeStandardMethod(plan,entry.ret),entry.ret);assert.equal(planStandardMethod({kind:'data',name:'Fake'},'map_or',options),null);
  for(const argumentCount of [0,1,3])assert.throws(()=>planStandardMethod(entry.params[0].type,'map_or',{...options,argumentCount}),error=>error.kind==='type');
  const u64={kind:'fixed',bits:64,signed:false,rustPrimitiveName:'u64'},usize={...u64,rustPrimitiveName:'usize'};
  assert.throws(()=>planStandardMethod(entry.params[0].type,'map_or',{...options,defaultType:usize,expected:u64}),error=>error.kind==='type');
  const fixedPlan=planStandardMethod(entry.params[0].type,'map_or',{...options,defaultType:u64,expected:u64});assert.throws(()=>completeStandardMethod(fixedPlan,usize),error=>error.kind==='type');
  assert.throws(()=>planStandardMethod(entry.params[0].type,'map_or',{...options,defaultType:{kind:'array',element:usize},expected:{kind:'array',element:u64}}),error=>error.kind==='type');
  const arrayPlan=planStandardMethod(entry.params[0].type,'map_or',{...options,defaultType:{kind:'array',element:u64},expected:{kind:'array',element:u64}});assert.throws(()=>completeStandardMethod(arrayPlan,{kind:'array',element:usize}),error=>error.kind==='type');
  for(const defaultType of [{kind:'data',name:'unchecked-generic-key'},{...u64,rustGenericIdentityUnresolved:true},{kind:'fixed',bits:64,signed:false}])assert.throws(()=>planStandardMethod(entry.params[0].type,'map_or',{...options,defaultType,expected:undefined}),error=>error.kind==='type');
  const stringPlan=planStandardMethod(entry.params[0].type,'map_or',{...options,defaultType:{kind:'string'},expected:{kind:'string'}});
  assert.throws(()=>completeStandardMethod(stringPlan,{kind:'string',patternOwnershipRefusal:'owned String conversion'}),error=>error.kind==='type');
  const owned={kind:'string',patternOwnershipRefusal:'owned String conversion'},ownedPlan=planStandardMethod(entry.params[0].type,'map_or',{...options,defaultType:owned,expected:owned});
  assert.equal(completeStandardMethod(ownedPlan,owned).patternOwnershipRefusal,'owned String conversion');
  assert.equal(STANDARD_METHOD_PROFILE.optionMapOr.line,1200);assert.equal(STANDARD_METHOD_PROFILE.optionMapOr.sha256,STANDARD_METHOD_PROFILE.option.sha256);
});

test('fake Option methods incompatible primitive aliases and non-const use remain refused',()=>{
  for(const source of [
    'enum Fake{None,Some(u8)} pub fn invented(value:Fake)->u8{value.map_or(0,|v|v)}',
    'pub fn invented(value:Option<u8>)->u8{value.map_or(0)}',
    'pub fn invented(value:Option<u8>)->bool{value.map_or(false,|v|v)}',
    'pub fn invented(value:Option<u8>,fallback:usize)->u64{value.map_or(fallback,|v|v as u64)}',
    'pub fn invented(value:Option<u8>,fallback:u64)->u64{value.map_or(fallback,|v|v as usize)}',
    'pub fn invented(value:Option<usize>,fallback:&usize)->usize{value.map_or(fallback,|v|v)}',
    'pub fn seed(value:Option<usize>)->bool{value.is_none()} pub fn invented(value:Option<u64>,fallback:usize)->usize{value.map_or(fallback,|v|v)}',
    'pub fn invented(value:Option<Vec<u64>>,fallback:Vec<usize>)->Vec<u64>{value.map_or(fallback,|v|v)}',
    'pub fn invented(value:Option<usize>,fallback:Box<usize>)->usize{value.map_or(fallback,|v|v)}',
    'pub fn invented(value:Option<u8>)->u8{value.map_or({return 1;},|v|v)}',
    'pub fn invented(value:Option<u8>)->Option<u8>{value.map_or({let v=Some(1u8)?;Some(v)},|v|Some(v))}',
    'pub async fn invented(value:Option<u8>)->u8{value.map_or({let v=std::fs::read_to_string("x");return 1;},|v|v)}',
    'pub fn invented(value:Option<u8>)->u8{loop {value.map_or({break;1},|v|v);}0}',
    'pub fn invented(value:Option<u8>)->u8{loop {value.map_or({continue;1},|v|v);}0}',
    'pub const fn invented(value:Option<u8>)->u8{value.map_or(0,|v|v)}',
    "pub fn invented(value:Option<&'static str>)->&'static str{value.map_or(\"borrowed\",|v|String::from(v))}",
    'mod std{} pub fn invented(value:std::option::Option<u8>)->u8{value.map_or(0,|v|v)}',
    'mod other{pub enum Option{None,Some(u8)}} use crate::other::Option; pub fn invented(value:Option<u8>)->u8{value.map_or(0,|v|v)}',
  ])assert.equal(project(source).meta.executable.some(entry=>entry.name==='invented'),false,source);
});

test('nonlocal exits in the eager default remain explicit statement-lowering obligations',()=>{
  for(const source of [
    'pub fn invented(v:Option<u8>)->u8{v.map_or({return 1;},|n|n)}',
    'pub fn invented(v:Option<u8>)->Option<u8>{v.map_or({let n=Some(1u8)?;Some(n)},|n|Some(n))}',
    'pub async fn invented(v:Option<u8>)->u8{v.map_or({let seen=tokio::fs::read_to_string("x").await;1},|n|n)}',
    'pub fn invented(v:Option<u8>)->u8{loop{v.map_or({break;1},|n|n);}0}',
    'pub fn invented(v:Option<u8>)->u8{loop{v.map_or({continue;1},|n|n);}0}',
  ]){
    const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='invented'),false);
    assert.ok(result.meta.refused.some(entry=>entry.name==='invented'&&/default control|control in value expression/u.test(entry.message)),JSON.stringify(result.meta.refused));
  }
});
