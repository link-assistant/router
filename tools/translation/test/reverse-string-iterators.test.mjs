// SOURCE-ONLY DRAFT: all new cases are unrun until Gate grants a coherent slot.
import test from 'node:test';
import assert from 'node:assert/strict';
import {reverseFindCharacterSplit} from '../extensions/reverse-string-runtime.mjs';
import {REVERSE_STRING_PROFILE} from '../extensions/reverse-string-iterators.mjs';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram,emitJavaScript} from '../extensions/host-contracts.mjs';
import {roundTripProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
const some=field0=>({$:'Some',field0}),none={$:'None'};
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
test('pinned reverse character fields retain trailing/leading empty and Unicode boundaries',()=>{
  assert.equal(REVERSE_STRING_PROFILE.constEligible,false);
  for(const [value,delimiter,expected]of [['',',',some('')],[',',',',some('')],['a,b,',',',some('')],['a,b',',',some('b')],['😀a😀b','😀',some('b')],['éΩé','é',some('')],['x\0y','\0',some('y')]])assert.deepEqual(reverseFindCharacterSplit(value,delimiter,Object.freeze([]),()=>true),expected);
  assert.deepEqual(reverseFindCharacterSplit('',',',Object.freeze([]),()=>false),none);
  for(const [value,delimiter]of [['\ud800',','],['x','\udfff'],['x','ab'],['x','']])assert.throws(()=>reverseFindCharacterSplit(value,delimiter,Object.freeze([]),()=>true),TypeError);
});
test('reverse map and predicate callbacks execute in source order only on selected reverse fields',()=>{
  const events=[],maps=Object.freeze([value=>{events.push('first:'+value);return value.trim();},value=>{events.push('second:'+value);return value;}]);
  assert.deepEqual(reverseFindCharacterSplit('panic, selected, ', ',',maps,value=>{events.push('predicate:'+value);return value.length>0;}),some('selected'));
  assert.deepEqual(events,['first: ','second:','predicate:','first: selected','second:selected','predicate:selected']);
  assert.throws(()=>reverseFindCharacterSplit('x',',',Object.freeze([]),()=>{throw Error('selected predicate');}),/selected predicate/);
});
test('reverse runtime rejects caller iterator protocols, proxy/getter maps and non-bool predicates',()=>{
  let reads=0;const proxy=new Proxy([],{get(){reads++;throw Error('get');},getPrototypeOf(){reads++;throw Error('prototype');},ownKeys(){reads++;throw Error('keys');}});assert.throws(()=>reverseFindCharacterSplit('x',',',proxy,()=>true),TypeError);assert.equal(reads,0);
  const getter=[];Object.defineProperty(getter,'0',{get(){reads++;return value=>value;},enumerable:true});Object.freeze(getter);assert.throws(()=>reverseFindCharacterSplit('x',',',getter,()=>true),TypeError);assert.equal(reads,0);
  assert.throws(()=>reverseFindCharacterSplit('x',',',Object.freeze([]),()=>1),TypeError);
  const input={get [Symbol.iterator](){reads++;throw Error('iterator');}};assert.throws(()=>reverseFindCharacterSplit(input,',',Object.freeze([]),()=>true),TypeError);assert.equal(reads,0);
});
test('typed reverse split trim preserves borrowed results and genuine inherent precedence',{timeout:60_000},async()=>{
  const result=project('pub fn last(v:&str)->Option<&str>{v.split(\',\').map(str::trim).rfind(|s|!s.is_empty())}pub fn direct(v:&str)->Option<&str>{v.split(\'😀\').rfind(|s|!s.is_empty())}struct View{value:u8}impl View{fn rfind(&self,n:u8)->u8{self.value+n}}pub fn custom(n:u8)->u8{View{value:n}.rfind(2u8)}');assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{for(const [value,expected]of [['',none],[', ,',none],['a,b, ',some('b')],['a,\u0085',some('a')],['a,\uFEFF',some('\uFEFF')],['😀, Ω ',some('Ω')]])assert.deepEqual(api.last(value),expected);assert.deepEqual(api.direct('x😀y😀'),some('y'));assert.equal(api.custom(3n),5n);},{childTimeoutMs:30_000});
});
test('reverse predicate source effects short circuit in reverse order in both typed targets',{timeout:60_000},async()=>{
  const result=project('pub fn selected(v:&str)->Option<&str>{v.split(\',\').map(str::trim).rfind(|s|std::env::var(*s).is_ok())}');assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,(api,effects)=>{const calls=[],environment={get(key){calls.push(key);return key==='middle'?'present':undefined;}};assert.deepEqual(effects.withEffectCapabilities({environment},()=>api.selected('unvisited,middle,last')),some('middle'));assert.deepEqual(calls,['last','middle']);});
});
test('arbitrary reverse adapters, owned moves, wrong owners, UTF8 index search and const stay refused',()=>{
  for(const source of [
    'pub fn bad(v:&str)->Option<&str>{let it=v.split(\',\');it.rfind(|s|!s.is_empty())}',
    'pub fn bad(v:&str)->Option<&str>{v.split(\',\').filter(|_|true).rfind(|s|!s.is_empty())}',
    'pub fn bad(v:&str)->Option<String>{v.split(\',\').map(str::to_string).rfind(|s|!s.is_empty())}',
    'pub fn bad(v:&str)->Option<&str>{v.split(\',\').map(|s|if s.is_empty(){"other"}else{s}).rfind(|s|!s.is_empty())}',
    'pub fn bad(v:&str)->Option<&\'static str>{v.split(\',\').rfind(|s|!s.is_empty())}',
    'pub fn bad(v:String)->Option<&str>{v.as_str().split(\',\').rfind(|s|!s.is_empty())}',
    'pub fn bad(v:&str)->Option<usize>{v.rfind(\'(\')}',
    'pub const fn bad(v:&str)->Option<&str>{v.split(\',\').rfind(|s|!s.is_empty())}',
    'enum Option{Other}pub fn bad(v:&str)->Option{v.split(\',\').rfind(|s|!s.is_empty())}',
  ]){const result=project(source);assert.ok(result.meta.refused.some(entry=>entry.name==='bad'),source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false);}
});
test('reverse checked pipeline remains emit-capable after semantic roundtrip and rejects a changed plan',()=>{
  const source='pub fn last(v:&str)->Option<&str>{v.split(\',\').map(str::trim).rfind(|s|!s.is_empty())}fn main(){}',program=checkProgram(parseRust(source));
  assert.doesNotThrow(()=>emitJavaScript(roundTripProgram(program)));
  const find=value=>{if(!value||typeof value!=='object')return null;if(value.k==='routerReverseSplitFind')return value;for(const child of Object.values(value)){const node=find(child);if(node)return node;}return null;};
  const node=find(program.declarations.get('last').body);assert.ok(node);node.maps=[];assert.throws(()=>emitJavaScript(program),/reverse Split plan differs/);
});
