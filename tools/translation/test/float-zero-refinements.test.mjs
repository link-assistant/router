import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {SOURCE_F64,primitiveFloatContract} from '../extensions/primitive-float-contracts.mjs';
import {floatSignObligation,resolveFloatZeroSigns,FLOAT_ZERO_PROFILE} from '../extensions/float-zero-refinements.mjs';
import {rust_f64_is_sign_negative,rust_f64_is_sign_positive} from '../extensions/float-runtime.mjs';
import {HostChecker} from '../extensions/host-contracts.mjs';
import {translateProject} from '../project.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const object=()=>({k:'var',name:'v',type:SOURCE_F64});
const surface={items:[{k:'fn',name:'unit',params:[{name:'v',type:SOURCE_F64}]}]};
function unit(body) {const entry={k:'fn',name:'unit',fullName:'unit',modulePath:[],params:surface.items[0].params,ret:{kind:'bool'},body};return {items:[entry],declarations:new Map([['unit',entry]]),main:null};}
const literal=()=>({k:'lit',value:'0',type:SOURCE_F64,sourceFloatLiteral:{profile:'rust-1.89-binary64-decimal-literals',verified:true,raw:'0.0',bits:'0000000000000000'},span:{start:10,end:13}});
const condition=()=>({k:'binary',op:'eq',left:object(),right:literal(),domain:SOURCE_F64,type:{kind:'bool'},span:{start:5,end:13}});

test('checked-IR unit facts use lexical slots, not refinement metadata or copied obligations',()=>{
  assert.equal(primitiveFloatContract('is_sign_negative'),null);
  const obligation=floatSignObligation('is_sign_negative',object(),{start:20,end:40});
  const program=unit({k:'if',cond:condition(),then:obligation,else:{k:'lit',value:false,type:{kind:'bool'}},type:{kind:'bool'}});
  resolveFloatZeroSigns(program,surface);
  const call=program.items[0].body.then;assert.equal(call.k,'routerHostCall');assert.equal(call.id,'rust_f64_is_sign_negative');
  assert.equal(call.primitiveFloatSignProof.fact,'zero-excludes-NaN');assert.equal(call.primitiveFloatSignProof.binding.index,0);
  assert.equal(JSON.stringify(program.items).includes('routerFloatSignObligation'),false);
  const forged={...floatSignObligation('is_sign_negative',object(),null),floatSignSeal:{},primitiveFloatSignProof:{verified:true,profile:FLOAT_ZERO_PROFILE.id}};
  assert.throws(()=>resolveFloatZeroSigns(unit({k:'if',cond:condition(),then:forged,else:{k:'lit',value:false,type:{kind:'bool'}},type:{kind:'bool'}}),surface),/actual checked zero/);
  const spoof={...floatSignObligation('is_sign_negative',object(),null),primitiveFloatSignProof:call.primitiveFloatSignProof};
  assert.throws(()=>resolveFloatZeroSigns(unit(spoof),surface),/actual checked zero/);
  const plain=condition();delete plain.right.sourceFloatLiteral;
  assert.throws(()=>resolveFloatZeroSigns(unit({k:'if',cond:plain,then:floatSignObligation('is_sign_positive',object(),null),else:{k:'lit',value:false,type:{kind:'bool'}},type:{kind:'bool'}}),surface),/actual checked zero/);
  const stale=floatSignObligation('is_sign_negative',object(),null);stale.object.name='other';
  const mismatched={...surface,items:[{...surface.items[0],params:[{name:'other',type:SOURCE_F64}]}]},staleProgram=unit({k:'if',cond:{...condition(),left:{...object(),name:'other'}},then:stale,else:{k:'lit',value:false,type:{kind:'bool'}},type:{kind:'bool'}});
  staleProgram.items[0].params=mismatched.items[0].params;
  assert.throws(()=>resolveFloatZeroSigns(staleProgram,mismatched),/actual checked zero/);
  const cloned=JSON.parse(JSON.stringify({k:'if',cond:condition(),then:floatSignObligation('is_sign_negative',object(),null),else:{k:'lit',value:false,type:{kind:'bool'}},type:{kind:'bool'}}));
  assert.throws(()=>resolveFloatZeroSigns(unit(cloned),surface),/actual checked zero/);
  let deep=floatSignObligation('is_sign_negative',object(),null);
  for(let index=0;index<FLOAT_ZERO_PROFILE.depth+1;index++)deep={k:'let',name:'nested'+index,value:{k:'lit',value:false,type:{kind:'bool'}},body:deep,type:{kind:'bool'}};
  assert.throws(()=>resolveFloatZeroSigns(unit(deep),surface),/bounded/);
  // These are pure checked-IR units, not parser/source-association proofs.
});

test('runtime sign adapters preserve both zeros and reject NaN without coercion',()=>{
  for(const [value,negative]of [[-0,true],[0,false],[-1,true],[1,false],[-Infinity,true],[Infinity,false],[-Number.MIN_VALUE,true],[Number.MIN_VALUE,false]]) {
    assert.equal(rust_f64_is_sign_negative(value),negative);assert.equal(rust_f64_is_sign_positive(value),!negative);
  }
  let reads=0;const value={valueOf(){reads++;return -0;}};
  for(const input of [NaN,value,'-0',0n,null])for(const operation of [rust_f64_is_sign_negative,rust_f64_is_sign_positive])assert.throws(()=>operation(input),TypeError);
  assert.equal(reads,0);
});

