// Independent optional ABI regression SOURCE. Every new case is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as runtime from '../json-option-runtime.mjs';
import {serde_json_from_str} from '../extensions/json-runtime.mjs';
import {prepareOptionalJsonReaderSources} from '../prepare-optional-json-reader-sources.mjs';
const limits={timeout:60000},some=field0=>({$:'Some',field0}),none={$:'None'};
const names=['as_str','as_bool','as_u64','as_i64','as_f64','as_null','as_number','as_array','as_object'];
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function json(source){const parsed=serde_json_from_str(source);assert.equal(parsed.$,'Ok');return freeze(parsed.field0);}
const call=(name,value)=>runtime['router_core_json_option_'+name](value);
test('all nine readers preserve None and independent scalar and borrowed payload cases',limits,()=>{
 for(const name of names){assert.deepEqual(call(name,none),none);assert.equal(Object.isFrozen(call(name,none)),true);}
 const cases=[['null','Null',null],['false','Bool',null],['true','Bool',null],['""','String',null],['"猫😀\\u0000\\r\\n"','String',null],['[]','Array',null],['[false,{"Ω":null}]','Array',null],['{}','Object',null],['{"__proto__":"safe","猫":"😀"}','Object',null],['0','Number',0],['-1','Number',-1],['1.5','Number',1.5],['-0.0','Number',-0],['18446744073709551615','Number',18446744073709551616]];
 for(const [source,kind,number]of cases){const value=json(source),input=some(value),expected={as_str:kind==='String'?some(value.field0):none,as_bool:kind==='Bool'?some(value.field0):none,as_null:kind==='Null'?some(null):none,as_f64:kind==='Number'?some(number):none,as_number:kind==='Number'?some(value.field0):none,as_array:kind==='Array'?some(value.field0):none,as_object:kind==='Object'?some(value.field0):none};assert.equal(value.$,kind);
  for(const name of ['as_str','as_bool','as_null','as_f64','as_number','as_array','as_object']){const result=call(name,input);assert.deepEqual(result,expected[name],source+' '+name);assert.equal(Object.isFrozen(result),true);if(result.$==='Some'&&['as_number','as_array','as_object'].includes(name))assert.strictEqual(result.field0,value.field0);}
 }
 const positive=freeze({$:'Number',field0:{$:'PosInt',field0:18446744073709551615n}}),negative=freeze({$:'Number',field0:{$:'NegInt',field0:-9223372036854775808n}}),float=freeze({$:'Number',field0:{$:'Float',field0:1.0}});
 assert.deepEqual(call('as_u64',some(positive)),some(18446744073709551615n));assert.deepEqual(call('as_i64',some(positive)),none);assert.deepEqual(call('as_i64',some(negative)),some(-9223372036854775808n));assert.deepEqual(call('as_u64',some(negative)),none);assert.deepEqual(call('as_u64',some(float)),none);assert.deepEqual(call('as_i64',some(float)),none);
 assert.deepEqual(call('as_f64',some(json('"1.5"'))),none);assert.ok(Object.is(call('as_f64',some(freeze({$:'Number',field0:{$:'Float',field0:-0}}))).field0,-0));
});
test('borrowed aggregate readers retain the original wider opaque view limits without copying input storage',limits,()=>{
 const nullValue=Object.freeze({$:'Null'}),items=Object.freeze(Array(5000).fill(nullValue)),wide=Object.freeze({$:'Array',field0:items});assert.strictEqual(call('as_array',some(wide)).field0,items);assert.deepEqual(call('as_str',some(wide)),none);
 let deep=nullValue;for(let at=0;at<40;at++)deep=Object.freeze({$:'Array',field0:Object.freeze([deep])});assert.strictEqual(call('as_array',some(deep)).field0,deep.field0);assert.deepEqual(call('as_str',some(deep)),none);
});
test('every reader rejects malformed or mutable payloads and refuses getters proxies and closed None extras before observing them',limits,()=>{
 let reads=0;const accessor=Object.defineProperty({$:'Some'},'field0',{enumerable:true,get(){reads++;return json('null');}}),extra=Object.defineProperty({$:'None'},'field0',{enumerable:true,get(){reads++;return json('null');}}),proxy=new Proxy({$:'Some',field0:json('null')},{get(){reads++;throw Error('proxy');},getPrototypeOf(){reads++;throw Error('proxy');},ownKeys(){reads++;throw Error('proxy');},getOwnPropertyDescriptor(){reads++;throw Error('proxy');}});
 const bad=[accessor,extra,proxy,some({$:'String',field0:'not frozen'}),some(freeze({$:'Number',field0:{$:'PosInt',field0:18446744073709551616n}})),some(freeze({$:'Number',field0:{$:'Float',field0:Infinity}})),some(freeze({$:'String',field0:'\ud800'})),{$:'Unknown'}];
 for(const name of names)for(const input of bad)assert.throws(()=>call(name,input),TypeError,name);assert.equal(reads,0);
});
test('new readers use captured numeric and integrity operations after stock initialization',limits,()=>{
 const input=some(json('1.5')),integer=some(json('7')),NumberValue=globalThis.Number,freezeValue=Object.freeze;let calls=0,decimalResult,integerResult;
 try{globalThis.Number=()=>{calls++;throw Error('late Number');};Object.freeze=()=>{calls++;throw Error('late freeze');};decimalResult=call('as_f64',input);integerResult=call('as_u64',integer);}finally{globalThis.Number=NumberValue;Object.freeze=freezeValue;}assert.deepEqual(decimalResult,some(1.5));assert.deepEqual(integerResult,some(7n));assert.equal(calls,0);
});
test('eighteen whole source equations preserve original modules both ordered sequences and complete inverses',limits,()=>{
 const plan=prepareOptionalJsonReaderSources();assert.equal(plan.files.length,18);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
