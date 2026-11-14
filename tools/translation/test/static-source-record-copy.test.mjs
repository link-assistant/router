import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {sourceItems} from '../rust-structure.mjs';
import {createStaticSourceItemReader} from '../static-source-items.mjs';

test('complete Router sources keep lexer field order descriptors and independently mutable tokens',{timeout:10000},()=>{
 const read=createStaticSourceItemReader();
 for(const path of ['account_routing_policy.rs','subscription_usage_normalize.rs','config.rs']){
  const source=readFileSync(new URL('../../../rust/src/'+path,import.meta.url),'utf8'),pin=Object.freeze({source});
  const expected=sourceItems(source),first=read(pin),second=read(pin);
  assert.deepEqual(first,expected);assert.deepEqual(second,expected);
  assert.equal(JSON.stringify(first),JSON.stringify(expected));
  assert.notEqual(first,second);assert.equal(Object.getPrototypeOf(first),Array.prototype);
  for(let index=0;index<expected.length;index++){
   const actual=second[index],original=expected[index];
   assert.deepEqual(Object.getOwnPropertyDescriptors(actual),Object.getOwnPropertyDescriptors(original));
   assert.equal(Object.getPrototypeOf(actual),Object.prototype);assert.equal(Object.isFrozen(actual),false);
   for(let at=0;at<original.tokens.length;at++){
    const token=actual.tokens[at];
    assert.deepEqual(Object.getOwnPropertyDescriptors(token),Object.getOwnPropertyDescriptors(original.tokens[at]));
    assert.equal(Object.getPrototypeOf(token),Object.prototype);assert.equal(Object.isFrozen(token),false);
    assert.notEqual(token,first[index].tokens[at]);
   }
  }
  first[0].tokens[0].text='caller mutation';first[0].name='caller mutation';
  assert.deepEqual(read(pin),expected);
 }
});

test('inherited named setters cannot intercept records on either cache miss or hit',{timeout:10000},()=>{
 const source='// Ω😀\npub fn original(value:&str)->bool{value=="Ω😀"}\n';
 const script=`
 import {sourceItems} from ${JSON.stringify(new URL('../rust-structure.mjs',import.meta.url).href)};
 import {createStaticSourceItemReader} from ${JSON.stringify(new URL('../static-source-items.mjs',import.meta.url).href)};
 const source=${JSON.stringify(source)},keys=['start','end','comment','tokens','term','name','type','text'];
 const pin=Object.freeze({source}),read=createStaticSourceItemReader(),define=Object.defineProperty,descriptor=Object.getOwnPropertyDescriptor,stringify=JSON.stringify;
 let callbacks=0,result;const before=keys.map(key=>[key,descriptor(Object.prototype,key)]);
 try{
  for(const key of keys)define(Object.prototype,key,{configurable:true,set(){callbacks++;throw Error('inherited '+key);}});
  const expected=sourceItems(source),first=read(pin),second=read(pin);result={expected,first,second,callbacks};
 }finally{
  for(const [key,prior]of before)if(prior)define(Object.prototype,key,prior);else delete Object.prototype[key];
 }
 process.stdout.write(stringify(result));`;
 const raw=execFileSync(process.execPath,['--input-type=module','--eval',script],{encoding:'utf8',timeout:8000,maxBuffer:8*1024*1024});
 const result=JSON.parse(raw);assert.equal(result.callbacks,0);
 assert.deepEqual(result.first,result.expected);assert.deepEqual(result.second,result.expected);
});
