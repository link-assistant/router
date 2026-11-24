import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {serializeSourceMapJson,digestSourceMapJson} from '../source-map-json.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function check(value){const expected=Buffer.from(JSON.stringify(value)+'\n');assert.deepEqual(serializeSourceMapJson(value),expected);assert.deepEqual(digestSourceMapJson(value,expected),{bytes:expected.length,sha256:hash(expected),matches:true});return expected;}
test('complete owned source maps preserve native property order, metadata and Unicode bytes',()=>{
 for(const sources of [{},{b:{source:'λ😀\r\n',canonical:'"\\ud800"'},a:{source:'\ud800',extra:[null,false,1]}},{'10':{source:'ten'},'2':{source:'two'},z:null}]){
  check({schema:'fixture',sources,metadata:{nested:{keep:['猫',false,null]}},last:true});check({sources,last:true,schema:'fixture'});
 }
 check({sources:{empty:undefined,callable:()=>{},symbol:Symbol('x'),keep:{source:'yes'}},missing:undefined});
});
test('scalar and ordinary JSON fallbacks retain the original native serializer',()=>{
 for(const value of [null,true,false,1,'λ😀',[],[1,null],{},new Date(0),{sources:new Map()}])check(value);
 check({toJSON(){return {sources:{x:{source:'kept'}}};}});check({sources:{toJSON(){return {x:'kept'};}}});
 const value={sources:{x:1n}};assert.throws(()=>serializeSourceMapJson(value),TypeError);assert.throws(()=>digestSourceMapJson(value),TypeError);
});
test('every original byte is compared, including late differences and extra or missing bytes',()=>{
 const value={schema:'fixture',sources:Object.fromEntries(Array.from({length:20000},(_,index)=>[String(index),{source:'λ😀\n'+index,meta:{keep:true}}]))},expected=check(value);
 for(const changed of [Buffer.concat([expected,Buffer.from('extra')]),expected.subarray(0,-1),Buffer.from(expected)]){
  if(changed.length===expected.length)changed[changed.length-2]^=1;
  assert.equal(digestSourceMapJson(value,changed).matches,false);
 }
 assert.equal(digestSourceMapJson(value).matches,null);
});
