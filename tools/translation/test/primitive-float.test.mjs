import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FLOAT_CONTRACTS,SOURCE_F64,PRIMITIVE_FLOAT_PROFILE,primitiveFloatContract,primitiveFloatConstant,requirePrimitiveFloat} from '../extensions/primitive-float-contracts.mjs';
import {rust_f64_is_nan,rust_f64_is_finite,rust_f64_floor} from '../extensions/float-runtime.mjs';
import {translateSource} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');

test('primitive f64 registry is immutable and separates stable runtime from floating CTFE',()=>{
  assert.equal(Object.isFrozen(FLOAT_CONTRACTS),true);assert.equal(Object.isFrozen(SOURCE_F64),true);
  assert.equal(PRIMITIVE_FLOAT_PROFILE.constantEvaluation,false);assert.equal(PRIMITIVE_FLOAT_PROFILE.binary32,false);
  for(const method of ['is_nan','is_finite','floor']) {
    const contract=primitiveFloatContract(method);assert.equal(Object.isFrozen(contract),true);
    assert.equal(contract.family,'float');assert.equal(contract.kind,'method');assert.equal(contract.pure,true);assert.equal(contract.async,false);
    assert.deepEqual(contract.params,[SOURCE_F64]);assert.deepEqual(contract.receiver,SOURCE_F64);
    assert.throws(()=>{contract.params[0].rustPrimitiveName='f32';},TypeError);
  }
  assert.equal(primitiveFloatContract('is_nan').constSince,'1.83.0');assert.equal(primitiveFloatContract('is_finite').constEligible,true);
  assert.equal(primitiveFloatContract('floor').constEligible,false);assert.equal(primitiveFloatContract('floor').constUnstable,'const_float_round_methods');
  for(const name of ['is_sign_negative','is_sign_positive','min','max','to_bits'])assert.equal(primitiveFloatContract(name),null);
  assert.equal(primitiveFloatConstant('NAN').value,'NaN');assert.equal(primitiveFloatConstant('INFINITY'),null);
  for(const type of [{kind:'float'}, {...SOURCE_F64,rustPrimitiveName:'f32'}, {...SOURCE_F64,rustReference:{kind:'shared',pointee:SOURCE_F64}}, {...SOURCE_F64,patternOwnershipRefusal:'shared source reference'}, {kind:'data',name:'f64'}])assert.throws(()=>requirePrimitiveFloat({type},{start:3,end:4}),error=>error.kind==='unsupported'&&error.span.start===3);
});

test('primitive runtime classifies all Number classes and floors signed zero exactly',()=>{
  for(const [value,nan,finite] of [[NaN,true,false],[Infinity,false,false],[-Infinity,false,false],[0,false,true],[-0,false,true],[Number.MIN_VALUE,false,true],[-Number.MIN_VALUE,false,true],[Number.MAX_VALUE,false,true]]) {
    assert.equal(rust_f64_is_nan(value),nan);assert.equal(rust_f64_is_finite(value),finite);
  }
  for(const [value,expected] of [[0,0],[-0,-0],[0.25,0],[-0.25,-1],[3.7,3],[-3.7,-4],[Number.MIN_VALUE,0],[-Number.MIN_VALUE,-1],[Infinity,Infinity],[-Infinity,-Infinity],[Number.MAX_VALUE,Number.MAX_VALUE]])assert.equal(Object.is(rust_f64_floor(value),expected),true);
  assert.equal(Number.isNaN(rust_f64_floor(NaN)),true);
  let reads=0;const hostile={valueOf(){reads++;throw Error('conversion');},[Symbol.toPrimitive](){reads++;throw Error('conversion');}};
  for(const value of [1n,'3',null,undefined,hostile,new Number(1)])for(const fn of [rust_f64_is_nan,rust_f64_is_finite,rust_f64_floor])assert.throws(()=>fn(value),TypeError);
  assert.equal(reads,0);
});

test('checked by-value primitive methods and UFCS execute JS and separately strict TS',{timeout:30_000},async()=>{
  const source='pub fn nan()->f64{f64::NAN} pub fn is_nan(value:f64)->bool{value.is_nan()} pub fn finite(value:f64)->bool{f64::is_finite(value)} pub fn floor(value:f64)->f64{value.floor()} pub fn floor_finite(value:f64)->bool{f64::floor(value).is_finite()} pub fn nan_class()->bool{f64::is_nan(f64::NAN)}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    assert.equal(Number.isNaN(api.nan()),true);assert.equal(api.nan_class(),true);
    for(const value of [NaN,Infinity,-Infinity,0,-0,0.25,-0.25,3.7,-3.7,Number.MIN_VALUE,Number.MAX_VALUE]) {
      assert.equal(api.is_nan(value),Number.isNaN(value));assert.equal(api.finite(value),Number.isFinite(value));
      const expected=Math.floor(value),actual=api.floor(value);assert.equal(Number.isNaN(expected)?Number.isNaN(actual):Object.is(actual,expected),true);
      assert.equal(api.floor_finite(value),Number.isFinite(expected));
    }
    for(const value of ['3',1n,null,{}])assert.throws(()=>api.floor(value),TypeError);
  });
});

