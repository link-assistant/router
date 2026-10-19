// SOURCE-ONLY DRAFT: these cases have not run on the authored source head.
import test from 'node:test';
import assert from 'node:assert/strict';
import {collectResult,mapResultError} from '../extensions/result-iterator-runtime.mjs';
import {RESULT_ITERATOR_PROFILE,knownResultDrop} from '../extensions/result-iterators.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
const ok=field0=>Object.freeze({$:'Ok',field0}),err=field0=>Object.freeze({$:'Err',field0});
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
test('pinned Result collection stops pulling immediately after the first error',()=>{
  assert.equal(RESULT_ITERATOR_PROFILE.constEligible,false);
  const events=[],first=err('bad');
  function* values(){events.push('first');yield ok(1n);events.push('error');yield first;events.push('unreachable');throw Error('late');}
  assert.equal(collectResult(values()),first);assert.deepEqual(events,['first','error']);
  assert.deepEqual(collectResult([]),ok([]));assert.deepEqual(collectResult([ok(1n),ok(2n)]),ok([1n,2n]));
});
test('map_err transfers Ok untouched and invokes its checked callback only once on Err',()=>{
  let calls=0;const success=ok(3n),failure=err('bad');
  const transform=value=>{calls++;return value+'!';};
  assert.equal(mapResultError(success,transform),success);assert.equal(calls,0);
  assert.deepEqual(mapResultError(failure,transform),err('bad!'));assert.equal(calls,1);
  assert.throws(()=>mapResultError(failure,()=>{throw Error('selected');}),/selected/);
});
test('Result runtime rejects proxy, inherited, mutable and accessor tags before dispatch',()=>{
  let reads=0;const proxy=new Proxy(err('bad'),{get(){reads++;throw Error('get');},ownKeys(){reads++;throw Error('keys');},getPrototypeOf(){reads++;throw Error('prototype');}});
  assert.throws(()=>mapResultError(proxy,()=>{reads++;}),TypeError);assert.equal(reads,0);
  const getter=Object.freeze({get $(){reads++;return 'Err';},field0:'bad'});
  for(const value of [getter,{$:'Err',field0:'bad'},Object.freeze(Object.create(err('bad'))),Object.freeze({$:'Custom',field0:'bad'}),Object.freeze({$:'Ok',field0:1n,extra:1})])assert.throws(()=>collectResult([value]),TypeError);
  assert.equal(reads,0);
});
test('destruction profile requires actual primitive identities and standard String ownership',()=>{
  assert.equal(knownResultDrop({kind:'fixed',bits:64,signed:false,rustPrimitiveName:'usize'}),true);
  assert.equal(knownResultDrop({kind:'string',rustOwnership:{kind:'owned',source:'String'}}),true);
  for(const type of [{kind:'fixed',bits:64,signed:false},{kind:'fixed',bits:8,signed:false,rustPrimitiveName:'u64'},{kind:'string'},{kind:'data',name:'Custom'},{kind:'array',element:{kind:'bool'}},{kind:'fixed',bits:8,signed:false,rustPrimitiveName:'u8',rustReference:{kind:'shared',pointee:{kind:'fixed',bits:8,signed:false}}}])assert.equal(knownResultDrop(type),false);
});
test('typed Result<Vec<usize>,String> CSV maps parser errors and retains forward short circuit',{timeout:60_000},async()=>{
  const source='pub fn numbers(v:&str)->Result<Vec<usize>,String>{v.split(\',\').map(str::trim).filter(|s|!s.is_empty()).map(|s|s.parse::<usize>().map_err(|_|String::from("bad"))).collect()}pub fn selected(v:&str)->Result<Vec<u8>,String>{v.split(\',\').map(|s|if s=="bad"{Err(String::from("bad"))}else{Ok(255u8+1u8)}).collect()}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    for(const [value,expected]of [['',ok([])],[' , 1,2, ',ok([1n,2n])],['18446744073709551615',ok([18446744073709551615n])],['-1',err('bad')],['18446744073709551616',err('bad')],['1,no,2',err('bad')]])assert.deepEqual(api.numbers(value),expected);
    assert.deepEqual(api.selected('bad,later'),err('bad'));assert.throws(()=>api.selected('later'),RangeError);
  });
});
test('borrowed successful substrings retain only their actual source origin',{timeout:60_000},async()=>{
  const result=project('pub fn pieces(v:&str)->Result<Vec<&str>,String>{v.split(\',\').map(|s|if s=="bad"{Err(String::from("bad"))}else{Ok(s)}).collect()}');assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.deepEqual(api.pieces('a,b'),ok(['a','b']));assert.deepEqual(api.pieces('a,bad,later'),err('bad'));});
  const escaped=project('pub fn bad(v:&str)->Result<Vec<&\'static str>,String>{v.split(\',\').map(|s|Ok(s)).collect()}');assert.ok(escaped.meta.refused.some(item=>item.name==='bad'));
});
test('first error leaves later source environment effects unexecuted in both typed targets',{timeout:60_000},async()=>{
  const result=project('pub fn checked(v:&str)->Result<Vec<bool>,String>{v.split(\',\').map(|s|if s=="bad"{Err(String::from("bad"))}else{Ok(std::env::var(s).is_ok())}).collect()}');assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,(api,effects)=>{
    for(const [value,expected,wantedCalls]of [['one,bad,two',err('bad'),['one']],['bad,two',err('bad'),[]],['one,two',ok([true,false]),['one','two']]]){
      const calls=[],environment={get(key){calls.push(key);return key==='one'?'present':undefined;}};
      assert.deepEqual(effects.withEffectCapabilities({environment},()=>api.checked(value)),expected);assert.deepEqual(calls,wantedCalls);
    }
  });
});
test('custom Result/collections/errors, erased receiver identities and const remain explicit refusals',()=>{
  for(const source of [
    'enum Result<T,E>{Ok(T),Err(E)}pub fn bad(v:&str)->Result<Vec<usize>,String>{v.split(\',\').map(|s|s.parse::<usize>().map_err(|_|String::from("bad"))).collect()}',
    'enum Error{Bad}pub fn bad(v:&str)->Result<Vec<usize>,Error>{v.split(\',\').map(|s|s.parse::<usize>().map_err(|_|Error::Bad)).collect()}',
    'pub fn bad(v:&Result<u8,String>)->Result<u8,String>{v.map_err(|e|e)}',
    'pub fn bad(v:&str)->Result<Vec<u64>,String>{v.split(\',\').map(|s|s.parse::<usize>().map_err(|_|String::from("bad"))).collect()}',
    'pub fn bad(v:&str)->usize{v.split(\',\').map(|s|s.parse::<usize>()).count()}',
    'pub fn bad(v:&str)->Result<Vec<usize>,String>{v.split(\',\').map(|s|s.parse::<usize>().map_err(|_|String::from("bad"))).filter(|_|true).collect()}',
    'pub const fn bad(v:&str)->Result<Vec<usize>,String>{v.split(\',\').map(|s|s.parse::<usize>().map_err(|_|String::from("bad"))).collect()}',
  ]){const result=project(source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false);}
});
