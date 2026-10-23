import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Buffer as NativeBuffer} from 'node:buffer';
import {serializeFlatSemanticJson,flatSemanticJsonMatches} from '../flat-semantic-json.mjs';
import * as original from '../semantic-meta.mjs';
import * as flat from '../semantic-meta-flat.mjs';
import {prepareFlatSemanticMeta} from '../prepare-flat-semantic-meta.mjs';
import {prepareProjectFlatSemanticEntry} from '../prepare-project-flat-semantic-entry.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject,originalProjectMethodFieldEvidenceGrouped} from '../project.mjs';
import {translateProject as translateFlatProject} from '../project-flat-semantic.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');

test('complete inert JSON preserves original Map encoding property order numeric and Unicode bytes',{timeout:60000},()=>{
 const record=Object.create(null);record['__proto__']='ordinary data';record['20']='twenty';record['3']='three';record.z='λ😀\ud800\udfff\0\r\n';record.a=undefined;
 const values=[null,true,false,0,-0,NaN,Infinity,'',record,[undefined,null,NaN,-0],new Map([['first',record],['second',[true,false]],['nested',new Map([['λ','😀']])]])];
 for(const value of values){const expected=JSON.stringify(value,(_,item)=>item instanceof Map?{$map:[...item]}:item);assert.equal(serializeFlatSemanticJson(value),expected);assert.equal(flatSemanticJsonMatches(value,expected),true);assert.equal(flatSemanticJsonMatches(value,expected+' '),false);}
 assert.equal(serializeFlatSemanticJson({second:2,first:1}),'\u007b"second":2,"first":1}');
});

test('copied semantic parser retains whole root declaration Map and canonical refusals',{timeout:60000},()=>{
 const program={schemaVersion:1,sourceLanguage:'Rust',items:[],declarations:new Map([['Unit',{k:'data',fullName:'Unit',modulePath:[],ctors:[]}]])};
 const wire=original.serializeProgram(program);assert.equal(flat.serializeProgram(program),wire);assert.deepEqual(flat.parseProgram(wire),original.parseProgram(wire));assert.deepEqual(flat.roundTripProgram(program),original.roundTripProgram(program));
 const malformed=[wire+' ',wire.replace('"schemaVersion":1','"schemaVersion":2'),wire.replace('"sourceLanguage":"Rust"','"sourceLanguage":"Other"'),wire.replace('"fullName":"Unit"','"fullName":"Wrong"'),wire.replace('"k":"data"','"k":"fn"')];
 const document=JSON.parse(wire);document.program.declarations.$map.push(document.program.declarations.$map[0]);malformed.push(JSON.stringify(document));
 for(const text of malformed)for(const parser of [original.parseProgram,flat.parseProgram])assert.throws(()=>parser(text));
});

test('observable proxies accessors callbacks cycles and foreign collections refuse without invocation',{timeout:60000},()=>{
 let calls=0;const getter={};Object.defineProperty(getter,'field',{enumerable:true,get(){calls++;throw Error('getter');}});
 const cycle={};cycle.self=cycle;const proxy=new Proxy({},{get(){calls++;throw Error('proxy get');},ownKeys(){calls++;throw Error('proxy keys');},getPrototypeOf(){calls++;throw Error('proxy parent');}});
 const custom=new Map();Object.defineProperty(custom,Symbol.iterator,{value(){calls++;throw Error('custom cursor');}});
 for(const input of [getter,cycle,proxy,custom,{toJSON(){calls++;throw Error('callback');}},[()=>{calls++;}],new Date(),1n,undefined])assert.throws(()=>serializeFlatSemanticJson(input),TypeError);
 assert.equal(calls,0);
});

test('both actual complete source copies retain original validation bodies native selections and full CST inverses',{timeout:60000},()=>{
 const plan=prepareFlatSemanticMeta(),entry=prepareProjectFlatSemanticEntry();assert.equal(plan.files.length,2);assert.equal(plan.originalAPIsUnchanged,true);assert.equal(plan.originalValidationsRetained,true);assert.equal(plan.newAcrossInvocationCache,false);
 assert.deepEqual(plan.files.map(row=>row.selections.length),[2,1]);assert.equal(entry.files.length,2);assert.equal(entry.privateIssuersNotCopied,true);assert.equal(entry.callerCannotSupplySemanticStorage,true);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.before,read(row.copiedFrom));assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.equal(stage.completeInverse,true);}}
 for(const row of entry.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.equal(stage.completeInverse,true);}}
 for(const name of ['translateProject','originalProjectMethodFieldEvidence','originalProjectMethodFieldEvidenceGrouped'])assert.ok(entry.files[0].unchangedOriginalFunctions.includes(name));
});

