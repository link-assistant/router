// Independent boundary SOURCE. Do not run until the entire bulk draft is done.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as integer from '../integer-runtime.mjs';
import {INTEGER_CONTRACTS,emitIntegerDeclarations} from '../integer-contracts.mjs';
import {INTEGER_NATIVE_SOURCE,INTEGER_RUNTIME_SOURCE,INTEGER_DECLARATIONS_SOURCE} from '../integer-native-source.mjs';
import {readFileSync} from 'node:fs';
const limits={timeout:60000},MAX=18446744073709551615n,MIN=-9223372036854775808n,IMAX=9223372036854775807n,none={$:'None'},some=field0=>({$:'Some',field0});
test('unsigned saturation wrapping checked results min max and clamp retain full width',limits,()=>{
 const cases=[['u64_saturating_add',[MAX,1n],MAX],['u64_saturating_sub',[0n,1n],0n],['u64_saturating_mul',[MAX,2n],MAX],['u64_wrapping_add',[MAX,1n],0n],['u64_wrapping_sub',[0n,1n],MAX],['u64_wrapping_mul',[MAX,2n],MAX-1n],['u64_checked_add',[MAX,1n],none],['u64_checked_add',[MAX-1n,1n],some(MAX)],['u64_checked_sub',[0n,1n],none],['u64_checked_sub',[MAX,MAX],some(0n)],['u64_checked_mul',[MAX,2n],none],['u64_checked_mul',[MAX,0n],some(0n)],['u64_checked_div',[MAX,0n],none],['u64_checked_div',[MAX,2n],some(9223372036854775807n)],['u64_checked_rem',[MAX,2n],some(1n)],['u64_checked_rem',[1n,0n],none],['u64_min',[MAX,0n],0n],['u64_max',[MAX,0n],MAX],['u64_clamp',[0n,1n,MAX],1n],['u64_clamp',[MAX,0n,MAX-1n],MAX-1n]];
 for(const [name,args,expected]of cases)assert.deepEqual(integer['router_integer_'+name](...args),expected);
});
test('signed overflow and truncation preserve Rust division remainder and absolute-value boundaries',limits,()=>{
 const cases=[['i64_saturating_add',[IMAX,1n],IMAX],['i64_saturating_sub',[MIN,1n],MIN],['i64_saturating_mul',[MIN,-1n],IMAX],['i64_wrapping_add',[IMAX,1n],MIN],['i64_wrapping_sub',[MIN,1n],IMAX],['i64_wrapping_mul',[MIN,-1n],MIN],['i64_checked_add',[IMAX,1n],none],['i64_checked_sub',[MIN,1n],none],['i64_checked_mul',[MIN,-1n],none],['i64_checked_div',[MIN,-1n],none],['i64_checked_rem',[MIN,-1n],none],['i64_checked_div',[-7n,3n],some(-2n)],['i64_checked_rem',[-7n,3n],some(-1n)],['i64_checked_div',[7n,-3n],some(-2n)],['i64_checked_rem',[7n,-3n],some(1n)],['i64_checked_div',[1n,0n],none],['i64_checked_rem',[1n,0n],none],['i64_checked_abs',[MIN],none],['i64_checked_abs',[-IMAX],some(IMAX)],['i64_saturating_abs',[MIN],IMAX],['i64_saturating_abs',[-17n],17n],['i64_min',[MIN,IMAX],MIN],['i64_max',[MIN,IMAX],IMAX],['i64_clamp',[MIN,-2n,3n],-2n]];
 for(const [name,args,expected]of cases)assert.deepEqual(integer['router_integer_'+name](...args),expected);
});
test('foreign inputs never coerce and closed option results remain immutable',limits,()=>{
 let touched=0;const hooks={valueOf(){touched++;return 1n;},toString(){touched++;return '1';}};for(const value of [1,'1',NaN,undefined,null,hooks,Object(1n),-1n,MAX+1n])assert.throws(()=>integer.router_integer_u64_wrapping_add(value,1n),TypeError);for(const value of [MIN-1n,IMAX+1n])assert.throws(()=>integer.router_integer_i64_min(value,0n),TypeError);assert.equal(touched,0);assert.throws(()=>integer.router_integer_i64_clamp(0n,1n,-1n),RangeError);const result=integer.router_integer_i64_checked_add(1n,2n);assert.equal(Object.isFrozen(result),true);assert.deepEqual(result,some(3n));
});
test('all 30 original and120 additional scalar/checked interfaces and declarations rejoin complete native/runtime source',limits,()=>{
 assert.equal(INTEGER_CONTRACTS.filter(row=>/^[ui]64_/u.test(row.rustName)).length,30);assert.equal(INTEGER_CONTRACTS.length,150);for(const row of INTEGER_CONTRACTS)assert.equal(typeof integer[row.javascriptName],'function');assert.equal(emitIntegerDeclarations(),INTEGER_DECLARATIONS_SOURCE);for(const [path,source]of [['integer-runtime.mjs',INTEGER_RUNTIME_SOURCE],['integer-runtime.d.mts',INTEGER_DECLARATIONS_SOURCE]])assert.equal(readFileSync(new URL('../'+path,import.meta.url),'utf8'),source);assert.equal(readFileSync(new URL('../../../rust/src/translation_integer_core.rs',import.meta.url),'utf8'),INTEGER_NATIVE_SOURCE);
});
