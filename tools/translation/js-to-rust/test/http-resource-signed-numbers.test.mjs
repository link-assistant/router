// Independent signed numeric family SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceOptionCallbackReceivingData} from './http-resource-option-callback-receiving-data.mjs';
import {verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceSignedNumberSources} from '../../prepare-http-resource-signed-number-sources.mjs';
const limits={timeout:60000},minimum=-9223372036854775808n,maximum=9223372036854775807n;
const guard=name=>'if(typeof '+name+'!=="bigint"||'+name+'< -9223372036854775808n||'+name+'>9223372036854775807n){throw new RangeError("Resource i64 input outside native range");}';
const imports=`import {router_integer_i64_saturating_add as add,router_integer_i64_wrapping_add as wrap,router_integer_i64_min as min,router_integer_i64_checked_div as divide} from './runtime/integer-runtime.mjs';
import {router_owned_result_i64_ok as okay,router_owned_result_i64_err as err,router_owned_result_i64_to_i64_map as resultMap} from './runtime/owned-result-runtime.mjs';
import {router_option_bool_some as boolSome,router_option_i64_some as some} from './runtime/primitive-option-runtime.mjs';
import {router_option_callback_bool_to_i64_map as optionMap} from './runtime/primitive-option-callback-runtime.mjs';
`;
const source=imports+`export function plus(input:bigint):ReturnType<typeof min>{${guard('input')}return add(input,1n);}
export function wrapping(input:ReturnType<typeof min>){${guard('input')}return wrap(input,1n);}
export function checked(left:bigint,right:bigint){${guard('left')}${guard('right')}return divide(left,right);}
export function lower(input:bigint){${guard('input')}return 0n>input;}
export function local():ReturnType<typeof min>{let value=1n;value=0n;return value;}
export function negative():ReturnType<typeof min>{return -9223372036854775808n;}
export function positive():ReturnType<typeof min>{return 9223372036854775807n;}
export function descend(flag:boolean):ReturnType<typeof min>{if(flag){return descend(false);}else{return 1n;}}
export function advanced(input:bigint):ReturnType<typeof min>{${guard('input')}let value=-2n;while(value<input){value=add(value,1n);}return value;}
export function mapped(flag:boolean){const input=flag?okay(-5n):err('missing');return resultMap(input,(value:bigint):bigint=>add(value,3n));}
export function optional(flag:boolean){return optionMap(boolSome(flag),(value:boolean):bigint=>value?1n:-1n);}
export function internallyOwned(){return some(-1n);}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceOptionCallbackReceivingData([{path:sourcePath,source:value}])};}
test('actual signed operations guards callbacks and recursive literal contexts preserve i64 boundaries',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.equal(result.typescript,source);const rows=JSON.parse(result.meta).functions;assert.equal(rows.find(row=>row.name==='plus').parameters[0].type,'i64');assert.equal(rows.find(row=>row.name==='plus').inputGuards[0].type,'i64');assert.match(result.rust,/-9223372036854775808_i64/u);
 await verifyHttpResourceTargets(result,async api=>{assert.equal(api.plus(minimum),minimum+1n);assert.equal(api.plus(maximum),maximum);assert.equal(api.wrapping(maximum),minimum);assert.deepEqual(api.checked(minimum,-1n),{$:'None'});assert.deepEqual(api.checked(7n,2n),{$:'Some',field0:3n});assert.deepEqual(api.checked(1n,0n),{$:'None'});assert.equal(api.lower(-1n),true);assert.equal(api.lower(0n),false);assert.equal(api.local(),0n);assert.equal(api.negative(),minimum);assert.equal(api.positive(),maximum);assert.equal(api.descend(true),1n);assert.equal(api.descend(false),1n);assert.equal(api.advanced(1n),1n);assert.deepEqual(api.mapped(true),{$:'Ok',field0:-2n});assert.deepEqual(api.mapped(false),{$:'Err',field0:'missing'});assert.deepEqual(api.optional(true),{$:'Some',field0:1n});assert.deepEqual(api.optional(false),{$:'Some',field0:-1n});assert.deepEqual(api.internallyOwned(),{$:'Some',field0:-1n});for(const value of [minimum-1n,maximum+1n,0,'1'])assert.throws(()=>api.plus(value),/Resource i64 input outside native range/u);});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('complete native signed parameters positive locals literals callbacks and returned domains reproduce',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source));for(const native of [translated.rust,'pub fn positive() -> i64 { 1_i64 }\n','pub fn local() -> i64 { let value = 1_i64; value }\n','pub fn plus(input: i64) -> i64 { crate::translation_integer_core::i64_saturating_add(input, 1_i64) }\n']){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));assert.equal(result.rustExecuted,false);}
});
test('signed entry guards and literal ranges cannot be replaced by annotations wrong bounds or incompatible domains',limits,()=>{
 const unsigned=name=>'if(typeof '+name+'!=="bigint"||'+name+'<0n||'+name+'>18446744073709551615n){throw new RangeError("Control u64 input outside native range");}';
 for(const body of [
  'export function bad(input:ReturnType<typeof min>){return input;}',
  'export function bad(input:ReturnType<typeof min>){'+unsigned('input')+'return input;}',
  'export function bad(input:bigint){'+guard('input').replace('9223372036854775807n','9223372036854775808n')+'return input;}',
  'export function bad(input:bigint){'+guard('input').replace('-9223372036854775808n','-9223372036854775807n')+'return input;}',
  'export function bad(){return min(9223372036854775808n,0n);}',
  'export function bad(){return min(-9223372036854775809n,0n);}',
  'export function bad(){return min(0xffffn,0n);}',
  'export function bad(input:ReturnType<typeof some>){return input;}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='positive').flow.tail.value.type='u64';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('complete signed guard/interface/body/source copies retain both ordered inverse sequences',limits,()=>{
 const plan=prepareHttpResourceSignedNumberSources();assert.equal(plan.files.length,13);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
