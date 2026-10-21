import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeCompleteClosedJsonDagHookWire as encode,decodeCompleteClosedJsonDagHookWire as decode,compareCompleteClosedJsonDagHookWires as compare} from './fixtures/complete-closed-json-dag-hook-wire.mjs';
import {encodeCompleteHookWire,decodeCompleteHookWire} from './fixtures/complete-hook-wire.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
const projection=value=>JSON.parse(JSON.stringify(value));

test('closed class DATA retains the complete native JSON projection including every Buffer and Uint8 byte',{timeout:60000},()=>{
 class Result {constructor(){this.rows=[{accepted:true,discard:undefined},Buffer.from([0,255,17]),new Uint8Array([1,250])];this.empty=new Map();this.set=new Set([1]);this.omit=()=>1;this.symbol=Symbol('omitted');this.numbers=[NaN,Infinity,-Infinity,-0,undefined,()=>0,Symbol('null')];}}
 const source=new Result(),wire=encode(source),actual=decode(wire);assert.deepStrictEqual(projection(actual),projection(source));compare(wire,encode(actual));assert.deepStrictEqual(actual.rows[1],Buffer.from([0,255,17]));
 compare(encode(Buffer.from([0,255,17])),encode({type:'Buffer',data:[0,255,17]}));compare(encode(new Uint8Array([1,250])),encode({'0':1,'1':250}));compare(encode(Object.create(null)),encode({}));
 const plain={};Object.defineProperty(plain,'__proto__',{value:{retained:'own original field'},enumerable:true});assert.deepStrictEqual(projection(decode(encode(plain))),projection(plain));
});

test('full structural interning normalizes distinct aliases while retaining all repeated array occurrences and nested mutations',{timeout:60000},()=>{
 const leaf={payload:'original source and Hash payload '.repeat(128),values:Array.from({length:2048},(_,at)=>({ordinal:at,value:'every complete field '.repeat(24)}))},source={events:Array.from({length:700},()=>({operation:'Hash.update',args:[leaf,'utf8']})),tail:{value:'complete final result'}};
 // The expanded logical JSON exceeds the old representation budget; no giant
 // expanded string is created to establish this deliberately conservative bound.
 assert.ok(leaf.values[0].value.length*700*2048>512*1024*1024);const wire=encode(source),actual=decode(wire),sizes=compare(wire,wire);assert.ok(sizes.left.logicalBytes<=384*1024*1024);assert.ok(sizes.left.storedBytes<=64*1024*1024);assert.equal(actual.events.length,700);
 for(const event of actual.events){assert.equal(event.operation,'Hash.update');assert.equal(event.args[0].payload,leaf.payload);assert.equal(event.args[0].values.length,2048);assert.deepStrictEqual(event.args[0].values[2047],leaf.values[2047]);assert.equal(event.args[1],'utf8');}assert.deepStrictEqual(actual.tail,source.tail);
 const shared={rows:[{value:'same full value',array:[1,2,300]}]},a={first:shared,second:shared},b={first:structuredClone(shared),second:structuredClone(shared)};compare(encode(a),encode(b));
 b.second.rows[0].array[2]=301;assert.throws(()=>compare(encode(a),encode(b)),/complete decoded bytes/u);assert.equal(decode(encode(b)).second.rows[0].array[2],301);compare(wire,encode(source));
});

test('canonical strings key order inherited array DATA and projected depth retain native JSON semantics',{timeout:60000},()=>{
 const parent=Object.create(Array.prototype);Object.defineProperty(parent,'1',{value:'inherited original DATA',enumerable:true});const sparse=new Array(4);Object.setPrototypeOf(sparse,parent);sparse[3]=undefined;
 const source={'10':'integer order','2':'first integer',marker:'@node:0 @s:1',text:'x'.repeat(32767)+'😀\ud800',sparse,ignored:undefined};Object.defineProperty(source,'hidden',{get(){throw Error('must not read ignored accessor');}});
 const wire=encode(source);assert.deepStrictEqual(projection(decode(wire)),projection(source));compare(wire,encode(decode(wire)));
 const nested=(depth,value)=>{for(let at=0;at<depth;at++)value={child:value};return value;};
 assert.equal(JSON.stringify(decode(encode(nested(512,'bottom')))),JSON.stringify(nested(512,'bottom')));assert.throws(()=>encode(nested(513,'bottom')),/full bounded node/u);
 // A compact byte node still has its implicit numeric JSON child depth.
 encode(nested(510,Buffer.from([1])));assert.throws(()=>encode(nested(511,Buffer.from([1]))),/full bounded node/u);
});

