// Independent semantic/domain expectations SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {router_borrowed_text_map_matches_literals as matches} from '../borrowed-standard-map-20261102-runtime.mjs';
test('standard map flag lookup keeps inputs beyond old opaque entry and byte caps',()=>{
 const map=new Map(Array.from({length:5000},(_,at)=>['key-'+at,'unused']));map.set('huge','x'.repeat(1048577));
 assert.equal(matches(map,'stream',['true','1']),false);
 for(const [value,expected]of [['true',true],['1',true],['false',false],['TRUE',false],['',false]]){
  map.set('stream',value);assert.equal(matches(map,'stream',['true','1']),expected);assert.equal(map.size,5002);
 }assert.equal(map.get('huge').length,1048577);
});
test('captured native lookup never invokes subclass getters or whole-map iteration',()=>{
 let calls=0;class Native extends Map{get(){calls++;throw Error('overridden get');}has(){calls++;throw Error('overridden has');}entries(){calls++;throw Error('whole scan');}[Symbol.iterator](){calls++;throw Error('whole scan');}}
 const map=new Native();Map.prototype.set.call(map,'stream','true');Map.prototype.set.call(map,'unused',{get value(){calls++;throw Error('unobserved value');}});
 assert.equal(matches(map,'stream',['true','1']),true);assert.equal(matches(map,'missing',['true','1']),false);assert.equal(calls,0);
});
test('exact Unicode empty values and literal count match independently written native vectors',()=>{
 const map=new Map([['𐐀','é'],['','']]);assert.equal(matches(map,'𐐀',['é']),true);assert.equal(matches(map,'𐐀',['e\u0301']),false);
 assert.equal(matches(map,'',['']),true);assert.equal(matches(map,'',[]),false);assert.equal(matches(map,'𐐀',Array(64).fill('é')),true);
 assert.throws(()=>matches(map,'𐐀',Array(65).fill('é')),/bounded ordinary literal/u);
});
test('structural maps proxies selected nontext and effectful literal descriptors refuse',()=>{
 assert.throws(()=>matches({get:()=> 'true',has:()=>true},'stream',['true']),/genuine native Map/u);
 assert.throws(()=>matches(new Proxy(new Map(),{}),'stream',['true']),/genuine native Map/u);
 assert.throws(()=>matches(new Map([['stream',undefined]]),'stream',['true']),/observed value/u);
 const map=new Map([['stream','true']]),literals=[];let calls=0;Object.defineProperty(literals,0,{enumerable:true,get(){calls++;return 'true';}});
 assert.throws(()=>matches(map,'stream',literals),/accessor\/hole/u);assert.equal(calls,0);
 assert.throws(()=>matches(map,'stream',new Array(1)),/dense own literal|accessor\/hole/u);
 assert.throws(()=>matches(map,'\ud800',['true']),/unpaired surrogate/u);assert.throws(()=>matches(map,'stream',['\ud800']),/unpaired surrogate/u);
});
