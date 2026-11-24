import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {topLevelItems} from '../vendor/formal-ai/lexer.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {topLevelRustItems} from '../rust-item-boundaries.mjs';
import {originalPrimitiveNamespaceSources} from '../extensions/primitive-namespace-sources.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function compare(source){const tokens=rustTokens(source),old=topLevelItems(tokens),current=topLevelRustItems(tokens);assert.deepEqual(current,old);return {bytes:Buffer.byteLength(source),sourceSha256:hash(source),tokens:tokens.length,items:current.length,completeItemsSha256:hash(JSON.stringify(current))};}

test('continuation lookahead preserves entire original boundaries across comments, attributes, declarations, operators and malformed groups',()=>{
  const sources=['','//only comment','#![allow(dead_code)]\n#[doc="λ😀"] pub fn f(){true}',
    'pub fn first(){} /*one*/ /*two*/ pub fn second(){}','fn f(){if true{} /*gap*/ else {}}',
    'type T={X}; const A:u8={1}+1; static B:u8={2};','use a::{b,c}; pub(crate) use d::{e,f};',
    'mod a{fn f(){}} mod b{fn g(){}}','macro_rules! a {() => {{true}};} fn f(){}',
    'fn f(){}; fn next(){}','fn f(){} #[allow(dead_code)] fn next(){}',
    'fn f(){} /*comment*/ as u8;','fn f(){(]} trailing','{a}/*gap*/+{b};',
    'fn f(){r#"} /* opaque */"#;\'🧪\';} //tail'];
  for(const tail of [';',')',']',',','+','*','}','#','@','else {}','as u8','end',''])sources.push('fn f(){} /*a*/ //b\n /*c*/ '+tail);
  for(const source of sources)compare(source);
  compare(Array.from({length:1200},(_,index)=>`fn f${index}(){} /*${index}*/`).join('\n'));
});

test('every complete pinned architecture source preserves the original item tokens and UTF16 spans', {timeout:120_000},t=>{
  const rows=[];let oldMilliseconds=0,currentMilliseconds=0;
  for(const [path,pin]of originalPrimitiveNamespaceSources()){
    if(!path.startsWith('crates/core_arch/src/'))continue;
    const tokens=rustTokens(pin.source);let start=performance.now();const old=topLevelItems(tokens);oldMilliseconds+=performance.now()-start;
    start=performance.now();const current=topLevelRustItems(tokens);currentMilliseconds+=performance.now()-start;assert.deepEqual(current,old,path);
    rows.push({path,sourceSha256:hash(pin.source),bytes:Buffer.byteLength(pin.source),tokenCount:tokens.length,itemCount:current.length,completeItemsSha256:hash(JSON.stringify(current))});
  }
  assert.equal(rows.length,135);
  t.diagnostic(JSON.stringify({completeArchitectureFiles:rows.length,oldMilliseconds,currentMilliseconds,timingScope:'Item boundary scan only; old/current share freshly lexed original input; not full cold compilation',runtimeParity:false}));
  t.diagnostic('complete-comparison-base64:'+Buffer.from(JSON.stringify(rows)).toString('base64'));
});

test('returned item arrays remain fresh and retain the same original token references',()=>{
  const tokens=rustTokens('fn f(){} /*comment*/ fn g(){}'),first=topLevelRustItems(tokens),second=topLevelRustItems(tokens);
  assert.notStrictEqual(first,second);assert.notStrictEqual(first[0].tokens,second[0].tokens);assert.strictEqual(first[0].tokens[0],tokens[0]);
  first[0].tokens.length=0;assert.deepEqual(topLevelRustItems(tokens),topLevelItems(tokens));
});
