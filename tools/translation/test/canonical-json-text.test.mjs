import test from 'node:test';
import assert from 'node:assert/strict';
import {isCanonicalJsonText,assertJsonSyntax} from '../canonical-json-text.mjs';

function native(source){try{return {value:JSON.stringify(JSON.parse(source))===source};}catch(error){return {error:{name:error.name,message:error.message}};}}
function actual(source){try{return {value:isCanonicalJsonText(source)};}catch(error){return {error:{name:error.name,message:error.message}};}}
function compare(sources){for(const source of sources)assert.deepEqual(actual(source),native(source),JSON.stringify(source));}

test('canonical primitive and nested data match the independent native JSON operation',()=>{
 const values=[null,true,false,0,-0,1,-1,1.5,1e-7,1e21,Number.MAX_VALUE,Number.MIN_VALUE,'','λ😀','\u0000\b\t\r\n"\\/','\ud800','\udfff',[],{},[1,true,null],{a:{b:[1,'x']}}];
 compare(values.map(value=>JSON.stringify(value)));
 for(let index=0;index<256;index++)compare([JSON.stringify(String.fromCharCode(index)),JSON.stringify({[String.fromCharCode(index)]:index})]);
});

test('native integer-key ordering, duplicates and ordinary keys retain exact canonical decisions',()=>{
 compare(['{"0":0,"2":2,"4294967294":4,"a":1,"4294967295":5}',
  '{"a":1,"2":2}','{"2":2,"1":1}','{"1":1,"1":2}',
  '{"-0":0,"00":1,"01":2,"1.0":3,"1e0":4}',
  '{"":1,"__proto__":2,"constructor":3,"toString":4}',
  '{"a":1,"\\u0061":2}','{"\\u0000":1,"λ😀":2}',
  '{"4294967295":1,"4294967296":2}','{"9007199254740993":1}']);
});

test('noncanonical numeric spellings, whitespace and escapes are never accepted as canonical',()=>{
 compare(['-0','1.0','1e0','1E+21','1e21','1e+21','0.0000001','1e400','9007199254740993',
  ' true','true\n','[1, 2]','{"a" :1}','"\\/"','"\\u0061"','"\\u000A"','"\\n"',
  '"\ud800"','"\udfff"','"\ud800\udfff"','"\\ud800"','"\\udfff"','"\\ud800\\udfff"']);
});

test('malformed input preserves the exact native SyntaxError, including its original position',()=>{
 const values=['','[',']','{','}',',','nullx','truefalse','undefined','NaN','Infinity','-Infinity','01','+1','1.','1e','1e+','--1','[1,]','[,1]','{"a":1,}','{a:1}','{"a" 1}','{"a":}','{"a":1 "b":2}','"unterminated','"\\x20"','"\\u00zz"','"\n"','"trailing\\'];
 compare(values);
 for(const value of values)compare(['{"before":[1,true],"bad":'+value+'}', '[0,'+value+']']);
});

test('deep documents keep the original native acceptance and stack behavior',()=>{
 for(const depth of [511,512,513,600,1500,12000]){
  const source='['.repeat(depth)+'0'+']'.repeat(depth);compare([source,source.slice(0,-1)]);
 }
});

test('large complete arrays and objects retain every late member and refusal',()=>{
 const rows=Array.from({length:20000},(_,index)=>({kind:'token',span:[index,index+1],text:index%2?'λ😀':'\\n'}));
 const source=JSON.stringify(rows);assert.equal(isCanonicalJsonText(source),true);
 compare([source.slice(0,-1)+',]',source.slice(0,-2)+'}]',JSON.stringify(Object.fromEntries(rows.map((row,index)=>[String(index),row])))]);
 assert.equal(isCanonicalJsonText(JSON.stringify([...rows,{late:'\ud800'}])) ,true);
});

test('deterministic generated values and lexical mutations match independent native decisions and errors',()=>{
 let seed=759;const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
 const scalar=()=>[null,true,false,0,-0,1e-7,1e21,Number.MAX_VALUE,'λ😀\u0000','\ud800','"\\',next()/7][next()%12];
 const tree=depth=>{
  if(!depth||next()%3===0)return scalar();
  if(next()%2)return Array.from({length:next()%5},()=>tree(depth-1));
  return Object.fromEntries(Array.from({length:next()%5},()=>[[String(next()%20),'__proto__','a','λ😀','\u0000'][next()%5],tree(depth-1)]));
 };
 for(let index=0;index<400;index++){
  const source=JSON.stringify(tree(4)),at=next()%(source.length+1);
  compare([source,source.slice(0,at)+' '+source.slice(at),source.slice(0,at)+','+source.slice(at),source.slice(0,at)+source.slice(at+1)]);
 }
 const alphabet='{}[],:"\\0123456789-+.eEtruefalsn λ😀\n\t';
 for(let index=0;index<1000;index++){let source='';for(let count=next()%40;count;count--)source+=alphabet[next()%alphabet.length];compare([source]);}
});

test('syntax-only validation retains native parsing of noncanonical and deeply nested data',()=>{
 const sources=['0','-0','1e0','1e400',' 1\n','{"a":1,"a":2}','{"2":1,"1":2}','"\\u0061"',
  '"\ud800"','[1,]','{"a":}','"\\x20"','','nullx'];
 for(const depth of [512,513,1500,12000])sources.push('['.repeat(depth)+'0'+']'.repeat(depth));
 function observation(callback,source){try{callback(source);return {ok:true};}catch(error){return {name:error.name,message:error.message};}}
 for(const source of sources){assert.deepEqual(observation(assertJsonSyntax,source),observation(JSON.parse,source),JSON.stringify(source));if(observation(JSON.parse,source).ok)assert.equal(assertJsonSyntax(source),undefined);}
});
