import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram,HostChecker} from '../extensions/host-contracts.mjs';
import {planStandardMethod,completeStandardMethod,STANDARD_METHOD_PROFILE} from '../extensions/standard-method-plans.mjs';
import {BOOL_THEN_SOME_PROFILE} from '../extensions/standard-bool-profile.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const root=new URL('../../../',import.meta.url),none={$:'None'},some=field0=>({$:'Some',field0});
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});

test('pinned ordinary bool.then_some plans an eager value and genuine canonical Option',()=>{
  assert.equal(BOOL_THEN_SOME_PROFILE.rust,'1.89.0');assert.equal(BOOL_THEN_SOME_PROFILE.constEligible,false);assert.equal(STANDARD_METHOD_PROFILE.boolThenSome.sha256,'d88d8511eb134f8efc2cdcb6a24c7f888abfb2c03588d7db3f304657e19b83b3');assert.equal(STANDARD_METHOD_PROFILE.boolThenSome.line,33);
  const checker=new HostChecker('Rust',[]),checked=checker.program(parseRust('pub fn selected(c:bool,n:u8)->Option<u8>{c.then_some(n)}fn main(){}')),entry=checked.declarations.get('selected');
  const options={declarations:checked.declarations,resolveType:type=>checker.resolveType(type,[],entry.span),expected:entry.ret,argumentCount:1,span:entry.span};
  const plan=planStandardMethod(entry.params[0].type,'then_some',options);assert.equal(plan.operation,'bool_then_some');assert.deepEqual(plan.evaluationOrder,['receiver','argument']);assert.equal(plan.argumentEvaluation,'eager-once');assert.equal(plan.callbackExpected,null);assert.deepEqual(plan.callbackParameters,[]);assert.equal(plan.constEligible,false);
  assert.deepEqual(completeStandardMethod(plan,entry.params[1].type,{optionType:()=>entry.ret}),entry.ret);
  assert.equal(planStandardMethod(entry.params[1].type,'then_some',options),null);
  for(const argumentCount of [0,2])assert.throws(()=>planStandardMethod(entry.params[0].type,'then_some',{...options,argumentCount}),error=>error.kind==='type');
});

test('then_some eager values overflow or panic even when the receiver is false',{timeout:60_000},async()=>{
  const result=project('pub fn eager(c:bool,n:u8)->Option<u8>{c.then_some(n+1)}pub fn eager_panic(c:bool)->Option<u8>{c.then_some(panic!("eager argument"))}pub fn lazy(c:bool,n:u8)->Option<u8>{c.then(||n+1)}');assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    for(const condition of [false,true]){assert.throws(()=>api.eager(condition,255n),RangeError);assert.throws(()=>api.eager_panic(condition),{message:'eager argument'});}
    assert.deepEqual(api.eager(false,4n),none);assert.deepEqual(api.eager(true,4n),some(5n));assert.deepEqual(api.lazy(false,255n),none);assert.throws(()=>api.lazy(true,255n),RangeError);
  });
});

test('receiver and eager argument effects occur once in source order in both typed targets',{timeout:60_000},async()=>{
  const result=project('pub fn ordered(receiver:&str,value:&str)->Option<bool>{std::env::var(receiver).is_ok().then_some(std::env::var(value).is_ok())}');assert.deepEqual(result.meta.refused,[]);
  const directory=mkdtempSync(join(tmpdir(),'router-then-some-'));
  try{
    writeRuntimeAssets(directory);const js=join(directory,'src/fixture.mjs'),ts=join(directory,'src/fixture.ts');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    execFileSync(process.execPath,['--check',js],{stdio:'pipe',timeout:30_000});execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'compiled'),ts],{stdio:'pipe',timeout:30_000});
    const effects=await import(pathToFileURL(join(directory,'runtime/effects.mjs')).href);
    for(const path of [js,join(directory,'compiled/fixture.js')]){
      const api=(await import(pathToFileURL(path).href)).translated;
      for(const [receiverExists,valueExists,expected]of [[false,true,none],[true,false,some(false)],[true,true,some(true)]]){
        const calls=[],env={get(key){calls.push(key);return (key==='receiver'?receiverExists:valueExists)?'present':undefined;}};
        assert.deepEqual(effects.withEffectCapabilities({env},()=>api.ordered('receiver','argument')),expected);assert.deepEqual(calls,['receiver','argument']);
      }
    }
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test('owned String and borrowed str payloads keep distinct checked Option ownership and origins',{timeout:60_000},async()=>{
  const source='pub fn owned(c:bool,value:String)->std::option::Option<String>{c.then_some(value)}pub fn borrowed(c:bool,value:&str)->std::option::Option<&str>{c.then_some(value)}enum Option{Other}use std::option::Option as Maybe;pub fn aliased(c:bool,value:String)->Maybe<String>{c.then_some(value)}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{for(const name of ['owned','borrowed','aliased']){assert.deepEqual(api[name](false,'😀'),none);assert.deepEqual(api[name](true,'😀'),some('😀'));}});
});