test('actual zero branches preserve signed zeros, conjunctions and lexical shadows in both targets',{timeout:30_000},async()=>{
  const source='pub fn negative(v:f64)->bool{if v==0.0{v.is_sign_negative()}else{false}} pub fn positive(v:f64)->bool{if 0.0==v{v.is_sign_positive()}else{false}} pub fn both(a:f64,b:f64)->bool{if a==0.0&&b==-0.0{a.is_sign_negative()||b.is_sign_negative()}else{false}} pub fn nested(v:f64)->bool{if v==0.0{let v:f64=-0.0;if v==0.0{v.is_sign_negative()}else{false}}else{false}}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.deepEqual(result.meta.refused,[]);
  assert.equal(JSON.stringify(result.meta.checkedSemanticProgram).includes('routerFloatSignObligation'),false);
  await verifyTypedTargets(result,api=>{
    for(const value of [0,-0,1,-1,Infinity,-Infinity,NaN]) {
      assert.equal(api.negative(value),Object.is(value,-0));assert.equal(api.positive(value),Object.is(value,0));assert.equal(api.nested(value),value===0);
    }
    for(const a of [0,-0])for(const b of [0,-0])assert.equal(api.both(a,b),Object.is(a,-0)||Object.is(b,-0));
    assert.equal(api.both(NaN,0),false);assert.equal(api.both(0,1),false);
  });
});

test('NaN predicates, aliases, closures, continuations, references and const signs gain no facts',()=>{
  for(const source of [
    'pub fn bad(v:f64)->bool{v.is_sign_negative()}',
    'pub fn bad()->bool{f64::NAN.is_sign_positive()}',
    'pub fn bad(v:f64)->bool{if !v.is_nan(){v.is_sign_negative()}else{false}}',
    'pub fn bad(v:f64)->bool{if v.is_finite(){v.is_sign_negative()}else{false}}',
    'pub fn bad(v:f64)->bool{if v>=0.0{v.is_sign_positive()}else{false}}',
    'pub fn bad(v:f64)->bool{if v==0.0||false{v.is_sign_negative()}else{false}}',
    'pub fn bad(v:f64)->bool{if v==0.0{let v:f64=1.0;v.is_sign_negative()}else{false}}',
    'pub fn bad(v:f64)->bool{if v==0.0{let alias:f64=v;alias.is_sign_negative()}else{false}}',
    'pub fn bad(v:f64)->bool{if v==0.0{}v.is_sign_negative()}',
    'pub fn bad(v:f64)->bool{if v==0.0{Some(v).is_some_and(|x|x.is_sign_negative())}else{false}}',
    'pub fn bad(v:&f64)->bool{if *v==0.0{v.is_sign_negative()}else{false}}',
    'pub fn bad(v:f64)->bool{if v==0.0{v.is_sign_negative(0.0)}else{false}}',
    'pub const fn bad(v:f64)->bool{if v==0.0{v.is_sign_negative()}else{false}}',
    'mod f64{} pub fn bad()->f64{f64::NAN}',
  ]){const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);}
  const checker=new HostChecker('Rust',[]);
  assert.throws(()=>checker.expr({k:'routerHostCall',id:'rust_f64_is_sign_negative',args:[{k:'name',path:['v']}],primitiveFloatSignProof:{verified:true,fact:'zero-excludes-NaN'}},new Map([['v',SOURCE_F64]]),[],{kind:'bool'}));
});

test('original js_min and js_max retain complete attributes and exact signed-zero semantics',{timeout:60_000},async()=>{
  const path='src/generated_js_first/policy.rs',original=readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
  assert.equal(hash(original),'c5d5cec07bf54be29de7beed707263256afa6ba1ee87c89695b237d5626f5673');
  const pins=[['js_min',252,522,'1f20e76a4730851db65b3bcd8d26c828c044df123e44130dd41125cfeb28f128'],['js_max',524,794,'99cf61ef989436d2df9ae2f42c6f4007c2827c94db1b08889350056636727509']];
  const items=sourceItems(original),selected=pins.map(([name,start,end,digest])=>{const item=items.find(item=>item.term==='fn'&&item.name===name);assert.deepEqual([item.start,item.end],[start,end]);const text=original.slice(start,end);assert.equal(hash(text),digest);assert.ok(text.startsWith('#[rustfmt::skip]'));return text;}).join('\n');
  // Root's original-token float parser and automatic tool context are pending
  // prerequisites. The source declarations and attributes are never rewritten.
  const result=translateProject({entry:path,paths:[path],readSource:()=>selected,compilationProfile:PRODUCTION_PROFILE});assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    for(const a of [NaN,Infinity,-Infinity,0,-0,3,-3])for(const b of [NaN,Infinity,-Infinity,0,-0,3,-3])for(const [name,expected]of [['js_min',Math.min(a,b)],['js_max',Math.max(a,b)]]) {
      const actual=api[name](a,b);assert.equal(Number.isNaN(expected)?Number.isNaN(actual):Object.is(actual,expected),true,`${name}(${a},${b})`);
    }
  });
  assert.equal(result.meta.runtimeParity,false); // complete selected declarations
});