test('verified original float tokens and IEEE arithmetic retain primitive receiver identity',{timeout:30_000},async()=>{
  // This source requires Root's separately reviewed decimal token adapter.
  const source='pub fn literal()->bool{1.0f64.is_finite()} pub fn arithmetic(value:f64)->f64{(value+0.25).floor()} pub fn negative()->f64{(-0.0f64).floor()}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.literal(),true);assert.equal(api.arithmetic(3.7),3);assert.equal(Object.is(api.negative(),-0),true);});
});

test('unproved owners, shared receivers, NaN signs and floating constants stay refused',()=>{
  for(const source of [
    'pub fn bad(value:&f64)->bool{value.is_nan()}',
    'pub fn bad(value:&f64)->bool{f64::is_finite(value)}',
    'pub fn bad(value:&mut f64)->f64{value.floor()}',
    'pub fn bad(value:f64)->bool{value.is_sign_negative()}',
    'pub fn bad(value:f64)->bool{value.is_sign_positive()}',
    'pub fn bad(value:f64)->f64{value.min(f64::NAN)}',
    'pub fn bad(value:f32)->bool{value.is_nan()}',
    'pub fn bad(value:u64)->bool{value.is_nan()}',
    'mod f64{} pub fn bad()->f64{f64::NAN}',
    'mod local{pub struct f64{value:u64}} use crate::local::f64; pub fn bad(value:f64)->bool{value.is_nan()}',
    'mod fake{} pub fn bad()->f64{fake::NAN}',
    'mod std{} pub fn bad(value:f64)->bool{std::primitive::f64::is_nan(value)}',
    'const BAD:f64=f64::NAN;',
    'const BAD:bool=f64::is_nan(f64::NAN);',
    'pub const fn bad(value:f64)->f64{value.floor()}',
  ]) {
    const result=translateSource(source);assert.equal(result.ir.items.some(item=>item.name==='bad'&&item.status==='executable'),false,source);
    assert.equal(result.ir.items.map(item=>item.source).join(''),source);
    if(source.startsWith('const BAD'))assert.equal(result.ir.items.some(item=>item.status==='executable'),false,source);
  }
});

test('unchanged policy classification declarations retain tool attributes and source pins',{timeout:60_000},async()=>{
  const path='src/generated_js_first/policy.rs',original=readFileSync(repositorySourceURL(path,new URL('../../../',import.meta.url)),'utf8');
  assert.equal(hash(original),'c5d5cec07bf54be29de7beed707263256afa6ba1ee87c89695b237d5626f5673');
  const pins=[['valid_token_count',1977,2130,'c09f46ceeaf76fbd33a63b6d061b6d45264efca9a37d8fbaf7b5a322468a0991'],['weighted_capacity',3303,3515,'99be3d6b8d2b18ccdcb008590f100e38557b1ccba90004213789747ad4c01e43']];
  const items=sourceItems(original),selected=pins.map(([name,start,end,digest])=>{const item=items.find(item=>item.term==='fn'&&item.name===name);assert.deepEqual([item.start,item.end],[start,end]);const text=original.slice(start,end);assert.equal(hash(text),digest);assert.ok(text.startsWith('#[rustfmt::skip]'));return text;}).join('\n');
  // Root's automatic sealed tool-attribute context is a prerequisite. The
  // declarations remain complete; no attributes or Rust bodies are rewritten.
  const result=translateProject({entry:path,paths:[path],readSource:()=>selected,compilationProfile:PRODUCTION_PROFILE});
  assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.runtimeParity,false);
  const extracted=sourceItems(selected);
  for(const [name]of pins){const item=extracted.find(item=>item.name===name),entry=result.meta.executable.find(entry=>entry.name===name);assert.deepEqual(entry.span,{start:item.start,end:item.end});}
  await verifyTypedTargets(result,api=>{
    for(const [value,expected] of [[0,true],[-0,true],[42,true],[1.5,false],[-1,false],[Infinity,false],[NaN,false]])assert.equal(api.valid_token_count(value),expected);
    for(const [weight,load,expected]of [[12,3,3],[-1,0,0],[0,0,0],[Infinity,0,0],[NaN,0,0],[12,-1,0],[12,Infinity,0]])assert.equal(api.weighted_capacity(weight,load),expected);
  });
});
