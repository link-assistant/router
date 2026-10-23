import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {serializeProjectMetaFieldUtf8 as originalBytes} from '../project-meta-field-json.mjs';
import {serializeProjectMetaFieldUtf8 as flatBytes} from '../project-meta-field-flat-json.mjs';
import {planCompressedProjectMetaUtf8ObjectStorage as originalPlan} from '../project-meta-compressed-storage.mjs';
import {planConsumedProjectMetaUtf8ObjectStorage as consumedPlan} from '../project-meta-consumed-storage.mjs';
import {prepareConsumedProjectMetaStorage} from '../prepare-consumed-project-meta-storage.mjs';
import {createConcreteSyntaxMeta,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const path='tools/translation/projects/rust/src/lib.meta.json';
function fixture(){return {schema:'owned-fixture',checkedSemanticProgram:{items:['λ😀'.repeat(2000)],value:17n},middle:{retained:true},targetSemanticProgram:{items:['x'.repeat(9000)],names:new Map([['20','twenty'],['3','three']])},concreteSyntaxMeta:[{source:'rust/src/lib.rs',document:createConcreteSyntaxMeta('pub fn value(v:u8)->u8{v+1}',{language:'Rust'})}],executable:false};}

test('owned field UTF8 preserves complete original BigInt Map coercion ordering and Unicode bytes',{timeout:60000},()=>{
 const record=Object.create(null);record.__proto__='ordinary';record['20']=20;record['3']=3;record.text='λ😀\ud800\udfff\0\r\n';record.missing=undefined;
 const map=new Map([[20,1n],['3',2n],['20',3n],[null,4n],[undefined,5n],[true,6n],[1n,7n],['1',8n],[Symbol('skip'),9n],['__proto__',record]]);
 const hidden={value:3,[Symbol('skip')]:true};Object.defineProperty(hidden,'hidden',{value:'omitted'});
 for(const input of [null,true,false,0,-0,NaN,Infinity,'',1n,-2n,record,map,[undefined,null,NaN,-0,7n,map],hidden,new Set([1]),new WeakMap(),new WeakSet(),/x/gu,new ArrayBuffer(3),fixture()])assert.deepEqual(flatBytes(input),originalBytes(input));
 assert.equal(flatBytes(new Map([['20',1n],['3',2n],[1n,3n],['1',4n]])).toString(),'{"1":{"$bigint":"4"},"3":{"$bigint":"2"},"20":{"$bigint":"1"}}');
});

test('owned field rejects observable values without invoking their callbacks',{timeout:60000},()=>{
 let calls=0;const getter={};Object.defineProperty(getter,'x',{enumerable:true,get(){calls++;}});
 const proxy=new Proxy({},{getPrototypeOf(){calls++;throw Error('proxy');},ownKeys(){calls++;throw Error('proxy');}}),key={toString(){calls++;throw Error('key');}},cycle={};cycle.self=cycle;
 for(const value of [getter,proxy,cycle,{toJSON(){calls++;}},new Map([[key,1]]),undefined,()=>{calls++;}])assert.throws(()=>flatBytes(value),TypeError);
 assert.equal(calls,0);
});

test('consuming storage retains every original output byte and consumes only selected owned fields',{timeout:60000},()=>{
 const untouched=fixture(),owned=fixture(),before=originalBytes(untouched),retained=owned.middle;
 const encoded=[],options={storageLimits:{fileBytes:18000,totalBytes:2000000}},expected=originalPlan(path,untouched,{...options,serializeUtf8:originalBytes}),actual=consumedPlan(path,owned,{...options,serializeUtf8(value){encoded.push(Object.keys(value)[0]);return flatBytes(value);}});
 assert.deepEqual(encoded.slice(0,3),['checkedSemanticProgram','targetSemanticProgram','concreteSyntaxMeta']);
 assert.deepEqual(actual,expected);assert.equal(actual.components.length,3);assert.deepEqual(originalBytes(untouched),before);assert.equal(owned.middle,retained);assert.deepEqual(Object.keys(owned),['schema','middle','executable']);
 assert.equal(owned.executable,false);assert.equal(untouched.checkedSemanticProgram.value,17n);
});

test('consuming storage preserves original bounds and checks nonconfigurable fields before consuming',{timeout:60000},()=>{
 const locked=fixture();Object.defineProperty(locked,'targetSemanticProgram',{configurable:false});let calls=0;
 assert.throws(()=>consumedPlan(path,locked,{serializeUtf8(){calls++;return Buffer.from('{}');}}),/configurable/);assert.equal(calls,0);assert.ok(locked.checkedSemanticProgram);
 for(const planner of [originalPlan,consumedPlan]){
  const meta=fixture();assert.throws(()=>planner(path,meta,{serializeUtf8:flatBytes,storageLimits:{fileBytes:100,totalBytes:2000000}}),/byte budget/);assert.ok(meta.checkedSemanticProgram);
  assert.throws(()=>planner(path,fixture(),{serializeUtf8:()=>Buffer.from('{"wrong":0}')}),/wrapper/);
  assert.throws(()=>planner(path,fixture(),{serializeUtf8:flatBytes,storageLimits:{fileBytes:67108865}}),/only be lowered/);
 }
 const owned=fixture();assert.throws(()=>consumedPlan(path,owned,{serializeUtf8(value){if(Object.hasOwn(value,'middle'))throw Error('later field failure');return flatBytes(value);}}),/later field failure/);
 assert.equal(Object.hasOwn(owned,'checkedSemanticProgram'),false);assert.equal(Object.hasOwn(owned,'targetSemanticProgram'),false);assert.equal(Object.hasOwn(owned,'concreteSyntaxMeta'),false);
});

test('consuming source copy preserves all unselected helpers full CST phases inverses and native bindings',{timeout:60000},()=>{
 const plan=prepareConsumedProjectMetaStorage(),[row]=plan.files;assert.equal(plan.originalAPIsUnchanged,true);assert.equal(plan.selectedFieldsEncodedFirst,true);assert.equal(plan.rootFieldsRetainedAsUtf8,true);assert.equal(plan.originalOutputKeyOrderRestored,true);assert.equal(plan.allOriginalValidationAndBoundsRetained,true);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.selectedOwnedValuesMayBeConsumedBeforeFailure,true);
 assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.before,readFileSync(new URL('../project-meta-compressed-storage.mjs',import.meta.url),'utf8'));assert.ok(row.unchangedFunctions.length>10);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.equal(stage.completeInverse,true);}
});

