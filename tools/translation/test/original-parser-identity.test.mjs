import test from 'node:test';
import assert from 'node:assert/strict';
import {assertOriginalParserIdentity,originalMethodSnapshot} from '../original-parser-identity.mjs';
import {HostRustParser,originalHostParserIdentitySnapshot} from '../extensions/host-contracts.mjs';
import {TokenCursor} from '../vendor/meta-language/translation/lexer.js';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {originalTextCursorGuard} from '../extensions/text.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens} from '../impl-resolver.mjs';
import {createMatchesMacroContext} from '../matches-macro-context.mjs';
import {createOriginalMethodTokenTransform} from '../source-method-transforms.mjs';
import {parseOriginalMethodTransform,originalMethodParsedFacts} from '../source-method-parser.mjs';
const snapshot=originalHostParserIdentitySnapshot();
const parserIdentity=parser=>assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));
const cursorIdentity=cursor=>assertOriginalParserIdentity(cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(cursor)});
function warmed(){
  const source='pub struct Counter{value:u8}impl Counter{pub fn read(&self)->u8{self.value}}',sourceView=captureSourceModuleViews({source,sourcePath:'src/lib.rs'}).views[0];
  const context=createMatchesMacroContext({modules:[{file:'src/lib.rs',path:[],source,sourceView}]}),method=extractImplDeclarations(source,{sourcePath:'src/lib.rs',sourceView}).implementations[0].methods[0],lowered=lowerSharedMethodTokens(method,['crate',...method.typePath]),transform=createOriginalMethodTokenTransform(context,method,lowered),result=parseOriginalMethodTransform(transform),state=originalMethodParsedFacts(result);
  return {result,parser:state.parser,cursor:state.parser.cursor,verify:()=>originalMethodParsedFacts(result)};
}
function owner(prototype,name){for(let current=prototype;current;current=Object.getPrototypeOf(current))if(Object.hasOwn(current,name))return current;throw Error('Missing actual method '+name);}
function changed(record,key,descriptor,verify){const before=Object.getOwnPropertyDescriptor(record,key);Object.defineProperty(record,key,{configurable:true,...descriptor});try{return verify();}finally{if(before)Object.defineProperty(record,key,before);else delete record[key];}}
function trapCounter(){let calls=0;const traps={get(){calls++;throw Error('get');},ownKeys(){calls++;throw Error('keys');},getPrototypeOf(){calls++;throw Error('prototype');},getOwnPropertyDescriptor(){calls++;throw Error('descriptor');},apply(){calls++;throw Error('apply');}};return {traps,calls:()=>calls};}

