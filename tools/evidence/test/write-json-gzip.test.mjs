import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync,gunzipSync} from 'node:zlib';
import {writeJsonGzip} from '../write-json-gzip.mjs';
import {writeJsonTextGzip} from '../write-json-gzip.mjs';
const legacy=(path,value,replacer)=>writeFileSync(path,gzipSync(JSON.stringify(value,replacer)+'\n',{mtime:0}));
const json=JSON.stringify,descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
const temporary=run=>{const directory=mkdtempSync(join(tmpdir(),'router-json-gzip-'));try{return run(directory);}finally{rmSync(directory,{recursive:true,force:true});}};
const decoded=path=>gunzipSync(readFileSync(path));
const replace=(_key,value)=>typeof value==='bigint'?{$integer:value.toString()}:value;

test('complete gzip output reconstructs native JSON with original BigInt normalization and Unicode',{timeout:5000},()=>temporary(directory=>{
 const value={text:'猫😀\ud800\n',missing:undefined,array:[undefined,null,true,-0,NaN,Infinity,9n],nested:{'__proto__':null,constructor:'data'},integer:18446744073709551615n};
 const before=join(directory,'before.gz'),after=join(directory,'after.gz');legacy(before,value,replace);writeJsonGzip(after,value,replace);assert.deepEqual(decoded(after),decoded(before));assert.equal(decoded(after).toString(),json(value,replace)+'\n');
}));

test('two complete members include the exact JSON member and the exact final newline member',{timeout:5000},()=>temporary(directory=>{
 const value={network:['a','Ω😀'],empty:{}},path=join(directory,'value.gz');writeJsonGzip(path,value,replace);const first=gzipSync(json(value,replace),{mtime:0}),last=gzipSync('\n',{mtime:0}),actual=readFileSync(path);assert.deepEqual(actual.subarray(0,first.length),first);assert.deepEqual(actual.subarray(first.length),last);assert.equal(actual.length,first.length+last.length);assert.deepEqual(decoded(path),Buffer.from(json(value,replace)+'\n'));
}));

test('original getter toJSON and replacer callback order remains complete and once-only',{timeout:5000},()=>temporary(directory=>{
 const run=(write,name)=>{const tape=[],value={get first(){tape.push('get:first');return 1;},nested:{toJSON(key){tape.push('toJSON:'+key);return {answer:2};}},array:[3,undefined]};const replacer=function(key,item){tape.push(['replace',key,Array.isArray(this)?'array':typeof this]);return item;};const path=join(directory,name);write(path,value,replacer);return {tape,bytes:decoded(path).toString()};};assert.deepEqual(run(writeJsonGzip,'after.gz'),run(legacy,'before.gz'));
}));

test('JSONStringify hooks retain one call receiver coercions and errors',{timeout:5000},()=>temporary(directory=>{
 const previous=descriptor(JSON,'stringify');
 for(const mode of ['string','undefined','number','object','symbol']){
  const run=(write,name)=>{const tape=[];let outcome;try{define(JSON,'stringify',{...previous,value:function(...args){tape.push({op:'stringify',receiver:this===JSON,argc:args.length});if(mode==='string')return 'custom';if(mode==='undefined')return undefined;if(mode==='number')return 7;if(mode==='symbol')return Symbol('refused');return {[Symbol.toPrimitive](hint){tape.push({op:'coercion',hint});return 'coerced';}};}});try{write(join(directory,name),{},replace);outcome={bytes:decoded(join(directory,name)).toString()};}catch(error){outcome={error:error.name,message:error.message};}}finally{define(JSON,'stringify',previous);}return {tape,outcome};};assert.deepEqual(run(writeJsonGzip,'after-'+mode),run(legacy,'before-'+mode));
 }
}));

test('native undefined roots and failing inputs preserve bytes or leave no partial output',{timeout:5000},()=>temporary(directory=>{
 for(const [index,value]of [undefined,Symbol('root'),function root(){},null,42].entries()){const before=join(directory,'before'+index),after=join(directory,'after'+index);legacy(before,value);writeJsonGzip(after,value);assert.deepEqual(decoded(after),decoded(before));}
 const cycle={};cycle.self=cycle;for(const [index,value]of [1n,cycle,{get failure(){throw Error('source getter');}}].entries()){const run=(write,name)=>{let caught;try{write(join(directory,name),value);}catch(error){caught={name:error.name,message:error.message};}assert.ok(caught);assert.equal(existsSync(join(directory,name)),false);return caught;};assert.deepEqual(run(writeJsonGzip,'bad-after'+index),run(legacy,'bad-before'+index));}
}));