for(const field of ['checkedSemanticProgram','targetSemanticProgram','concreteSyntaxMeta'])test('complete retained '+field+' field encodes every original byte',{timeout:60000},()=>{
 const stored=readFileSync(new URL('../projects/rust/src/lib.meta.json.parts/'+field+'.json',import.meta.url)),document=JSON.parse(stored),actual=flatBytes(document);
 assert.equal(stored[stored.length-1],10);assert.deepEqual(actual,stored.subarray(0,-1));
});

test('primitive BigInt encoding cannot invoke replaced prototype conversion callbacks',{timeout:60000},()=>{
 const fields=['toString','toJSON'],before=fields.map(key=>Object.getOwnPropertyDescriptor(BigInt.prototype,key));let calls=0;
 try{for(const key of fields)Object.defineProperty(BigInt.prototype,key,{configurable:true,value(){calls++;throw Error('BigInt callback');}});
  for(const [value,decimal]of [[0n,'0'],[-17n,'-17'],[2n**256n,'115792089237316195423570985008687907853269984665640564039457584007913129639936']])assert.equal(flatBytes(value).toString(),'{"$bigint":"'+decimal+'"}');
 }finally{fields.forEach((key,index)=>{if(before[index])Object.defineProperty(BigInt.prototype,key,before[index]);else delete BigInt.prototype[key];});}
 assert.equal(calls,0);
});
