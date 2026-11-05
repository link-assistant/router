// Finite source-pattern substitutions. Complete fresh Rust reemission remains
// mandatory; these patterns alone grant no source or semantic authority.
import {refuse} from './constructs.mjs';
const failure=()=>refuse('unsupported','Rust syntax is outside the canonical scalar absence patterns');
const wrappers=new Map([['JsNullable',{absent:'null',tag:'Null',typeName:'object'}],['JsOptional',{absent:'undefined',tag:'Undefined',typeName:'undefined'}]]);
function until(at,stop){
 const result=[],stack=[],closes={'(':')','[':']','{':'}'};
 while(!(stack.length===0&&at.is(stop))){
  const token=at.next();if(token.type==='end'||result.length>=4096||stack.length>64)failure();
  if(token.type==='punct'){
   if(closes[token.text])stack.push(closes[token.text]);
   else if([')',']','}'].includes(token.text)&&stack.pop()!==token.text)failure();
  }result.push(token);
 }return result;
}
const words=tokens=>tokens.map(token=>token.text).join(' ');
function match(at,expression){
 const operand=expression(at,'Rust');at.expect('{');const wrapper=at.next().text,contract=wrappers.get(wrapper);if(!contract)failure();
 at.expect('::');at.expect('Value');at.expect('(');const binder=at.next().text;at.expect(')');at.expect('=>');
 const present=until(at,',');at.expect(',');at.expect('_');at.expect('=>');const absent=until(at,'}');at.expect('}');
 if(binder==='value'&&words(present)==='value'&&words(absent)==='unreachable! ( "checked absence guard" )')return operand;
 if(binder==='_'&&present.length===1&&present[0].type==='string'&&['"number"','"string"','"boolean"'].includes(present[0].text)&&absent.length===1&&absent[0].text===JSON.stringify(contract.typeName))return {kind:'typeof',operand};
 const truthy=['observed','observed != 0.0 && ! observed . is_nan ( )','! observed . is_empty ( )'];
 if(binder==='observed'&&truthy.includes(words(present))&&words(absent)==='false')return {kind:'truthy',operand};
 failure();
}
function block(at,expression){
 at.expect('let');const binder=at.next().text;if(!['observed','_'].includes(binder))failure();at.expect('=');const operand=expression(at,'Rust');at.expect(';');const tail=until(at,'}');at.expect('}');
 if(binder==='observed'&&words(tail)==='observed != 0.0 && ! observed . is_nan ( )'||binder==='_'&&words(tail)==='false')return {kind:'truthy',operand};
 if(binder==='_'&&tail[0]?.type==='string'&&['"number"','"string"','"boolean"','"object"','"undefined"'].includes(tail[0].text)&&words(tail.slice(1))==='. to_string ( )')return {kind:'typeof',operand};
 failure();
}
export function parsePortableRustAbsencePrimary(token,at,expression){
 if(token.text==='None')return {kind:'undefined'};
 if(token.text==='Some'){at.expect('(');const value=expression(at,'Rust');at.expect(')');return value;}
 if(token.text==='JsNull')return {kind:'null'};
 if(token.text==='JsUndefined')return {kind:'undefined'};
 if(wrappers.has(token.text)){
  at.expect('::');const variant=at.next().text,contract=wrappers.get(token.text);
  if(variant===contract.tag)return {kind:contract.absent};
  if(variant!=='Value')failure();at.expect('(');const value=expression(at,'Rust');at.expect(')');return value;
 }
 if(token.text==='matches!'){
  at.expect('(');const operand=expression(at,'Rust');at.expect(',');const contract=wrappers.get(at.next().text);if(!contract)failure();at.expect('::');at.expect(contract.tag);at.expect(')');return {kind:'binary',op:'equal',left:operand,right:{kind:contract.absent}};
 }
 if(token.text==='match')return match(at,expression);
 if(token.text==='{')return block(at,expression);
 return null;
}