test('large full evidence retains every module source and decoded byte',{timeout:20000},()=>temporary(directory=>{
 const source='Rust source 猫😀 \ud800\n'.repeat(6000),value={originalInputs:{sources:60},modules:Array.from({length:60},(_value,index)=>({file:'src/module_'+index+'.rs',source,items:[{source}]})),context:{diagnostics:[],authority:false}};const expected=Buffer.from(json(value,replace)+'\n'),before=join(directory,'large-before.gz'),after=join(directory,'large-after.gz');assert.ok(expected.length>8*1024*1024);legacy(before,value,replace);writeJsonGzip(after,value,replace);assert.deepEqual(decoded(before),expected);assert.deepEqual(decoded(after),expected);assert.equal(JSON.parse(decoded(after)).modules.length,60);
}));


test('caller-encoded text preserves captured serialization coercions complete bytes and once-only effects',{timeout:20000},()=>temporary(directory=>{
 const legacyText=(path,encoded)=>writeFileSync(path,encoded+'\n');
 const read=(path,packed)=>packed?decoded(path):readFileSync(path);
 const capturedRun=(write,label,packed)=>{
  const tape=[],path=join(directory,label),previous=descriptor(JSON,'stringify');let calls=0;
  const value={get first(){tape.push('get:first');return '猫😀\ud800';},nested:{toJSON(key){tape.push('toJSON:'+key);return {answer:9n};}}};
  const replacer=function(key,item){tape.push(['replace',key,Array.isArray(this)?'array':typeof this]);return typeof item==='bigint'?{$integer:String(item)}:item;};
  const captured=function(...args){calls++;tape.push({op:'captured-json',receiverUndefined:this===undefined,argc:args.length});return Reflect.apply(json,JSON,args);};
  try{define(JSON,'stringify',{...previous,value(){throw Error('live JSON serializer must not be selected');}});write(path,captured(value,replacer));}
  finally{define(JSON,'stringify',previous);}
  assert.equal(calls,1);return {tape,bytes:read(path,packed)};
 };
 const before=capturedRun(legacyText,'captured-before',false),after=capturedRun(writeJsonTextGzip,'captured-after.gz',true);
 assert.deepEqual(after.tape,before.tape);assert.ok(after.bytes.equals(before.bytes));assert.deepEqual(after.tape[0],{op:'captured-json',receiverUndefined:true,argc:2});
 const factories=[()=>'',()=>undefined,()=>null,()=>7,()=>9n,()=>Symbol('refused'),tape=>({[Symbol.toPrimitive](hint){tape.push(hint);return 'coerced 猫😀\udfff';}}),tape=>({[Symbol.toPrimitive](hint){tape.push(hint);throw Error('encoded coercion failed');}})];
 for(const [index,factory]of factories.entries()){
  const run=(write,label,packed)=>{const tape=[],path=join(directory,label);let outcome;try{write(path,factory(tape));outcome={bytes:read(path,packed).toString('base64')};}catch(error){outcome={error:error.name,message:error.message};assert.equal(existsSync(path),false);}return {tape,outcome};};
  assert.deepEqual(run(writeJsonTextGzip,'text-after-'+index+'.gz',true),run(legacyText,'text-before-'+index,false));
 }
 const encoded='complete evidence 猫😀\ud800\n'.repeat(40000),large=join(directory,'encoded-large.gz'),expected=Buffer.from(encoded+'\n');
 assert.ok(expected.length>1024*1024);writeJsonTextGzip(large,encoded);assert.ok(decoded(large).equals(expected));
 const payload=gzipSync(encoded,{mtime:0}),newline=gzipSync('\n',{mtime:0}),actual=readFileSync(large);
 assert.ok(actual.subarray(0,payload.length).equals(payload));assert.ok(actual.subarray(payload.length).equals(newline));
}));
