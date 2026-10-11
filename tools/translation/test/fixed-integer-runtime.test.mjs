import test from 'node:test';
import assert from 'node:assert/strict';
import {fixedIntegerContracts} from '../extensions/fixed-integer-contracts.mjs';
import {createFixedIntegerRuntime} from '../extensions/fixed-integer-runtime.mjs';
const type=(bits,signed)=>({kind:'fixed',bits,signed}),some=value=>({$: 'Some',field0:value}),none={$:'None'};
test('fixed arithmetic contracts require checked types, standard Option provenance and exact layouts',()=>{
  const ids=new Set();
  for(const bits of [8,16,32,64,128])for(const signed of [false,true]){
    const result=fixedIntegerContracts(type(bits,signed));
    assert.equal(result.contracts.length,9);assert.equal(result.data[0].standardGeneric.kind,'Option');
    assert.deepEqual(result.data[0].standardGeneric.arguments,[type(bits,signed)]);
    for(const contract of result.contracts){assert.ok(!ids.has(contract.id));ids.add(contract.id);assert.equal(contract.runtimeInstantiation.factory,'createFixedIntegerRuntime');assert.deepEqual(contract.receiver,type(bits,signed));assert.ok(contract.pure);}
    for(const contract of result.contracts.filter(item=>['rust_fixed_min','rust_fixed_max','rust_fixed_clamp'].includes(item.jsExport))){assert.equal(contract.constEligible,false);assert.equal(contract.trait,'std::cmp::Ord');}
    const declaration={...result.data[0],fullName:result.data[0].name};
    assert.deepEqual(fixedIntegerContracts(type(bits,signed),new Map([[declaration.name,declaration]])).data,[]);
    const fake={...declaration,standardGeneric:undefined};assert.throws(()=>fixedIntegerContracts(type(bits,signed),new Map([[fake.name,fake]])),TypeError);
    const incompatible={...declaration,ctors:[{name:'None',fields:[]}]};assert.throws(()=>fixedIntegerContracts(type(bits,signed),new Map([[incompatible.name,incompatible]])),TypeError);
  }
  for(const invalid of [undefined,{kind:'float'},type(7,false),type(64,1),{kind:'data',name:'u64'}]){
    assert.throws(()=>fixedIntegerContracts(invalid),TypeError);assert.throws(()=>createFixedIntegerRuntime(invalid),TypeError);
  }
});
test('checked arithmetic preserves literal overflow, underflow and signed multiplication expectations',()=>{
  const cases=[
    [type(8,false),'checked_add',250n,5n,some(255n)],[type(8,false),'checked_add',250n,6n,none],
    [type(8,false),'checked_sub',0n,1n,none],[type(8,false),'checked_sub',5n,5n,some(0n)],
    [type(8,false),'checked_mul',16n,16n,none],[type(8,false),'checked_mul',17n,15n,some(255n)],
    [type(8,true),'checked_add',127n,1n,none],[type(8,true),'checked_add',-128n,-1n,none],
    [type(8,true),'checked_sub',127n,-1n,none],[type(8,true),'checked_sub',-128n,1n,none],
    [type(8,true),'checked_mul',-128n,-1n,none],[type(8,true),'checked_mul',-128n,1n,some(-128n)],
    [type(8,true),'checked_mul',-128n,0n,some(0n)],[type(8,true),'checked_mul',-16n,7n,some(-112n)],
    [type(128,false),'checked_add',340282366920938463463374607431768211454n,1n,some(340282366920938463463374607431768211455n)],
    [type(128,false),'checked_add',340282366920938463463374607431768211455n,1n,none],
    [type(128,true),'checked_mul',-170141183460469231731687303715884105728n,-1n,none],
    [type(64,false),'checked_mul',9007199254740993n,3n,some(27021597764222979n)],
  ];
  for(const [target,operation,left,right,expected] of cases){const actual=createFixedIntegerRuntime(target)['rust_fixed_'+operation](left,right);assert.deepEqual(actual,expected);assert.ok(Object.isFrozen(actual));}
});
test('saturating arithmetic clamps toward the correct signed bound without wrapping',()=>{
  const signed=createFixedIntegerRuntime(type(8,true)),unsigned=createFixedIntegerRuntime(type(8,false));
  for(const [operation,left,right,expected] of [
    ['saturating_add',127n,1n,127n],['saturating_add',-128n,-1n,-128n],
    ['saturating_sub',127n,-1n,127n],['saturating_sub',-128n,1n,-128n],
    ['saturating_mul',-128n,-1n,127n],['saturating_mul',-128n,2n,-128n],
    ['saturating_mul',-128n,0n,0n],['saturating_mul',-4n,-5n,20n],
  ])assert.equal(signed['rust_fixed_'+operation](left,right),expected);
  assert.equal(unsigned.rust_fixed_saturating_add(254n,2n),255n);
  assert.equal(unsigned.rust_fixed_saturating_sub(0n,1n),0n);
  assert.equal(unsigned.rust_fixed_saturating_mul(16n,16n),255n);
  const wide=createFixedIntegerRuntime(type(128,false));assert.equal(wide.rust_fixed_saturating_mul(340282366920938463463374607431768211455n,2n),340282366920938463463374607431768211455n);
});
test('all supported widths retain source bounds and return exact immutable standard options',()=>{
  for(const bits of [8,16,32,64,128])for(const signed of [false,true]){
    const minimum=signed?-(2n**BigInt(bits-1)):0n,maximum=2n**BigInt(signed?bits-1:bits)-1n;
    const api=createFixedIntegerRuntime(type(bits,signed));assert.ok(Object.isFrozen(api));
    assert.deepEqual(api.rust_fixed_checked_add(maximum,1n),none);
    assert.deepEqual(api.rust_fixed_checked_sub(minimum,1n),none);
    assert.deepEqual(api.rust_fixed_checked_mul(minimum,0n),some(0n));
    assert.equal(api.rust_fixed_saturating_add(maximum,1n),maximum);
    assert.equal(api.rust_fixed_saturating_sub(minimum,1n),minimum);
  }
});
test('primitive Ord min/max/clamp preserve exact ordering, equal bounds and reversed-bound panic',()=>{
  const api=createFixedIntegerRuntime(type(64,true));
  assert.equal(api.rust_fixed_min(9007199254740993n,9007199254740992n),9007199254740992n);
  assert.equal(api.rust_fixed_max(-5n,3n),3n);assert.equal(api.rust_fixed_min(-5n,-5n),-5n);
  for(const [value,lower,upper,expected] of [[-4n,-3n,3n,-3n],[0n,-3n,3n,0n],[4n,-3n,3n,3n],[2n,5n,5n,5n]])assert.equal(api.rust_fixed_clamp(value,lower,upper),expected);
  assert.throws(()=>api.rust_fixed_clamp(0n,2n,1n),RangeError);
});
test('invalid typed operands fail before any arithmetic or reversed-bound observation',()=>{
  const api=createFixedIntegerRuntime(type(8,false));
  for(const value of [0,'0',null,undefined,true,-1n,256n]){
    for(const operation of Object.keys(api))assert.throws(()=>api[operation](value,2n,1n),TypeError);
    assert.throws(()=>api.rust_fixed_checked_add(0n,value),TypeError);
    assert.throws(()=>api.rust_fixed_min(0n,value),TypeError);
    assert.throws(()=>api.rust_fixed_clamp(0n,value,1n),TypeError);
    assert.throws(()=>api.rust_fixed_clamp(0n,0n,value),TypeError);
  }
});