test('custom owners erased or escaping borrows aggregate moves and const calls remain carried',()=>{
  for(const source of [
    'struct Switch;pub fn bad(c:Switch)->Option<u8>{c.then_some(1u8)}',
    'enum Option{None,Some(u8)}pub fn bad(c:bool,n:u8)->Option{c.then_some(n)}',
    'pub fn bad(c:&bool)->Option<u8>{c.then_some(1u8)}',
    'pub fn bad(c:bool,n:usize)->Option<u64>{c.then_some(n)}',
    'pub fn bad(c:bool,n:&u8)->Option<u8>{c.then_some(n)}',
    'pub fn bad(c:bool,n:Box<u8>)->Option<u8>{c.then_some(n)}',
    'pub fn bad(c:bool,n:Vec<u8>)->Option<Vec<u8>>{c.then_some(n)}',
    'pub fn bad(value:&str)->Option<&\'static str>{false.then_some(value)}',
    'pub fn bad(value:String)->Option<&str>{true.then_some(value.as_str())}',
    'pub const fn bad()->Option<u8>{true.then_some(1u8)}',
    'pub fn bad(c:bool)->u8{c.then_some(return 1u8);0u8}',
  ]){const result=project(source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);}
});

test('source functions cannot collide with the standard eager helper binder',{timeout:60_000},async()=>{
  const result=project('fn ml_host_bool_then_some(value:u8)->u8{value+1}pub fn selected(c:bool,value:u8)->Option<u8>{c.then_some(ml_host_bool_then_some(value))}');assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.deepEqual(api.selected(true,8n),some(9n));assert.deepEqual(api.selected(false,8n),none);assert.throws(()=>api.selected(false,255n),RangeError);});
});

test('complete unchanged output_limit data_payload is source-pinned and runs both typed targets',{timeout:60_000},async()=>{
  const source=readFileSync(new URL('src/output_limit.rs',root),'utf8');assert.equal(hash(source),'b165be6e33444a5811b33e52567de74ca144e7208a24c161b231bd332cf899e0');
  const item=sourceItems(source).find(item=>item.term==='fn'&&item.name==='data_payload');assert.deepEqual([item.start,item.end],[15207,15550]);assert.equal(hash(source.slice(item.start,item.end)),'04bfbe451d693d4d59236c58510214e7a13b0ff5d9dd3ae18a4e0f8aa42a08cd');
  const result=translateProject({entry:'src/output_limit.rs',paths:['src/output_limit.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
  const checked=result.meta.executable.find(entry=>entry.name==='data_payload');assert.ok(checked,JSON.stringify(result.meta.refused));assert.deepEqual(checked.span,{start:item.start,end:item.end});assert.equal(result.meta.runtimeParity,false);
  await verifyTypedTargets(result,api=>{for(const [block,expected]of [['',none],['event: message\n',none],['data: \n',none],['data: hello\n',some('hello')],['data: one\r\ndata: two\n',some('one\ntwo')],['data: \u0085word\ndata:\n',some('word\n')],['data: \uFEFFword\n',some('\uFEFFword')]])assert.deepEqual(api.data_payload(block),expected);});
});
