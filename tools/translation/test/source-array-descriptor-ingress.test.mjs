import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {copyMetadata} from '../extensions/source-links.mjs';
import {tokenizeRust,capturedRustTokenSource} from '../extensions/lexical.mjs';
import {validateOriginalMethodAssociations} from '../source-method-admission.mjs';
import {withSharedNullaryEnumChecker} from '../shared-nullary-enum.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {standaloneMatchesMacroContext,configureMatchesMacroParser,matchesParserFacts} from '../matches-macro-context.mjs';

function retain(name,value){const directory=process.env.ROUTER_ARRAY_DESCRIPTOR_VECTORS;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(directory+'/'+name+'.json',JSON.stringify(value),{flag:'wx'});}}
function damaged(value,index){const removed=value[index];delete value[index];value.unrelated=true;assert.equal(Reflect.ownKeys(value).length,value.length+1);assert.equal(Object.hasOwn(value,String(index)),false);return removed;}
function poisoned(index,value,run){
 const key=String(index),original=Object.getOwnPropertyDescriptor(Object.prototype,key),define=Object.defineProperty;let reads=0,writes=0,result,error;
 define(Object.prototype,key,{configurable:true,get(){reads++;return {value,writable:true,enumerable:true,configurable:true};},set(item){writes++;define(this,key,{value:item,writable:true,enumerable:true,configurable:true});}});
 try{result=run();}catch(cause){error={typeError:cause instanceof TypeError,name:cause.name,message:cause.message};}
 finally{if(original)define(Object.prototype,key,original);else delete Object.prototype[key];}
 return {reads,writes,error,returned:result!==undefined};
}
function refused(outcome,pattern){assert.equal(outcome.reads,0);assert.equal(outcome.error?.typeError,true);assert.match(outcome.error.message,pattern);}

test('metadata proof input with a missing own numeric descriptor never reads Object.prototype',{timeout:5000},()=>{
 const value=Array.from({length:128},(_,index)=>({index})),removed=damaged(value,127),outcome=poisoned(127,removed,()=>copyMetadata(value));
 retain('metadata-same-count-hole',{input:value,ownDescriptors:Object.getOwnPropertyDescriptors(value),outcome});refused(outcome,/array metadata hole/);
});

test('genuine tokenizer snapshot rejects the same-key-count numeric hole before any inherited descriptor lookup',{timeout:5000},()=>{
 const source='fn main(){'+Array.from({length:40},(_,index)=>'let value'+index+'='+index+'u8;').join('')+'}',tokens=tokenizeRust(source),index=127;
 assert.ok(tokens.length>index);assert.ok(capturedRustTokenSource(tokens));const removed=damaged(tokens,index);
 const outcome=poisoned(index,removed,()=>capturedRustTokenSource(tokens));
 retain('original-tokenizer-same-count-hole',{source,tokens,ownDescriptors:Object.getOwnPropertyDescriptors(tokens),outcome});refused(outcome,/changed tokenizer array/);
});

test('source method association ingress rejects the same-key-count item hole without invoking a getter',{timeout:5000},()=>{
 const items=Array.from({length:128},()=>({k:'fn'})),surface={items};assert.strictEqual(validateOriginalMethodAssociations(surface),surface);
 const removed=damaged(items,127),outcome=poisoned(127,removed,()=>validateOriginalMethodAssociations(surface));
 retain('method-association-same-count-hole',{surface,ownDescriptors:Object.getOwnPropertyDescriptors(items),outcome});refused(outcome,/cannot invoke accessors/);
});

test('shared-nullary source collection rejects a numeric hole before private declaration lookup',{timeout:5000},()=>{
 class Base{program(surface){return surface;}}
 const Checker=withSharedNullaryEnumChecker(Base),items=Array.from({length:128},()=>({k:'fn'})),surface={items};assert.strictEqual(new Checker().program(surface),surface);
 const removed=damaged(items,127),outcome=poisoned(127,removed,()=>new Checker().program(surface));
 retain('shared-nullary-same-count-hole',{surface,ownDescriptors:Object.getOwnPropertyDescriptors(items),outcome});refused(outcome,/cannot invoke callbacks/);
});

test('live Matches target verification cannot obtain a missing array descriptor through Object.prototype',{timeout:5000},()=>{
 const source='pub struct A{value:u8}pub fn active(value:u8)->bool{matches!(value,1)}',parser=new HostRustParser(tokenizeRust(source)),context=standaloneMatchesMacroContext(source,{file:'src/lib.rs'});
 configureMatchesMacroParser(parser,context,{file:'src/lib.rs'});const frame=matchesParserFacts(parser),map=parser.sourceNamespaceAliases.type.get(''),original=map.get('A');assert.ok(original.length);
 const target=[...original],index=target.length-1,removed=damaged(target,index);map.set('A',target);
 let outcome;try{outcome=poisoned(index,removed,()=>matchesParserFacts(parser));}finally{map.set('A',original);}
 retain('matches-target-same-count-hole',{source,originalTarget:original,damagedTarget:target,ownDescriptors:Object.getOwnPropertyDescriptors(target),outcome});refused(outcome,/association|array metadata hole/);assert.strictEqual(matchesParserFacts(parser),frame);
});
