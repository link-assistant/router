import test from 'node:test';
import assert from 'node:assert/strict';
import {Checker} from '../extensions/core.mjs';
import {TIME_DATA,TIME_TYPES,TIME_CONTRACTS,TIME_CONSTANTS,timeContracts} from '../extensions/time-contracts.mjs';
import * as time from '../extensions/time-runtime.mjs';
const d=(secs,nanos)=>Object.freeze({$:'Duration',secs,nanos}),some=value=>({$:'Some',field0:value}),none={$:'None'},max=d(18446744073709551615n,999999999n);
test('Duration layouts resolve through the semantic checker and pure/const metadata names actual adapters',()=>{
  const checker=new Checker('Rust',[]),checked=checker.program({language:'Rust',items:structuredClone(TIME_DATA)});
  const fields=checked.declarations.get('std.time.Duration').ctors[0].fields;
  assert.deepEqual(fields.map(field=>[field.name,field.type.kind,field.type.bits,field.type.signed]),[['secs','fixed',64,false],['nanos','fixed',32,false]]);
  for(const contract of TIME_CONTRACTS){assert.equal(typeof time[contract.jsExport],'function',contract.id);assert.equal(contract.pure,true);assert.equal(contract.async,false);assert.equal(typeof contract.constEligible,'boolean');assert.ok(Object.isFrozen(contract));checker.resolveType(contract.ret,[],{start:0,end:0});for(const type of contract.params)checker.resolveType(type,[],{start:0,end:0});}
  for(const constant of TIME_CONSTANTS){assert.deepEqual(time[constant.jsExport],constant.value);assert.ok(Object.isFrozen(time[constant.jsExport]));}
  assert.equal(timeContracts('std::time::Duration::from_secs')[0].constEligible,true);
  assert.equal(timeContracts('std::time::Duration::add')[0].constEligible,false);
  assert.equal(timeContracts('std::time::Duration::from_secs_f64')[0].constEligible,false);
  assert.deepEqual(timeContracts('std::time::Instant::now'),[]);assert.deepEqual(timeContracts('tokio::time::sleep'),[]);assert.deepEqual(timeContracts('chrono::Duration::seconds'),[]);
  assert.equal(TIME_TYPES.duration.path.join('::'),'std::time::Duration');
});
test('constructors normalize u32 nanosecond carries and retain full u64 precision',()=>{
  for(const [secs,nanos,expected] of [[0n,0n,d(0n,0n)],[2n,4294967295n,d(6n,294967295n)],[18446744073709551614n,1000000000n,d(18446744073709551615n,0n)],[18446744073709551615n,999999999n,max]])assert.deepEqual(time.std_time_duration_new(secs,nanos),expected);
  assert.deepEqual(time.std_time_duration_from_secs(9007199254740993n),d(9007199254740993n,0n));
  assert.deepEqual(time.std_time_duration_from_millis(18446744073709551615n),d(18446744073709551n,615000000n));
  assert.deepEqual(time.std_time_duration_from_micros(18446744073709551615n),d(18446744073709n,551615000n));
  assert.deepEqual(time.std_time_duration_from_nanos(18446744073709551615n),d(18446744073n,709551615n));
  assert.throws(()=>time.std_time_duration_new(18446744073709551615n,1000000000n),/overflow in Duration::new/);
  assert.deepEqual(time.std_time_duration_default(),d(0n,0n));
});
test('total-unit projections use u128 and truncate fractional units without rounding',()=>{
  assert.equal(time.std_time_duration_as_millis(max),18446744073709551615999n);
  assert.equal(time.std_time_duration_as_micros(max),18446744073709551615999999n);
  assert.equal(time.std_time_duration_as_nanos(max),18446744073709551615999999999n);
  const value=d(7n,123456789n);
  for(const [name,expected] of [['as_secs',7n],['subsec_millis',123n],['subsec_micros',123456n],['subsec_nanos',123456789n],['as_millis',7123n],['as_micros',7123456n],['as_nanos',7123456789n]])assert.equal(time[`std_time_duration_${name}`](value),expected);
  assert.equal(time.std_time_duration_is_zero(d(0n,0n)),true);assert.equal(time.std_time_duration_is_zero(d(0n,1n)),false);
});
test('checked arithmetic distinguishes carry, borrow, underflow and second-counter overflow',()=>{
  assert.deepEqual(time.std_time_duration_checked_add(d(8n,800000000n),d(1n,300000000n)),some(d(10n,100000000n)));
  assert.deepEqual(time.std_time_duration_checked_add(max,d(0n,0n)),some(max));assert.deepEqual(time.std_time_duration_checked_add(max,d(0n,1n)),none);
  assert.deepEqual(time.std_time_duration_checked_sub(d(10n,0n),d(0n,1n)),some(d(9n,999999999n)));
  assert.deepEqual(time.std_time_duration_checked_sub(d(1n,0n),d(1n,1n)),none);
  assert.deepEqual(time.std_time_duration_checked_mul(d(0n,500000001n),2n),some(d(1n,2n)));
  assert.deepEqual(time.std_time_duration_checked_mul(max,0n),some(d(0n,0n)));assert.deepEqual(time.std_time_duration_checked_mul(max,1n),some(max));assert.deepEqual(time.std_time_duration_checked_mul(d(18446744073709551614n,0n),2n),none);
  assert.deepEqual(time.std_time_duration_checked_div(d(1n,2n),3n),some(d(0n,333333334n)));
  assert.deepEqual(time.std_time_duration_checked_div(d(1n,1n),3n),some(d(0n,333333333n)));
  assert.deepEqual(time.std_time_duration_checked_div(d(2n,0n),0n),none);
  assert.deepEqual(time.std_time_duration_abs_diff(d(1n,0n),d(2n,1n)),d(1n,1n));assert.deepEqual(time.std_time_duration_abs_diff(d(2n,1n),d(1n,0n)),d(1n,1n));
});
test('saturating operations clamp only semantic overflow and trait operations preserve source panic distinctions',()=>{
  assert.deepEqual(time.std_time_duration_saturating_add(max,d(0n,1n)),max);assert.deepEqual(time.std_time_duration_saturating_sub(d(0n,0n),d(0n,1n)),d(0n,0n));assert.deepEqual(time.std_time_duration_saturating_mul(max,2n),max);
  assert.deepEqual(time.std_time_duration_add(d(0n,1n),d(0n,2n)),d(0n,3n));assert.deepEqual(time.std_time_duration_sub(d(2n,0n),d(1n,1n)),d(0n,999999999n));assert.deepEqual(time.std_time_duration_mul(d(0n,7n),3n),d(0n,21n));assert.deepEqual(time.std_time_duration_div(d(3n,0n),2n),d(1n,500000000n));
  assert.throws(()=>time.std_time_duration_add(max,d(0n,1n)),/overflow when adding durations/);assert.throws(()=>time.std_time_duration_sub(d(0n,0n),d(0n,1n)),/overflow when subtracting durations/);assert.throws(()=>time.std_time_duration_mul(max,2n),/overflow when multiplying duration by scalar/);assert.throws(()=>time.std_time_duration_div(d(1n,0n),0n),/divide by zero error/);
  assert.throws(()=>time.std_time_duration_saturating_mul(max,4294967296n),RangeError);
});
test('immutable Duration comparison is lexicographic across exact seconds and nanoseconds',()=>{
  const a=d(9007199254740992n,999999999n),b=d(9007199254740993n,0n);
  assert.equal(time.std_time_duration_lt(a,b),true);assert.equal(time.std_time_duration_le(a,a),true);assert.equal(time.std_time_duration_gt(b,a),true);assert.equal(time.std_time_duration_ge(b,b),true);assert.equal(time.std_time_duration_eq(a,d(9007199254740992n,999999999n)),true);assert.equal(time.std_time_duration_eq(a,b),false);
});
test('Ord min and max validate both Copy operands and retain pinned source tie identities',()=>{
  const a=d(9007199254740992n,999999999n),b=d(9007199254740993n,0n),equal=d(9007199254740993n,0n);
  assert.equal(time.std_time_duration_min(a,b),a);assert.equal(time.std_time_duration_min(b,a),a);
  assert.equal(time.std_time_duration_max(a,b),b);assert.equal(time.std_time_duration_max(b,a),b);
  assert.equal(time.std_time_duration_min(b,equal),b);assert.equal(time.std_time_duration_max(b,equal),equal);
  assert.equal(time.std_time_duration_min(max,d(0n,0n)).secs,0n);
  for(const name of ['min','max']){
    const descriptor=timeContracts(['std','time','Duration',name])[0];assert.deepEqual(descriptor.trait,['std','cmp','Ord']);assert.equal(descriptor.constEligible,false);assert.equal(descriptor.pure,true);
    for(const invalid of [{...a},d(0n,1000000000n),d(18446744073709551616n,0n)]){
      assert.throws(()=>time[`std_time_duration_${name}`](a,invalid));assert.throws(()=>time[`std_time_duration_${name}`](invalid,a));
    }
  }
});
test('binary64 constructors round original IEEE rational seconds to nanoseconds with ties to even',()=>{
  const cases=[[0,d(0n,0n)],[-0,d(0n,0n)],[Number.MIN_VALUE,d(0n,0n)],[0.999e-9,d(0n,1n)],[2.7,d(2n,700000000n)],[0.999999999499,d(0n,999999999n)],[0.999999999501,d(1n,0n)],[42.999999999499,d(42n,999999999n)],[42.999999999501,d(43n,0n)],[1/1024,d(0n,976562n)],[3/1024,d(0n,2929688n)],[1+1/1024,d(1n,976562n)],[1+3/1024,d(1n,2929688n)],[2**64-2048,d(18446744073709549568n,0n)]];
  for(const [input,expected] of cases){assert.deepEqual(time.std_time_duration_try_from_secs_f64(input),{$:'Ok',field0:expected});assert.deepEqual(time.std_time_duration_from_secs_f64(input),expected);}
  for(const [input,kind] of [[-1,'Negative'],[-Infinity,'Negative'],[NaN,'OverflowOrNan'],[Infinity,'OverflowOrNan'],[2**64,'OverflowOrNan']]){const result=time.std_time_duration_try_from_secs_f64(input);assert.equal(result.$,'Err');assert.equal(result.field0.kind.$,kind);assert.ok(Object.isFrozen(result.field0.kind));assert.throws(()=>time.std_time_duration_from_secs_f64(input),RangeError);}
});
test('binary64 projections and operations preserve pinned source evaluation and zero-divisor behavior',()=>{
  assert.equal(time.std_time_duration_as_secs_f64(d(2n,700000000n)),2.7);assert.equal(time.std_time_duration_as_secs_f64(max),2**64);
  assert.equal(time.std_time_duration_div_duration_f64(d(2n,700000000n),d(5n,400000000n)),0.5);
  assert.equal(time.std_time_duration_div_duration_f64(d(1n,0n),d(0n,0n)),Infinity);assert.ok(Number.isNaN(time.std_time_duration_div_duration_f64(d(0n,0n),d(0n,0n))));
  assert.deepEqual(time.std_time_duration_mul_f64(d(2n,500000000n),2),d(5n,0n));assert.deepEqual(time.std_time_duration_div_f64(d(2n,500000000n),2),d(1n,250000000n));assert.throws(()=>time.std_time_duration_div_f64(d(1n,0n),0),RangeError);
  assert.equal(time.std_time_float_secs_error_to_string(time.std_time_duration_try_from_secs_f64(-1).field0),'cannot convert float seconds to Duration: value is negative');
});
test('foreign, mutable, unnormalized and ill-typed values abort before becoming a successful Duration result',()=>{
  for(const value of [{...d(0n,0n)},Object.freeze({$:'Duration',secs:0,nanos:0n}),d(-1n,0n),d(0n,1000000000n),Object.freeze(Object.create(d(0n,0n))),Object.freeze({$:'Duration',secs:0n,nanos:0n,extra:true})])assert.throws(()=>time.std_time_duration_as_nanos(value));
  const accessor=Object.freeze({$:'Duration',secs:0n,get nanos(){throw new Error('getter must not run');}});assert.throws(()=>time.std_time_duration_as_nanos(accessor),/own data fields/);
  const errorAccessor=Object.freeze({$:'TryFromFloatSecsError',get kind(){throw new Error('error getter must not run');}});assert.throws(()=>time.std_time_float_secs_error_to_string(errorAccessor),/own data fields/);
  assert.throws(()=>time.std_time_float_secs_error_to_string(Object.freeze({$:'TryFromFloatSecsError',kind:Object.freeze({$:'Invented'})})),/Unknown float seconds error variant/);
  for(const call of [()=>time.std_time_duration_from_secs(1),()=>time.std_time_duration_from_secs(18446744073709551616n),()=>time.std_time_duration_new(0n,4294967296n),()=>time.std_time_duration_checked_div(d(1n,0n),-1n),()=>time.std_time_duration_try_from_secs_f64('1')])assert.throws(call);
});
