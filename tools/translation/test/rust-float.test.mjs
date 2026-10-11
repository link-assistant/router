import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeRustFloat,isRustFloatToken,RUST_FLOAT_LITERAL_PROFILE} from '../extensions/rust-float.mjs';
import {tokenizeRust,capturedRustTokenSource} from '../extensions/lexical.mjs';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const decode=raw=>decodeRustFloat(raw,{start:5,end:5+raw.length});

test('Rust decimal literals round once at normal, subnormal and exact halfway boundaries',()=>{
  assert.equal(RUST_FLOAT_LITERAL_PROFILE.binary32,false);
  for(const raw of ['1usize','1isize','0xf64','0xff64','2u64'])assert.equal(isRustFloatToken(raw),false,raw);
  for(const [raw,bits]of [
    ['0.0','0000000000000000'],['0.1','3fb999999999999a'],['2.','4000000000000000'],
    ['1_2E+2_f64','4092c00000000000'],['9007199254740993f64','4340000000000000'],
    ['1.00000000000000011102230246251565404236316680908203125','3ff0000000000000'],
    ['1.00000000000000033306690738754696212708950042724609375','3ff0000000000002'],
    ['1e-400','0000000000000000'],['1.7976931348623157e308','7fefffffffffffff'],
    [(5n**1075n).toString()+'e-1075','0000000000000000'],
    [(3n*5n**1075n).toString()+'e-1075','0000000000000002'],
    [(5n**1022n).toString()+'e-1022','0010000000000000'],
  ])assert.equal(decode(raw).floatBits,bits,raw);
  for(const raw of ['','NaN','inf','-1.0','1','1.0u64','2.e3','2.f64','2e','2e+','2e___','0x1f64','0b1f64','1.0f32','1e999999','1.7976931348623159e308','1'.repeat(4097)+'.0'])assert.throws(()=>decode(raw),error=>['syntax','unsupported'].includes(error.kind)&&error.span.start===5,raw);
});

test('float lexical adaptation preserves original bytes, opaque text, ranges and methods',()=>{
  const source='/* 😀 1.0 */ fn floats()->f64{let a=1.25e_2_f64;let b=2.;let s=r#"1e3"#;a+b}';
  const tokens=tokenizeRust(source),captured=capturedRustTokenSource(tokens),floats=tokens.filter(token=>token.kind==='rustFloat');
  assert.equal(captured.source,source);assert.deepEqual(floats.map(token=>token.raw),['1.25e_2_f64','2.']);
  assert.deepEqual(floats.map(token=>token.value),['125','2']);
  for(const token of floats)assert.equal(source.slice(token.start,token.end),token.raw);
  assert.deepEqual(tokenizeRust('1..2 1..=2 2.max(3) 0xff64 1usize 2isize').slice(0,-1).map(token=>token.value),['1','..','2','1','..=','2','2','.','max','(','3',')','65380','1','2']);
  assert.equal(tokens.find(token=>token.kind==='string').value,'1e3');
});

test('binary64 source literals execute JS and strict TS with negative zero and independent boundary outcomes',{timeout:30_000},async()=>{
  const source='pub fn tenth()->f64{0.1} pub fn half()->f64{1.00000000000000011102230246251565404236316680908203125} pub fn negzero()->f64{-0.0} pub fn tiny()->f64{5e-324} pub fn underflow()->f64{-1e-400} pub fn shifted(value:f64)->f64{value+1.25e2} pub fn equal(value:f64)->bool{value==1.0} pub fn trailing()->f64{2.}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.tenth(),0.1);assert.equal(api.half(),1);assert.equal(Object.is(api.negzero(),-0),true);assert.equal(api.tiny(),Number.MIN_VALUE);assert.equal(Object.is(api.underflow(),-0),true);
    assert.equal(api.shifted(0.5),125.5);assert.equal(api.shifted(Infinity),Infinity);assert.equal(Number.isNaN(api.shifted(NaN)),true);assert.equal(api.equal(1),true);assert.equal(api.equal(NaN),false);assert.equal(api.trailing(),2);
    for(const value of [1n,'1',null])assert.throws(()=>api.shifted(value),TypeError);
  });
});

test('float source syntax cannot invent integer, reference, binary32 or const-evaluation permission',()=>{
  for(const source of ['pub fn bad()->u8{1.0}','pub fn bad()->f32{1.0}','pub fn bad()->f64{1.0f32}','pub fn bad()->f64{1.0u64}','pub fn bad()->f64{1e500}','pub fn bad()->&\'static f64{1.0}','pub fn bad()->[u8;1]{[1.0]}','const BAD:f64=1.0;']) {
    const result=translateSource(source);assert.equal(result.ir.items.some(item=>item.status==='executable'),false,source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});

test('unchanged original Router decimal tokens retain file and declaration pins without a tool-attribute runtime claim',()=>{
  const path='src/generated_js_first/policy.rs',source=readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
  assert.equal(hash(source),'c5d5cec07bf54be29de7beed707263256afa6ba1ee87c89695b237d5626f5673');
  const item=sourceItems(source).find(item=>item.name==='retryable_status');assert.deepEqual([item.start,item.end],[3019,3183]);
  const original=source.slice(item.start,item.end);assert.equal(hash(original),'ac6c63fc33f2cbac3f4749bf88eabab3f058238c99260d938ff462816584d2cc');
  assert.deepEqual(tokenizeRust(original).filter(token=>token.kind==='rustFloat').map(token=>token.value),['408','429','500','599']);
});