test('actual warmed Host and member parser retain definition-time snapshots and original text cursor guard',()=>{
  const row=warmed();assert.doesNotThrow(()=>parserIdentity(row.parser));assert.doesNotThrow(()=>cursorIdentity(row.cursor));assert.equal(row.verify().parser,row.parser);assert.equal(row.result.entry.body.k,'routerField');assert.equal(row.cursor.is,originalTextCursorGuard(row.cursor).guard);assert.equal(originalTextCursorGuard(row.cursor).baseIs,new Map(snapshot.cursorMethods).get('is'));
});
test('inherited Host prototype accessors refuse before warmed private proof can invoke getters',()=>{
  for(const name of ['fn','primary','hostTypeSyntax']){const row=warmed(),actual=owner(HostRustParser.prototype,name);let calls=0;changed(actual,name,{get(){calls++;return new Map(snapshot.parserMethods).get(name);}},()=>{assert.throws(()=>parserIdentity(row.parser),/method identity changed/);assert.throws(row.verify,/method identity changed/);assert.equal(calls,0);});assert.doesNotThrow(row.verify);}
});
test('cursor prototype getters including guarded is refuse without invoking callbacks',()=>{
  for(const name of ['peek','next','is']){const row=warmed(),actual=owner(TokenCursor.prototype,name);let calls=0;changed(actual,name,{get(){calls++;return new Map(snapshot.cursorMethods).get(name);}},()=>{assert.throws(()=>cursorIdentity(row.cursor),/method identity changed/);assert.throws(row.verify,/method identity changed/);assert.equal(calls,0);});assert.doesNotThrow(row.verify);}
});
test('plain and proxy function replacements of real Host and cursor methods cannot authorize a warmed member',()=>{
  for(const [prototype,name]of [[HostRustParser.prototype,'fn'],[TokenCursor.prototype,'peek'],[TokenCursor.prototype,'is']])for(const proxy of [false,true]){const row=warmed(),actual=owner(prototype,name),counter=trapCounter();let calls=0;const replacement=()=>{calls++;return null;};changed(actual,name,{writable:true,value:proxy?new Proxy(replacement,counter.traps):replacement},()=>{assert.throws(row.verify,/method identity changed/);assert.equal(calls,0);assert.equal(counter.calls(),0);});assert.doesNotThrow(row.verify);}
});
test('own callback data and accessor overrides reject before getters or functions execute',()=>{
  for(const select of [row=>row.parser,row=>row.cursor])for(const accessor of [false,true]){const row=warmed(),record=select(row),name=record===row.parser?'fn':'peek';let calls=0;changed(record,name,accessor?{get(){calls++;return ()=>{};}}:{writable:true,value:()=>{calls++;}},()=>{assert.throws(row.verify,/callbacks|identity/);assert.equal(calls,0);});assert.doesNotThrow(row.verify);}const row=warmed();changed(row.parser,'fn',{value:null},()=>assert.throws(row.verify,/own replacement/));
});
test('proxy parser cursor and prototype input checks never invoke reflection traps',()=>{
  const row=warmed();for(const [value,prototype,methods]of [[row.parser,HostRustParser.prototype,new Map(snapshot.parserMethods)],[row.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods)]]){const counter=trapCounter();assert.throws(()=>assertOriginalParserIdentity(new Proxy(value,counter.traps),prototype,methods),/source class changed/);assert.throws(()=>assertOriginalParserIdentity(value,new Proxy(prototype,counter.traps),methods),/source class changed/);assert.equal(counter.calls(),0);}const counter=trapCounter(),old=row.parser.cursor;row.parser.cursor=new Proxy(old,counter.traps);try{assert.throws(row.verify,/source class changed/);assert.equal(counter.calls(),0);}finally{row.parser.cursor=old;}
});
test('proxy links in actual prototype traversal reject before own-descriptor or parent traps',()=>{
  for(const prototype of [HostRustParser.prototype,TokenCursor.prototype]){const row=warmed(),before=Object.getPrototypeOf(prototype),counter=trapCounter();Object.setPrototypeOf(prototype,new Proxy(before,counter.traps));try{assert.throws(row.verify,/source class changed/);assert.equal(counter.calls(),0);}finally{Object.setPrototypeOf(prototype,before);}assert.doesNotThrow(row.verify);}
});
test('snapshot collection refuses direct nested proxy or function-proxy roots without callbacks',()=>{
  const counter=trapCounter();assert.throws(()=>originalMethodSnapshot(new Proxy(HostRustParser.prototype,counter.traps)),/source class changed/);assert.throws(()=>originalMethodSnapshot(Object.create(new Proxy(HostRustParser.prototype,counter.traps))),/source class changed/);assert.equal(counter.calls(),0);const prototype={method:new Proxy(()=>{},counter.traps)};assert.throws(()=>originalMethodSnapshot(prototype),/proxy callback/);assert.equal(counter.calls(),0);
});
test('expected-map and original-guard proxies accessors and options fail before callbacks',()=>{
  const row=warmed(),counter=trapCounter(),methods=new Map(snapshot.cursorMethods);assert.throws(()=>assertOriginalParserIdentity(row.cursor,TokenCursor.prototype,new Proxy(methods,counter.traps)),/source class changed/);assert.throws(()=>assertOriginalParserIdentity(row.cursor,TokenCursor.prototype,methods,new Proxy({},counter.traps)),/source class changed/);assert.throws(()=>assertOriginalParserIdentity(row.cursor,TokenCursor.prototype,methods,{originalGuard:new Proxy(originalTextCursorGuard(row.cursor),counter.traps)}),/source class changed/);assert.equal(counter.calls(),0);let calls=0;const options=Object.defineProperty({},'originalGuard',{get(){calls++;return originalTextCursorGuard(row.cursor);}}),guard=Object.defineProperty({},'baseIs',{get(){calls++;return methods.get('is');}});assert.throws(()=>assertOriginalParserIdentity(row.cursor,TokenCursor.prototype,methods,options),/callbacks or accessors/);assert.throws(()=>assertOriginalParserIdentity(row.cursor,TokenCursor.prototype,methods,{originalGuard:guard}),/callbacks or accessors/);assert.equal(calls,0);
});
test('descriptor lookup does not fall back through inherited getters on fresh descriptor records',()=>{
  const row=warmed();let calls=0;changed(Object.prototype,'fn',{get(){calls++;return ()=>{};}},()=>{assert.doesNotThrow(()=>parserIdentity(row.parser));assert.doesNotThrow(row.verify);assert.equal(calls,0);});changed(Object.prototype,'originalGuard',{get(){calls++;return null;}},()=>{assert.doesNotThrow(()=>parserIdentity(row.parser));assert.doesNotThrow(row.verify);assert.equal(calls,0);});changed(Object.prototype,'value',{get(){calls++;return ()=>{};}},()=>{const descriptor=Object.create(null);descriptor.get=()=>{calls++;return ()=>{};};const prototype=Object.defineProperty({},'method',descriptor);assert.equal(originalMethodSnapshot(prototype).has('method'),false);assert.equal(calls,0);});
});
test('legitimate literal delimiter guards keep original ordinary source parser behavior',()=>{
  for(const value of [')','&','let','fn']){const parser=new HostRustParser(tokenizeRust('fn literal()->&str{'+JSON.stringify(value)+'}'));assert.doesNotThrow(()=>parserIdentity(parser));assert.doesNotThrow(()=>cursorIdentity(parser.cursor));const entry=parser.fn([]);assert.equal(entry.body.value,value);assert.equal(parser.cursor.atEnd(),true);assert.doesNotThrow(()=>cursorIdentity(parser.cursor));}
});
test('a bounded cursor subclass does not change Host parser identity or install a global cursor requirement',()=>{
  const parser=new HostRustParser(tokenizeRust('fn value()->u8{7u8}fn next()->u8{9u8}')),original=parser.cursor;class BoundedCursor extends TokenCursor{peek(offset=0){return this.index+offset>=this.limit?this.boundary:super.peek(offset);}}const bounded=new BoundedCursor(original.tokens,original.language);bounded.limit=original.tokens.findIndex((token,index)=>index>0&&token.value==='fn');assert.ok(bounded.limit>0);bounded.boundary={...original.tokens.at(-1),start:original.tokens[bounded.limit].start,end:original.tokens[bounded.limit].start};const methods=originalMethodSnapshot(BoundedCursor.prototype);parser.cursor=bounded;try{assert.doesNotThrow(()=>parserIdentity(parser));assert.doesNotThrow(()=>assertOriginalParserIdentity(bounded,BoundedCursor.prototype,methods));const entry=parser.fn([]);assert.equal(entry.body.value,7n);assert.equal(bounded.atEnd(),true);}finally{parser.cursor=original;}assert.doesNotThrow(()=>parserIdentity(parser));assert.doesNotThrow(()=>cursorIdentity(original));
});
