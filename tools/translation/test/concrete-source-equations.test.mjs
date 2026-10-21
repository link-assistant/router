import test from 'node:test';
import assert from 'node:assert/strict';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

test('fresh whole source equations retain all canonical fields substitutions and inverses in both fixed phases',{timeout:60000},()=>{
 const rows=[
  {before:'// Ω😀\r\npub fn answer()->u8{1}\n',after:'// Ω😀\r\npub fn answer()->u8{2}\n',language:'Rust'},
  {before:'// complete trivia\nexport const value = "a";\n',after:'// complete trivia\nexport const value = "b";\n',language:'JavaScript'},
  {before:'export const value: number = 1;\n',after:'export const value: number = 2;\n',language:'TypeScript'},
 ];
 const snapshot=structuredClone(rows),actual=transportConcreteSourceEquations(rows);assert.deepEqual(rows,snapshot);assert.equal(actual.length,3);
 for(let index=0;index<rows.length;index++){
  const row=actual[index],wanted=rows[index];assert.equal(row.before,wanted.before);assert.equal(row.after,wanted.after);assert.equal(row.inverse,wanted.before);assert.deepEqual(row.trace.map(value=>value.phase),['language','repository']);
  const before=transportConcreteSyntaxMeta(row.beforeMeta),after=transportConcreteSyntaxMeta(row.afterMeta);assert.equal(before.source,wanted.before);assert.equal(after.source,wanted.after);assert.equal(before.document.language,wanted.language);assert.equal(after.document.language,wanted.language);assert.deepEqual(after.document.authority,{type:false,owner:false,executable:false});
 }
 assert.deepEqual(transportConcreteSourceEquations(rows),actual);
});

test('equation ingress refuses foreign descriptors sparse arrays proxies and invalid primitives without callbacks',{timeout:60000},()=>{
 let calls=0;const good={before:'pub fn x(){}',after:'pub fn x(){ }',language:'Rust'},accessor={...good};Object.defineProperty(accessor,'before',{enumerable:true,get(){calls++;throw Error('unexpected getter');}});
 const proxy=new Proxy(good,{get(){calls++;throw Error('unexpected proxy read');},ownKeys(){calls++;throw Error('unexpected proxy keys');}}),arrayProxy=new Proxy([good],{get(){calls++;throw Error('unexpected array proxy read');}}),hole=new Array(1),arrayAccessor=[good];Object.defineProperty(arrayAccessor,'0',{enumerable:true,get(){calls++;throw Error('unexpected array getter');}});
 for(const value of [[],hole,arrayAccessor,arrayProxy,[accessor],[proxy],[{...good,extra:true}],[{...good,language:'unknown'}],[{...good,before:1}],[Object.assign(Object.create(null),good)],new Array(129).fill(good)])assert.throws(()=>transportConcreteSourceEquations(value),TypeError);
 assert.equal(calls,0);assert.equal(transportConcreteSourceEquations([good])[0].after,good.after);
});