test('callback-bearing and late-hook domains refuse without invoking input getters proxies toJSON or stack formatting',{timeout:60000},()=>{
 let calls=0;const getter=()=>{calls++;return 1;},cycle={};cycle.self=cycle;
 const proxy=new Proxy({value:1},{ownKeys(){calls++;return [];},getOwnPropertyDescriptor(){calls++;return undefined;},getPrototypeOf(){calls++;return null;}}),extra=new Uint8Array([1]);extra.tail=2;
 const cases=[cycle,proxy,Object.create(proxy),new Number(1),1n,{toJSON:getter},Object.create({toJSON:getter}),Object.defineProperty({},'toJSON',{get:getter}),Object.defineProperty({},'field',{get:getter,enumerable:true}),Object.defineProperty({},'stack',{get:getter}),Object.defineProperty([],'stack',{get:getter}),new Error('never materialize stack'),extra,new (class Bytes extends Uint8Array {})([1])];
 if(typeof SharedArrayBuffer==='function')cases.push(new Uint8Array(new SharedArrayBuffer(1)));
 for(const value of cases)assert.throws(()=>encode(value),/full bounded node/u);assert.equal(calls,0);
 const old=Object.getOwnPropertyDescriptor(Buffer.prototype,'toJSON');try{Object.defineProperty(Buffer.prototype,'toJSON',{...old,value:getter});assert.throws(()=>encode(Buffer.from([1])),/full bounded node/u);}finally{Object.defineProperty(Buffer.prototype,'toJSON',old);}assert.equal(calls,0);
 const arrayMethod=Object.getOwnPropertyDescriptor(Array.prototype,'map');try{Object.defineProperty(Array.prototype,'map',{...arrayMethod,value:getter});assert.throws(()=>encode({value:1}),/full bounded node/u);}finally{Object.defineProperty(Array.prototype,'map',arrayMethod);}assert.equal(calls,0);assert.deepStrictEqual(decode(encode({retained:true})),{retained:true});
});

test('validly reframed corruptions cannot bypass complete DAG schema base64 postorder uniqueness or reachability',{timeout:60000},()=>{
 const wire=encode({rows:[{text:'original payload',bytes:new Uint8Array([1,255])}],tail:'all fields retained'});
 for(const kind of ['unusedNode','duplicateNode','unusedString','duplicateString','forward','root','base64','extra','tag']){
  const data=decodeCompleteHookWire(wire);
  if(kind==='unusedNode')data.nodes.push(['b',false]);else if(kind==='duplicateNode')data.nodes.push([...data.nodes[0]]);else if(kind==='unusedString')data.strings.push(['not originally referenced']);else if(kind==='duplicateString')data.strings.push([...data.strings[0]]);
  else if(kind==='forward'){const at=data.nodes.findIndex(row=>row[0]==='o');data.nodes[at][1][0][1]=at;}
  else if(kind==='root')data.root=data.nodes.length;
  else if(kind==='base64'){const row=data.nodes.find(row=>row[0]==='o8');data.strings[row[1]]=['AQ'];}
  else if(kind==='extra')data.extra='unrecognized';else data.nodes[0][0]='unknown';
  const changed=encodeCompleteHookWire(data);assert.throws(()=>decode(changed),/full bounded node/u);assert.throws(()=>compare(wire,changed),/complete decoded bytes/u);
 }
 const changed=decode(wire);changed.rows[0].text+=' actual nested mutation';assert.throws(()=>compare(wire,encode(changed)),/complete decoded bytes/u);assert.equal(decode(wire).tail,'all fields retained');
});

test('complete authored closed DAG source retains separate language and repository serialized CST stages and whole inverses',{timeout:60000},()=>{
 const name=new URL('./fixtures/complete-closed-json-dag-hook-wire.mjs',import.meta.url),source=readFileSync(name,'utf8'),first=transportConcreteSyntaxSource(source,{language:'JavaScript'});let document=transportConcreteSyntaxMeta(first.meta).document;
 for(const sequence of [{languageRules:[{id:'javascript:complete-closed-JSON-DATA-source',edits:[]}],repositoryRules:[]},{languageRules:[],repositoryRules:[{id:'router:retain-all-observation-fields-and-original-bounds',edits:[]}]}]){
  const result=applyConcreteSyntaxSubstitutions(document,sequence),stored=serializeConcreteSyntaxMeta(result.value),reparsed=transportConcreteSyntaxMeta(stored);assert.equal(reparsed.source,source);document=reparsed.document;
  const inverse=applyConcreteSyntaxSubstitutions(document,{languageRules:[{id:'javascript:whole-observation-inverse',edits:[]}],repositoryRules:[]});assert.equal(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source,source);
 }
 assert.equal(readFileSync(name,'utf8'),source);const original={rows:[{value:'first genuine call'}]};const before=encode(original);original.rows[0].value='fresh next invocation';assert.throws(()=>compare(before,encode(original)),/complete decoded bytes/u);original.rows[0].value='first genuine call';compare(before,encode(original));
});
