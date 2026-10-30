import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isCanonicalJsonText} from '../canonical-json-text.mjs';
import {isCanonicalJsonUtf8} from '../canonical-json-utf8.mjs';
import {prepareUtf8CanonicalJson} from '../prepare-utf8-canonical-json.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

test('whole original canonical decisions and malformed errors survive byte cursor boundaries',{timeout:60000},()=>{
 const values=[null,true,false,0,-0,NaN,Infinity,Number.MIN_VALUE,Number.MAX_VALUE,'λ😀\ud800\udfff\0\r\n',[],{},[1,false,null],{'20':2,'3':3,z:'λ😀'}];
 const texts=values.map(value=>JSON.stringify(value));
 for(let padding=16360;padding<16400;padding++)texts.push(JSON.stringify({first:'x'.repeat(padding)+'λ😀猫',second:[0,-123.5e23,true,null],['key'+padding+'😀']:'end'}));
 texts.push(JSON.stringify({['key'.repeat(12000)+'😀']:1}));
 texts.push(...[' {"x":1}','{"20":2,"3":3}','{"x":1,"x":2}','1e0','-0','"\\u0061"','"\\/"','[1,]','{"x":}','true false','', '['.repeat(514)+'0'+']'.repeat(514)]);
 for(const text of texts){assert.equal(Buffer.from(text).toString('utf8'),text,'complete UTF8 fixture inverse');let expected,error;try{expected=isCanonicalJsonText(text);}catch(value){error=value;}
  if(error)assert.throws(()=>isCanonicalJsonUtf8(Buffer.from(text)),value=>value.constructor===error.constructor&&value.message===error.message);else assert.equal(isCanonicalJsonUtf8(Buffer.from(text)),expected,text.slice(0,50));
 }
});

test('byte cursor rejects invalid complete UTF8 including boundaries without replacing input bytes',{timeout:60000},()=>{
 for(const bytes of [Buffer.from([34,0xc0,0xaf,34]),Buffer.from([34,0xed,0xa0,0x80,34]),Buffer.from([34,0xf4,0x90,0x80,0x80,34]),Buffer.from([34,0xe2,0x82]),Buffer.concat([Buffer.from('"'+'x'.repeat(16382)),Buffer.from([0x80,34])])]){const before=Buffer.from(bytes);assert.equal(isCanonicalJsonUtf8(bytes),false);assert.deepEqual(bytes,before);}
 assert.throws(()=>isCanonicalJsonUtf8(new Uint8Array([49])),TypeError);
});

test('actual complete grammar and both original public entries remain byte exact through CST phases',{timeout:60000},()=>{
 const plan=prepareUtf8CanonicalJson(),[row]=plan.files;assert.equal(plan.originalCompleteGrammarUnchanged,true);assert.equal(plan.originalNativeFallbackRetained,true);assert.equal(plan.newAcrossInvocationCache,false);
 assert.equal(row.current,row.after);assert.equal(row.before,readFileSync(new URL('../canonical-json-text.mjs',import.meta.url),'utf8'));assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepEqual(row.unchangedFunctions,['canonicalSyntax','isCanonicalJsonText','assertJsonSyntax']);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);assert.equal(stage.completeInverse,true);}
});
