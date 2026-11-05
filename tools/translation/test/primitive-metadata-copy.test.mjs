import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePrimitiveMetadataCopy} from '../prepare-primitive-metadata-copy.mjs';
import {createOriginalDigestMetadataCopierForInternalSources as previous} from '../original-json-intrinsics.mjs';
import {createPrimitiveMetadataCopier as current} from '../primitive-metadata-copy.mjs';
import * as copiedFactory from '../primitive-metadata-copy.mjs';
import {copyMetadata,ordinal} from '../extensions/source-links.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const encode=value=>JSON.stringify(value,(_,item)=>typeof item==='bigint'?{$integer:item.toString()}:item);
function outcome(factory,value){try{return {value:factory(copyMetadata,ordinal)(value)};}catch(error){return {error:{name:error.name,message:error.message}};}}

test('complete native private-kernel copy retains all original primitive statements both CST phases and every inverse',{timeout:60000},()=>{
 const plan=preparePrimitiveMetadataCopy();assert.equal(plan.files.length,2);assert.equal(plan.oldFactoryUnchanged,true);assert.equal(plan.allOriginalChecksRetained,true);assert.equal(plan.oldHashAndJsonExpressionUnchanged,true);assert.equal(plan.newCaches,false);assert.equal(plan.performanceQualified,false);assert.equal(plan.sourceAuthority,false);assert.equal(plan.kernel.nativeSelections.length,1);assert.ok(plan.kernel.after.includes(plan.kernel.compositeSource));assert.equal(plan.kernel.originalRecursiveCalls.length,3);for(const call of plan.kernel.originalRecursiveCalls)assert.ok(plan.kernel.after.includes(call));assert.equal(plan.files[0].originalPrivateFastPathRetained,true);assert.deepEqual(Object.keys(copiedFactory),['createPrimitiveMetadataCopier']);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}}
 assert.equal(plan.pinnedHostUnchanged,true);assert.equal(plan.allOriginalParameterDefaultsRetained,true);assert.ok(plan.kernel.after.includes(plan.kernel.primitivePrefix.source));assert.ok(plan.kernel.after.includes('function copyMetadata('+plan.kernel.parameterSource+')'));assert.equal(plan.kernel.allOriginalParameterDefaultsRetained,true);assert.equal(previous(copyMetadata,ordinal).length,current(copyMetadata,ordinal).length);
});

test('all primitive values ordering certificates fresh aliases and null prototypes match the unchanged copier',{timeout:60000},()=>{
 const shared={a:1,z:'λ😀\ud800'},record=Object.create(null);Object.defineProperty(record,'__proto__',{value:{key:3},enumerable:true});const value={z:[null,undefined,true,false,123n,-0,'',shared,shared],a:record,copyCertificate:{z:1,a:{z:2,a:3}}},old=outcome(previous,value),actual=outcome(current,value);assert.deepEqual(actual,old);assert.equal(encode(actual),encode(old));assert.equal(Object.getPrototypeOf(actual.value),null);assert.deepEqual(Object.keys(actual.value.copyCertificate),['z','a']);assert.notEqual(actual.value.z[7],actual.value.z[8]);shared.a=9;assert.equal(actual.value.z[7].a,1);
});

test('complete unsupported shapes cell byte and depth boundaries keep original refusals',{timeout:60000},()=>{
 const hidden={};Object.defineProperty(hidden,'x',{value:1});const getter={};let calls=0;Object.defineProperty(getter,'x',{enumerable:true,get(){calls++;throw Error('unexpected getter');}});const cycle={};cycle.x=cycle;const extra=[1];extra.x=2;let atDepth=null;for(let index=0;index<160;index++)atDepth={value:atDepth};
 for(const value of [getter,hidden,cycle,new Proxy({},{ownKeys(){calls++;throw Error('unexpected proxy');}}),new Map(),new Date(),()=>{},Symbol('x'),NaN,1.5,Array(2),extra,Array.from({length:199999},()=>null),Array.from({length:200000},()=>null),'λ'.repeat(2097152),'λ'.repeat(2097152)+'x',atDepth,{value:atDepth}])assert.deepEqual(outcome(current,value),outcome(previous,value));assert.equal(calls,0);
});

test('primitive callbacks retain callee receivers fresh native stacks and late inherited-option observations',{timeout:60000},()=>{
 const get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,number=get(Number,'isSafeInteger'),formatter=get(Error,'prepareStackTrace'),limit=get(Error,'stackTraceLimit'),cells=get(Object.prototype,'cells'),tapes=[],observations=[];
 try{
  define(Error,'stackTraceLimit',{value:1000,writable:true,configurable:true});
  define(Error,'prepareStackTrace',{value:(_error,frames)=>frames.map(frame=>frame.getFunctionName()),configurable:true});
  for(const factory of [previous,current]){
   const tape=[],stacks=[];let first=true;define(Number,'isSafeInteger',{...number,value:function isSafeInteger(value){const stack=new Error().stack;assert.ok(Array.isArray(stack)||typeof stack==='string');assert.ok(stack.length>0);stacks.push(stack);tape.push({kind:'number',value,receiver:this===Number});if(first){first=false;define(Object.prototype,'cells',{configurable:true,get(){tape.push({kind:'cells'});return 200000;}});}return Reflect.apply(number.value,this,[value]);}});
   const value=factory(copyMetadata,ordinal)({a:1,b:2,c:[3,'λ',null]});tapes.push({tape,wire:encode(value)});observations.push(stacks);if(cells)define(Object.prototype,'cells',cells);else delete Object.prototype.cells;
  }
 }finally{define(Number,'isSafeInteger',number);if(formatter)define(Error,'prepareStackTrace',formatter);else delete Error.prepareStackTrace;if(limit)define(Error,'stackTraceLimit',limit);else delete Error.stackTraceLimit;if(cells)define(Object.prototype,'cells',cells);else delete Object.prototype.cells;}
 // Existing private-copy contracts explicitly exclude private frame equality.
 // JSC may inline the dispatcher entirely; retain each native observation.
 assert.equal(observations[1].length,observations[0].length);assert.ok(observations[0].length>0);assert.deepEqual(tapes[1],tapes[0]);assert.ok(tapes[0].tape.some(row=>row.kind==='cells'));assert.ok(tapes[0].tape.filter(row=>row.kind==='number').every(row=>row.receiver));
});
