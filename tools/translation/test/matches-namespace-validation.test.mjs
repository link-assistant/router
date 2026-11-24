import test from 'node:test';
import assert from 'node:assert/strict';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {standaloneMatchesMacroContext,configureMatchesMacroParser,matchesParserFacts} from '../matches-macro-context.mjs';
import {metadataDigest} from '../extensions/source-links.mjs';
const source='pub struct A{value:u8}pub enum B{On,Off}pub fn first(v:u8)->bool{matches!(v,1)}pub fn second(v:u8)->bool{matches!(v,2)}';
function configured(){const parser=new HostRustParser(tokenizeRust(source)),context=standaloneMatchesMacroContext(source,{file:'src/lib.rs'});configureMatchesMacroParser(parser,context,{file:'src/lib.rs'});return parser;}
function reference(parser){return metadataDigest(['type','value','macro'].map(namespace=>[namespace,[...parser.sourceNamespaceAliases[namespace]].map(([path,map])=>[path,[...map]])]));}
test('later complete namespace mutations retain original order and target guards in every namespace',()=>{
 for(const namespace of ['type','value','macro']){
  const parser=configured(),scope=parser.sourceNamespaceAliases[namespace],map=scope.get(''),digest=matchesParserFacts(parser).namespaceDigest;
  const extra=['crate','different'];map.set('new_binding',extra);assert.throws(()=>matchesParserFacts(parser),/association/);map.delete('new_binding');assert.equal(matchesParserFacts(parser).namespaceDigest,digest);
  scope.set('foreign',new Map());assert.throws(()=>matchesParserFacts(parser),/association/);scope.delete('foreign');assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));
  const first=map.entries().next().value;if(!first)continue;const [name,target]=first,original=[...map];
  target.push('changed');assert.throws(()=>matchesParserFacts(parser),/association/);target.pop();assert.equal(matchesParserFacts(parser).namespaceDigest,digest);
  map.delete(name);map.set(name,target);if(original.length>1)assert.throws(()=>matchesParserFacts(parser),/association/);map.clear();for(const pair of original)map.set(...pair);assert.equal(matchesParserFacts(parser).namespaceDigest,digest);
 }
});
test('later hostile target descriptors and proxies remain rejected without executing caller callbacks',()=>{
 let callbacks=0;const proxy=value=>new Proxy(value,{get(){callbacks++;throw Error('get');},ownKeys(){callbacks++;throw Error('keys');},getOwnPropertyDescriptor(){callbacks++;throw Error('descriptor');},getPrototypeOf(){callbacks++;throw Error('prototype');}});
 for(const target of [proxy(['crate','A']),Object.defineProperty([],0,{enumerable:true,get(){callbacks++;throw Error('getter');}}),Object.defineProperty(['crate','A'],'hidden',{value:true}),Object.defineProperty(['crate','A'],Symbol('extra'),{value:true}),Array(2)]){
  const parser=configured(),map=parser.sourceNamespaceAliases.type.get(''),original=map.get('A');map.set('A',target);assert.throws(()=>matchesParserFacts(parser),TypeError);map.set('A',original);assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));
 }
 const parser=configured(),original=parser.sourceNamespaceAliases.value;parser.sourceNamespaceAliases.value=proxy(original);assert.throws(()=>matchesParserFacts(parser),TypeError);parser.sourceNamespaceAliases.value=original;assert.equal(callbacks,0);assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));
});
test('inherited descriptor values cannot replace original namespace target data',()=>{
 const parser=configured(),map=parser.sourceNamespaceAliases.type.get(''),original=map.get('A'),target=[...original];let ownReads=0,inheritedReads=0;
 Object.defineProperty(target,0,{enumerable:true,configurable:true,get(){ownReads++;return original[0];}});map.set('A',target);
 const previous=Object.getOwnPropertyDescriptor(Object.prototype,'value'),poison=Object.create(null);poison.configurable=true;poison.get=()=>{inheritedReads++;return original[0];};
 try{Object.defineProperty(Object.prototype,'value',poison);assert.throws(()=>matchesParserFacts(parser),TypeError);}
 finally{if(previous)Object.defineProperty(Object.prototype,'value',previous);else delete Object.prototype.value;map.set('A',original);}
 assert.equal(ownReads,0);assert.equal(inheritedReads,0);assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));
});
test('inherited descriptor values cannot replace an original parser frame data field',()=>{
 const parser=configured(),frame=matchesParserFacts(parser),original=Object.getOwnPropertyDescriptor(frame,'sourceLength');let ownReads=0,inheritedReads=0;
 Object.defineProperty(frame,'sourceLength',{enumerable:original.enumerable,configurable:true,get(){ownReads++;return original.value;}});
 const previous=Object.getOwnPropertyDescriptor(Object.prototype,'value'),poison=Object.create(null);poison.configurable=true;poison.get=()=>{inheritedReads++;return original.value;};
 try{Object.defineProperty(Object.prototype,'value',poison);assert.throws(()=>matchesParserFacts(parser),/frame fields/);}
 finally{if(previous)Object.defineProperty(Object.prototype,'value',previous);else delete Object.prototype.value;Object.defineProperty(frame,'sourceLength',original);}
 assert.equal(ownReads,0);assert.equal(inheritedReads,0);assert.strictEqual(matchesParserFacts(parser),frame);
});
test('serializer changes after initial capture use the original complete digest behavior',()=>{
 const parser=configured(),baseline=matchesParserFacts(parser).namespaceDigest,descriptor=Object.getOwnPropertyDescriptor(JSON,'stringify'),stringify=descriptor.value;let namespaceCalls=0;
 Object.defineProperty(JSON,'stringify',{...descriptor,value(...args){const namespace=Array.isArray(args[0])&&args[0][0]?.[0]==='type';if(namespace)namespaceCalls++;return stringify(...args)+(namespace?' ':'');}});
 try{assert.throws(()=>matchesParserFacts(parser),/association/);assert.ok(namespaceCalls>0);assert.notEqual(reference(parser),baseline);}finally{Object.defineProperty(JSON,'stringify',descriptor);}
 assert.equal(matchesParserFacts(parser).namespaceDigest,baseline);
 for(const prototype of [Array.prototype,Object.prototype]){
  const prior=Object.getOwnPropertyDescriptor(prototype,'toJSON');let calls=0;Object.defineProperty(prototype,'toJSON',{configurable:true,value(){calls++;return this;}});
  try{assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));assert.ok(calls>0);}finally{if(prior)Object.defineProperty(prototype,'toJSON',prior);else delete prototype.toJSON;}
 }
});
test('old parser validation stays exact after global eviction and preserves original byte and cycle limits',()=>{
 const parser=configured(),baseline=matchesParserFacts(parser).namespaceDigest;for(let index=0;index<12;index++)assert.equal(matchesParserFacts(configured()).namespaceDigest,baseline);
 assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));const map=parser.sourceNamespaceAliases.type.get(''),original=map.get('A'),cycle=[];cycle.push(cycle);
 for(const target of [['x'.repeat(4194305)],cycle,['crate','different']]){map.set('A',target);assert.throws(()=>matchesParserFacts(parser),TypeError);map.set('A',original);assert.equal(matchesParserFacts(parser).namespaceDigest,baseline);}
});
test('metadata-compatible descriptor changes and native Map changes retain exact fallback acceptance',()=>{
 const parser=configured(),target=parser.sourceNamespaceAliases.type.get('').get('A'),baseline=matchesParserFacts(parser).namespaceDigest;Object.setPrototypeOf(target,null);assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));Object.freeze(target);assert.equal(matchesParserFacts(parser).namespaceDigest,baseline);
 const descriptor=Object.getOwnPropertyDescriptor(Map.prototype,'get'),get=descriptor.value;Object.defineProperty(Map.prototype,'get',{...descriptor,value(...args){return get.apply(this,args);}});
 try{assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));}finally{Object.defineProperty(Map.prototype,'get',descriptor);}
 assert.equal(matchesParserFacts(parser).namespaceDigest,baseline);
});
test('late Array iterator and guard callback changes retain the original namespace behavior',()=>{
 for(const key of [Symbol.iterator,'some']){
  const parser=configured(),baseline=matchesParserFacts(parser).namespaceDigest,descriptor=Object.getOwnPropertyDescriptor(Array.prototype,key),original=descriptor.value;let callbacks=0;
  Object.defineProperty(Array.prototype,key,{...descriptor,value(...args){callbacks++;return original.apply(this,args);}});
  try{assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));assert.ok(callbacks>0);const map=parser.sourceNamespaceAliases.type.get(''),target=map.get('A');map.set('A',['crate','different']);assert.throws(()=>matchesParserFacts(parser),/association/);map.set('A',target);assert.equal(matchesParserFacts(parser).namespaceDigest,baseline);}finally{Object.defineProperty(Array.prototype,key,descriptor);}
  assert.equal(matchesParserFacts(parser).namespaceDigest,baseline);
 }
});
