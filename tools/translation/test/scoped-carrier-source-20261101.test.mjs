// Independent source ledger expectations. Every execution is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceItems,rustTokens} from '../rust-structure.mjs';
import {withScopedCarrierSource} from '../scoped-carrier-source-20261101.mjs';
import {readScopedCarrierOperand} from '../scoped-carrier-source-20261101-operands.mjs';
import {visitScopedCarrierSourceHistory} from '../scoped-carrier-source-20261101-source-history.mjs';
import {withSourceFailureOperation} from '../source-failure-operations.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const limits={timeout:60000};
function input(source){const item=sourceItems(source).find(row=>row.term==='fn');assert.ok(item);return {source,functionSpan:[item.start,item.end]};}
const tokens=source=>rustTokens(source).filter(row=>row.type!=='comment');
test('parenthesized concrete text and repeated sibling-block locals retain separate original evidence',limits,()=>{
 const value=input('pub fn f(key:&str)->u64{{let key:&str=("first");probe(key);} {let key:&str=("second");probe(key);} probe(key);0_u64}');
 withScopedCarrierSource(value,reader=>{const first=reader.at(value.source.indexOf('probe(key)')),second=reader.at(value.source.indexOf('probe(key)',value.source.indexOf('probe(key)')+1)),outer=reader.at(value.source.lastIndexOf('probe(key)'));assert.equal(first.bindings.key,'payload:str');assert.equal(second.bindings.key,'payload:str');assert.notDeepEqual(first.evidence.key.span,second.evidence.key.span);assert.equal(value.source.slice(...first.evidence.key.span),'let key:&str=("first");');assert.equal(value.source.slice(...second.evidence.key.span),'let key:&str=("second");');assert.equal(outer.bindings.key,'payload:str');assert.equal(outer.evidence.key,null);assert.equal(first.semanticAuthority,false);return null;});
});
test('shadow initializer sees prior source binding until terminator and publishes a new independently selected result',limits,()=>{
 const value=input('pub fn f(x:u64)->u64{let x=x+1_u64;x}'),initializer=value.source.indexOf('x+1'),tail=value.source.lastIndexOf('x');
 withScopedCarrierSource(value,reader=>{const before=reader.at(initializer),after=reader.at(tail);assert.equal(before.bindings.x,'payload:u64');assert.equal(before.evidence.x,null);assert.equal(before.provenance.x.kind,'parameter');assert.equal(after.bindings.x,'payload:u64');assert.equal(after.provenance.x.kind,'local');assert.equal(after.provenance.x.roleKnown,true);assert.equal(value.source.slice(...after.evidence.x.initializerSpan),'x+1_u64');return null;});
});
test('unknown shadow result hides prior role; a written annotation cannot invent an initializer domain',limits,()=>{
 for(const body of ['let x=unknown();x','let x:&str=(7_u64);x']){const value=input('pub fn f(x:u64)->u64{'+body+'}');withScopedCarrierSource(value,reader=>{const after=reader.at(value.source.lastIndexOf('x'));assert.equal(Object.hasOwn(after.bindings,'x'),false);assert.equal(after.evidence.x,null);assert.equal(after.provenance.x.kind,'local');assert.equal(after.provenance.x.roleKnown,false);assert.equal(value.source.slice(...after.provenance.x.declarationSpan),body.slice(0,body.indexOf(';')+1));assert.ok(Object.isFrozen(after.provenance.x));return null;});}
});
test('unresolved header aliases remain parameter provenance while an unknown local never inherits that provenance',limits,()=>{
 const value=input('pub fn f(x:&Alias)->u64{probe(x);let x=unknown();x}');withScopedCarrierSource(value,reader=>{const parameter=reader.at(value.source.indexOf('probe')),local=reader.at(value.source.lastIndexOf('x'));assert.equal(parameter.bindings.x,null);assert.equal(parameter.provenance.x.kind,'parameter');assert.equal(parameter.provenance.x.roleKnown,false);assert.equal(value.source.slice(...parameter.provenance.x.declarationSpan),'x:&Alias');assert.equal(Object.hasOwn(local.bindings,'x'),false);assert.equal(local.provenance.x.kind,'local');assert.equal(local.provenance.x.roleKnown,false);assert.equal(local.typedCaptureAuthority,false);return null;});
});
test('complete block-tail field role preserves actual local and tail token intervals without owner authority',limits,()=>{
 const source='{let key:&str=("count");crate::translation_json_fields_core::json_u64_field(record,key)}',result=readScopedCarrierOperand(tokens(source),new Map([['record','json:json']]));assert.equal(result.kind,'option:u64');assert.equal(source.slice(...result.blockLocals[0].declarationSpan),'let key:&str=("count");');assert.equal(source.slice(...result.blockTailSpan),'crate::translation_json_fields_core::json_u64_field(record,key)');assert.equal(result.semanticAuthority,false);assert.equal(result.sourceAuthority,false);
});
test('nested block-tail and old-name initializer source projection remain bounded concrete DATA',limits,()=>{
 const source='{let x:u64=(7_u64);{let x:u64=(x+1_u64);x}}',result=readScopedCarrierOperand(tokens(source),new Map());assert.equal(result.kind,'payload:u64');assert.equal(result.semanticAuthority,false);
 for(const source of ['{let mut x=7_u64;x}','{let (x,y)=pair();x}','{let x=unknown();x}','{return 7_u64;}'])assert.equal(readScopedCarrierOperand(tokens(source),new Map()),null);
});
test('pattern/mutable/unknown callback scopes cannot issue roles and complete finite callback regions stay opaque',limits,()=>{
 for(const source of ['pub fn f(x:u64)->u64{let mut y=x;y}','pub fn f(x:u64)->u64{if let Some(y)=unknown(){y}else{x}}','pub fn f(x:u64)->u64{let pair=|a,b|a+b;x}'])assert.throws(()=>withScopedCarrierSource(input(source),()=>null));
 const value=input('pub fn f(x:u64)->u64{let selected=crate::translation_primitive_option_callbacks_core::u64_to_text_owned_map(crate::translation_primitive_option_core::u64_some(x),|v|crate::translation_core::format!("{v}"));probe(x);x}');withScopedCarrierSource(value,reader=>{assert.equal(reader.at(value.source.indexOf('probe(x)')).bindings.x,'payload:u64');return null;});
});
test('ledger expiry, whole input closing and caught restoration invalidate enclosing source operations',limits,()=>{
 const value=input('pub fn f(x:u64)->u64{x}');let saved;withScopedCarrierSource(value,reader=>{saved=reader;return reader.at(value.source.lastIndexOf('x'));});assert.throws(()=>saved.at(value.source.lastIndexOf('x')),/expired/);
 assert.throws(()=>withSourceFailureOperation(()=>withScopedCarrierSource(value,reader=>{const original=value.source;value.source+=' ';try{reader.at(original.lastIndexOf('x'));}catch{}value.source=original;return null;})),/invalidated/i);
 for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('frozen source callback primary'))]){let observed,failed=false;try{withScopedCarrierSource(value,()=>{throw primary;});}catch(error){failed=true;observed=error;}assert.equal(failed,true);assert.equal(observed,primary);}
});
test('exact DATA descriptors, array identity/coordinates/prototypes and keys close without invoking new getters',limits,()=>{
 for(const mutation of ['source-getter','coordinate-getter','array-reference','coordinate','root-key','array-key','source-attributes','array-length','root-prototype','array-prototype','root-extensibility','array-extensibility','proxy-array']){
  const value=input('pub fn f(x:u64)->u64{x}'),position=value.source.lastIndexOf('x'),originalSource=Object.getOwnPropertyDescriptor(value,'source'),originalSpan=Object.getOwnPropertyDescriptor(value,'functionSpan'),array=value.functionSpan,originalCoordinate=Object.getOwnPropertyDescriptor(array,'0'),rootPrototype=Object.getPrototypeOf(value),arrayPrototype=Object.getPrototypeOf(array);let effects=0,primary,observed,failed=false;
  try{withScopedCarrierSource(value,reader=>{
   if(mutation==='source-getter')Object.defineProperty(value,'source',{get(){effects++;return originalSource.value;},enumerable:true,configurable:true});
   else if(mutation==='coordinate-getter')Object.defineProperty(array,'0',{get(){effects++;return originalCoordinate.value;},enumerable:true,configurable:true});
   else if(mutation==='array-reference')value.functionSpan=[...array];
   else if(mutation==='coordinate')array[0]++;
   else if(mutation==='root-key')Object.defineProperty(value,'extra',{get(){effects++;return 1;},configurable:true});
   else if(mutation==='array-key')array.extra=1;
   else if(mutation==='source-attributes')Object.defineProperty(value,'source',{...originalSource,writable:false});
   else if(mutation==='array-length')array.length=3;
   else if(mutation==='root-prototype')Object.setPrototypeOf(value,{});
   else if(mutation==='array-prototype')Object.setPrototypeOf(array,{});
   else if(mutation==='root-extensibility')Object.preventExtensions(value);
   else if(mutation==='array-extensibility')Object.preventExtensions(array);
   else value.functionSpan=new Proxy(array,{get(){effects++;return 1;}});
   try{reader.at(position);}catch(error){primary=error;}assert.ok(primary);assert.equal(effects,0);
   Object.setPrototypeOf(value,rootPrototype);Object.setPrototypeOf(array,arrayPrototype);Object.defineProperty(value,'source',originalSource);Object.defineProperty(value,'functionSpan',originalSpan);Object.defineProperty(array,'0',originalCoordinate);delete value.extra;delete array.extra;array.length=2;
   let sticky;try{reader.at(position);}catch(error){sticky=error;}assert.equal(sticky,primary);return null;
  });}catch(error){failed=true;observed=error;}assert.equal(failed,true);assert.equal(observed,primary);assert.equal(effects,0);
 }
});
test('complete original chronological implementation, actual prerequisites and successor keep all CST/inverse histories',limits,()=>{
 let copies=0,inputs=0;const result=visitScopedCarrierSourceHistory(event=>{assert.equal(event.history.inverse,event.before);assert.equal(transportConcreteSyntaxMeta(event.history.beforeMeta).source,event.before);assert.equal(transportConcreteSyntaxMeta(event.history.afterMeta).source,event.after);assert.deepEqual(event.history.trace.map(row=>row.phase),['language','repository']);if(event.role==='complete-chronological-copy-successor'){copies++;assert.ok(event.before.includes('export function createChronologicalLocalSource'));assert.ok(event.after.includes('function createScopedChronologicalLocalSource'));}inputs++;return {consumed:true};});assert.equal(copies,1);assert.equal(inputs,16);assert.equal(result.semanticAuthority,false);assert.equal(result.consumerHooksInstalled,false);
});
