import test from 'node:test';
import assert from 'node:assert/strict';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {createMatchesMacroContext,configureMatchesMacroParser,matchesParserFacts} from '../matches-macro-context.mjs';
import {metadataDigest} from '../extensions/source-links.mjs';
import {configureParserSourceScope} from '../source-scopes.mjs';
const source='pub struct A{value:u8}pub enum B{On,Off}pub fn first(v:u8)->bool{matches!(v,1)}pub fn second(v:u8)->bool{matches!(v,2)}';
function context(text=source){const views=captureSourceModuleViews({source:text,sourcePath:'src/lib.rs'});return createMatchesMacroContext({modules:views.views.map(sourceView=>({file:'src/lib.rs',path:[...sourceView.modulePath],source:text,sourceView,configurationCondition:sourceView.configurationCondition}))});}
function reference(parser){return metadataDigest(['type','value','macro'].map(namespace=>[namespace,[...parser.sourceNamespaceAliases[namespace]].map(([path,map])=>[path,[...map]])]));}
function configured(owner,text=source,mutate=null,options={}){
 const parser=new HostRustParser(tokenizeRust(text));
 if(mutate)Object.defineProperty(parser,'sourceNamespaceAliases',{configurable:true,set(value){mutate(value);Object.defineProperty(this,'sourceNamespaceAliases',{value,writable:true,enumerable:true,configurable:true});}});
 configureMatchesMacroParser(parser,owner,{file:'src/lib.rs',...options});return parser;
}
test('private initial captures retain exact previous full namespace digests and every parser owns fresh mutable Maps',()=>{
 const owner=context(),rows=Array.from({length:5},()=>configured(owner));
 for(const parser of rows){assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));assert.equal(Object.isFrozen(parser.sourceNamespaceAliases.type.get('').get('A')),false);}
 for(const a of rows)for(const b of rows)if(a!==b){assert.notEqual(a.sourceNamespaceAliases,b.sourceNamespaceAliases);assert.notEqual(a.sourceNamespaceAliases.type,b.sourceNamespaceAliases.type);assert.notEqual(a.sourceNamespaceAliases.type.get(''),b.sourceNamespaceAliases.type.get(''));assert.notEqual(a.sourceNamespaceAliases.type.get('').get('A'),b.sourceNamespaceAliases.type.get('').get('A'));}
});
test('caller setter reconstruction cannot poison private captures or erase insertion-order differences',()=>{
 const owner=context(),plain=configured(owner),baseline=reference(plain);
 for(const mutate of [aliases=>aliases.type.get('').set('A',['core','A']),aliases=>{const map=aliases.type.get(''),value=map.get('A');map.delete('A');map.set('A',value);},aliases=>{const map=aliases.value.get(''),value=map.get('first');map.delete('first');map.set('first',value);}]){
  const changed=configured(owner,source,mutate);assert.equal(matchesParserFacts(changed).namespaceDigest,reference(changed));assert.notEqual(reference(changed),baseline);assert.equal(reference(configured(owner)),baseline);
 }
});
test('initial captures retain proxy native Map subclass and hostile target descriptor guards without callbacks',()=>{
 const owner=context();configured(owner);let callbacks=0;
 const proxy=value=>new Proxy(value,{get(){callbacks++;throw Error('get');},ownKeys(){callbacks++;throw Error('keys');},getOwnPropertyDescriptor(){callbacks++;throw Error('descriptor');},getPrototypeOf(){callbacks++;throw Error('prototype');}});
 for(const mutate of [aliases=>{aliases.macro=proxy(aliases.macro);},aliases=>{aliases.value.set('',proxy(aliases.value.get('')));},aliases=>{aliases.type.get('').set('A',proxy(['crate','A']));},aliases=>{aliases.type.get('').set('A',Object.freeze(Object.defineProperty([],0,{enumerable:true,get(){callbacks++;throw Error('getter');}})));},aliases=>{class ForeignMap extends Map{}aliases.macro=new ForeignMap(aliases.macro);},aliases=>{Object.defineProperty(aliases.value.get(''),'hidden',{value:true});},aliases=>{const target=aliases.type.get('').get('A');Object.defineProperty(target,'hidden',{value:true});},aliases=>{const target=aliases.type.get('').get('A');Object.defineProperty(target,Symbol('extra'),{value:true});}])assert.throws(()=>configured(owner,source,mutate),TypeError);
 assert.equal(callbacks,0);assert.equal(matchesParserFacts(configured(owner)).namespaceDigest,reference(configured(owner)));
});
test('warm capture never skips later namespace rebinding mutations descriptors or byte/cycle budgets',()=>{
 const owner=context(),parser=configured(owner),map=parser.sourceNamespaceAliases.type.get(''),original=map.get('A');
 for(const target of [['std','A'],['x'.repeat(4194305)],(()=>{const value=[];value.push(value);return value;})(),Object.defineProperty([],0,{enumerable:true,get(){throw Error('getter');}})]){map.set('A',target);try{assert.throws(()=>matchesParserFacts(parser),TypeError);}finally{map.set('A',original);}}
 original.push('forged');assert.throws(()=>matchesParserFacts(parser),/association/);original.pop();assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));
 const aliases=parser.sourceNamespaceAliases;Object.defineProperty(parser,'sourceNamespaceAliases',{configurable:true,get(){throw Error('getter');}});assert.throws(()=>matchesParserFacts(parser),TypeError);Object.defineProperty(parser,'sourceNamespaceAliases',{value:aliases,configurable:true,writable:true,enumerable:true});assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));
});
test('bounded context/global evictions preserve exact visibility-adjusted namespaces across genuine consumers',()=>{
 const text=Array.from({length:12},(_,index)=>`mod child${index}{pub struct Local;pub fn f(v:u8)->bool{matches!(v,1)}}`).join(''),views=captureSourceModuleViews({source:text,sourcePath:'src/lib.rs'}),modules=views.views.map(sourceView=>({file:'src/lib.rs',path:[...sourceView.modulePath],source:text,sourceView,configurationCondition:sourceView.configurationCondition})),owner=createMatchesMacroContext({modules});
 for(let round=0;round<2;round++)for(const module of modules){const span=module.sourceView.bodySpan,slice=text.slice(span.start,span.end),parser=configured(owner,slice,null,{modulePath:module.path,offset:span.start});assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));}
 const owners=Array.from({length:12},()=>context());for(let round=0;round<2;round++)for(const current of owners){const parser=configured(current);assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));}
 assert.throws(()=>configured(structuredClone(owner),text),/private original context/);
});
test('ambient serialization changes use the exact original serializer fallback and cannot reuse prior bytes',()=>{
 const owner=context();configured(owner);const descriptor=Object.getOwnPropertyDescriptor(JSON,'stringify'),original=descriptor.value;
 Object.defineProperty(JSON,'stringify',{...descriptor,value(...args){return original(...args)+(Array.isArray(args[0])&&args[0][0]?.[0]==='type'?' ':'');}});
 try{const parser=configured(owner);assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));}finally{Object.defineProperty(JSON,'stringify',descriptor);}
 for(const prototype of [Array.prototype,Object.prototype]){
  const prior=Object.getOwnPropertyDescriptor(prototype,'toJSON');let calls=0;Object.defineProperty(prototype,'toJSON',{configurable:true,value(){calls++;return this;}});
  try{const parser=configured(owner);assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));assert.ok(calls>0);}finally{if(prior)Object.defineProperty(prototype,'toJSON',prior);else delete prototype.toJSON;}
 }
 const parser=configured(owner);assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));
});