test('live Buffer binding methods accessors and prototype changes refuse without invoking replacements',{timeout:60000},()=>{
 let calls=0;
 for(const [owner,key]of [[NativeBuffer,'from'],[NativeBuffer,'concat'],[NativeBuffer,'byteLength'],[NativeBuffer.prototype,'toString'],[NativeBuffer.prototype,'utf16leSlice']]){
  const previous=Object.getOwnPropertyDescriptor(owner,key);if(!previous)continue;
  try{Object.defineProperty(owner,key,{...previous,value(){calls++;throw Error('replacement');}});assert.throws(()=>serializeFlatSemanticJson({value:'λ😀'}),/Buffer|native/);}
  finally{Object.defineProperty(owner,key,previous);}
 }
 const previous=Object.getOwnPropertyDescriptor(NativeBuffer,'from');try{Object.defineProperty(NativeBuffer,'from',{configurable:true,get(){calls++;throw Error('accessor');}});assert.throws(()=>serializeFlatSemanticJson({}),/Buffer|native/);}finally{Object.defineProperty(NativeBuffer,'from',previous);}
 const binding=Object.getOwnPropertyDescriptor(globalThis,'Buffer');try{Object.defineProperty(globalThis,'Buffer',{configurable:binding.configurable,enumerable:binding.enumerable,writable:true,value:new Proxy(NativeBuffer,{get(){calls++;throw Error('binding');}})});assert.throws(()=>serializeFlatSemanticJson({}),/Buffer|native/);}finally{Object.defineProperty(globalThis,'Buffer',binding);}
 assert.equal(calls,0);assert.equal(serializeFlatSemanticJson({value:'restored'}),'{"value":"restored"}');
});

test('complete retained actual project semantic document round trips with every original byte and declaration',{timeout:60000},()=>{
 const stored=read('tools/translation/projects/rust/src/lib.meta.json.parts/checkedSemanticProgram.json'),wire=stored.endsWith('\n')?stored.slice(0,-1):stored,program=flat.parseProgram(wire);
 assert.equal(program.sourceLanguage,'Rust');assert.ok(program.declarations.size>100);assert.equal(flat.serializeProgram(program),wire);
});

test('complete project sibling retains original outputs and executes independently strict compiled TypeScript',{timeout:60000},async()=>{
 const source='pub enum Mode {On,Off} pub struct Counter{value:u8} impl Counter{pub fn good(v:u8)->u8{v+2} pub fn read(&self)->u8{self.value}} pub fn run(v:u8)->u8{Counter::good(v)} pub fn read_counter(v:Counter)->u8{v.read()} pub fn choose(flag:bool)->u64{if flag{7}else{9}}',options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source};
 const before=translateProject(options),after=translateFlatProject(options);assert.equal(after.javascript,before.javascript);assert.equal(after.typescript,before.typescript);assert.deepEqual(after.meta,before.meta);
 for(const result of [before,after]){const method=result.checkedMethodDeclarations.find(row=>row.name==='read');assert.ok(method);assert.ok(originalProjectMethodFieldEvidenceGrouped(method));assert.throws(()=>originalProjectMethodFieldEvidenceGrouped(Object.freeze({...method})),TypeError);}
 let reads=0;const hostileOptions={...options};Object.defineProperty(hostileOptions,'semanticStorage',{get(){reads++;throw Error('caller codec');}});assert.equal(translateFlatProject(hostileOptions).javascript,after.javascript);assert.equal(reads,0);
 await verifyTypedTargets(after,api=>{assert.equal(api.choose(true),7n);assert.equal(api.choose(false),9n);assert.equal(api.run(3n),5n);assert.equal(api.read_counter(Object.freeze({$:'Counter',value:7n})),7n);assert.throws(()=>api.choose(0),TypeError);},{childTimeoutMs:20000});
});
