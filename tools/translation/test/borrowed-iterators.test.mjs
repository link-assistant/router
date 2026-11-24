import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
import {assertImmutableIterator} from '../extensions/iterator-runtime.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'});
test('find_map stops before later checked arithmetic and filter_map folds lazily in order',{timeout:30_000},async()=>{
  const source='fn present(v:&u8)->Option<u8>{Some(10u8/ *v)} pub fn first(v:&[u8])->Option<u8>{v.iter().find_map(present)} pub fn total(v:&[u64])->u64{v.iter().filter_map(|v|if *v>0{Some(*v)}else{None}).fold(0u64,u64::saturating_add)}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,api=>{assert.deepEqual(api.first(Object.freeze([2n,0n])),some(5n));assert.deepEqual(api.first(Object.freeze([])),none);assert.throws(()=>api.first(Object.freeze([0n])),RangeError);assert.equal(api.total(Object.freeze([0n,2n,3n])),5n);assert.equal(api.total(Object.freeze([18446744073709551615n,1n])),18446744073709551615n);
    let reads=0;const prototype=Object.create(Array.prototype);Object.defineProperty(prototype,Symbol.iterator,{get(){reads++;throw Error('custom iterator');}});const input=[2n];Object.setPrototypeOf(input,prototype);Object.freeze(input);assert.throws(()=>api.first(input),TypeError);assert.equal(reads,0);
  });
});
test('borrowed flatten and find preserve item identity and actual reference depth',{timeout:30_000},async()=>{
  const source="pub fn picked(v:&'static [&'static [u8]])->Option<&'static u8>{v.iter().copied().flatten().find(|v|**v==3)}";
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,api=>{assert.deepEqual(api.picked(Object.freeze([Object.freeze([1n,2n]),Object.freeze([3n,4n])])),some(3n));assert.deepEqual(api.picked(Object.freeze([])),none);});
});
test('shared aggregate binder exposes only a readonly checked view and canonical Copy Option payloads',{timeout:30_000},async()=>{
  const source='struct Item{value:u8} pub fn first(v:&[Item])->Option<u8>{v.iter().find_map(|item|Some(item.value))} pub fn nested(v:Option<(Option<u8>,Option<u8>)>)->Option<u8>{let(a,b)=v?;a.or_else(||b)}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,api=>{const item=Object.freeze({$:'Item',value:7n});assert.deepEqual(api.first(Object.freeze([item])),some(7n));assert.deepEqual(api.nested(some(Object.freeze({$:'Tuple',field0:none,field1:some(4n)}))),some(4n));
    let reads=0;const proxy=new Proxy(item,{get(){reads++;throw Error('get');},getOwnPropertyDescriptor(){reads++;throw Error('descriptor');},ownKeys(){reads++;throw Error('keys');},getPrototypeOf(){reads++;throw Error('prototype');}});assert.throws(()=>api.first(Object.freeze([proxy])),TypeError);assert.equal(reads,0);
    assert.throws(()=>api.first(Object.freeze([Object.freeze({$:'Item',get value(){reads++;return 7n;}})])),TypeError);assert.equal(reads,0);
  });
});
test('descriptor-only immutable view guard rejects holes cycles getters proxies and mutable nested containers',()=>{
  const item=Object.freeze({$:'Some',field0:Object.freeze([1n])});assert.equal(assertImmutableIterator(Object.freeze([item,item])),true);
  let reads=0;for(const value of [Object.freeze({get value(){reads++;return 1;}}),new Proxy(item,{get(){reads++;throw Error();},ownKeys(){reads++;throw Error();},getOwnPropertyDescriptor(){reads++;throw Error();},getPrototypeOf(){reads++;throw Error();}})])assert.throws(()=>assertImmutableIterator(value),TypeError);assert.equal(reads,0);
  const cycle={};cycle.self=cycle;Object.freeze(cycle);
  for(const value of [Object.freeze([,1n]),Object.freeze({items:[1n]}),cycle])assert.throws(()=>assertImmutableIterator(value),TypeError);
  const prototype=Object.create(Array.prototype);Object.defineProperty(prototype,Symbol.iterator,{get(){reads++;throw Error('custom iterator');}});
  const inherited=[1n];Object.setPrototypeOf(inherited,prototype);Object.freeze(inherited);assert.throws(()=>assertImmutableIterator(inherited),TypeError);assert.equal(reads,0);
  assert.throws(()=>assertImmutableIterator(Object.freeze(Array(70000).fill(1n))),TypeError);
  let deep=Object.freeze({});for(let depth=0;depth<1100;depth++)deep=Object.freeze({next:deep});assert.throws(()=>assertImmutableIterator(deep),TypeError);
});
test('fake Option results owned aggregate moves unproved function items and reference erasure remain refused',()=>{
  for(const source of [
    'enum Fake{Some(u8),None} pub fn bad(v:&[u8])->Option<u8>{v.iter().find_map(|v|Fake::Some(*v))}',
    'struct Item{value:u8} pub fn bad(v:Vec<Item>)->Option<Item>{v.into_iter().find(|v|true)}',
    'pub fn bad(v:&[u8])->Option<u8>{v.iter().find(|v|**v==2)}',
    "pub fn bad(v:&'static [u8])->Option<&'static u8>{v.iter().find_map(|&v|Some(v))}",
    'pub fn bad(v:&[u8])->Option<u8>{v.iter().find_map(|v:u8|Some(*v))}',
    'pub fn bad(v:&[Vec<u8>])->Vec<u8>{v.iter().flatten().collect()}',
    'pub fn bad(v:&[usize])->usize{v.iter().copied().fold(0usize,u64::saturating_add)}',
    'mod u64{} pub fn bad(v:&[u64])->u64{v.iter().copied().fold(0u64,u64::saturating_add)}',
    'enum Fake{Some(u8),None} pub fn bad(v:Fake)->u8{if let Some(n)=v{n}else{0}}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);}
});