test('changed native Map callbacks never cause an extra private namespace reconstruction',()=>{
 const owner=context(),warm=configured(owner),facts=matchesParserFacts(warm).facts,scope=facts.evidence.scopes.find(row=>row.path.length===0);
 for(let index=0;index<10;index++)configured(context());
 const parser=new HostRustParser(tokenizeRust(source));configureParserSourceScope({},scope,facts.evidence.scopes,[]);
 const descriptor=Object.getOwnPropertyDescriptor(Map.prototype,'get'),get=descriptor.value;let calls=0;
 Object.defineProperty(Map.prototype,'get',{...descriptor,value(...args){calls++;return get.apply(this,args);}});
 try{configureParserSourceScope({},scope,facts.evidence.scopes,[]);const expected=calls;calls=0;configureMatchesMacroParser(parser,owner,{file:'src/lib.rs'});assert.equal(calls,expected);assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));}finally{Object.defineProperty(Map.prototype,'get',descriptor);}
});
test('metadata-compatible descriptor changes retain original capture acceptance through the fallback',()=>{
 const owner=context(),baseline=reference(configured(owner));
 for(const mutate of [aliases=>{Object.setPrototypeOf(aliases.type.get('').get('A'),null);},aliases=>{Object.defineProperty(aliases.type.get('').get('A'),'0',{writable:false});},aliases=>{Object.freeze(aliases.type.get('').get('A'));}]){
  const parser=configured(owner,source,mutate);assert.equal(matchesParserFacts(parser).namespaceDigest,reference(parser));assert.equal(reference(parser),baseline);
 }
});
